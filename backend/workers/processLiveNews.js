/**
 * Main Worker: processLiveNews
 * 
 * Orchestrates the full pipeline:
 * 1. Check live channels every 1 minute
 * 2. Extract captions when live is detected
 * 3. Send transcript to Gemini AI (generates full 250-word article)
 * 4. Save structured news to MongoDB with 24-hour expiry
 * 5. Push via Socket.IO ("new-article" / "article-expired")
 */

const { checkLiveChannels } = require('../services/liveDetector');
const { getTranscript } = require('../services/transcriptService');
const { processTranscript } = require('../services/aiService');
const { emitNewArticle, emitArticleExpired } = require('../services/socketService');
const News = require('../models/News');

// Track which video IDs we've already processed to avoid duplicates
const processedVideos = new Set();

/**
 * Process a single live channel through the full pipeline.
 */
async function processChannel(channel) {
  const { channelName, videoId, channelUrl } = channel;

  // Skip if already processing this video
  if (processedVideos.has(videoId)) {
    return;
  }

  processedVideos.add(videoId);

  try {
    console.log(`\n🔄 Processing: ${channelName} (${videoId})`);

    // Phase 2: Get transcript/captions
    const { transcript, source } = await getTranscript(videoId, channelName);

    // Phase 3: AI Processing with Gemini (generates full article)
    const { headline, summary, article, category } = await processTranscript(transcript, channelName);

    // Phase 4: Save to MongoDB with 24-hour expiry
    const newsDoc = await News.create({
      headline,
      summary,
      article,
      category,
      sourceChannel: channelName,
      sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
      videoId,
      transcriptSnippet: transcript ? transcript.slice(-500) : null,
      publishedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    console.log(`✅ Saved to MongoDB: "${headline}" (${category}) — expires in 24h`);

    // Phase 5: Emit "new-article" via Socket.IO
    const articlePayload = {
      _id: newsDoc._id,
      headline: newsDoc.headline,
      summary: newsDoc.summary,
      article: newsDoc.article,
      category: newsDoc.category,
      sourceChannel: newsDoc.sourceChannel,
      sourceUrl: newsDoc.sourceUrl,
      videoId: newsDoc.videoId,
      publishedAt: newsDoc.publishedAt,
      expiresAt: newsDoc.expiresAt,
      image: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
    };
    emitNewArticle(articlePayload);

    return newsDoc;

  } catch (error) {
    console.error(`❌ Error processing ${channelName}:`, error.message);
    processedVideos.delete(videoId); // Allow retry
  }
}

/**
 * Main loop: Check live channels every 60 seconds.
 */
async function startWorker() {
  console.log('🚀 Live News Worker started');
  console.log('⏰ Checking channels every 60 seconds...');
  console.log('🗑️  MongoDB TTL: articles auto-delete after 24 hours');

  // Run immediately on start
  await runCheck();

  // Then every 60 seconds
  setInterval(runCheck, 60000);

  // Every 30 seconds, emit expired articles
  setInterval(async () => {
    try {
      const expired = await News.find({ expiresAt: { $lt: new Date() } });
      for (const item of expired) {
        emitArticleExpired(item._id);
      }
    } catch (err) {
      // Ignore errors on expiry check
    }
  }, 30000);
}

async function runCheck() {
  try {
    console.log('\n📡 Checking for live channels...');

    // Phase 1: Detect which channels are live
    const liveChannels = await checkLiveChannels();

    if (liveChannels.length === 0) {
      console.log('📺 No new live channels detected');
      return;
    }

    console.log(`🔴 Found ${liveChannels.length} live channel(s)!`);

    // Process each live channel sequentially to avoid rate limits
    for (const channel of liveChannels) {
      await processChannel(channel);
    }

  } catch (error) {
    console.error('❌ Worker check error:', error.message);
  }
}

module.exports = { startWorker, runCheck, processChannel };