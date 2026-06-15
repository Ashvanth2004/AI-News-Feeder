import { useState, useEffect } from 'react';
import { io as socketIO } from 'socket.io-client';
import Header from './components/Header';
import NewsGrid from './components/NewsGrid';
import NewsSlideshow from './components/NewsSlideshow';
import LiveStreamPanel, { LIVE_CHANNELS } from './components/LiveStreamPanel';
import LiveTicker from './components/LiveTicker';
import LiveNewsArticle from './components/LiveNewsArticle';
import './App.css';

const App = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';

  const buildChannelNews = () => LIVE_CHANNELS.map((c, i) => ({
    id: `live-${c.id}`, headline: `${c.name} — Live News Stream`,
    summary: `Watch ${c.name} live for the latest breaking news.`,
    timestamp: new Date().toISOString(),
    image: `https://img.youtube.com/vi/${c.videoId}/maxresdefault.jpg`,
    source: c.name, sourceUrl: `https://www.youtube.com/watch?v=${c.videoId}`,
    link: `https://www.youtube.com/watch?v=${c.videoId}`,
    category: 'LIVE', language: 'tamil', country: ['india'],
    isBreaking: i === 0, isLiveStream: true, videoId: c.videoId, index: -1,
  }));

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch("https://newsdata.io/api/1/latest?apikey=pub_e1153ec2e6914acd88c36bc47f0a57d3&country=in");
        const data = await res.json();
        const formatted = data.status === "success" && data.results
          ? data.results.filter(a => !a.country || [].concat(a.country).some(c => c.toLowerCase().includes('india')))
            .map((a, i) => ({ id: a.article_id, headline: a.title, summary: a.description || 'Read more...', timestamp: a.pubDate, image: a.image_url, source: a.source_name, link: a.link, category: Array.isArray(a.category) ? a.category[0] : a.category || 'news', isBreaking: i === 0, index: i }))
          : [];
        setNews([...buildChannelNews(), ...formatted]);
      } catch { setNews(buildChannelNews()); }
      finally { setLoading(false); }
    };
    fetchNews();
  }, []);

  useEffect(() => {
    const socket = socketIO(BACKEND, { transports: ['websocket', 'polling'], reconnectionAttempts: 5 });
    socket.on('new-article', article => setNews(prev => [{
      id: `a-${article._id || Date.now()}`, _id: article._id,
      headline: article.headline || 'Breaking', summary: article.summary || '',
      timestamp: article.publishedAt || new Date().toISOString(),
      image: article.image, source: article.sourceChannel || 'AI',
      link: article.sourceUrl || `https://youtube.com/watch?v=${article.videoId}`,
      category: article.category || 'AI Generated', isBreaking: true,
    }, ...prev]));
    socket.on('article-expired', id => setNews(prev => prev.filter(i => i._id !== id && i.id !== `a-${id}`)));
    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${BACKEND}/api/news?limit=50`);
        const data = await res.json();
        if (data.results?.length) {
          const items = data.results.map((item, i) => ({
            id: `b-${item._id}`, _id: item._id,
            headline: item.headline, summary: item.summary,
            timestamp: item.publishedAt || item.createdAt,
            image: item.image || `https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg`,
            source: item.source || 'AI Pipeline', category: item.category || 'AI Generated',
            isBreaking: i === 0, index: i,
          }));
          setNews(prev => [...items.filter(i => !prev.some(p => p.id === i.id)), ...prev]);
        }
      } catch {}
    })();
  }, []);

  const gridNews = news.slice(8);
  const aiArticles = news.filter(i => i.category === 'AI Generated' || i.isBreaking);

  return (
    <>
      <div className="app-container">
        <Header />
        <main className="main-content">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Fetching latest news...</p>
            </div>
          ) : (
            <>
              <NewsSlideshow articles={news} />
              <LiveStreamPanel />
              <LiveNewsArticle articles={aiArticles} />
              <section className="news-section">
                <div className="section-header">
                  <div className="section-header-left">
                    <span className="section-indicator"></span>
                    <h2>Latest Headlines</h2>
                  </div>
                  <span className="article-count">{news.length} articles</span>
                </div>
                <NewsGrid newsItems={gridNews} />
              </section>
            </>
          )}
        </main>
      </div>
      <LiveTicker newsItems={news} />
    </>
  );
};

export default App;