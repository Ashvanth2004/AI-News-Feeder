require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { initSocket } = require('./services/socketService');
const newsRoutes = require('./routes/newsRoutes');
const { startWorker } = require('./workers/processLiveNews');
const { startChannelNewsService } = require('./services/channelNewsService');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', newsRoutes);

// Socket.IO
initSocket(server);

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/newsai';
const PORT = process.env.PORT || 3002;

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    startServer(true);
  })
  .catch((err) => {
    console.warn('⚠️ MongoDB not available, running without database:', err.message);
    console.warn('⚠️ News storage will be disabled. Install MongoDB or set MONGO_URI in .env');
    startServer(false);
  });

function startServer(hasDb) {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Socket.IO available on ws://localhost:${PORT}`);
    if (!hasDb) {
      console.warn('⚠️ Running in degraded mode — no database');
    } else {
      // Start background worker (YouTube live caption processor)
      try {
        startWorker();
      } catch (e) {
        console.warn('⚠️ Could not start worker:', e.message);
      }

      // Start channel news service (generates articles from live channel headlines)
      try {
        startChannelNewsService();
      } catch (e) {
        console.warn('⚠️ Could not start channel news service:', e.message);
      }
    }
  });
}
