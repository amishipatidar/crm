const express = require('express');
const router = express.Router();
const webRoutesController = require('../controllers/webRoutesController');

// Public pages
router.get('/', webRoutesController.homePage.bind(webRoutesController));
router.get('/login', webRoutesController.loginPage.bind(webRoutesController));
router.get('/register', webRoutesController.registerPage.bind(webRoutesController));

// Protected pages
router.get('/dashboard', webRoutesController.dashboardPage.bind(webRoutesController));
router.get('/sms-instructions', webRoutesController.smsInstructionsPage.bind(webRoutesController));
router.get('/bulk-upload', webRoutesController.bulkUploadPage.bind(webRoutesController));

module.exports = router; 