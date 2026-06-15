/**
 * AI Features Service
 * 
 * All AI-powered features using Google Gemini:
 * 1. Smart Summarization (bullet points)
 * 2. Sentiment Analysis
 * 3. Keyword Extraction (for trending)
 * 4. Multilingual Translation (English → Tamil, Hindi)
 * 5. Text-to-Speech URL generation
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

/**
 * Generate a bullet-point summary of a long article.
 * Returns array of bullet points (3-5 bullets).
 */
async function generateBulletSummary(articleText) {
  if (!articleText || articleText.length < 50) return [];

  if (!genAI) {
    // Fallback summary extraction
    return extractFallbackBullets(articleText);
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: `You are a news summarizer. Given a news article, generate 3-5 concise bullet points that capture the most important information. Each bullet point must be max 20 words. Respond with ONLY a JSON array of strings. No markdown, no backticks. Example: ["Bullet one here.", "Bullet two here.", "Bullet three here."]`,
    });

    const result = await model.generateContent(articleText.slice(0, 2000));
    const text = result.response?.text?.() || '';

    try {
      const parsed = JSON.parse(text.replace(/```json\n?|```\n?/g, '').trim());
      if (Array.isArray(parsed)) return parsed.slice(0, 5);
      return extractFallbackBullets(articleText);
    } catch {
      return extractFallbackBullets(articleText);
    }
  } catch (error) {
    console.error('❌ Bullet summary failed:', error.message);
    return extractFallbackBullets(articleText);
  }
}

/**
 * Extract sentiment from article text.
 * Returns { sentiment: 'positive'|'negative'|'neutral', score: 0-100 }
 */
async function analyzeSentiment(articleText) {
  if (!articleText || articleText.length < 50) {
    return { sentiment: 'neutral', score: 50 };
  }

  if (!genAI) {
    return simpleSentiment(articleText);
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: `Analyze the sentiment of this news article. Respond with ONLY valid JSON: {"sentiment": "positive|negative|neutral", "score": 0-100}. Score 0=very negative, 50=neutral, 100=very positive. No markdown.`,
    });

    const result = await model.generateContent(articleText.slice(0, 1500));
    const text = result.response?.text?.() || '';

    try {
      const parsed = JSON.parse(text.replace(/```json\n?|```\n?/g, '').trim());
      const sentiment = ['positive', 'negative', 'neutral'].includes(parsed.sentiment) ? parsed.sentiment : 'neutral';
      const score = Math.max(0, Math.min(100, parsed.score || 50));
      return { sentiment, score };
    } catch {
      return simpleSentiment(articleText);
    }
  } catch (error) {
    console.error('❌ Sentiment analysis failed:', error.message);
    return simpleSentiment(articleText);
  }
}

/**
 * Extract trending keywords from article.
 * Returns array of keyword strings (max 10).
 */
async function extractKeywords(articleText) {
  if (!articleText || articleText.length < 30) return [];

  if (!genAI) {
    return simpleKeywords(articleText);
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: `Extract 3-8 important keywords or phrases from this news article. Focus on: people, places, organizations, events, topics. Respond with ONLY a JSON array of strings. Max 8 keywords. No markdown. Example: ["keyword1", "keyword2", "keyword3"]`,
    });

    const result = await model.generateContent(articleText.slice(0, 1500));
    const text = result.response?.text?.() || '';

    try {
      const parsed = JSON.parse(text.replace(/```json\n?|```\n?/g, '').trim());
      if (Array.isArray(parsed)) return parsed.slice(0, 8);
      return simpleKeywords(articleText);
    } catch {
      return simpleKeywords(articleText);
    }
  } catch (error) {
    console.error('❌ Keyword extraction failed:', error.message);
    return simpleKeywords(articleText);
  }
}

/**
 * Translate article to multiple languages.
 * Returns { ta: {headline, summary, article}, hi: {headline, summary, article} }
 */
