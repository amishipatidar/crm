const express = require('express');
const router = express.Router();
const webController = require('../controllers/webController');
const { authenticateToken, requireAgent } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);
router.use(requireAgent);

// Dashboard
router.get('/dashboard', webController.getDashboard.bind(webController));

// Lead management
router.get('/leads', webController.getLeads.bind(webController));
router.get('/leads/:leadId', webController.getLead.bind(webController));
router.post('/leads', webController.createLead.bind(webController));
router.put('/leads/:leadId', webController.updateLead.bind(webController));

// Lead actions
router.post('/leads/:leadId/notes', webController.addNote.bind(webController));
router.post('/leads/:leadId/followup', webController.setFollowUp.bind(webController));

// Bulk upload
router.post('/bulk-upload', webController.bulkUpload.bind(webController));
router.get('/sample-csv', webController.downloadSampleCSV.bind(webController));

module.exports = router; 