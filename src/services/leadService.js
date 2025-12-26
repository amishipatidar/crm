const Lead = require('../models/Lead');
const Agent = require('../models/Agent');
const logger = require('../utils/logger');

class LeadService {
  /**
   * Find or create agent by phone number
   * @param {string} agentPhone - Agent's phone number
   * @returns {Promise<Object>} - Agent object
   */
  async findOrCreateAgent(agentPhone) {
    try {
      let agent = await Agent.findOne({ phoneNumber: agentPhone });
      if (!agent) {
        // Create agent with default email if not provided
        const defaultEmail = `sms-agent-${Date.now()}@example.com`;
        agent = await Agent.create({
          name: 'SMS Agent',
          phoneNumber: agentPhone,
          email: defaultEmail,
          password: 'temp123' // Will be updated when agent registers
        });
        logger.info(`Created new agent for phone: ${agentPhone}`);
      }
      return agent;
    } catch (error) {
      logger.error('Error finding or creating agent:', error);
      throw error;
    }
  }

  /**
   * Create a new lead
   * @param {Object} leadData - Lead information
   * @param {string} agentPhone - Agent's phone number
   * @returns {Promise<Object>} - Created lead
   */
  async createLead(leadData, agentPhone) {
    try {
      const agent = await this.findOrCreateAgent(agentPhone);

      const lead = new Lead({
        ...leadData,
        agentId: agent._id.toString()
      });

      const savedLead = await lead.save();
      logger.info(`Created new lead: ${savedLead._id} for agent: ${agent.name}`);

      return savedLead;
    } catch (error) {
      logger.error('Error creating lead:', error);
      throw error;
    }
  }

  /**
   * Create a new lead with agent ID (for web interface)
   * @param {Object} leadData - Lead information
   * @param {string} agentId - Agent's ID
   * @returns {Promise<Object>} - Created lead
   */
  async createLeadWithAgentId(leadData, agentId) {
    try {
      const lead = new Lead({
        ...leadData,
        agentId: agentId
      });

      const savedLead = await lead.save();
      logger.info(`Created new lead: ${savedLead._id} for agent: ${agentId}`);

      return savedLead;
    } catch (error) {
      logger.error('Error creating lead:', error);
      throw error;
    }
  }

  /**
   * Find lead by name, ID, email, or phone number
   * @param {string} identifier - Lead name, ID, email, or phone
   * @param {string} identifierType - 'name', 'id', 'email', or 'phone'
   * @param {string} agentPhone - Agent's phone number
   * @returns {Promise<Object>} - Found lead
   */
  async findLeadByIdentifier(identifier, identifierType, agentPhone) {
    try {
      const agent = await this.findOrCreateAgent(agentPhone);

      let leads;
      if (identifierType === 'id') {
        // Search by MongoDB ObjectId (should be unique)
        leads = await Lead.find({
          _id: identifier,
          agentId: agent._id.toString()
        });
      } else if (identifierType === 'email') {
        // Search by email (case-insensitive)
        leads = await Lead.find({
          email: { $regex: new RegExp(identifier, 'i') },
          agentId: agent._id.toString()
        });
      } else if (identifierType === 'phone') {
        // Search by phone number (flexible regex to match 555-123 vs 555123)
        const digits = identifier.replace(/\D/g, '');
        // Create regex like: 5.*5.*5.* leading/trailing allowed
        // Actually best is to match the sequence of digits with optional separators
        const flexibleRegex = digits.split('').join('[-\\s.]*');
        
        leads = await Lead.find({
          phone: { $regex: new RegExp(flexibleRegex, 'i') },
          agentId: agent._id.toString()
        });
      } else {
        // Default: Search by name (case-insensitive)
        leads = await Lead.find({
          name: { $regex: new RegExp(identifier, 'i') },
          agentId: agent._id.toString()
        });
      }

      if (leads.length === 0) {
        throw new Error(`Lead not found: ${identifier}`);
      }

      if (leads.length > 1) {
        const count = leads.length;
        const identifierTypeText = identifierType === 'id' ? 'ID' :
          identifierType === 'email' ? 'email' :
            identifierType === 'phone' ? 'phone number' : 'name';
        throw new Error(`MULTIPLE_RECORDS: You have ${count} records with the same ${identifierTypeText}: "${identifier}". Please use more specific information like email or phone number.`);
      }

      return leads[0];
    } catch (error) {
      logger.error('Error finding lead:', error);
      throw error;
    }
  }

