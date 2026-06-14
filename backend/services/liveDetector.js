/**
 * Phase 1: Detect Live YouTube Videos
 * 
 * Every 1 minute, checks if configured YouTube channels are currently live.
 * Uses the YouTube oEmbed API and HTML scraping to detect live streams.
 * Automatically fetches the current live video ID from each channel.
 */

const axios = require('axios');
const cheerio = require('cheerio');

// List of YouTube channels to monitor for live streams
const CHANNELS = [
  // Tamil News Channels
  {
    channelName: 'Polimer News',
    channelUrl: 'https://www.youtube.com/@PolimerNews',
    videoId: 'vb72Ot79JrQ',
    language: 'ta',
  },
  {
    channelName: 'Thanthi TV',
    channelUrl: 'https://www.youtube.com/@ThanthiTV',
    videoId: '5TVd_iBhqTc',
    language: 'ta',
  },
  {
    channelName: 'News Tamil 24x7',
    channelUrl: 'https://www.youtube.com/@NewsTamil24x7',
    videoId: '1r8SULpEOak',
    language: 'ta',
  },
  {
    channelName: 'Puthiya Thalaimurai',
    channelUrl: 'https://www.youtube.com/@PuthiyaThalaimurai',
    videoId: 'pkFDQL4KG9I',
    language: 'ta',
  },
  // Hindi News Channels
  {
    channelName: 'NDTV India',
    channelUrl: 'https://www.youtube.com/@NDTVIndia',
    videoId: 'MN8p-Vrn6G0',
    language: 'hi',
  },
  {
    channelName: 'Republic Bharat',
    channelUrl: 'https://www.youtube.com/@RepublicBharat',
    videoId: 'utAPTeEAapM',
    language: 'hi',
  },
  {
    channelName: 'ABP News',
    channelUrl: 'https://www.youtube.com/@ABPNews',
    videoId: 'LqhlHAex09Y',
    language: 'hi',
  },
  {
    channelName: 'Aaj Tak',
    channelUrl: 'https://www.youtube.com/@aaboratory',
    videoId: 'Tl1mKd1Rz7A',
    language: 'hi',
  },
  // English News Channels
  {
    channelName: 'Times Now',
    channelUrl: 'https://www.youtube.com/@TimesNow',
    videoId: 'vfHN5oUEQ5U',
    language: 'en',
  },
  // 3 New Indian News Channels
  {
    channelName: 'India Today',
    channelUrl: 'https://www.youtube.com/@IndiaToday',
    videoId: 'X8r2R31Bx5k',
    language: 'en',
  },
  {
    channelName: 'NDTV 24x7',
    channelUrl: 'https://www.youtube.com/@ndtv',
    videoId: 'VjJNjDkF7Uo',
    language: 'en',
  },
  {
    channelName: 'Zee News',
    channelUrl: 'https://www.youtube.com/@ZeeNews',
    videoId: 'kWfz9Tf0FkA',
    language: 'hi',
  },
];

// Cache to track which channels are currently live
const liveCache = new Map();

// Cache for dynamically discovered live video IDs
const liveVideoCache = new Map();

/**
 * Try to scrape the current live video ID from a YouTube channel page.
 * Checks for the "LIVE" badge on videos on the channel's homepage.
 */
