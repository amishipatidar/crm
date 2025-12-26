const express = require('express');
const router = express.Router();
const smsController = require('../controllers/smsController');

// Twilio webhook for incoming SMS
router.post('/webhook', smsController.handleIncomingSMS.bind(smsController));

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'SMS Lead Management System'
  });
});

module.exports = router; 