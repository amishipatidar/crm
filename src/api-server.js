require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const connectDB = require('./config/database');
const { setupSecurity } = require('./middleware/security');
const smsRoutes = require('./routes/sms');
const authRoutes = require('./routes/auth');
const webRoutes = require('./routes/web');
const authService = require('./services/authService');
const logger = require('./utils/logger');

// Initialize Express app for API only
const app = express();
const PORT = process.env.API_PORT || 3001;

// Trust proxy for rate limiting (fixes X-Forwarded-For warning)
app.set('trust proxy', 1);

// Connect to MongoDB
connectDB();

// Create admin user on startup
authService.createAdminIfNotExists();

// Security middleware
setupSecurity(app);

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// API Routes
app.use('/api/sms', smsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/web', webRoutes);

// Root endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'SMS Lead Management System API',
    version: '1.0.0',
    endpoints: {
      smsWebhook: '/api/sms/webhook',
      health: '/api/sms/health',
      auth: '/api/auth',
      web: '/api/web'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Start API server
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 API Server running on port ${PORT}`);
  logger.info(`📱 SMS Webhook URL: http://0.0.0.0:${PORT}/api/sms/webhook`);
  logger.info(`🏥 Health Check: http://0.0.0.0:${PORT}/api/sms/health`);
  logger.info(`🔗 API Base URL: http://0.0.0.0:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = app;
