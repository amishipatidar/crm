const { Worker } = require('bullmq');
const { getRedisConnection } = require('../config/redis');
const twilioService = require('../services/twilioService');
const logger = require('../utils/logger');

let smsWorker = null;

const initializeWorkers = () => {
  const connection = getRedisConnection();
  
  if (!connection) {
    logger.warn('⚠️ Workers not started: Redis not available.');
    return;
  }

  // 1. Define the worker
  smsWorker = new Worker('smsQueue', async (job) => {
    logger.info(`👷 Worker processing job ${job.id}: Send SMS to ${job.data.to}`);
    
    try {
      const { to, message } = job.data;
      await twilioService.sendSMS(to, message);
      logger.info(`✅ Job ${job.id} completed`);
    } catch (error) {
      logger.error(`❌ Job ${job.id} failed:`, error);
      throw error; // Triggers retry logic
    }
  }, { 
    connection,
    concurrency: 5 // Process 5 jobs at once
  });

  // 2. Listen for events
  smsWorker.on('completed', (job) => {
    logger.info(`🎉 SMS sent to ${job.data.to}`);
  });

  smsWorker.on('failed', (job, err) => {
    logger.error(`💀 Job ${job.id} has failed with ${err.message}`);
  });
  
  logger.info('👷 SMS Worker started and listening...');
};

module.exports = { initializeWorkers };