  /**
   * Update an existing lead
   * @param {string} identifier - Lead name, ID, email, or phone
   * @param {string} identifierType - 'name', 'id', 'email', or 'phone'
   * @param {Object} updateFields - Fields to update
   * @param {string} agentPhone - Agent's phone number
   * @returns {Promise<Object>} - Updated lead
   */
  async updateLead(identifier, identifierType, updateFields, agentPhone) {
    try {
      const agent = await this.findOrCreateAgent(agentPhone);

      // First check for duplicates before updating
      let leads;
      if (identifierType === 'id') {
        // Search by MongoDB ObjectId (should be unique)
        leads = await Lead.find({
          _id: identifier,
          agentId: agent._id.toString()
        });
      } else if (identifierType === 'email') {
        // Search by email (case-insensitive)
        leads = await Lead.find({
          email: { $regex: new RegExp(identifier, 'i') },
          agentId: agent._id.toString()
        });
      } else if (identifierType === 'phone') {
        // Search by phone number (normalize for comparison)
        const normalizedPhone = identifier.replace(/\D/g, ''); // Remove non-digits
        leads = await Lead.find({
          phone: { $regex: new RegExp(normalizedPhone, 'i') },
          agentId: agent._id.toString()
        });
      } else {
        // Default: Search by name (case-insensitive)
        leads = await Lead.find({
          name: { $regex: new RegExp(identifier, 'i') },
          agentId: agent._id.toString()
        });
      }

      if (leads.length === 0) {
        throw new Error(`Lead not found: ${identifier}`);
      }

      if (leads.length > 1) {
        const count = leads.length;
        const identifierTypeText = identifierType === 'id' ? 'ID' :
          identifierType === 'email' ? 'email' :
            identifierType === 'phone' ? 'phone number' : 'name';
        throw new Error(`MULTIPLE_RECORDS: You have ${count} records with the same ${identifierTypeText}: "${identifier}". Please use more specific information like email or phone number.`);
      }

      // Now update the single lead
      let lead;
      if (identifierType === 'id') {
        // Update by MongoDB ObjectId
        lead = await Lead.findOneAndUpdate(
          { _id: identifier, agentId: agent._id.toString() },
          { $set: updateFields },
          { new: true, runValidators: true }
        );
      } else if (identifierType === 'email') {
        // Update by email (case-insensitive)
        lead = await Lead.findOneAndUpdate(
          {
            email: { $regex: new RegExp(identifier, 'i') },
            agentId: agent._id.toString()
          },
          { $set: updateFields },
          { new: true, runValidators: true }
        );
      } else if (identifierType === 'phone') {
        // Update by phone number (normalize for comparison)
        const normalizedPhone = identifier.replace(/\D/g, ''); // Remove non-digits
        lead = await Lead.findOneAndUpdate(
          {
            phone: { $regex: new RegExp(normalizedPhone, 'i') },
            agentId: agent._id.toString()
          },
          { $set: updateFields },
          { new: true, runValidators: true }
        );
      } else {
        // Update by name (case-insensitive)
        lead = await Lead.findOneAndUpdate(
          {
            name: { $regex: new RegExp(identifier, 'i') },
            agentId: agent._id.toString()
          },
          { $set: updateFields },
          { new: true, runValidators: true }
        );
      }

      logger.info(`Updated lead: ${lead._id}`);
      return lead;
    } catch (error) {
      logger.error('Error updating lead:', error);
      throw error;
    }
  }

