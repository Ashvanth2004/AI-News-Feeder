import React, { useState, useEffect, useCallback } from 'react';

const NewsSlideshow = ({ articles }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const topArticles = articles.slice(0, 8); // Show top 8 as slides for more variety

  const goToSlide = useCallback((index) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex(index);
    setTimeout(() => setIsTransitioning(false), 600);
  }, [isTransitioning]);

  const goToPrev = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev === 0 ? topArticles.length - 1 : prev - 1));
    setTimeout(() => setIsTransitioning(false), 600);
  }, [topArticles.length, isTransitioning]);

  const goToNext = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev === topArticles.length - 1 ? 0 : prev + 1));
    setTimeout(() => setIsTransitioning(false), 600);
  }, [topArticles.length, isTransitioning]);

  // Auto-advance every 4 seconds (faster for hero auto-slide effect)
  useEffect(() => {
    if (isPaused || topArticles.length <= 1) return;
    const interval = setInterval(() => {
      goToNext();
    }, 4000);
    return () => clearInterval(interval);
  }, [isPaused, goToNext, topArticles.length]);

  if (!topArticles || topArticles.length === 0) return null;

  const article = topArticles[currentIndex];

  const { headline, summary, timestamp, image, source, sourceIcon, link, category, isBreaking } = article;

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
    <div
      className="slideshow-container"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Slide */}
      <div className={`slideshow-slide ${isTransitioning ? 'transitioning' : ''}`}>
        {image && (
          <>
            <img
              className="slideshow-background"
              src={image}
              alt={headline}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div className="slideshow-image-overlay-glow"></div>
          </>
        )}
        <div className="slideshow-overlay"></div>

        <div className="slideshow-content">
          <div className="slideshow-content-top">
            <span className="slideshow-category">
              {category ? category.toUpperCase() : 'TOP STORY'}
            </span>
            <span className="slideshow-time">{formattedTime} • {formattedDate}</span>
            {isBreaking && <span className="slideshow-breaking">BREAKING</span>}
          </div>

          <h2 className="slideshow-headline">{headline}</h2>
          <p className="slideshow-summary">{summary}</p>

          <div className="slideshow-meta">
            <div className="slideshow-source">
              {sourceIcon && (
                <img
                  className="slideshow-source-icon"
                  src={sourceIcon}
                  alt={source}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )}
              <span>{source || 'News Source'}</span>
            </div>

            {link && (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="slideshow-read-more"
                onClick={(e) => e.stopPropagation()}
              >
                Watch Live Stream →
              </a>
            )}
          </div>
        </div>

        {/* Navigation arrows */}
        {topArticles.length > 1 && (
          <>
            <button className="slideshow-arrow slideshow-arrow-prev" onClick={goToPrev}>
              ‹
            </button>
            <button className="slideshow-arrow slideshow-arrow-next" onClick={goToNext}>
              ›
            </button>
          </>
        )}
      </div>

      {/* Progress bar for auto-slide */}
      {topArticles.length > 1 && (
        <div className="slideshow-progress-bar">
          {topArticles.map((_, idx) => (
            <div
              key={idx}
              className={`slideshow-progress-segment ${idx === currentIndex ? 'active' : ''} ${idx < currentIndex ? 'completed' : ''}`}
              onClick={() => goToSlide(idx)}
            />
          ))}
        </div>
      )}

      {/* Dots / Slide counter */}
      {topArticles.length > 1 && (
        <div className="slideshow-footer">
          <div className="slideshow-dots">
            {topArticles.map((_, idx) => (
              <button
                key={idx}
                className={`slideshow-dot ${idx === currentIndex ? 'active' : ''}`}
                onClick={() => goToSlide(idx)}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
          <span className="slideshow-counter">
            {String(currentIndex + 1).padStart(2, '0')} / {String(topArticles.length).padStart(2, '0')}
          </span>
        </div>
      )}
    </div>
  );
};

export default NewsSlideshow;