async function translateArticle(article, targetLangs = ['ta', 'hi']) {
  const translations = {};

  for (const lang of targetLangs) {
    translations[lang] = { headline: '', summary: '', article: '' };
  }

  if (!genAI) return translations;

  for (const lang of targetLangs) {
    try {
      const langName = lang === 'ta' ? 'Tamil' : 'Hindi';
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        systemInstruction: `You are a professional news translator. Translate the following news article from English to ${langName}. IF the article is already in ${langName} or contains mixed languages, just clean it up. Respond with ONLY valid JSON: {"headline": "translated headline", "summary": "translated summary", "article": "translated article"}. No markdown.`,
      });

      const inputText = `Headline: ${article.headline}\nSummary: ${article.summary}\nArticle: ${(article.article || article.summary || '').slice(0, 1500)}`;
      const result = await model.generateContent(inputText);
      const text = result.response?.text?.() || '';

      try {
        const parsed = JSON.parse(text.replace(/```json\n?|```\n?/g, '').trim());
        translations[lang] = {
          headline: parsed.headline || article.headline,
          summary: parsed.summary || article.summary,
          article: parsed.article || article.article || '',
        };
      } catch {
        // Keep empty
      }
    } catch (error) {
      console.error(`❌ Translation to ${lang} failed:`, error.message);
    }
  }

  return translations;
}

/**
 * Generate a text-to-speech audio URL using a TTS service.
 * Uses a simulated URL for now (real TTS would need Google Cloud TTS / AWS Polly).
 */
async function generateTtsUrl(text, lang = 'en') {
  if (!text) return null;

  // Check if text is valid and has content
  const cleanText = text.replace(/[^\w\s.,!?-]/g, '').trim();
  if (cleanText.length < 10) return null;

  // Using a free TTS API simulation
  // For production: integrate Google Cloud TTS, AWS Polly, or ElevenLabs
  const encodedText = encodeURIComponent(cleanText.slice(0, 500));
  const langCode = lang === 'ta' ? 'ta-IN' : lang === 'hi' ? 'hi-IN' : 'en-US';

  // Using the built-in browser Speech Synthesis API instead (works offline too!)
  // The frontend will handle this natively with Web Speech API
  // This URL is for reference / future TTS integration
  return `tts:${langCode}:${cleanText.slice(0, 100).replace(/\s+/g, '-')}`;
}

// ── Fallback Utilities (no API key) ──

function extractFallbackBullets(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
  if (sentences.length === 0) return ['Read the full article for details.'];
  return sentences.slice(0, 4).map(s => s.trim() + '.');
}

function simpleSentiment(text) {
  const positiveWords = ['success', 'growth', 'win', 'launch', 'breakthrough', 'record', 'innovation', 'progress', 'achieve', 'celebrate'];
  const negativeWords = ['crisis', 'war', 'conflict', 'crash', 'decline', 'loss', 'disaster', 'threat', 'failure', 'violence'];

  const lower = text.toLowerCase();
  let score = 50;

  for (const word of positiveWords) {
    if (lower.includes(word)) score += 5;
  }
  for (const word of negativeWords) {
    if (lower.includes(word)) score -= 5;
  }

  score = Math.max(0, Math.min(100, score));
  const sentiment = score > 60 ? 'positive' : score < 40 ? 'negative' : 'neutral';
  return { sentiment, score };
}

function simpleKeywords(text) {
  const stopWords = new Set(['the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'is', 'are', 'was', 'were', 'has', 'have', 'had', 'this', 'that', 'with', 'from', 'its', 'their', 'been', 'said', 'will', 'can', 'all', 'also', 'not', 'but', 'more', 'very', 'than', 'just', 'about']);
  const words = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(w => w.length > 4 && !stopWords.has(w));
  const freq = {};
  words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 8).map(e => e[0]);
}

module.exports = {
  generateBulletSummary,
  analyzeSentiment,
  extractKeywords,
  translateArticle,
  generateTtsUrl,
};