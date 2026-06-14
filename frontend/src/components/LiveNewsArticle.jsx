import React, { useState, useEffect } from 'react';

/**
 * LiveNewsArticle - Displays AI-generated articles from live news streams
 * Fetches from backend and receives real-time updates via props
 */
const LiveNewsArticle = ({ articles: propArticles }) => {
  const [expandedId, setExpandedId] = useState(null);
  const [localArticles, setLocalArticles] = useState([]);

  // Fetch stored articles from backend on mount
  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';
        const res = await fetch(`${BACKEND}/api/news?limit=20`);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          setLocalArticles(data.results);
        }
      } catch (err) {
        // Backend not available — that's OK, we'll get articles via Socket.IO
      }
    };
    fetchArticles();
  }, []);

  // Merge prop articles (from Socket.IO) with fetched articles
  const allArticles = [...localArticles, ...propArticles];

  // Deduplicate by _id or headline
  const seen = new Set();
  const uniqueArticles = allArticles.filter((article) => {
    const key = article._id || article.headline;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (uniqueArticles.length === 0) {
    return null; // Don't show section if no articles
  }

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Politics': 'var(--red)',
      'Technology': 'var(--blue)',
      'Business': 'var(--amber)',
      'Sports': 'var(--green)',
      'Entertainment': 'var(--purple)',
      'Health': 'var(--cyan)',
      'Science': 'var(--purple)',
      'Weather': 'var(--cyan)',
      'Local News': 'var(--amber)',
      'Crime': 'var(--red)',
      'General': 'var(--text-muted)',
    };
    return colors[category] || 'var(--text-muted)';
  };

  return (
    <section className="live-news-articles-section">
      <div className="section-header">
        <div className="section-header-left">
          <span className="section-indicator live"></span>
          <h2>AI-Generated Live Articles</h2>
        </div>
        <span className="article-count">{uniqueArticles.length} articles</span>
      </div>

      <div className="live-news-articles-list">
        {uniqueArticles.map((article) => {
          const isExpanded = expandedId === (article._id || article.headline);
          return (
            <div key={article._id || article.headline} className="live-news-article-card">
              {/* Thumbnail */}
              {article.image && (
                <div className="live-news-article-image">
                  <img
                    src={article.image}
                    alt={article.headline || 'News article'}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}

              <div className="live-news-article-content">
                {/* Meta row */}
                <div className="live-news-article-meta">
                  {article.sourceChannel && (
                    <span className="live-news-article-source">
                      📺 {article.sourceChannel}
                    </span>
                  )}
                  {article.category && (
                    <span
                      className="live-news-article-category"
                      style={{ color: getCategoryColor(article.category) }}
                    >
                      {article.category}
                    </span>
                  )}
                  <span className="live-news-article-time">
                    {formatTime(article.publishedAt || article.timestamp)}
                  </span>
                </div>

                {/* Headline */}
                <h3 className="live-news-article-headline">
                  {article.headline || 'Breaking News'}
                </h3>

                {/* Summary */}
                <p className="live-news-article-summary">
                  {article.summary || 'Processing live broadcast...'}
                </p>

                {/* Expanded Article Content */}
                {isExpanded && article.article && (
                  <div className="live-news-article-body">
                    <div className="live-news-article-divider"></div>
                    <div className="live-news-article-full-text">
                      {article.article}
                    </div>
                    {article.transcriptSnippet && (
                      <div className="live-news-article-transcript">
                        <span className="transcript-label">📝 Transcript excerpt:</span>
                        <p>{article.transcriptSnippet}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Row */}
                <div className="live-news-article-actions">
                  {article.article && (
                    <button
                      className="live-news-article-toggle"
                      onClick={() => toggleExpand(article._id || article.headline)}
                    >
                      {isExpanded ? '▲ Show Less' : '▼ Read Full Article'}
                    </button>
                  )}
                  {article.sourceUrl && (
                    <a
                      href={article.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="live-news-article-link"
                    >
                      🔗 Watch Source
                    </a>
                  )}
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