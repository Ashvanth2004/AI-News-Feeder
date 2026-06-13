import React from 'react';

const LiveTicker = ({ newsItems }) => {
  // Tamil headlines fallback
  const tamilHeadlines = [
    'பாலிமர் நியூஸ் — தமிழ்நாட்டின் முக்கியச் செய்திகள் மற்றும் நேரலைத் தகவல்கள்',
    'தந்தி டிவி — இன்றைய சமீபத்திய தமிழ் செய்தித் தலைப்புகள்',
    'நியூஸ் தமிழ் 24x7 — தொடர்ச்சியான தமிழ் செய்தித் தொகுப்பு',
    'புதிய தலைமுறை — தமிழ் செய்திகள் மற்றும் நடப்பு நிகழ்வுகள்',
    'என்.டி.டி.வி இந்தியா — சிறந்த இந்திச் செய்திகள் நேரலை',
    'ரிபப்ளிக் பாரத் — இந்தியில் முக்கியச் செய்திகள்',
    'ஏ.பி.பி நியூஸ் — இந்திச் செய்திகளின் நேரலைத் தகவல்கள்',
    'டைம்ஸ் நவ் — ஆங்கிலச் செய்திகளின் முக்கியத் தகவல்கள்',
    'ஏர்பாட்ஸ் ப்ரோ 3: ஆப்பிளின் மிகவும் பிரபலமான இயர்போன்கள் சலுகையில் உள்ளன',
    'ஜூன் 13-ஆம் தேதிக்கான தினசரி கணிப்பு',
    'ரியல் மாட்ரிட் ஜாம்பவான் புதிய பொறுப்பில் உணர்ச்சிப்பூர்வமான மறுபிரவேசம்',
    'கோபி மைனூ: மேன் யுனைடெட் பரபரப்பானது நம்பமுடியாத திறமைகளுக்குப் பின்னால் உள்ள ரகசியம்',
  ].join(' •  ');

  const defaultHeadlines = tamilHeadlines;

  const headlines = newsItems.length > 0
    ? newsItems.map(item => item.headline).join(' •  ')
    : defaultHeadlines;

  return (
    <div className="ticker-container">
      <div className="ticker-label">
        <span className="ticker-label-dot"></span>
        LIVE
      </div>
      <div className="ticker-scroll">
        <div className="ticker-content">
          <span className="ticker-item">{headlines}</span>
          <span className="ticker-separator"> • </span>
          <span className="ticker-item">{headlines}</span>
          <span className="ticker-separator"> • </span>
          <span className="ticker-item">{headlines}</span>
        </div>
      </div>
    </div>
  );
};

export default LiveTicker;