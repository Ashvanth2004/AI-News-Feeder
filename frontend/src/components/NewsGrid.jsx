import React from 'react';

const NewsCard = ({ news, index }) => {
  const { headline, summary, timestamp, image, source, sourceIcon, link, category, isBreaking } = news;

  const formattedTime = new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  const handleCardClick = () => {
    if (link) {
      window.open(link, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      className="news-card"
      onClick={handleCardClick}
      style={{ animationDelay: `${0.05 * (index + 1)}s` }}
    >
      <div className="card-image-wrapper">
        {image ? (
          <img
            className="card-image"
            src={image}
            alt={headline}
            loading="lazy"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.parentElement.querySelector('.card-image-placeholder').style.display = 'flex';
            }}
          />
        ) : null}
        <div
          className="card-image-placeholder"
          style={{ display: image ? 'none' : 'flex' }}
        >
          📰
        </div>
        <div className="card-image-overlay">
          {isBreaking && (
            <span className="card-badge breaking">
              <span className="live-indicator-dot"></span>
              BREAKING
            </span>
          )}
          {category && (
            <span className="card-badge category">{category}</span>
          )}
        </div>
      </div>

      <div className="card-body">
        <div className="card-header">
          <span className="timestamp">
            {formattedTime}
          </span>
          <span className="live-indicator">
            <span className="live-indicator-dot"></span>
            Live
          </span>
        </div>

        <h3 className="headline">{headline}</h3>
        <p className="summary">{summary}</p>

        <div className="card-footer">
          <div className="card-source">
            {sourceIcon && (
              <img
                className="source-icon"
                src={sourceIcon}
                alt={source}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            )}
            <span>{source || 'News Source'}</span>
          </div>
          <span className="card-link">Read →</span>
        </div>
      </div>
    </div>
  );
};

const NewsGrid = ({ newsItems }) => {
  if (!newsItems || newsItems.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📡</div>
        <p>Awaiting live stream data... Submit a URL to begin.</p>
      </div>
    );
  }

  return (
    <div className="news-grid">
      {newsItems.map((news, index) => (
        <NewsCard key={news.id} news={news} index={index} />
      ))}
    </div>
  );
};

export default NewsGrid;