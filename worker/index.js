require('dotenv').config({ path: '../.env' });
const { Worker } = require('bullmq');
const youtubedl = require('youtube-dl-exec');
const path = require('path');
const fs = require('fs');
const http = require('http');
const OpenAI = require('openai');
const { v4: uuidv4 } = require('uuid');

// Upstash Redis connection
const connection = {
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
};

// OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
});
const USE_OPENAI = !!process.env.OPENAI_API_KEY;

// Webhook to notify API server when a new news item is ready
const API_WEBHOOK_URL = `http://127.0.0.1:${process.env.API_PORT || 3001}/webhook/worker`;

console.log('👷 Worker started, listening for jobs on BullMQ...');
if (!USE_OPENAI) {
  console.warn('⚠️ OPENAI_API_KEY not set — using mock transcription & summarization');
} else {
  console.log('✅ OpenAI API key configured');
}

// Helper: extract video ID from a YouTube URL
function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return `unknown-${uuidv4().slice(0, 8)}`;
}

// Helper: send webhook result to API server
function notifyApi(data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ event: 'news_processed', data });
    const req = http.request(API_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => responseBody += chunk);
      res.on('end', () => resolve(responseBody));
    });
    req.on('error', (err) => {
      console.warn(`⚠️ Webhook to API failed: ${err.message}`);
      resolve(null); // Don't fail the job
    });
    req.write(body);
    req.end();
  });
}

// Helper: delete temp audio file
function cleanup(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🧹 Cleaned up: ${filePath}`);
    }
  } catch (err) {
    console.warn(`⚠️ Cleanup warning: ${err.message}`);
  }
}

const worker = new Worker('videoQueue', async job => {
  let outputFilename = null;

  try {
    const { videoUrl } = job.data;
    const videoId = extractVideoId(videoUrl);
    console.log(`\n📦 Received job ID: ${job.id}`);
    console.log(`⏳ Processing video URL: ${videoUrl} (ID: ${videoId})`);

    // Create downloads directory if it doesn't exist
    const downloadDir = path.join(__dirname, 'downloads');
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir);
    }

    // 1. Download Audio
    console.log(`[Job ${job.id}] 🎧 Step 1: Downloading audio via yt-dlp...`);
    outputFilename = path.join(downloadDir, `job-${job.id}.mp3`);

    await youtubedl(videoUrl, {
      extractAudio: true,
      audioFormat: 'mp3',
      output: outputFilename,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      addHeader: [
        'referer:youtube.com',
        'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ]
    });
    console.log(`[Job ${job.id}] ✅ Audio downloaded: ${outputFilename}`);

    // 2. Transcribe Audio (Speech-to-Text)
    console.log(`[Job ${job.id}] 📝 Step 2: Transcribing audio to text...`);
    let transcript = '';

    if (USE_OPENAI) {
      // Use OpenAI Whisper API for real transcription
      const audioFile = fs.createReadStream(outputFilename);
      const transcription = await openai.audio.transcriptions.create({
        model: 'whisper-1',
        file: audioFile,
        language: 'en',
        response_format: 'text',
      });
      transcript = transcription || '';
      console.log(`[Job ${job.id}] ✅ Whisper transcription complete (${transcript.length} chars)`);
    } else {
      // Mock transcription for development
      await new Promise(resolve => setTimeout(resolve, 2000));
      transcript = `The latest news report covers significant developments in technology, politics, and global affairs. Experts analyze the impact of recent policy changes on international trade and economic growth. Meanwhile, climate scientists warn about accelerating environmental changes requiring immediate action from world leaders. In sports, the championship series continues to draw record audiences worldwide.`;
      console.log(`[Job ${job.id}] ✅ Mock transcription complete`);
    }

    // 3. Summarize with OpenAI GPT
    console.log(`[Job ${job.id}] 🧠 Step 3: Summarizing text with GPT...`);
    let headline = `Breaking: News from ${videoId}`;
    let summary = transcript.slice(0, 200) + '...';
    let category = 'General';

    if (USE_OPENAI && transcript.length > 20) {
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a news summarizer. Given a transcript from a news video, extract the key story and respond with valid JSON only (no markdown):

{
  "headline": "A concise, attention-grabbing headline (max 12 words)",
  "summary": "A 1-2 sentence summary covering the key point (max 40 words)",
  "category": "One of: Politics, Technology, Business, Sports, Entertainment, Health, Science, World, General"
}`
          },
          { role: 'user', content: `Transcript: ${transcript.slice(0, 4000)}` }
        ],
        temperature: 0.3,
        max_tokens: 300,
      });

      const responseText = completion.choices?.[0]?.message?.content || '';
      try {
        const parsed = JSON.parse(responseText.replace(/```json|```/g, '').trim());
        headline = parsed.headline || headline;
        summary = parsed.summary || summary;
        category = parsed.category || category;
        console.log(`[Job ${job.id}] ✅ GPT summary generated`);
      } catch (parseErr) {
        console.warn(`[Job ${job.id}] ⚠️ GPT JSON parse failed, using raw response`);
        headline = responseText.slice(0, 100);
        summary = responseText.slice(0, 300);
      }
    } else {
      // Mock summarization
      await new Promise(resolve => setTimeout(resolve, 1500));
      headline = `Breaking News from ${videoId}: Major Developments Unfold`;
      summary = `According to live reports from the source, significant events are taking place. The situation continues to develop as more information becomes available from official channels and eyewitness accounts.`;
      console.log(`[Job ${job.id}] ✅ Mock summary generated`);
    }

    // 4. Build result and send to API
    const result = {
      videoId,
      headline,
      summary,
      category,
      source: `YouTube Live (${videoId})`,
      timestamp: new Date().toISOString(),
      jobId: job.id,
    };

    console.log(`[Job ${job.id}] 💾 Step 4: Saving to database via API webhook...`);
    await notifyApi(result);
    console.log(`[Job ${job.id}] ✅ Result sent to API`);

    console.log(`✅ Finished processing job ${job.id} successfully!`);
    return { success: true, videoId, headline, jobId: job.id };

  } catch (error) {
    console.error(`❌ Error processing job ${job.id}:`, error);
    throw error; // Let BullMQ handle retries

  } finally {
    // Always clean up temp audio file
    if (outputFilename) {
      cleanup(outputFilename);
    }
  }

}, { connection });

worker.on('failed', (job, err) => {
  console.log(`❌ Job ${job.id} failed with: ${err.message}`);
});

worker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed successfully`);
});