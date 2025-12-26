require('dotenv').config();
const express = require('express');
const http = require('http');
const socketService = require('./services/socketService');
const morgan = require('morgan');
const connectDB = require('./config/database');
const { setupSecurity } = require('./middleware/security');
const smsRoutes = require('./routes/sms');
const authRoutes = require('./routes/auth');
const webRoutes = require('./routes/web');
const pageRoutes = require('./routes/pages');
const authService = require('./services/authService');
const logger = require('./utils/logger');
const path = require('path');
const queueService = require('./services/queueService');
const { initializeWorkers } = require('./workers/smsWorker');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Services
socketService.init(server);
queueService.initialize();
initializeWorkers();
const PORT = process.env.PORT || 3001;

// Trust proxy for rate limiting (fixes X-Forwarded-For warning)
app.set('trust proxy', 1);

// Connect to MongoDB
connectDB();

// Create admin user on startup
authService.createAdminIfNotExists();

// Security middleware
setupSecurity(app);

// Set up EJS templating
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Static files
app.use(express.static('public'));

// API Routes
app.use('/api/sms', smsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/web', webRoutes);

// Web Page Routes
app.use('/', pageRoutes);

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

// Start server
server.listen(PORT, '0.0.0.0', () => {
  logger.info('🔄 Server initiated restart...');
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📱 SMS Webhook URL: http://0.0.0.0:${PORT}/api/sms/webhook`);
  logger.info(`🏥 Health Check: http://0.0.0.0:${PORT}/api/sms/health`);
  logger.info(`🌐 Web Interface: http://0.0.0.0:${PORT}/login`);
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