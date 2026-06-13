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
  expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
});

// Index for sorting by newest first
newsSchema.index({ publishedAt: -1 });

// TTL Index: MongoDB auto-deletes documents when expiresAt is reached
newsSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for checking duplicates by videoId
newsSchema.index({ videoId: 1 });

module.exports = mongoose.model('News', newsSchema);