const IORedis = require('ioredis');
const logger = require('../utils/logger');

let connection = null;

const getRedisConnection = () => {
  if (connection) return connection;

  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    logger.error('REDIS_URL not found in environment variables.');
    // Don't throw here to allow app to start without Redis (graceful degradation)
    // But queue features won't work.
    return null;
  }

  try {
    // maxRetriesPerRequest: null is required for BullMQ
    connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });

    connection.on('connect', () => logger.info('🔗 Connected to Redis'));
    connection.on('error', (err) => logger.error('❌ Redis Error:', err));

    return connection;
  } catch (error) {
    logger.error('Failed to initialize Redis:', error);
    return null;
  }
};

module.exports = { getRedisConnection };