  /**
   * Set follow-up for a lead with agent ID (for web interface)
   * @param {string} identifier - Lead name, ID, email, or phone
   * @param {string} identifierType - 'name', 'id', 'email', or 'phone'
   * @param {number} days - Days from now
   * @param {string} agentId - Agent's ID
   * @param {string} notes - Optional follow-up notes
   * @returns {Promise<Object>} - Updated lead
   */
  async setFollowUpWithAgentId(identifier, identifierType, days, agentId, notes = '') {
    try {
      // First check for duplicates before setting follow-up
      let leads;
      if (identifierType === 'id') {
        // Search by MongoDB ObjectId (should be unique)
        leads = await Lead.find({
          _id: identifier,
          agentId: agentId
        });
      } else if (identifierType === 'email') {
        // Search by email (case-insensitive)
        leads = await Lead.find({
          email: { $regex: new RegExp(identifier, 'i') },
          agentId: agentId
        });
      } else if (identifierType === 'phone') {
        // Search by phone number (normalize for comparison)
        const normalizedPhone = identifier.replace(/\D/g, ''); // Remove non-digits
        leads = await Lead.find({
          phone: { $regex: new RegExp(normalizedPhone, 'i') },
          agentId: agentId
        });
      } else {
        // Default: Search by name (case-insensitive)
        leads = await Lead.find({
          name: { $regex: new RegExp(identifier, 'i') },
          agentId: agentId
        });
      }

      if (leads.length === 0) {
        throw new Error('Lead not found');
      }

      if (leads.length > 1) {
        const identifierTypeText = identifierType === 'id' ? 'ID' : identifierType;
        throw new Error(`MULTIPLE_RECORDS: You have ${leads.length} records with the same ${identifierTypeText}: "${identifier}". Please use more specific information like email or phone number.`);
      }

      const lead = leads[0];
      const followUpDate = new Date();
      followUpDate.setDate(followUpDate.getDate() + days);

      // Set individual follow-up fields
      lead.followUpDate = followUpDate;
      lead.followUpDays = days;
      lead.followUpSet = true;

      // Also add to followUps array for dashboard display
      lead.followUps.push({
        scheduledDate: followUpDate,
        completed: false,
        notes: notes || `Follow-up scheduled for ${days} days from now`,
        createdAt: new Date()
      });

      const updatedLead = await lead.save();
      logger.info(`Set follow-up for lead: ${updatedLead._id} in ${days} days`);

      return updatedLead;
    } catch (error) {
      logger.error('Error setting follow-up:', error);
      throw error;
    }
  }

