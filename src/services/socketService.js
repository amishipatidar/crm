const socketIo = require('socket.io');
const logger = require('../utils/logger');

class SocketService {
  constructor() {
    this.io = null;
  }

  init(server) {
    this.io = socketIo(server);
    
    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);
      
      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });
    });

    logger.info('Socket.io initialized');
  }

  getIO() {
    if (!this.io) {
      throw new Error('Socket.io not initialized!');
    }
    return this.io;
  }

  emitLeadUpdate(lead, type = 'update') {
    if (this.io) {
      this.io.emit('lead:update', { type, lead });
      logger.info(`Emitted lead:${type} event for lead ${lead._id}`);
    } else {
      logger.warn('Socket.io not initialized, cannot emit event');
    }
  }
}

module.exports = new SocketService();
