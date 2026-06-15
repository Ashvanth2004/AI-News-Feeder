const HEADLINES = 'பாலிமர் நியூஸ் • தந்தி டிவி • நியூஸ் தமிழ் 24x7 • புதிய தலைமுறை • என்.டி.டி.வி இந்தியா • ரிபப்ளிக் பாரத் • ஏ.பி.பி நியூஸ் • Aaj Tak • Times Now • India Today • NDTV 24x7 • Zee News';

const LiveTicker = ({ newsItems }) => {
  const text = newsItems.length ? newsItems.map(i => i.headline).join(' •  ') : HEADLINES;
  return (
    <div className="ticker-container">
      <div className="ticker-label">
        <span className="ticker-label-dot"></span>LIVE
      </div>
      <div className="ticker-scroll">
        <div className="ticker-content">
          <span className="ticker-item">{text}</span>
          <span className="ticker-separator"> • </span>
          <span className="ticker-item">{text}</span>
          <span className="ticker-separator"> • </span>
          <span className="ticker-item">{text}</span>
        </div>
      </div>
    </div>
  );
};

export default LiveTicker;