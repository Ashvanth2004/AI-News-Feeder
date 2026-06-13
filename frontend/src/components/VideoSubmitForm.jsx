import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const VideoSubmitForm = () => {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsSubmitting(true);
    setStatus({ type: 'info', message: '⏳ Adding to queue...' });

    try {
      // Push the YouTube link directly to Firestore — no local API needed
      const docRef = await addDoc(collection(db, 'jobs'), {
        videoUrl: url.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      setStatus({
        type: 'success',
        message: `✅ Job added! ID: ${docRef.id}. Worker will process it automatically.`,
      });
      setUrl('');
    } catch (err) {
      console.error('Firestore error:', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="video-submit-section">
      <div className="section-header">
        <div className="section-header-left">
          <span className="section-indicator" style={{ background: 'linear-gradient(to bottom, #f59e0b, #10b981)' }}></span>
          <h2>Submit YouTube Video</h2>
        </div>
      </div>

      <div className="video-submit-card">
        <p className="video-submit-description">
          Paste a YouTube live stream or video URL below. Our AI will transcribe, summarize, and publish the news automatically.
        </p>

        <form onSubmit={handleSubmit} className="video-submit-form">
          <div className="video-submit-input-wrapper">
            <input
              type="url"
              className="video-submit-input"
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isSubmitting}
            />
            <button
              type="submit"
              className="video-submit-btn"
              disabled={isSubmitting || !url.trim()}
            >
              {isSubmitting ? (
                <span className="btn-loading">
                  <span className="btn-spinner"></span>
                  Processing...
                </span>
              ) : (
                'Analyze & Publish'
              )}
            </button>
          </div>
        </form>

        {status && (
          <div className={`video-submit-status ${status.type}`}>
            {status.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoSubmitForm;