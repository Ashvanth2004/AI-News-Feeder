import { useState, useEffect, useCallback } from 'react';

const LANG_MAP = { en: 'EN', ta: 'த', hi: 'ह' };
const CAT_COLORS = { Politics: 'var(--red)', Technology: 'var(--accent-1)', Business: 'var(--amber)', Sports: 'var(--green)', Entertainment: 'var(--accent-3)', Health: 'var(--accent-2)', Science: 'var(--purple)', Weather: 'var(--accent-2)' };
const SENT_EMOJI = { positive: '🟢', negative: '🔴', neutral: '⚪' };
const formatTime = d => { if (!d) return ''; const diff = Date.now() - new Date(d).getTime(); const m = Math.floor(diff/60000); const h = Math.floor(m/60); return m<1 ? 'Just now' : m<60 ? `${m}m ago` : h<24 ? `${h}h ago` : new Date(d).toLocaleDateString('en-IN', {day:'numeric',month:'short'}); };
const getColor = c => CAT_COLORS[c] || 'var(--text-muted)';

const LiveNewsArticle = ({ articles: propArticles }) => {
  const [expanded, setExpanded] = useState(null);
  const [locals, setLocals] = useState([]);
  const [summaries, setSummaries] = useState({});
  const [sentiments, setSentiments] = useState({});
  const [translations, setTranslations] = useState({});
  const [currentLang, setCurrentLang] = useState({});
  const [speaking, setSpeaking] = useState({});
  const [loading, setLoading] = useState({});
  const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${BACKEND}/api/news?limit=20`);
        const data = await res.json();
        if (data.results?.length) {
          setLocals(data.results);
          data.results.forEach(a => {
            if (a.summaryBullets?.length) setSummaries(p => ({...p, [a._id]: a.summaryBullets}));
            if (a.sentiment) setSentiments(p => ({...p, [a._id]: {sentiment:a.sentiment, score:a.sentimentScore}}));
            if (a.translations && Object.keys(a.translations).length) setTranslations(p => ({...p, [a._id]: a.translations}));
          });
        }
      } catch {}
    })();
  }, []);

  const all = [...locals, ...propArticles];
  const seen = new Set();
  const articles = all.filter(a => { const k = a._id || a.headline; if (seen.has(k)) return false; seen.add(k); return true; });
  const toggle = useCallback(id => { 
    if (expanded !== id) fetch(`${BACKEND}/api/news/${id}/read`, {method:'POST'}).catch(()=>{});
    setExpanded(expanded === id ? null : id);
  }, [expanded]);

  const fetchSummary = async id => {
    if (summaries[id]) return;
    setLoading(p => ({...p, [`s-${id}`]: true}));
    try { const res = await fetch(`${BACKEND}/api/news/${id}/summarize`, {method:'POST'}); const d = await res.json(); if (d.bullets?.length) setSummaries(p => ({...p, [id]: d.bullets})); } catch {}
    setLoading(p => ({...p, [`s-${id}`]: false}));
  };

  const fetchSentiment = async id => {
    if (sentiments[id]) return;
    setLoading(p => ({...p, [`se-${id}`]: true}));
    try { const res = await fetch(`${BACKEND}/api/news/${id}/sentiment`, {method:'POST'}); const d = await res.json(); setSentiments(p => ({...p, [id]: {sentiment:d.sentiment, score:d.score}})); } catch {}
    setLoading(p => ({...p, [`se-${id}`]: false}));
  };

  const fetchTranslation = async (id, lang) => {
    setLoading(p => ({...p, [`t-${id}-${lang}`]: true}));
    try {
      const res = await fetch(`${BACKEND}/api/news/${id}/translate`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({languages:[lang]})});
      const d = await res.json();
      setTranslations(p => ({...p, [id]: {...p[id], ...d.translations}}));
      setCurrentLang(p => ({...p, [id]: lang}));
    } catch {}
    setLoading(p => ({...p, [`t-${id}-${lang}`]: false}));
  };

  const speak = (id, text, lang='en') => {
    if (speaking[id]) { window.speechSynthesis.cancel(); setSpeaking(p => ({...p, [id]: false})); return; }
    const u = new SpeechSynthesisUtterance(text.slice(0,500));
    u.lang = lang === 'ta' ? 'ta-IN' : lang === 'hi' ? 'hi-IN' : 'en-US';
    u.rate = 0.9; u.onend = () => setSpeaking(p => ({...p, [id]: false}));
    window.speechSynthesis.speak(u);
    setSpeaking(p => ({...p, [id]: true}));
  };

  if (!articles.length) return null;

  return (
    <section className="live-news-articles-section">
      <div className="section-header">
        <div className="section-header-left">
          <span className="section-indicator live"></span>
          <h2>AI-Generated Live Articles</h2>
        </div>
        <span className="article-count">{articles.length} articles</span>
      </div>
      <div className="live-news-articles-list">
        {articles.map(article => {
          const id = article._id || article.headline;
          const isEx = expanded === id;
          const sent = sentiments[id];
          const sum = summaries[id];
          const trans = translations[id];
          const lang = currentLang[id] || 'en';
          const disp = lang === 'en' ? article : { headline: trans?.[lang]?.headline || article.headline, summary: trans?.[lang]?.summary || article.summary, article: trans?.[lang]?.article || article.article };

          return (
            <div key={id} className={`live-news-article-card ${isEx ? 'expanded' : ''}`}>
              {article.image && (
                <div className="live-news-article-image">
                  <img src={article.image} alt="" onError={e => e.target.style.display='none'} />
                </div>
              )}
              <div className="live-news-article-content">
                <div className="live-news-article-meta">
                  {article.sourceChannel && <span className="live-news-article-source">📺 {article.sourceChannel}</span>}
                  {article.category && <span className="live-news-article-category" style={{color: getColor(article.category)}}>{article.category}</span>}
                  <span className="live-news-article-time">{formatTime(article.publishedAt || article.timestamp)}</span>
                </div>
                <h3 className="live-news-article-headline">{disp.headline || 'Breaking News'}</h3>
                <p className="live-news-article-summary">{disp.summary || 'Processing...'}</p>

                {isEx && sum?.length > 0 && (
                  <div className="live-news-article-bullets">
                    <span className="bullet-label">📌 Quick Summary</span>
                    <ul className="bullet-list">{sum.map((p, i) => <li key={i}>{p}</li>)}</ul>
                  </div>
                )}
                {isEx && loading[`s-${id}`] && <div className="live-news-article-loading"><span className="loading-dot"></span> Generating summary...</div>}

                {isEx && disp.article && (
                  <div className="live-news-article-body">
                    <div className="live-news-article-divider"></div>
                    <div className="live-news-article-full-text">{disp.article}</div>
                  </div>
                )}

                <div className="live-news-article-actions">
                  {disp.article && (
                    <button className="live-news-article-toggle" onClick={() => { toggle(id); if (!isEx) { fetchSummary(id); fetchSentiment(id); } }}>
                      {isEx ? '▲ Show Less' : '▼ Read Full Article'}
                    </button>
                  )}
                  {sent && <span className={`sentiment-badge ${sent.sentiment}`}>{SENT_EMOJI[sent.sentiment]} {sent.sentiment}</span>}
                  {disp.summary && (
                    <button className={`tts-button ${speaking[id] ? 'speaking' : ''}`} onClick={() => speak(id, disp.summary + (disp.article ? '. ' + disp.article.slice(0,400) : ''), lang)}>
                      {speaking[id] ? '⏹' : '🔊'}
                    </button>
                  )}
                  <div className="language-switcher">
                    {['en','ta','hi'].map(l => {
                      const existing = trans?.[l]?.headline;
                      const isLoading = loading[`t-${id}-${l}`];
                      return (
                        <button key={l} className={`lang-btn ${lang === l ? 'active' : ''} ${existing || l === 'en' ? '' : 'unavailable'}`}
                          onClick={() => l === 'en' ? setCurrentLang(p => ({...p, [id]: 'en'})) : existing ? setCurrentLang(p => ({...p, [id]: l})) : !isLoading && fetchTranslation(id, l)}
                          disabled={isLoading}>{isLoading ? '...' : LANG_MAP[l]}
                        </button>
                      );
                    })}
                  </div>
                  {article.sourceUrl && <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer" className="live-news-article-link">🔗 Watch Source</a>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default LiveNewsArticle;