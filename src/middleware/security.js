const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const express = require('express');

// Rate limiting for SMS webhook
const smsWebhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// General rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Security middleware setup
const setupSecurity = (app) => {
  // CORS configuration
  app.use(cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001', 
        'https://superior-closings-crm.onrender.com',
        process.env.RENDER_EXTERNAL_URL,
        'http://98.87.48.222',
        'https://98.87.48.222',
        'http://3.238.1.38',
        'https://3.238.1.38',
        'http://44.200.2.140',
        'https://44.200.2.140'
      ];
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log('CORS blocked origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 200
  }));
  
  // Body parsing
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json({ limit: '10mb' }));
  
  // Handle preflight requests
  app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.sendStatus(200);
  });
  
  // Rate limiting
  app.use('/api/sms/webhook', smsWebhookLimiter);
  app.use(generalLimiter);
};

module.exports = { setupSecurity };
