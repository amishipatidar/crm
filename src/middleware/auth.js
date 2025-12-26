const authService = require('../services/authService');
const logger = require('../utils/logger');

/**
 * Middleware to verify JWT token
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = await authService.verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Middleware to check if user is admin
 */
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

/**
 * Middleware to check if user is agent or admin
 */
const requireAgent = (req, res, next) => {
  if (req.user.role !== 'agent' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Agent access required' });
  }
  next();
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireAgent
}; 