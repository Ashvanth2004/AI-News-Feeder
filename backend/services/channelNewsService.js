/**
 * Channel News Service
 * 
 * Generates news articles from live channel headlines and stores them in MongoDB.
 * Runs every 6 hours to produce new articles from each channel's headline list.
 * Articles auto-expire after 30 days via MongoDB TTL.
 */

const News = require('../models/News');
const { LIVE_CHANNELS } = require('../data/channels');
const { emitNewArticle } = require('./socketService');

// Track which headlines we've already used per channel to rotate through them
const usedHeadlines = {};

// Category distribution for generating article categories
const categories = ['Politics', 'Technology', 'Business', 'Sports', 'Entertainment', 'Health', 'Science', 'Weather', 'Local News', 'General'];

// Article templates for generating realistic-looking news articles
const articleTemplates = [
  {
    summary: (headline, channel) => `${headline.replace('🔴 ', '')} — ${channel.name} reports live from the field with exclusive coverage of this developing story.`,
    article: (headline, channel) => `In a significant development covered live by ${channel.name}, ${headline.replace('🔴 ', '').toLowerCase()}. Sources confirm that authorities are closely monitoring the situation and have urged the public to stay informed through official channels.

According to reports from ${channel.name}'s ground team, this is a rapidly evolving situation with new details emerging every hour. Eyewitnesses describe the scene as unprecedented, with widespread attention from across the region.

Experts and analysts speaking on ${channel.name} have provided extensive context on this development. "This marks a significant moment," said a senior analyst. "The implications are far-reaching and will likely shape discussions in the coming weeks."

The broadcast has featured exclusive interviews with key stakeholders who have shared their perspectives on the matter. Local residents have expressed a mix of concern and hope as the situation continues to unfold.

${channel.name} will continue to provide round-the-clock coverage of this developing story. Viewers are encouraged to stay tuned for live updates, expert analysis, and on-the-ground reporting as more information becomes available.`,
    category: (headline) => {
      const lower = headline.toLowerCase();
      if (lower.includes('mudhal') || lower.includes('cm') || lower.includes('minister') || lower.includes('politi') || lower.includes('election') || lower.includes('parliament')) return 'Politics';
      if (lower.includes('weather') || lower.includes('rain') || lower.includes('cyclone') || lower.includes('ma¾ai') || lower.includes('vaanilai')) return 'Weather';
      if (lower.includes('sports') || lower.includes('cricket') || lower.includes('olympic') || lower.includes('vilaiyaattu') || lower.includes('khel')) return 'Sports';
      if (lower.includes('tech') || lower.includes('ai') || lower.includes('satellite') || lower.includes('isro') || lower.includes('digital')) return 'Technology';
      if (lower.includes('business') || lower.includes('stock') || lower.includes('market') || lower.includes('share') || lower.includes('sensex')) return 'Business';
      if (lower.includes('health') || lower.includes('hospital') || lower.includes('covid') || lower.includes('sehai') || lower.includes('medical')) return 'Health';
      if (lower.includes('film') || lower.includes('bollywood') || lower.includes('entertainment') || lower.includes('cinema')) return 'Entertainment';
      if (lower.includes('education') || lower.includes('school') || lower.includes('college') || lower.includes('kalaivi') || lower.includes('shiksha')) return 'Education';
      return categories[Math.floor(Math.random() * categories.length)];
    },
  },
  {
    summary: (headline, channel) => `Latest update from ${channel.name}: ${headline.replace('🔴 ', '')}. This story is developing and our team is tracking every update.`,
    article: (headline, channel) => `${channel.name} is covering this breaking story as it develops. ${headline.replace('🔴 ', '')} has captured the attention of viewers across the region who are tuning in for the latest updates.

Our correspondents on the ground have confirmed that this is a major development with significant implications. Officials have been contacted for official statements, and responses are expected shortly.

The story has generated widespread discussion on social media platforms, with many users sharing their reactions and perspectives. ${channel.name}'s digital platforms have seen a surge in engagement as viewers seek the latest information.

"This is a story that resonates with people across the region," noted a media analyst. "The coverage by ${channel.name} has been comprehensive and timely."

As the situation continues to evolve, ${channel.name} remains committed to providing accurate, up-to-date information. Viewers can expect continuous coverage with expert analysis, on-the-ground reports, and exclusive interviews as this story develops further.`,
    category: (headline) => {
      const lower = headline.toLowerCase();
      if (lower.includes('mudhal') || lower.includes('cm') || lower.includes('minister') || lower.includes('politi') || lower.includes('election') || lower.includes('parliament')) return 'Politics';
      if (lower.includes('weather') || lower.includes('rain') || lower.includes('cyclone') || lower.includes('ma¾ai') || lower.includes('vaanilai')) return 'Weather';
      if (lower.includes('sports') || lower.includes('cricket') || lower.includes('olympic') || lower.includes('vilaiyaattu') || lower.includes('khel')) return 'Sports';
      if (lower.includes('tech') || lower.includes('ai') || lower.includes('satellite') || lower.includes('isro') || lower.includes('digital')) return 'Technology';
      if (lower.includes('business') || lower.includes('stock') || lower.includes('market') || lower.includes('share') || lower.includes('sensex')) return 'Business';
      if (lower.includes('health') || lower.includes('hospital') || lower.includes('covid') || lower.includes('sehai') || lower.includes('medical')) return 'Health';
      if (lower.includes('film') || lower.includes('bollywood') || lower.includes('entertainment') || lower.includes('cinema')) return 'Entertainment';
      if (lower.includes('education') || lower.includes('school') || lower.includes('college') || lower.includes('kalaivi') || lower.includes('shiksha')) return 'Education';
      return categories[Math.floor(Math.random() * categories.length)];
    },
  },
];

