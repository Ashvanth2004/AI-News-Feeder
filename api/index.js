// Vercel Serverless Function — Express API
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// ===== Middleware =====
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ===== MongoDB Schema =====
const newsSchema = new mongoose.Schema({
  videoId: { type: String, index: true },
  headline: String,
  summary: String,
  category: { type: String, default: 'General' },
  source: String,
  timestamp: { type: Date, default: Date.now },
  jobId: String,
});

let NewsItem;
try {
  NewsItem = mongoose.model('NewsItem');
} catch {
  NewsItem = mongoose.model('NewsItem', newsSchema);
}

// ===== Lazy MongoDB connection =====
let mongoConnected = false;

async function ensureMongo() {
  if (mongoConnected) return true;
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) return false;
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 5000,
    });
    mongoConnected = true;
    return true;
  } catch {
    return false;
  }
}

// ===== Routes =====

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'API is running', timestamp: new Date().toISOString() });
});

// GET /news — fetch all processed news (newest first)
app.get('/news', async (req, res) => {
  try {
    const hasDb = await ensureMongo();
    if (!hasDb) {
      return res.json({ status: 'success', count: 0, results: [], note: 'Database not configured' });
    }
    const limit = parseInt(req.query.limit) || 50;
    const items = await NewsItem.find().sort({ timestamp: -1 }).limit(limit);
    res.json({ status: 'success', count: items.length, results: items });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

// POST /jobs — add a YouTube video URL for processing
app.post('/jobs', async (req, res) => {
  const { videoUrl } = req.body;
  if (!videoUrl) {
    return res.status(400).json({ error: 'videoUrl is required' });
  }

  // Queue not available in serverless — return info
  res.status(503).json({ 
    error: 'Queue service not available in serverless mode',
    message: 'Use the backend server for job queue functionality'
  });
});

// POST /webhook/worker — internal webhook for worker to notify of new items
app.post('/webhook/worker', async (req, res) => {
  const { event, data } = req.body;
  if (event === 'news_processed' && data) {
    try {
      const hasDb = await ensureMongo();
      if (hasDb) {
        const newsItem = new NewsItem(data);
        await newsItem.save();
      }
      res.json({ status: 'success' });
    } catch {
      res.status(500).json({ error: 'Failed to process webhook' });
    }
  } else {
    res.status(400).json({ error: 'Invalid webhook payload' });
  }
});

// ===== Export for Vercel Serverless =====
module.exports = app;