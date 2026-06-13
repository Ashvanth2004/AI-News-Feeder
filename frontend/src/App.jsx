import { useState, useEffect } from 'react';
import { io as socketIO } from 'socket.io-client';
import Header from './components/Header';
import NewsGrid from './components/NewsGrid';
import NewsSlideshow from './components/NewsSlideshow';
import LiveStreamPanel, { LIVE_CHANNELS } from './components/LiveStreamPanel';
import LiveTicker from './components/LiveTicker';
import './App.css';

function App() {
  const [newsItems, setNewsItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Build live channel news articles from LIVE_CHANNELS
  const buildChannelNews = () => {
    const now = new Date().toISOString();
    const headlines = {
      polimer: 'Polimer News — Tamil Nadu Breaking News & Live Updates',
      thanthi: 'Thanthi TV — Latest Tamil News Headlines Today',
      newsTamil: 'News Tamil 24x7 — Continuous Tamil News Coverage',
      puthiyaThalaimurai: 'Puthiya Thalaimurai — Tamil News & Current Affairs',
      ndtv: 'NDTV India — Top Hindi News Stories Live',
      republic: 'Republic Bharat — Breaking News in Hindi',
      abp: 'ABP News — Hindi News Live Updates',
      timesNow: 'Times Now — English News Breaking Updates',
    };
    const summaries = {
      polimer: 'Watch Polimer News live for the latest breaking news, political updates, and current affairs from Tamil Nadu.',
      thanthi: 'Thanthi TV brings you continuous live coverage of Tamil news, politics, sports, and entertainment.',
      newsTamil: 'Stay informed with News Tamil 24x7 live stream covering Tamil Nadu news and national headlines.',
      puthiyaThalaimurai: 'Puthiya Thalaimurai provides in-depth news analysis, breaking stories, and live debates.',
      ndtv: 'NDTV India offers comprehensive Hindi news coverage with live reports and breaking news alerts.',
      republic: 'Republic Bharat delivers hard-hitting Hindi news, debates, and exclusive breaking stories.',
      abp: 'ABP News brings you the latest Hindi news, political updates, and live coverage of major events.',
      timesNow: 'Times Now provides fast-paced English news coverage with breaking news and expert analysis.',
    };

    return LIVE_CHANNELS.map((channel, index) => ({
      id: `live-${channel.id}`,
      headline: headlines[channel.id] || `${channel.name} — Live News Stream`,
      summary: summaries[channel.id] || `Watch ${channel.name} live for the latest news updates and breaking stories.`,
      timestamp: now,
      image: `https://img.youtube.com/vi/${channel.videoId}/maxresdefault.jpg`,
      source: channel.name,
      sourceIcon: `https://img.youtube.com/vi/${channel.videoId}/mqdefault.jpg`,
      sourceUrl: `https://www.youtube.com/watch?v=${channel.videoId}`,
      link: `https://www.youtube.com/watch?v=${channel.videoId}`,
      category: 'LIVE',
      language: channel.id === 'timesNow' ? 'english' : 'tamil',
      country: ['india'],
      isBreaking: index === 0,
      isLiveStream: true,
      videoId: channel.videoId,
      index: -1, // placed at top
    }));
  };

  // Fetch real news from the NewsData.io API on load
  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await fetch(
          "https://newsdata.io/api/1/latest?apikey=pub_e1153ec2e6914acd88c36bc47f0a57d3"
        );
        const data = await response.json();

        if (data.status === "success" && data.results) {
          const formattedNews = data.results.map((article, index) => ({
            id: article.article_id,
            headline: article.title,
            summary: article.description || 'Click to read the full story...',
            timestamp: article.pubDate,
            image: article.image_url,
            source: article.source_name,
            sourceIcon: article.source_icon,
            sourceUrl: article.source_url,
            link: article.link,
            category: article.category ? (Array.isArray(article.category) ? article.category[0] : article.category) : 'news',
            language: article.language,
            country: article.country,
            isBreaking: index === 0,
            index
          }));

          // Merge live channel news at the top, then API news
          const channelNews = buildChannelNews();
          const merged = [...channelNews, ...formattedNews];
          setNewsItems(merged);
        } else {
          // No API data — show just channel news
          setNewsItems(buildChannelNews());
        }
      } catch (error) {
        console.error('Error fetching news:', error);
        // On error, still show channel news
        setNewsItems(buildChannelNews());
      } finally {
        setIsLoading(false);
      }
    };

    fetchNews();
  }, []);

  // Real-time updates via Socket.IO from backend
  useEffect(() => {
    const BACKEND_URL = 'http://localhost:3002';
    const socket = socketIO(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('🔌 Connected to backend via Socket.IO');
    });

    socket.on('new-article', (article) => {
      console.log('📰 Live AI article received:', article.headline);
      const newItem = {
        id: `new-article-${article._id || Date.now()}`,
        _id: article._id,
        headline: article.headline || 'Breaking News',
        summary: article.summary || 'New article processed from live stream',
        article: article.article || '',
        timestamp: article.publishedAt || new Date().toISOString(),
        image: article.image || null,
        source: article.sourceChannel || 'AI Pipeline',
        sourceIcon: article.image || null,
        sourceUrl: article.sourceUrl || `https://www.youtube.com/watch?v=${article.videoId || ''}`,
        link: article.sourceUrl || `https://www.youtube.com/watch?v=${article.videoId || ''}`,
        category: article.category || 'AI Generated',
        isBreaking: true,
        isLiveStream: false,
        index: -1,
      };
      setNewsItems(prev => [newItem, ...prev]);
    });

    // Remove expired articles from the UI
    socket.on('article-expired', (articleId) => {
      console.log('🗑️ Article expired:', articleId);
      setNewsItems(prev => prev.filter(item => item._id !== articleId && item.id !== `new-article-${articleId}`));
    });

    socket.on('disconnect', () => {
      console.log('🔌 Disconnected from backend');
    });

    socket.on('connect_error', () => {
      console.warn('⚠️ Backend not available — Socket.IO disabled');
    });

    return () => socket.disconnect();
  }, []);

  // Also try to fetch stored news from backend API on load
  useEffect(() => {
    const fetchBackendNews = async () => {
      try {
        const res = await fetch('http://localhost:3002/api/news?limit=50');
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const items = data.results.map((item, index) => ({
            id: `backend-${item._id}`,
            headline: item.headline,
            summary: item.summary,
            timestamp: item.publishedAt || item.createdAt,
            image: item.image || `https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg`,
            source: item.source || 'AI Pipeline',
            sourceIcon: item.image || null,
            sourceUrl: `https://www.youtube.com/watch?v=${item.videoId || ''}`,
            link: `https://www.youtube.com/watch?v=${item.videoId || ''}`,
            category: item.category || 'AI Generated',
            isBreaking: index === 0,
            isLiveStream: false,
            index,
          }));
          setNewsItems(prev => {
            const existingIds = new Set(prev.map(i => i.id));
            const newItems = items.filter(i => !existingIds.has(i.id));
            return [...newItems, ...prev];
          });
          console.log(`📋 Fetched ${items.length} stored news items from backend`);
        }
      } catch (err) {
        console.warn('⚠️ Backend API not available:', err.message);
      }
    };
    fetchBackendNews();
  }, []);

  const gridNews = newsItems.length > 1 ? newsItems.slice(8) : [];
  // Slideshow uses the top 8 articles

  return (
    <>
      <div className="app-container">
        <Header />

        <main className="main-content">
          {isLoading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Fetching latest news from around the world...</p>
            </div>
          ) : (
            <>
              <NewsSlideshow articles={newsItems} />

              <LiveStreamPanel />

              <section className="news-section">
                <div className="section-header">
                  <div className="section-header-left">
                    <span className="section-indicator"></span>
                    <h2>Latest Headlines</h2>
                  </div>
                  <span className="article-count">{newsItems.length} articles</span>
                </div>
                <NewsGrid newsItems={gridNews} />
              </section>
            </>
          )}
        </main>
      </div>

      <LiveTicker newsItems={newsItems} />
    </>
  );
}

export default App;