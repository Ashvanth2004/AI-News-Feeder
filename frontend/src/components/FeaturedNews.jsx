import React from 'react';

const FeaturedNews = ({ article }) => {
  const { headline, summary, timestamp, image, source, sourceIcon, link, category } = article;

  const formattedTime = new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  const formattedDate = new Date(timestamp).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="featured-news">
      {image && (
        <img
          className="featured-background"
          src={image}
          alt={headline}
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      )}
      <div className="featured-overlay"></div>

      <div className="featured-content">
        <div className="featured-content-top">
          <span className="featured-category">
            {category ? category.toUpperCase() : 'TOP STORY'}
          </span>
          <span className="featured-time">{formattedTime} • {formattedDate}</span>
        </div>

        <h2 className="featured-headline">{headline}</h2>
        <p className="featured-summary">{summary}</p>

        <div className="featured-meta">
          <div className="featured-source">
            {sourceIcon && (
              <img
                className="featured-source-icon"
                src={sourceIcon}
                alt={source}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            )}
            <span>{source || 'News Source'}</span>
          </div>

          {link && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="featured-read-more"
              onClick={(e) => e.stopPropagation()}
            >
              Read Full Story →
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeaturedNews;