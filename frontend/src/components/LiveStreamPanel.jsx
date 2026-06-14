import React, { useState, useEffect } from 'react';

const LIVE_CHANNELS = [
  // Tamil News Channels
  {
    id: 'polimer',
    name: 'Polimer News',
    videoId: 'vb72Ot79JrQ',
    lang: 'ta',
    newsHeadlines: [
      '🔴 தமிழ்நாட்டில் பரவலாக மழை — வெள்ள முன்னெச்சரிக்கை',
      '🔴 முதலமைச்சர் இன்று முக்கிய ஆலோசனை கூட்டம்',
      '🔴 சென்னையில் புதிய மெட்ரோ திட்டத்திற்கு ஒப்புதல்',
      '🔴 விவசாயிகளுக்கு மானியம் வழங்க அரசு முடிவு',
      '🔴 பள்ளி மாணவர்களுக்கு இலவச மடிக்கணினி திட்டம்',
      '🔴 மின் கட்டணம் உயர்வு குறித்து இன்று முடிவு',
      '🔴 தமிழக எல்லையில் புதிய சோதனைச் சாவடிகள்',
      '🔴 சென்னை பல்கலைக்கழகத்தில் புதிய படிப்புகள்',
      '🔴 மீனவர்களுக்கு புதிய காப்பீட்டுத் திட்டம்',
      '🔴 தமிழக சுற்றுலா தலங்களில் சிறப்பு ஏற்பாடுகள்',
    ],
  },
  {
    id: 'thanthi',
    name: 'Thanthi TV',
    videoId: '5TVd_iBhqTc',
    lang: 'ta',
    newsHeadlines: [
      '🔴 இன்றைய முக்கிய செய்திகள் — நேரலை தொகுப்பு',
      '🔴 தமிழக அரசியலில் பரபரப்பு — புதிய கூட்டணி',
      '🔴 வடசென்னையில் புதிய மேம்பால திட்டம் அறிவிப்பு',
      '🔴 வெளிநாடுகளில் தமிழர்களின் சாதனை',
      '🔴 இன்று வெளியான முக்கிய தீர்ப்புகள்',
      '🔴 தமிழ் திரையுலகில் புதிய அறிவிப்புகள்',
      '🔴 விளையாட்டு உலகில் தமிழக வீரர்களின் சாதனை',
      '🔴 வணிக செய்திகள் — பங்குச் சந்தை நிலவரம்',
      '🔴 வானிலை முன்னறிவிப்பு — இன்று முதல் 3 நாட்கள்',
      '🔴 கல்வி செய்திகள் — தேர்வு முடிவுகள் வெளியீடு',
    ],
  },
  {
    id: 'newsTamil',
    name: 'News Tamil 24x7',
    videoId: '1r8SULpEOak',
    lang: 'ta',
    newsHeadlines: [
      '🔴 24 மணி நேரமும் தொடர்ந்து செய்திகள்',
      '🔴 தமிழகத்தில் பரபரப்பான அரசியல் மாற்றங்கள்',
      '🔴 இன்றைய முக்கிய நிகழ்வுகள் நேரலை',
      '🔴 பொருளாதாரத்தில் புதிய மாற்றங்கள்',
      '🔴 சென்னை மற்றும் மாவட்டங்களில் போக்குவரத்து மாற்றம்',
      '🔴 உலக தமிழர் தின சிறப்பு செய்திகள்',
      '🔴 காவல்துறை புதிய நடவடிக்கைகள்',
      '🔴 வெளிநாட்டு செய்திகள் — தமிழர்கள் சம்பந்தப்பட்ட',
      '🔴 சட்டசபை நடவடிக்கைகள் நேரலை',
      '🔴 விரைவில் வரும் புதிய சட்டங்கள்',
    ],
  },
  {
    id: 'puthiyaThalaimurai',
    name: 'Puthiya Thalaimurai',
    videoId: 'pkFDQL4KG9I',
    lang: 'ta',
    newsHeadlines: [
      '🔴 புதிய தலைமுறை — நடப்பு நிகழ்வுகள் விவாதம்',
      '🔴 தேர்தல் ஆணையத்தின் புதிய அறிவிப்பு',
      '🔴 நீதிமன்றத்தில் முக்கிய வழக்கு விசாரணை',
      '🔴 சமூக ஊடகங்களில் வைரலான செய்திகள்',
      '🔴 புதிய கல்வி கொள்கையின் தாக்கம்',
      '🔴 மருத்துவத் துறையில் புதிய கண்டுபிடிப்புகள்',
      '🔴 விவசாயிகளின் கோரிக்கைகள் குறித்த விவாதம்',
      '🔴 இளைஞர்களுக்கான வேலைவாய்ப்பு செய்திகள்',
      '🔴 சுற்றுச்சூழல் பாதுகாப்பு நடவடிக்கைகள்',
      '🔴 தமிழக தொழில் துறை வளர்ச்சி',
    ],
  },
  // Hindi News Channels
  {
    id: 'ndtv',
    name: 'NDTV India',
    videoId: 'MN8p-Vrn6G0',
    lang: 'hi',
    newsHeadlines: [
      '🔴 देश में बारिश का अलर्ट — मौसम विभाग की चेतावनी',
      '🔴 प्रधानमंत्री आज करेंगे महत्वपूर्ण घोषणा',
      '🔴 संसद में गरमागरम बहस — विपक्ष का हंगामा',
      '🔴 शेयर बाजार में जबरदस्त उछाल',
      '🔴 क्रिकेट टीम का चयन आज — बड़ा बदलाव संभव',
      '🔴 रेलवे बजट 2026 — नई ट्रेनों की घोषणा',
      '🔴 दिल्ली में प्रदूषण पर सुप्रीम कोर्ट सख्त',
      '🔴 राज्यों में विधानसभा चुनाव की तैयारियां',
      '🔴 डिजिटल इंडिया — नई ऑनलाइन सेवाएं शुरू',
      '🔴 सेना का नया अभियान — सीमा पर तैनाती बढ़ी',
    ],
  },
  {
    id: 'republic',
    name: 'Republic Bharat',
    videoId: 'utAPTeEAapM',
    lang: 'hi',
    newsHeadlines: [
      '🔴 ब्रेकिंग: देश में आज बड़ा राजनीतिक घटनाक्रम',
      '🔴 सरकार का नया बिल — संसद में पेश आज',
      '🔴 चुनाव आयोग की बड़ी कार्रवाई',
      '🔴 प्रदेशों में मंत्रिमंडल विस्तार की तैयारी',
      '🔴 राष्ट्रीय सुरक्षा पर अहम बैठक आज',
      '🔴 ग्रामीण विकास योजनाओं की समीक्षा',
      '🔴 शिक्षा के क्षेत्र में बड़ा बदलाव',
      '🔴 स्वास्थ्य मंत्रालय की नई गाइडलाइन',
      '🔴 बैंकिंग सेक्टर में सुधार के कदम',
      '🔴 खेल मंत्रालय की नई पहल — खिलाड़ियों को बढ़ावा',
    ],
  },
  {
    id: 'abp',
    name: 'ABP News',
    videoId: 'LqhlHAex09Y',
    lang: 'hi',
    newsHeadlines: [
      '🔴 आज की बड़ी खबरें — लाइव अपडेट',
      '🔴 संसद में पेश होगा महत्वपूर्ण विधेयक',
      '🔴 राज्यों में जारी राजनीतिक उठापटक',
      '🔴 अर्थव्यवस्था के आंकड़े जारी — बड़ा बदलाव',
      '🔴 आसमान छूते पेट्रोल-डीजल के दाम',
      '🔴 ओलंपिक में भारत का प्रदर्शन — आज का मुकाबला',
      '🔴 टेक्नोलॉजी में भारत की नई उपलब्धि',
      '🔴 मौसम विभाग का अलर्ट — कई राज्यों में बारिश',
      '🔴 रोजगार मेला — हजारों युवाओं को मिलेगी नौकरी',
      '🔴 अंतरिक्ष मिशन की तैयारी — इसरो का अपडेट',
    ],
  },
  {
    id: 'aajTak',
    name: 'Aaj Tak',
    videoId: 'Tl1mKd1Rz7A',
    lang: 'hi',
    newsHeadlines: [
      '🔴 आज तक — ब्रेकिंग न्यूज़ और लाइव अपडेट',
      '🔴 देश में आज की बड़ी खबरें — लाइव कवरेज',
      '🔴 राजनीति में बड़ा घटनाक्रम — नेता ने दिया बड़ा बयान',
      '🔴 शेयर बाजार में उतार-चढ़ाव — निवेशकों की रणनीति',
      '🔴 भारतीय सेना का बड़ा ऑपरेशन — सीमा पर कड़ी निगरानी',
      '🔴 मौसम अलर्ट — भारी बारिश की चेतावनी, कई राज्य निशाने पर',
      '🔴 खेल जगत — क्रिकेट टीम की बड़ी जीत पर जश्न',
      '🔴 मनोरंजन — बॉलीवुड फिल्म का रिकॉर्ड तोड़ कलेक्शन',
      '🔴 शिक्षा — नई नीति का ऐलान — पढ़ाई में बड़ा बदलाव',
      '🔴 टेक्नोलॉजी — भारत की डिजिटल क्रांति जारी',
    ],
  },
  // English News Channel
  {
    id: 'timesNow',
    name: 'Times Now',
    videoId: 'vfHN5oUEQ5U',
    lang: 'en',
    newsHeadlines: [
      '🔴 BREAKING: Major Political Shift Underway',
      '🔴 Stock Market Hits All-Time High Today',
      '🔴 Parliament Debates Key Economic Bill',
      '🔴 Global Summit: World Leaders Gather',
      '🔴 Tech Giant Announces Revolutionary AI Product',
      '🔴 Sports: Historic Win for National Team',
      '🔴 Climate Summit: New Agreements Reached',
      '🔴 Healthcare Breakthrough: New Treatment Approved',
      '🔴 Space Mission Success: Satellite Launched',
      '🔴 Infrastructure Projects Worth Billions Approved',
    ],
  },
  // 3 New Indian News Channels
  {
    id: 'indiaToday',
    name: 'India Today',
    videoId: 'X8r2R31Bx5k',
    lang: 'en',
    newsHeadlines: [
      '🔴 India Today Live — Top Stories Breaking Now',
      '🔴 Political Update: Major Selection Results Declared',
      '🔴 Economic Growth: India GDP Forecast Raised',
      '🔴 Sports: Indian Team Wins Historic Series Victory',
      '🔴 Technology: Startup Funding Hits Record $10B',
      '🔴 Weather: Cyclone Warning for Eastern States',
      '🔴 Health: New COVID Variant Detected — WHO Monitoring',
      '🔴 International: India-USA Relations Hit New Heights',
      '🔴 Business: Reliance Launches New Venture',
      '🔴 Entertainment: Bollywood Releases 500-Crore Film',
    ],
  },
  {
    id: 'ndtv24x7',
    name: 'NDTV 24x7',
    videoId: 'VjJNjDkF7Uo',
    lang: 'en',
    newsHeadlines: [
      '🔴 NDTV 24x7 — Breaking News Live',
      '🔴 Parliament Session: Key Bills to be Passed Today',
      '🔴 International: Global Leaders Arrive for Summit in Delhi',
      '🔴 Business: Sensex Crosses 80,000 Mark',
      '🔴 Sports: Indian Cricket Team Announces World Cup Squad',
      '🔴 Technology: ISRO Launches New Satellite',
      '🔴 Health: Rise in Dengue Cases — Government Takes Action',
      '🔴 Weather: Heavy Rain Destroys Several Cities',
      '🔴 Education: NEET Results Released — Top 100 Secured',
      '🔴 Defense: Indian Army Strengthens Border Security Equipment',
    ],
  },
  {
    id: 'zeeNews',
    name: 'Zee News',
    videoId: 'kWfz9Tf0FkA',
    lang: 'hi',
    newsHeadlines: [
      '🔴 Zee News — ब्रेकिंग न्यूज़ और लाइव अपडेट',
      '🔴 आज भारत में महत्वपूर्ण राजनीतिक घटनाक्रम',
      '🔴 शेयर बाजार — निफ्टी ने तोड़ा नया रिकॉर्ड',
      '🔴 खेल जगत — भारतीय क्रिकेट टीम की बड़ी जीत',
      '🔴 तकनीक — भारत की डिजिटल यात्रा',
      '🔴 मौसम — बारिश का अलर्ट — मस्तिष्क नियंत्रण जरूरी',
      '🔴 सेहत — कोरोना का नया वेरिएंट — WHO ने दी चेतावनी',
      '🔴 अंतरराष्ट्रीय — भारत और अमेरिका के बीच समझौता',
      '🔴 व्यापार — नई कंपनी लॉन्च — रिलायंस बाज़ार में आगे',
      '🔴 मनोरंजन — बॉलीवुड फिल्म 500 करोड़ क्लब में शामिल',
    ],
  },
];

const NewsTickerBox = ({ channel }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!channel.newsHeadlines || channel.newsHeadlines.length <= 1) return;
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % channel.newsHeadlines.length);
        setVisible(true);
      }, 300);
    }, 3000);
    return () => clearInterval(interval);
  }, [channel.newsHeadlines]);

  if (!channel.newsHeadlines || channel.newsHeadlines.length === 0) return null;

  const headline = channel.newsHeadlines[currentIndex];

  return (
    <div className="live-stream-subtitle-box">
      <div className={`live-stream-subtitle-text ${visible ? 'visible' : 'hidden'}`}>
        {headline}
      </div>
    </div>
  );
};

const LiveStreamPanel = () => {
  return (
    <section className="live-stream-section">
      <div className="section-header">
        <div className="section-header-left">
          <span className="section-indicator live"></span>
          <h2>Live TV Streams</h2>
        </div>
        <span className="live-stream-badge">🔴 LIVE</span>
      </div>

      <div className="live-stream-grid auto">
        {LIVE_CHANNELS.map((channel) => (
          <div key={channel.id} className="live-stream-card auto-play">
            <div className="live-stream-player-wrapper">
              <iframe
                className="live-stream-iframe"
                src={`https://www.youtube.com/embed/${channel.videoId}?autoplay=1&mute=1&controls=1&rel=0&loop=1`}
                title={channel.name}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="live-stream-info auto">
              <div className="live-stream-info-header">
                <span className="live-stream-live-tag">LIVE</span>
                <span className="live-stream-channel-name">{channel.name}</span>
              </div>
              <NewsTickerBox channel={channel} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export { LIVE_CHANNELS };
export default LiveStreamPanel;