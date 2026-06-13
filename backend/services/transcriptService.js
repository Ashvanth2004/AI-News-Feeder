/**
 * Phase 2: Extract Transcripts/Captions from YouTube Live Streams
 * 
 * Option A (Recommended): Get YouTube live captions (fast, accurate, low cost)
 * Option B (Fallback): Download 30-second audio chunk → Whisper transcription
 */

const axios = require('axios');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Extract live captions from a YouTube video using the innertube API.
 * This reads the YouTube auto-generated captions (if available).
 */
async function getYouTubeCaptions(videoId) {
  try {
    // Get the video page to extract caption track URLs
    const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await axios.get(pageUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9,ta;q=0.8,hi;q=0.7',
      },
    });

    const html = response.data;
    
    // Extract caption tracks from the ytInitialPlayerResponse
    const captionMatch = html.match(/"captions":\s*\{[^}]*"captionTracks":\s*(\[.*?\])/);
    if (!captionMatch) {
      console.log(`No captions found for video ${videoId}`);
      return null;
    }

    const captionTracks = JSON.parse(captionMatch[1]);
    if (!captionTracks || captionTracks.length === 0) {
      return null;
    }

    // Prefer auto-generated captions
    let captionUrl = null;
    for (const track of captionTracks) {
      if (track.kind === 'asr') {
        captionUrl = track.baseUrl;
        break;
      }
    }
    // Fallback to first available caption
    if (!captionUrl && captionTracks.length > 0) {
      captionUrl = captionTracks[0].baseUrl;
    }

    if (!captionUrl) return null;

    // Add params for plain text output
    const fullUrl = `${captionUrl}&fmt=json3`;
    const captionResponse = await axios.get(fullUrl, { timeout: 8000 });
    const captionData = captionResponse.data;

    // Extract text from the caption events
    let transcript = '';
    if (captionData && captionData.events) {
      for (const event of captionData.events) {
        if (event.segs) {
          for (const seg of event.segs) {
            transcript += seg.utf8 || '';
          }
        }
      }
    }

    // Clean up the transcript
    transcript = transcript.replace(/\n+/g, ' ').trim();

    // Get the last ~500 characters (most recent content)
    const recentText = transcript.slice(-500);
    return recentText || null;

  } catch (error) {
    console.error(`Error extracting captions for ${videoId}:`, error.message);
    return null;
  }
}

/**
 * Download a short audio chunk from a YouTube live stream using yt-dlp.
 * This is the fallback when captions are not available.
 */
async function downloadAudioChunk(videoId, duration = 30) {
  const tempDir = os.tmpdir();
  const outputFile = path.join(tempDir, `yt_audio_${videoId}_${Date.now()}.mp3`);

  return new Promise((resolve, reject) => {
    const command = `yt-dlp --no-playlist -x --audio-format mp3 --postprocessor-args "-t ${duration}" -o "${outputFile}" "https://www.youtube.com/watch?v=${videoId}"`;

    exec(command, { timeout: 60000 }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Audio download error for ${videoId}:`, error.message);
        reject(error);
        return;
      }
      if (fs.existsSync(outputFile)) {
        resolve(outputFile);
      } else {
        reject(new Error('Audio file not created'));
      }
    });
  });
}

/**
 * Main function: Get transcript from a live YouTube stream.
 * Tries captions first, falls back to audio download.
 */
async function getTranscript(videoId, channelName) {
  console.log(`📝 Getting transcript for ${channelName} (${videoId})...`);

  // Option A: Try captions first (fast & free)
  const captionTranscript = await getYouTubeCaptions(videoId);
  if (captionTranscript && captionTranscript.length > 50) {
    console.log(`✅ Got ${captionTranscript.length} chars from captions`);
    return { transcript: captionTranscript, source: 'captions' };
  }

  // Option B: Fallback to audio download (needs Whisper or similar)
  console.log(`⚠️ No captions available, would use audio fallback`);
  return {
    transcript: null,
    source: 'none',
    note: 'Captions unavailable; configure OPENAI_API_KEY for audio fallback',
  };
}

module.exports = { getYouTubeCaptions, getTranscript, downloadAudioChunk };