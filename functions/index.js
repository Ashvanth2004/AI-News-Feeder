/**
 * Firebase Cloud Function Worker
 * 
 * Automatically triggered when a new job is added to Firestore 'jobs' collection.
 * Downloads audio → transcribes with Whisper → summarizes with GPT → saves to 'news' collection.
 * 
 * Deploy: firebase deploy --only functions
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { OpenAI } = require('openai');
const youtubedl = require('youtube-dl-exec');
const path = require('path');
const os = require('os');
const fs = require('fs');

admin.initializeApp();
const db = admin.firestore();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});
const USE_OPENAI = !!process.env.OPENAI_API_KEY;

// Extract YouTube video ID from URL
function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return `unknown-${Date.now()}`;
}

// Cleanup temp file
function cleanup(filePath) {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (err) {
    console.warn('Cleanup warning:', err.message);
  }
}

/**
 * Cloud Function triggered when a document is created in the 'jobs' collection.
 */
exports.processJob = functions.firestore
  .document('jobs/{jobId}')
  .onCreate(async (snap, context) => {
    const job = snap.data();
    const jobId = context.params.jobId;
    const videoUrl = job.videoUrl;

    console.log(`📦 Job ${jobId} started for URL: ${videoUrl}`);
    let outputFile = null;

    try {
      // Update status → processing
      await snap.ref.update({ status: 'processing', startedAt: admin.firestore.FieldValue.serverTimestamp() });

      const videoId = extractVideoId(videoUrl);
      const downloadDir = os.tmpdir();
      outputFile = path.join(downloadDir, `audio-${jobId}.mp3`);

      // 1️⃣ Download audio
      console.log(`[${jobId}] 🎧 Downloading audio...`);
      await youtubedl(videoUrl, {
        extractAudio: true,
        audioFormat: 'mp3',
        output: outputFile,
        noCheckCertificates: true,
        noWarnings: true,
        preferFreeFormats: true,
        addHeader: [
          'referer:youtube.com',
          'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ],
      });
      console.log(`[${jobId}] ✅ Audio downloaded`);

      // 2️⃣ Transcribe with Whisper
      console.log(`[${jobId}] 📝 Transcribing...`);
      let transcript = '';

      if (USE_OPENAI && fs.existsSync(outputFile)) {
        const audioStream = fs.createReadStream(outputFile);
        const transcription = await openai.audio.transcriptions.create({
          model: 'whisper-1',
          file: audioStream,
          language: 'en',
          response_format: 'text',
        });
        transcript = transcription || '';
        console.log(`[${jobId}] ✅ Whisper complete (${transcript.length} chars)`);
      } else {
        // Mock for development
        await new Promise((r) => setTimeout(r, 2000));
        transcript =
          'Live news report covering major developments in technology, politics, and global affairs. Experts analyze recent policy changes affecting international trade and economic growth. Climate scientists warn about accelerating environmental changes requiring immediate action.';
        console.log(`[${jobId}] ✅ Mock transcription complete`);
      }

      // 3️⃣ Summarize with GPT
      console.log(`[${jobId}] 🧠 Summarizing...`);
      let headline = `Breaking from ${videoId}`;
      let summary = transcript.slice(0, 200);
      let category = 'General';

      if (USE_OPENAI && transcript.length > 20) {
        const completion = await openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are a news summarizer. Given a transcript, extract the key story and respond with valid JSON only:

{
  "headline": "Concise attention-grabbing headline (max 12 words)",
  "summary": "1-2 sentence summary of key point (max 40 words)",
  "category": "Politics | Technology | Business | Sports | Entertainment | Health | Science | World | General"
}`,
            },
            { role: 'user', content: `Transcript: ${transcript.slice(0, 4000)}` },
          ],
          temperature: 0.3,
          max_tokens: 300,
        });

        const text = completion.choices?.[0]?.message?.content || '';
        try {
          const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
          headline = parsed.headline || headline;
          summary = parsed.summary || summary;
          category = parsed.category || category;
          console.log(`[${jobId}] ✅ GPT summary: ${headline}`);
        } catch {
          headline = text.slice(0, 100);
          summary = text.slice(0, 300);
        }
      } else {
        await new Promise((r) => setTimeout(r, 1500));
        console.log(`[${jobId}] ✅ Mock summary generated`);
      }

      // 4️⃣ Save result to Firestore 'news' collection
      const newsData = {
        videoId,
        videoUrl,
        headline,
        summary,
        category,
        source: `YouTube (${videoId})`,
        jobId,
        image: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        sourceIcon: `https://img.youtube.com/vi/${videoId}/default.jpg`,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection('news').add(newsData);
      console.log(`[${jobId}] ✅ Saved to Firestore 'news' collection`);

      // 5️⃣ Update job status → completed
      await snap.ref.update({
        status: 'completed',
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        headline,
      });

      console.log(`✅ Job ${jobId} completed successfully!`);
      return { success: true, jobId, headline };
    } catch (error) {
      console.error(`❌ Job ${jobId} failed:`, error.message);
      await snap.ref.update({
        status: 'failed',
        error: error.message,
        failedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { success: false, jobId, error: error.message };
    } finally {
      if (outputFile) cleanup(outputFile);
    }
  });