/**
 * Get the next unused headline for a channel.
 * Cycles through all headlines, tracking used ones to avoid immediate repeats.
 */
function getNextHeadline(channel) {
  if (!usedHeadlines[channel.id]) {
    usedHeadlines[channel.id] = 0;
  }
  
  const headlines = channel.newsHeadlines;
  const index = usedHeadlines[channel.id] % headlines.length;
  usedHeadlines[channel.id] = (usedHeadlines[channel.id] + 1) % headlines.length;
  
  return headlines[index];
}

/**
 * Generate a news article from a channel's headline.
 */
async function generateChannelArticle(channel) {
  const headline = getNextHeadline(channel);
  const template = articleTemplates[Math.floor(Math.random() * articleTemplates.length)];
  
  const summary = typeof template.summary === 'function' 
    ? template.summary(headline, channel) 
    : template.summary;
  
  const article = typeof template.article === 'function'
    ? template.article(headline, channel)
    : template.article;
  
  const category = typeof template.category === 'function'
    ? template.category(headline)
    : template.category;
  
  // Check if a similar headline already exists from this channel (avoid exact duplicates)
  const existing = await News.findOne({
    sourceChannel: channel.name,
    headline: { $regex: headline.slice(0, 30).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
    publishedAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // within last 24h
  });
  
  if (existing) {
    console.log(`⏭️ Skipping duplicate headline for ${channel.name}: "${headline.slice(0, 40)}..."`);
    return null;
  }
  
  return {
    headline: headline.replace('🔴 ', '') + ` — ${channel.name}`,
    summary,
    article,
    category,
    sourceChannel: channel.name,
    sourceUrl: `https://www.youtube.com/watch?v=${channel.videoId}`,
    videoId: channel.videoId,
    publishedAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  };
}

/**
 * Generate and save new articles from all channels.
 * Optionally specify a subset of channels to process.
 */
async function generateNewsFromChannels(channelIds = null) {
  const channels = channelIds
    ? LIVE_CHANNELS.filter(c => channelIds.includes(c.id))
    : LIVE_CHANNELS;
  
  // Only process Tamil channels if specifically requested or on first run
  const tamilChannels = channels.filter(c => c.lang === 'ta');
  const otherChannels = channels.filter(c => c.lang !== 'ta');
  
  // Generate 2-3 articles from Tamil channels and 1-2 from others
  let results = [];
  
  for (const channel of tamilChannels) {
    const count = 2 + Math.floor(Math.random() * 2); // 2-3 articles per Tamil channel
    for (let i = 0; i < count; i++) {
      const doc = await generateChannelArticle(channel);
      if (doc) results.push(doc);
    }
  }
  
  for (const channel of otherChannels) {
    const count = 1 + Math.floor(Math.random() * 2); // 1-2 articles per other channel
    for (let i = 0; i < count; i++) {
      const doc = await generateChannelArticle(channel);
      if (doc) results.push(doc);
    }
  }
  
  if (results.length === 0) {
    console.log('📰 No new articles to generate (all duplicates)');
    return [];
  }
  
  // Save all articles to MongoDB
  const savedArticles = await News.insertMany(results);
  console.log(`✅ Generated ${savedArticles.length} new news articles from live channels (30-day TTL)`);
  
  // Emit via Socket.IO
  for (const article of savedArticles) {
    emitNewArticle({
      _id: article._id,
      headline: article.headline,
      summary: article.summary,
      article: article.article,
      category: article.category,
      sourceChannel: article.sourceChannel,
      sourceUrl: article.sourceUrl,
      videoId: article.videoId,
      publishedAt: article.publishedAt,
      expiresAt: article.expiresAt,
      image: `https://img.youtube.com/vi/${article.videoId}/mqdefault.jpg`,
    });
  }
  
  return savedArticles;
}

/**
 * Start the channel news service on a schedule.
 * - Runs immediately on startup
 * - Then every 6 hours to generate fresh articles
 */
function startChannelNewsService() {
  console.log('📰 Channel News Service started');
  console.log('⏰ Generating news from live channel headlines every 6 hours');
  console.log('🗑️ Articles auto-delete after 30 days via MongoDB TTL');
  
  // Run immediately
  generateNewsFromChannels()
    .then(articles => {
      if (articles.length > 0) {
        console.log(`📊 Total: ${articles.length} articles generated on initial run`);
      }
    })
    .catch(err => console.error('❌ Initial news generation error:', err.message));
  
  // Then every 6 hours (21600000 ms)
  setInterval(() => {
    generateNewsFromChannels()
      .then(articles => {
        if (articles.length > 0) {
          console.log(`📊 Generated ${articles.length} fresh news articles`);
        }
      })
      .catch(err => console.error('❌ Scheduled news generation error:', err.message));
  }, 6 * 60 * 60 * 1000);
  
  // Also generate a smaller batch every 30 minutes for real-time feel
  setInterval(() => {
    // Pick 1-2 random channels to generate a quick update
    const randomChannels = LIVE_CHANNELS
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.floor(Math.random() * 2) + 1)
      .map(c => c.id);
    
    generateNewsFromChannels(randomChannels)
      .then(articles => {
        if (articles.length > 0) {
          console.log(`⚡ Quick update: ${articles.length} new article(s) from ${randomChannels.join(', ')}`);
        }
      })
      .catch(err => console.error('❌ Quick update error:', err.message));
  }, 30 * 60 * 1000);
}

module.exports = { startChannelNewsService, generateNewsFromChannels };