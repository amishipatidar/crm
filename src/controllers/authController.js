const authService = require('../services/authService');
const logger = require('../utils/logger');

class AuthController {
  /**
   * Handle agent login
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async login(req, res) {
    try {
      const { phoneNumber, password } = req.body;

      if (!phoneNumber || !password) {
        return res.status(400).json({
          error: 'Phone number and password are required'
        });
      }

      const result = await authService.login(phoneNumber, password);

      res.json({
        success: true,
        message: 'Login successful',
        ...result
      });

    } catch (error) {
      logger.error('Login controller error:', error);
      res.status(401).json({
        error: error.message || 'Login failed'
      });
    }
  }

  /**
   * Handle agent registration
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async register(req, res) {
    try {
      const { name, email, password, phoneNumber } = req.body;

      if (!name || !password || !phoneNumber) {
        return res.status(400).json({
          error: 'Name, password, and phone number are required'
        });
      }

      const result = await authService.register({
        name,
        email: email || undefined, // Make email optional
        password,
        phoneNumber
      });

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        ...result
      });

    } catch (error) {
      logger.error('Registration controller error:', error);
      res.status(400).json({
        error: error.message || 'Registration failed'
      });
    }
  }

  /**
   * Get current user profile
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getProfile(req, res) {
    try {
      const agent = await authService.getAgentById(req.user.agentId);
      
      res.json({
        success: true,
        agent
      });

    } catch (error) {
      logger.error('Get profile error:', error);
      res.status(500).json({
        error: 'Failed to get profile'
      });
    }
  }

  /**
   * Handle logout (client-side token removal)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async logout(req, res) {
    try {
      // In JWT-based auth, logout is handled client-side by removing the token
      res.json({
        success: true,
        message: 'Logout successful'
      });

    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        error: 'Logout failed'
      });
    }
  }
}

module.exports = new AuthController(); 