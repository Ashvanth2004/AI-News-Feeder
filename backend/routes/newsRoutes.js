const express = require('express');
const News = require('../models/News');
const { runCheck } = require('../workers/processLiveNews');

const router = express.Router();

// GET /api/news — Fetch all non-expired news items (newest first)
router.get('/news', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;
    const items = await News.find({ expiresAt: { $gt: new Date() } })
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit);
    res.json({ status: 'success', count: items.length, results: items });
  } catch (error) {
    console.error('Error fetching news:', error.message);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

// GET /api/news/:id — Fetch a single news item
router.get('/news/:id', async (req, res) => {
  try {
    const item = await News.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'News item not found' });
    }
    res.json({ status: 'success', result: item });
  } catch (error) {
    console.error('Error fetching news item:', error.message);
    res.status(500).json({ error: 'Failed to fetch news item' });
  }
});

// POST /api/check — Manually trigger a live check
router.post('/check', async (req, res) => {
  try {
    console.log('🔍 Manual check triggered via API');
    await runCheck();
    res.json({ status: 'success', message: 'Live check completed' });
  } catch (error) {
    console.error('Error running manual check:', error.message);
    res.status(500).json({ error: 'Check failed' });
  }
});

// GET /api/stats — System statistics
router.get('/stats', async (req, res) => {
  try {
    const totalCount = await News.countDocuments();
    const activeCount = await News.countDocuments({ expiresAt: { $gt: new Date() } });
    const expiredCount = totalCount - activeCount;
    res.json({
      status: 'success',
      stats: {
        total: totalCount,
        active: activeCount,
        expired: expiredCount,
        note: 'Expired articles are auto-deleted by MongoDB TTL',
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/health — Health check
router.get('/health', (req, res) => {
  res.json({ status: 'Backend is running', timestamp: new Date().toISOString() });
});

module.exports = router;