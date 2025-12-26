const leadService = require('../services/leadService');
const Agent = require('../models/Agent');
const logger = require('../utils/logger');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'bulk-upload-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

class WebController {
  /**
   * Get dashboard data for agent
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getDashboard(req, res) {
    try {
      const agentId = req.user.agentId;
      const agent = await Agent.findById(agentId);
      
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      // Get leads for this agent
      const leads = await leadService.getAgentLeads(agent.phoneNumber);
      
      // Calculate statistics
      const stats = {
        total: leads.length,
        new: leads.filter(lead => lead.status === 'new').length,
        contacted: leads.filter(lead => lead.status === 'contacted').length,
        qualified: leads.filter(lead => lead.status === 'qualified').length,
        proposal_sent: leads.filter(lead => lead.status === 'proposal_sent').length,
        closed: leads.filter(lead => lead.status === 'closed').length,
        lost: leads.filter(lead => lead.status === 'lost').length
      };

      res.json({
        success: true,
        agent: agent.toJSON(),
        leads,
        stats
      });

    } catch (error) {
      logger.error('Dashboard error:', error);
      res.status(500).json({ error: 'Failed to load dashboard' });
    }
  }

  /**
   * Get all leads for agent
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getLeads(req, res) {
    try {
      const agentId = req.user.agentId;
      const agent = await Agent.findById(agentId);
      
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      const leads = await leadService.getAgentLeadsWithAgentId(agentId);

      res.json({
        success: true,
        leads
      });

    } catch (error) {
      logger.error('Get leads error:', error);
      res.status(500).json({ error: 'Failed to get leads' });
    }
  }

  /**
   * Get single lead by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getLead(req, res) {
    try {
      const { leadId } = req.params;
      const agentId = req.user.agentId;
      const agent = await Agent.findById(agentId);
      
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      const lead = await leadService.getLeadWithAgentId(leadId, agentId);

      res.json({
        success: true,
        lead
      });

    } catch (error) {
      logger.error('Get lead error:', error);
      res.status(500).json({ error: error.message || 'Failed to get lead' });
    }
  }

  /**
   * Create new lead via web interface
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createLead(req, res) {
    try {
      const { name, email, phone, status, notes } = req.body;
      const agentId = req.user.agentId;
      const agent = await Agent.findById(agentId);
      
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      if (!name) {
        return res.status(400).json({ error: 'Lead name is required' });
      }

      const leadData = { name, email, phone, status };
      if (notes) {
        leadData.notes = [{ content: notes }];
      }

      const lead = await leadService.createLead(leadData, agent.phoneNumber);

      res.status(201).json({
        success: true,
        message: 'Lead created successfully',
        lead
      });

    } catch (error) {
      logger.error('Create lead error:', error);
      res.status(500).json({ error: error.message || 'Failed to create lead' });
    }
  }

  /**
   * Update lead via web interface
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateLead(req, res) {
    try {
      const { leadId } = req.params;
      const updateData = req.body;
      const agentId = req.user.agentId;
      const agent = await Agent.findById(agentId);
      
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      // Remove fields that shouldn't be updated directly
      const { _id, agentId: _, createdAt, updatedAt, ...allowedUpdates } = updateData;
      
      const lead = await leadService.updateLead(
        leadId, 
        'id', 
        allowedUpdates, 
        agent.phoneNumber
      );

      res.json({
        success: true,
        message: 'Lead updated successfully',
        lead
      });

    } catch (error) {
      logger.error('Update lead error:', error);
      res.status(500).json({ error: error.message || 'Failed to update lead' });
    }
  }

  /**
   * Add note to lead
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async addNote(req, res) {
    try {
      const { leadId } = req.params;
      const { note } = req.body;
      const agentId = req.user.agentId;
      const agent = await Agent.findById(agentId);
      
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      if (!note) {
        return res.status(400).json({ error: 'Note content is required' });
      }

      const lead = await leadService.addNote(leadId, note, agent.phoneNumber);

      res.json({
        success: true,
        message: 'Note added successfully',
        lead
      });

    } catch (error) {
      logger.error('Add note error:', error);
      res.status(500).json({ error: error.message || 'Failed to add note' });
    }
  }

  /**
   * Set follow-up for lead
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async setFollowUp(req, res) {
    try {
      const { leadId } = req.params;
      const { days, notes } = req.body;
      const agentId = req.user.agentId;
      const agent = await Agent.findById(agentId);
      
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      if (!days || days < 1) {
        return res.status(400).json({ error: 'Valid number of days is required' });
      }

      const lead = await leadService.setFollowUpWithAgentId(
        leadId, 
        'id', 
        days, 
        agentId,
        notes
      );

      res.json({
        success: true,
        message: 'Follow-up scheduled successfully',
        lead
      });

    } catch (error) {
      logger.error('Set follow-up error:', error);
      res.status(500).json({ error: error.message || 'Failed to set follow-up' });
    }
  }

  /**
   * Bulk upload leads from CSV file
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async bulkUpload(req, res) {
    const uploadSingle = upload.single('csvFile');
    
    uploadSingle(req, res, async (err) => {
      if (err) {
        logger.error('File upload error:', err);
        return res.status(400).json({ error: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const filePath = req.file.path;
      const agentId = req.user.agentId;

      try {
        const results = await this.processCSVFile(filePath, agentId);
        
        // Clean up uploaded file
        fs.unlinkSync(filePath);
        
        res.json(results);
      } catch (error) {
        // Clean up uploaded file on error
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        
        logger.error('Bulk upload error:', error);
        res.status(500).json({ error: error.message || 'Failed to process CSV file' });
      }
    });
  }

  /**
   * Process CSV file and create leads
   * @param {string} filePath - Path to uploaded CSV file
   * @param {string} agentId - Agent's ID
   * @returns {Promise<Object>} - Processing results
   */
  async processCSVFile(filePath, agentId) {
    return new Promise((resolve, reject) => {
      const results = {
        summary: {
          total: 0,
          created: 0,
          duplicates: 0,
          rejected: 0
        },
        details: {
          created: [],
          duplicates: [],
          rejected: []
        }
      };

      const rows = [];
      
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
          results.summary.total++;
          rows.push(data);
        })
        .on('end', async () => {
          try {
            // Process each row
            for (const row of rows) {
              await this.processLeadRow(row, agentId, results);
            }
            
            resolve(results);
          } catch (error) {
            reject(error);
          }
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  /**
   * Process a single lead row from CSV
   * @param {Object} row - CSV row data
   * @param {string} agentId - Agent's ID
   * @param {Object} results - Results accumulator
   */
  async processLeadRow(row, agentId, results) {
    try {
      // Log the row data to see what we're working with
      logger.info(`Processing row:`, Object.keys(row));
      logger.info(`Row data:`, row);
      
      // Validate required fields
      const validation = this.validateLeadData(row);
      if (!validation.valid) {
        results.summary.rejected++;
        results.details.rejected.push({
          name: row.name || 'Invalid Name',
          email: row.email || 'No email',
          phone: row.phone || 'No phone',
          error: validation.error
        });
        return;
      }

      // Check for duplicates
      const duplicate = await this.checkForDuplicate(row, agentId);
      if (duplicate) {
        results.summary.duplicates++;
        results.details.duplicates.push({
          name: row.name,
          email: row.email,
          phone: row.phone,
          matchedBy: duplicate.matchedBy
        });
        return;
      }

      // Create the lead
      const leadData = {
        name: row.name.trim(),
        email: row.email ? row.email.trim().toLowerCase() : undefined,
        phone: row.phone ? row.phone.trim() : undefined,
        status: this.validateStatus(row.status) || 'new',
        notes: row.notes ? [{ content: row.notes.trim() }] : []
      };

      const lead = await leadService.createLeadWithAgentId(leadData, agentId);

      // Set follow-up if specified (check multiple column name variations)
      const followUpDaysValue = row.followUpDays || row.followupdays || row.follow_up_days || row.followUpDays;
      logger.info(`Checking follow-up days for lead ${lead.name}: ${followUpDaysValue}`);
      
      if (followUpDaysValue && !isNaN(parseInt(followUpDaysValue))) {
        const days = parseInt(followUpDaysValue);
        logger.info(`Setting follow-up for lead ${lead._id}: ${days} days`);
        if (days > 0) {
          try {
            await leadService.setFollowUpWithAgentId(lead._id.toString(), 'id', days, agentId, row.notes || `Follow-up scheduled for ${days} days`);
            logger.info(`Follow-up set successfully for lead ${lead._id}`);
          } catch (followUpError) {
            logger.error(`Error setting follow-up for lead ${lead._id}:`, followUpError);
          }
        }
      }

      results.summary.created++;
      results.details.created.push({
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        status: lead.status
      });

    } catch (error) {
      logger.error('Error processing lead row:', error);
      results.summary.rejected++;
      results.details.rejected.push({
        name: row.name || 'Invalid Name',
        email: row.email || 'No email',
        phone: row.phone || 'No phone',
        error: error.message || 'Processing error'
      });
    }
  }

  /**
   * Validate lead data from CSV row
   * @param {Object} row - CSV row data
   * @returns {Object} - Validation result
   */
  validateLeadData(row) {
    // Check required fields
    if (!row.name || row.name.trim().length === 0) {
      return { valid: false, error: 'Name is required' };
    }

    if (!row.email || row.email.trim().length === 0) {
      return { valid: false, error: 'Email is required' };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(row.email.trim())) {
      return { valid: false, error: 'Invalid email format' };
    }

    // Validate phone format if provided
    if (row.phone && row.phone.trim().length > 0) {
      const phoneRegex = /^[\d\s\-\+\(\)\.]{10,}$/;
      if (!phoneRegex.test(row.phone.trim())) {
        return { valid: false, error: 'Invalid phone format' };
      }
    }

    // Validate followUpDays if provided
    if (row.followUpDays && row.followUpDays.trim().length > 0) {
      const days = parseInt(row.followUpDays);
      if (isNaN(days) || days < 0) {
        return { valid: false, error: 'Follow-up days must be a positive number' };
      }
    }

    return { valid: true };
  }

  /**
   * Check if lead already exists (duplicate detection)
   * @param {Object} row - CSV row data
   * @param {string} agentId - Agent's ID
   * @returns {Promise<Object|null>} - Duplicate info or null
   */
  async checkForDuplicate(row, agentId) {
    try {
      const Lead = require('../models/Lead');

      // Check by email first
      if (row.email) {
        const existingByEmail = await Lead.findOne({
          email: { $regex: new RegExp(row.email.trim(), 'i') },
          agentId: agentId
        });
        if (existingByEmail) {
          return { matchedBy: 'email' };
        }
      }

      // Check by phone if provided
      if (row.phone) {
        const normalizedPhone = row.phone.replace(/\D/g, '');
        if (normalizedPhone.length >= 10) {
          const existingByPhone = await Lead.findOne({
            phone: { $regex: new RegExp(normalizedPhone, 'i') },
            agentId: agentId
          });
          if (existingByPhone) {
            return { matchedBy: 'phone' };
          }
        }
      }

      return null;
    } catch (error) {
      logger.error('Error checking for duplicates:', error);
      return null;
    }
  }

  /**
   * Validate and normalize status value
   * @param {string} status - Status from CSV
   * @returns {string|null} - Valid status or null
   */
  validateStatus(status) {
    if (!status) return null;
    
    const validStatuses = ['new', 'contacted', 'qualified', 'proposal_sent', 'closed', 'lost'];
    const normalizedStatus = status.trim().toLowerCase();
    
    return validStatuses.includes(normalizedStatus) ? normalizedStatus : null;
  }

  /**
   * Download sample CSV file
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async downloadSampleCSV(req, res) {
    try {
      const sampleData = `name,email,phone,status,followUpDays,notes
John Smith,john.smith@example.com,555-123-4567,new,7,Interested in downtown property
Jane Doe,jane.doe@email.com,555-987-6543,contacted,14,Looking for family home
Mike Johnson,mike.j@company.com,555-456-7890,qualified,3,Ready to make offer
Sarah Wilson,sarah.wilson@gmail.com,555-321-0987,new,5,First-time buyer
David Brown,david.brown@outlook.com,555-555-1234,contacted,10,Investment property interest
Lisa Garcia,lisa.garcia@yahoo.com,555-777-8888,new,7,Relocating from another state
Robert Taylor,robert.t@business.com,555-999-0000,qualified,2,Commercial property inquiry
Emily Davis,emily.davis@email.net,555-111-2222,new,14,Downsizing home search
Christopher Lee,chris.lee@domain.com,555-333-4444,contacted,7,Luxury home buyer
Amanda White,amanda.white@service.com,555-666-7777,new,5,Young professional looking for condo`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="sample-leads.csv"');
      res.send(sampleData);
    } catch (error) {
      logger.error('Error generating sample CSV:', error);
      res.status(500).json({ error: 'Failed to generate sample CSV' });
    }
  }
}

module.exports = new WebController(); 