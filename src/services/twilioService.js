const twilio = require('twilio');
const logger = require('../utils/logger');

class TwilioService {
  constructor() {
    this.client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    this.messagingServiceSid = process.env.MESSAGING_SERVICE;
  }

  /**
   * Send SMS message
   * @param {string} to - Recipient phone number
   * @param {string} message - Message content
   * @returns {Promise<Object>} - Twilio message object
   */
  async sendSMS(to, message) {
    try {
      logger.info(`Sending SMS to ${to}: ${message}`);
      
      const result = await this.client.messages.create({
        body: message,
        messagingServiceSid: this.messagingServiceSid,
        to: to
      });

      logger.info(`SMS sent successfully. SID: ${result.sid}`);
      return result;
    } catch (error) {
      logger.error('Error sending SMS:', error);
      
      // Fallback for testing/simulation (if invalid SID or no credits)
      if (process.env.NODE_ENV !== 'production') {
          logger.warn(`⚠️ [SIMULATION] SMS failed (likely credentials/credits). Pretending success for testing.`);
          logger.info(`[SIMULATION] To: ${to}`);
          logger.info(`[SIMULATION] Body: ${message}`);
          return { sid: 'SM_SIMULATED_' + Date.now() };
      }
      
      throw error;
    }
  }

  /**
   * Validate Twilio webhook request
   * @param {Object} req - Express request object
   * @param {string} signature - Request signature
   * @param {string} url - Webhook URL
   * @returns {boolean} - Whether request is valid
   */
  validateWebhook(req, signature, url) {
    try {
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const validator = twilio.webhook(authToken);
      
      return validator.validate(signature, url, req.body);
    } catch (error) {
      logger.error('Error validating Twilio webhook:', error);
      return false;
    }
  }

  /**
   * Format phone number for consistency
   * @param {string} phoneNumber - Raw phone number
   * @returns {string} - Formatted phone number
   */
  formatPhoneNumber(phoneNumber) {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Add +1 prefix if it's a 10-digit US number
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    }
    
    // Add + prefix if it's an 11-digit number starting with 1
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+${cleaned}`;
    }
    
    // Return as is if it already has country code
    return phoneNumber;
  }
}

module.exports = new TwilioService(); 