async function fetchCurrentLiveVideoId(channelUrl) {
  try {
    // Try the channel's /live page first
    const livePageUrl = channelUrl.endsWith('/live') 
      ? channelUrl 
      : `${channelUrl}/live`;
    
    const response = await axios.get(channelUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Look for live video indicators in the page
    // Method 1: Find video links with "live" badge
    let liveVideoId = null;

    // Check ytInitialData for live streams
    const ytDataMatch = html.match(/var ytInitialData = ({.*?});/s);
    if (ytDataMatch) {
      try {
        const ytData = JSON.parse(ytDataMatch[1]);
        const tabs = ytData?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
        
        for (const tab of tabs) {
          const content = tab?.tabRenderer?.content;
          if (content?.richGridRenderer?.contents) {
            for (const item of content.richGridRenderer.contents) {
              const video = item?.richItemRenderer?.content?.videoRenderer;
              if (video) {
                // Check if this video is live
                const badges = video.badges || [];
                const isLive = badges.some(b => 
                  b?.metadataBadgeRenderer?.label?.toLowerCase().includes('live')
                );
                const isLiveNow = video?.thumbnailOverlays?.some(o =>
                  o?.thumbnailOverlayTimeStatusRenderer?.style?.includes('LIVE')
                );
                
                if (isLive || isLiveNow) {
                  liveVideoId = video.videoId;
                  break;
                }
              }
            }
          }
          if (liveVideoId) break;
        }
      } catch (parseErr) {
        // JSON parse failed, fall through to regex methods
      }
    }

    // Method 2: Regex fallback - find any video with live indicator
    if (!liveVideoId) {
      const liveMatch = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"[^}]*?"label":"LIVE"/);
      if (liveMatch) {
        liveVideoId = liveMatch[1];
      }
    }

    // Method 3: Look for the first video on the channel (likely the live one)
    if (!liveVideoId) {
      const videoMatch = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
      if (videoMatch) {
        liveVideoId = videoMatch[1];
      }
    }

    return liveVideoId;
  } catch (error) {
    console.error(`Error fetching live video from channel:`, error.message);
    return null;
  }
}

/**
 * Get the current live video ID for a channel, with caching.
 * Returns the dynamically discovered ID or falls back to the configured one.
 */
async function getCurrentLiveVideoId(channel) {
  const cacheKey = channel.channelUrl;
  const cached = liveVideoCache.get(cacheKey);
  
  // Use cached live video ID if recent (refresh every 5 minutes)
  if (cached && (Date.now() - cached.timestamp < 5 * 60 * 1000)) {
    return cached.videoId;
  }

  // Try to fetch the current live video dynamically
  const dynamicId = await fetchCurrentLiveVideoId(channel.channelUrl);
  
  if (dynamicId) {
    liveVideoCache.set(cacheKey, { videoId: dynamicId, timestamp: Date.now() });
    console.log(`📡 Dynamically found live video for ${channel.channelName}: ${dynamicId}`);
    return dynamicId;
  }

  // Fall back to the configured video ID
  return channel.videoId;
}

/**
 * Check if a YouTube video (by ID) is currently livestreaming.
 * Uses the YouTube oEmbed endpoint + fallback to page scraping.
 */
async function isVideoLive(videoId) {
  try {
    // Method 1: Try to get video info via oEmbed
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await axios.get(oembedUrl, { timeout: 5000 });
    
    // If we get a response, the video exists
    // Now check if it's live via the YouTube page
    const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const pageResponse = await axios.get(pageUrl, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const html = pageResponse.data;

    // Check for "isLive" in the page data
    const isLiveMatch = html.match(/"isLive"?\s*:\s*true/i);
    const isLiveContent = html.match(/isLiveContent"?\s*:\s*true/i);
    const badgeText = html.match(/"label"\s*:\s*"LIVE"/i);

    const isLive = !!(isLiveMatch || isLiveContent || badgeText);
    return isLive;

  } catch (error) {
    // If oEmbed fails, try the direct scraping method
    try {
      const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const pageResponse = await axios.get(pageUrl, {
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
      const html = pageResponse.data;
      const isLive = html.includes('"isLive":true') || 
                     html.includes('isLiveContent') ||
                     html.includes('"isLive": true');
      return isLive;
    } catch {
      // If we can't check, assume it's live (our known channels are always streaming)
      return true;
    }
  }
}

/**
 * Check all channels and return a list of currently live channels.
 * Automatically discovers the current live video ID for each channel.
 */
async function checkLiveChannels() {
  const liveChannels = [];

  for (const channel of CHANNELS) {
    try {
      // Get the current live video ID (dynamically or from config)
      const currentVideoId = await getCurrentLiveVideoId(channel);
      
      if (!currentVideoId) continue;

      const isLive = await isVideoLive(currentVideoId);
      
      if (isLive) {
        // Check if this is a new live event (not previously detected)
        const lastDetected = liveCache.get(channel.channelUrl);
        const now = Date.now();
        
        if (!lastDetected || (now - lastDetected > 60000)) {
          // New live event detected
          liveChannels.push({
            ...channel,
            videoId: currentVideoId, // Use the dynamically discovered ID
          });
          liveCache.set(channel.channelUrl, now);
          console.log(`🔴 LIVE DETECTED: ${channel.channelName} (${currentVideoId})`);
        }
      }
    } catch (error) {
      console.error(`Error checking ${channel.channelName}:`, error.message);
    }
  }

  return liveChannels;
}

module.exports = { CHANNELS, checkLiveChannels, isVideoLive, getCurrentLiveVideoId };