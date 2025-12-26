const jwt = require('jsonwebtoken');
const Agent = require('../models/Agent');
const logger = require('../utils/logger');

class AuthService {
  /**
   * Authenticate agent login
   * @param {string} phoneNumber - Agent phone number
   * @param {string} password - Agent password
   * @returns {Promise<Object>} - Authentication result
   */
  async login(phoneNumber, password) {
    try {
      // Validate phone number format
      if (!phoneNumber || !phoneNumber.startsWith('+')) {
        throw new Error('Phone number must be in international format (e.g., +1234567890)');
      }

      // Find agent by phone number
      const agent = await Agent.findOne({ phoneNumber, isActive: true });
      if (!agent) {
        throw new Error('Invalid phone number or password');
      }

      // Check password
      const isPasswordValid = await agent.comparePassword(password);
      if (!isPasswordValid) {
        throw new Error('Invalid phone number or password');
      }

      // Update last login
      agent.lastLogin = new Date();
      await agent.save();

      // Generate JWT token
      const token = this.generateToken(agent);

      logger.info(`Agent logged in: ${agent.phoneNumber}`);

      return {
        success: true,
        agent: agent.toJSON(),
        token
      };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Register new agent
   * @param {Object} agentData - Agent information
   * @returns {Promise<Object>} - Registration result
   */
  async register(agentData) {
    try {
      // Validate phone number format
      if (!agentData.phoneNumber || !agentData.phoneNumber.startsWith('+')) {
        throw new Error('Phone number must be in international format (e.g., +1234567890)');
      }

      // Check if agent already exists by phone number
      const existingAgent = await Agent.findOne({ phoneNumber: agentData.phoneNumber });

      if (existingAgent) {
        throw new Error('Agent with this phone number already exists');
      }

      // Check if email is provided and if agent exists with that email
      if (agentData.email) {
        const existingEmailAgent = await Agent.findOne({ email: agentData.email });
        if (existingEmailAgent) {
          throw new Error('Agent with this email already exists');
        }
      }

      // Create new agent
      const agent = new Agent(agentData);
      await agent.save();

      // Generate JWT token
      const token = this.generateToken(agent);

      logger.info(`New agent registered: ${agent.phoneNumber}`);

      return {
        success: true,
        agent: agent.toJSON(),
        token
      };
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token
   * @returns {Promise<Object>} - Decoded token payload
   */
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const agent = await Agent.findById(decoded.agentId);
      
      if (!agent || !agent.isActive) {
        throw new Error('Invalid token');
      }

      return decoded;
    } catch (error) {
      logger.error('Token verification error:', error);
      throw error;
    }
  }

  /**
   * Generate JWT token
   * @param {Object} agent - Agent object
   * @returns {string} - JWT token
   */
  generateToken(agent) {
    return jwt.sign(
      {
        agentId: agent._id,
        email: agent.email,
        phoneNumber: agent.phoneNumber,
        role: agent.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  /**
   * Get agent by ID
   * @param {string} agentId - Agent ID
   * @returns {Promise<Object>} - Agent information
   */
  async getAgentById(agentId) {
    try {
      const agent = await Agent.findById(agentId);
      if (!agent) {
        throw new Error('Agent not found');
      }
      return agent;
    } catch (error) {
      logger.error('Error getting agent by ID:', error);
      throw error;
    }
  }

  /**
   * Create admin user if not exists
   * @returns {Promise<void>}
   */
  async createAdminIfNotExists() {
    try {
      const adminExists = await Agent.findOne({ role: 'admin' });
      
      if (!adminExists) {
        const admin = new Agent({
          name: 'Admin User',
          email: process.env.ADMIN_EMAIL || 'admin@example.com',
          password: process.env.ADMIN_PASSWORD || 'admin123',
          phoneNumber: process.env.ADMIN_PHONE || '+1234567890',
          role: 'admin'
        });

        await admin.save();
        logger.info('Admin user created');
      }
    } catch (error) {
      logger.error('Error creating admin user:', error);
    }
  }
}

module.exports = new AuthService(); 
 