  /**
   * Set follow-up for a lead
   * @param {string} identifier - Lead name, ID, email, or phone
   * @param {string} identifierType - 'name', 'id', 'email', or 'phone'
   * @param {number} days - Days from now
   * @param {string} agentPhone - Agent's phone number
   * @returns {Promise<Object>} - Updated lead
   */
  async setFollowUp(identifier, identifierType, days, agentPhone) {
    try {
      const agent = await this.findOrCreateAgent(agentPhone);

      // First check for duplicates before setting follow-up
      let leads;
      if (identifierType === 'id') {
        // Search by MongoDB ObjectId (should be unique)
        leads = await Lead.find({
          _id: identifier,
          agentId: agent._id.toString()
        });
      } else if (identifierType === 'email') {
        // Search by email (case-insensitive)
        leads = await Lead.find({
          email: { $regex: new RegExp(identifier, 'i') },
          agentId: agent._id.toString()
        });
      } else if (identifierType === 'phone') {
        // Search by phone number (normalize for comparison)
        const normalizedPhone = identifier.replace(/\D/g, ''); // Remove non-digits
        leads = await Lead.find({
          phone: { $regex: new RegExp(normalizedPhone, 'i') },
          agentId: agent._id.toString()
        });
      } else {
        // Default: Search by name (case-insensitive)
        leads = await Lead.find({
          name: { $regex: new RegExp(identifier, 'i') },
          agentId: agent._id.toString()
        });
      }

      if (leads.length === 0) {
        throw new Error(`Lead not found: ${identifier}`);
      }

      if (leads.length > 1) {
        const count = leads.length;
        const identifierTypeText = identifierType === 'id' ? 'ID' :
          identifierType === 'email' ? 'email' :
            identifierType === 'phone' ? 'phone number' : 'name';
        throw new Error(`MULTIPLE_RECORDS: You have ${count} records with the same ${identifierTypeText}: "${identifier}". Please use more specific information like email or phone number.`);
      }

      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + days);

      // Now set follow-up for the single lead
      let lead;
      if (identifierType === 'id') {
        // Set follow-up by MongoDB ObjectId
        lead = await Lead.findOneAndUpdate(
          { _id: identifier, agentId: agent._id.toString() },
          {
            $push: {
              followUps: {
                scheduledDate,
                notes: `Follow-up scheduled for ${days} days from now`
              }
            }
          },
          { new: true }
        );
      } else if (identifierType === 'email') {
        // Set follow-up by email (case-insensitive)
        lead = await Lead.findOneAndUpdate(
          {
            email: { $regex: new RegExp(identifier, 'i') },
            agentId: agent._id.toString()
          },
          {
            $push: {
              followUps: {
                scheduledDate,
                notes: `Follow-up scheduled for ${days} days from now`
              }
            }
          },
          { new: true }
        );
      } else if (identifierType === 'phone') {
        // Set follow-up by phone number (normalize for comparison)
        const normalizedPhone = identifier.replace(/\D/g, ''); // Remove non-digits
        lead = await Lead.findOneAndUpdate(
          {
            phone: { $regex: new RegExp(normalizedPhone, 'i') },
            agentId: agent._id.toString()
          },
          {
            $push: {
              followUps: {
                scheduledDate,
                notes: `Follow-up scheduled for ${days} days from now`
              }
            }
          },
          { new: true }
        );
      } else {
        // Set follow-up by name (case-insensitive)
        lead = await Lead.findOneAndUpdate(
          {
            name: { $regex: new RegExp(identifier, 'i') },
            agentId: agent._id.toString()
          },
          {
            $push: {
              followUps: {
                scheduledDate,
                notes: `Follow-up scheduled for ${days} days from now`
              }
            }
          },
          { new: true }
        );
      }

      logger.info(`Set follow-up for lead: ${lead._id} on ${scheduledDate}`);
      return lead;
    } catch (error) {
      logger.error('Error setting follow-up:', error);
      throw error;
    }
  }

  /**
   * Get lead status and information
   * @param {string} identifier - Lead name or ID
   * @param {string} identifierType - 'name' or 'id'
   * @param {string} agentPhone - Agent's phone number
   * @returns {Promise<Object>} - Lead information
   */
  async getLeadStatus(identifier, identifierType, agentPhone) {
    try {
      const lead = await this.findLeadByIdentifier(identifier, identifierType, agentPhone);
      return lead;
    } catch (error) {
      logger.error('Error getting lead status:', error);
      throw error;
    }
  }

  /**
   * List leads with optional filters
   * @param {Object} filter - Filter options
   * @param {string} agentPhone - Agent's phone number
   * @returns {Promise<Array>} - List of leads
   */
  async listLeads(filter, agentPhone) {
    try {
      const agent = await this.findOrCreateAgent(agentPhone);

      let query = { agentId: agent._id.toString() };

      // Apply filters
      if (filter && filter.filter === 'status' && filter.status) {
        query.status = filter.status;
      }

      const leads = await Lead.find(query)
        .sort({ createdAt: -1 })
        .limit(10);

      return leads;
    } catch (error) {
      logger.error('Error listing leads:', error);
      throw error;
    }
  }

  /**
   * Get lead information (legacy method)
   * @param {string} leadId - Lead ID
   * @param {string} agentPhone - Agent's phone number
   * @returns {Promise<Object>} - Lead information
   */
  async getLead(leadId, agentPhone) {
    return this.getLeadStatus(leadId, 'id', agentPhone);
  }

  /**
   * Get a specific lead by ID with agent ID (for web interface)
   * @param {string} leadId - Lead ID
   * @param {string} agentId - Agent's ID
   * @returns {Promise<Object>} - Lead object
   */
  async getLeadWithAgentId(leadId, agentId) {
    try {
      const lead = await Lead.findOne({
        _id: leadId,
        agentId: agentId
      });

      if (!lead) {
        throw new Error('Lead not found');
      }

      return lead;
    } catch (error) {
      logger.error('Error getting lead with agent ID:', error);
      throw error;
    }
  }

  /**
   * Get all leads for an agent (legacy method)
   * @param {string} agentPhone - Agent's phone number
   * @returns {Promise<Array>} - List of leads
   */
  async getAgentLeads(agentPhone) {
    return this.listLeads({ filter: 'all' }, agentPhone);
  }

  /**
   * Get all leads for an agent with agent ID (for web interface)
   * @param {string} agentId - Agent's ID
   * @returns {Promise<Array>} - List of leads
   */
  async getAgentLeadsWithAgentId(agentId) {
    try {
      const leads = await Lead.find({ agentId: agentId }).sort({ createdAt: -1 });
      return leads;
    } catch (error) {
      logger.error('Error getting agent leads with agent ID:', error);
      throw error;
    }
  }

  /**
   * Add note to lead
   * @param {string} leadId - Lead ID
   * @param {string} note - Note content
   * @param {string} agentPhone - Agent's phone number
   * @returns {Promise<Object>} - Updated lead
   */
  async addNote(leadId, note, agentPhone) {
    try {
      const agent = await this.findOrCreateAgent(agentPhone);

      const lead = await Lead.findOneAndUpdate(
        { _id: leadId, agentId: agent._id.toString() },
        {
          $push: {
            notes: {
              content: note
            }
          }
        },
        { new: true }
      );

      if (!lead) {
        throw new Error('Lead not found or access denied');
      }

      logger.info(`Added note to lead: ${leadId}`);
      return lead;
    } catch (error) {
      logger.error('Error adding note:', error);
      throw error;
    }
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
}

module.exports = new LeadService(); 