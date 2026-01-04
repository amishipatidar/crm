const path = require('path');

class WebRoutesController {
  /**
   * Serve login page
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async loginPage(req, res) {
    res.render('login');
  }

  /**
   * Serve registration page
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async registerPage(req, res) {
    res.render('register');
  }

  /**
   * Serve dashboard page
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async dashboardPage(req, res) {
    res.render('dashboard');
  }

  /**
   * Serve home page (redirects to login if not authenticated)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async homePage(req, res) {
    res.redirect('/login');
  }

  /**
   * Serve SMS instructions page
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async smsInstructionsPage(req, res) {
    try {
      res.render('sms-instructions', {
        twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || 'Not Configured'
      });
    } catch (error) {
      logger.error('Error serving SMS instructions page:', error);
      res.status(500).render('error', {
        message: 'Error loading SMS instructions page',
        error: process.env.NODE_ENV === 'development' ? error : {}
      });
    }
  }

  /**
   * Serve bulk upload page
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async bulkUploadPage(req, res) {
    try {
      res.render('bulk-upload');
    } catch (error) {
      logger.error('Error serving bulk upload page:', error);
      res.status(500).render('error', {
        message: 'Error loading bulk upload page',
        error: process.env.NODE_ENV === 'development' ? error : {}
      });
    }
  }
}

module.exports = new WebRoutesController(); 