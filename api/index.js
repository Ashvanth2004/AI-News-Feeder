require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { Queue } = require('bullmq');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const port = process.env.API_PORT || 3001;

// BullMQ Redis connection
const connection = {
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
};

const videoQueue = new Queue('videoQueue', { connection });

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

const NewsItem = mongoose.model('NewsItem', newsSchema);

// ===== Middleware =====
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ===== Routes =====

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'API is running', uptime: process.uptime() });
});

// GET /news — fetch all processed news (newest first)
app.get('/news', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const items = await NewsItem.find().sort({ timestamp: -1 }).limit(limit);
    res.json({ status: 'success', count: items.length, results: items });
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

// POST /jobs — add a YouTube video URL for processing
app.post('/jobs', async (req, res) => {
  const { videoUrl } = req.body;

  if (!videoUrl) {
    return res.status(400).json({ error: 'videoUrl is required' });
  }

  try {
    const job = await videoQueue.add('processVideo', { videoUrl }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
    res.json({ message: 'Job added to queue', jobId: job.id });
  } catch (error) {
    console.error('Queue error:', error);
    res.status(500).json({ error: 'Failed to add job to queue' });
  }
});

// POST /webhook/worker — internal webhook for worker to notify of new items
app.post('/webhook/worker', async (req, res) => {
  const { event, data } = req.body;
  if (event === 'news_processed' && data) {
    // Save to MongoDB
    const newsItem = new NewsItem(data);
    await newsItem.save();
    console.log(`📰 Saved news item: "${data.headline}"`);

    // Emit to all connected WebSocket clients
    io.emit('news_added', data);
    console.log('📡 Emitted news_added via WebSocket');
    res.json({ status: 'success' });
  } else {
    res.status(400).json({ error: 'Invalid webhook payload' });
  }
});

// ===== WebSocket =====
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// ===== MongoDB Connection & Server Start =====
async function start() {
  const mongoUri = process.env.MONGO_URI;
  if (mongoUri) {
    try {
      await mongoose.connect(mongoUri);
      console.log('✅ MongoDB connected');
    } catch (err) {
      console.warn('⚠️ MongoDB not available, running without database:', err.message);
    }
  } else {
    console.warn('⚠️ MONGO_URI not set, running without database');
  }

  server.listen(port, () => {
    console.log(`🚀 API server listening at http://localhost:${port}`);
    console.log(`📡 WebSocket available on ws://localhost:${port}`);
  });
}

start();