const { Queue } = require('bullmq');
const { getRedisConnection } = require('../config/redis');
const logger = require('../utils/logger');

class QueueService {
  constructor() {
    this.smsQueue = null;
    this.emailQueue = null;
    this.isReady = false;
  }

  initialize() {
    const connection = getRedisConnection();
    
    if (!connection) {
      logger.warn('⚠️ Redis not available. Queues disabled.');
      return;
    }

    try {
      this.smsQueue = new Queue('smsQueue', { connection });
      this.emailQueue = new Queue('emailQueue', { connection });
      this.isReady = true;
      logger.info('✅ Job Queues Initialized');
    } catch (error) {
      logger.error('Error initializing queues:', error);
    }
  }

  /**
   * Schedule an SMS
   * @param {string} to - Phone number
   * @param {string} message - Message content
   * @param {number} delayMs - Delay in milliseconds
   */
  async scheduleSMS(to, message, delayMs) {
    if (!this.isReady) {
      logger.warn('Cannot schedule SMS: Queues not initialized');
      return;
    }

    try {
      await this.smsQueue.add('send-sms', { to, message }, { delay: delayMs });
      logger.info(`⏰ Scheduled SMS to ${to} in ${Math.round(delayMs / 1000 / 60)} minutes`);
    } catch (error) {
      logger.error('Error scheduling SMS:', error);
    }
  }
}

module.exports = new QueueService();
