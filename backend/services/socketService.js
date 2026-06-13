/**
 * Phase 5: Socket.IO Service
 * 
 * Events emitted:
 * - "new-article"   → When a new article is generated and saved
 * - "article-expired" → When an article passes its 24-hour TTL
 */

const { Server } = require('socket.io');

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);
    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  console.log('📡 Socket.IO server initialized');
  return io;
}

function emitNewArticle(article) {
  if (io) {
    io.emit('new-article', article);
    console.log(`📢 Emitted new-article: "${article.headline}"`);
  }
}

function emitArticleExpired(articleId) {
  if (io) {
    io.emit('article-expired', articleId);
  }
}

function getIO() {
  return io;
}

module.exports = { initSocket, emitNewArticle, emitArticleExpired, getIO };