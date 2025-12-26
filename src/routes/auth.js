const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Public routes
router.post('/login', authController.login.bind(authController));
router.post('/register', authController.register.bind(authController));

// Protected routes
router.get('/profile', authenticateToken, authController.getProfile.bind(authController));
router.post('/logout', authenticateToken, authController.logout.bind(authController));

module.exports = router; 