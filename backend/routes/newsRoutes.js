const { Router } = require('express');
const News = require('../models/News');
const { runCheck } = require('../workers/processLiveNews');
const { generateNewsFromChannels } = require('../services/channelNewsService');
const { generateBulletSummary, analyzeSentiment, translateArticle } = require('../services/aiFeaturesService');

const router = Router();

const handleErr = (res, msg) => err => { console.error(msg, err.message); res.status(500).json({ error: msg }); };

router.get('/news', async (req, res) => {
  try {
    const items = await News.find({ expiresAt: { $gt: new Date() } }).sort({ publishedAt: -1 }).limit(+req.query.limit || 50).skip(+req.query.skip || 0);
    res.json({ status: 'success', count: items.length, results: items });
  } catch(e) { handleErr(res, 'Failed to fetch news')(e); }
});

router.get('/news/:id', async (req, res) => {
  try { const item = await News.findById(req.params.id); if (!item) return res.status(404).json({ error: 'Not found' }); res.json({ status: 'success', result: item }); }
  catch(e) { handleErr(res, 'Failed to fetch')(e); }
});

router.post('/news/:id/read', async (req, res) => {
  try { const item = await News.findByIdAndUpdate(req.params.id, { $inc: { readCount: 1 } }, { new: true }); if (!item) return res.status(404).json({ error: 'Not found' }); res.json({ status: 'success', readCount: item.readCount }); }
  catch(e) { handleErr(res, 'Failed')(e); }
});

router.post('/news/:id/summarize', async (req, res) => {
  try {
    const article = await News.findById(req.params.id);
    if (!article) return res.status(404).json({ error: 'Not found' });
    const text = article.article || article.summary;
    if (!text) return res.json({ bullets: [], cached: false });
    if (article.summaryBullets?.length) return res.json({ bullets: article.summaryBullets, cached: true });
    const bullets = await generateBulletSummary(text);
    await News.findByIdAndUpdate(req.params.id, { summaryBullets: bullets });
    res.json({ bullets, cached: false });
  } catch(e) { handleErr(res, e.message)(e); }
});

router.post('/news/:id/sentiment', async (req, res) => {
  try {
    const article = await News.findById(req.params.id);
    if (!article) return res.status(404).json({ error: 'Not found' });
    if (article.sentiment) return res.json({ sentiment: article.sentiment, score: article.sentimentScore, cached: true });
    const text = article.article || article.summary || article.headline;
    const { sentiment, score } = await analyzeSentiment(text);
    await News.findByIdAndUpdate(req.params.id, { sentiment, sentimentScore: score });
    res.json({ sentiment, score, cached: false });
  } catch(e) { handleErr(res, e.message)(e); }
});

router.post('/news/:id/translate', async (req, res) => {
  try {
    const article = await News.findById(req.params.id);
    if (!article) return res.status(404).json({ error: 'Not found' });
    const targetLangs = req.body.languages || ['ta', 'hi'];
    const existing = article.translations || {};
    const missing = targetLangs.filter(l => !existing.has(l) || !existing.get(l)?.headline);
    if (!missing.length) return res.json({ translations: Object.fromEntries(existing), cached: true });
    const newTrans = await translateArticle(article, missing);
    const all = { ...Object.fromEntries(existing), ...newTrans };
    await News.findByIdAndUpdate(req.params.id, { translations: all });
    res.json({ translations: all, cached: false });
  } catch(e) { handleErr(res, e.message)(e); }
});

router.get('/trending', async (req, res) => {
  try {
    const items = await News.find({ expiresAt: { $gt: new Date() }, keywords: { $exists: true, $not: { $size: 0 } } }).sort({ readCount: -1, publishedAt: -1 }).limit(10);
    res.json({ status: 'success', count: items.length, results: items });
  } catch(e) { handleErr(res, 'Failed to fetch trending')(e); }
});

router.post('/check', async (req, res) => {
  try { await runCheck(); res.json({ status: 'success', message: 'Live check completed' }); }
  catch(e) { handleErr(res, 'Check failed')(e); }
});

router.get('/stats', async (req, res) => {
  try {
    const [total, active, pos, neg] = await Promise.all([
      News.countDocuments(),
      News.countDocuments({ expiresAt: { $gt: new Date() } }),
      News.countDocuments({ sentiment: 'positive' }),
      News.countDocuments({ sentiment: 'negative' }),
    ]);
    res.json({ status: 'success', stats: { total, active, expired: total - active, positive: pos, negative: neg, note: 'Articles auto-deleted by MongoDB TTL' } });
  } catch(e) { handleErr(res, 'Failed to fetch stats')(e); }
});

router.post('/news/generate', async (req, res) => {
  try { const articles = await generateNewsFromChannels(); res.json({ status: 'success', count: articles.length, message: `Generated ${articles.length} new articles` }); }
  catch(e) { handleErr(res, 'Failed to generate news')(e); }
});

router.get('/health', (req, res) => res.json({ status: 'Backend is running', timestamp: new Date().toISOString() }));

module.exports = router;