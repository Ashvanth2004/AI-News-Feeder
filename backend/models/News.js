const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
  headline: { type: String, required: true },
  summary: { type: String, required: true },
  article: { type: String, default: '' },
  category: { type: String, default: 'General' },
  sourceChannel: { type: String, required: true },
  sourceUrl: { type: String },
  videoId: { type: String },
  transcriptSnippet: { type: String },
  publishedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },

  // ── NEW AI FEATURES ──

  // AI Summarization: bullet-point summary
  summaryBullets: { type: [String], default: [] },

  // Sentiment Analysis: "positive", "negative", or "neutral"
  sentiment: { type: String, enum: ['positive', 'negative', 'neutral', null], default: null },

  // Sentiment score (0-100)
  sentimentScore: { type: Number, default: null },

  // Trending keywords extracted from article
  keywords: { type: [String], default: [] },

  // Multilingual translations: { ta: { headline, summary }, hi: { headline, summary } }
  translations: {
    type: Map,
    of: new mongoose.Schema({
      headline: { type: String },
      summary: { type: String },
      article: { type: String },
    }, { _id: false }),
    default: {},
  },

  // Text-to-speech audio URL (generated on demand)
  ttsAudioUrl: { type: String, default: null },

  // Article language code
  language: { type: String, default: 'en' },

  // Read count for popularity tracking
  readCount: { type: Number, default: 0 },
});

// Index for sorting by newest first
newsSchema.index({ publishedAt: -1 });

// TTL Index: MongoDB auto-deletes documents when expiresAt is reached
newsSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for checking duplicates by videoId
newsSchema.index({ videoId: 1 });

// Index for trending queries
newsSchema.index({ keywords: 1, publishedAt: -1 });
newsSchema.index({ sentiment: 1 });
newsSchema.index({ readCount: -1 });

module.exports = mongoose.model('News', newsSchema);