
const twilioService = require('../services/twilioService');
const geminiService = require('../services/geminiService');
const leadService = require('../services/leadService');
const emailService = require('../services/emailService');
const socketService = require('../services/socketService');
const queueService = require('../services/queueService');
const ProcessedMessage = require('../models/ProcessedMessage');
const logger = require('../utils/logger');

// In-memory set to track responses sent in current session (prevents race conditions)
const sentResponses = new Set();

class SMSController {
  /**
   * Handle incoming SMS webhook from Twilio
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async handleIncomingSMS(req, res) {
    const messageSid = req.body.MessageSid;
    const { From: senderPhone, Body: messageBody } = req.body;
    let responseSent = false;

    try {
      logger.info('Received SMS webhook:', {
        from: senderPhone,
        body: messageBody,
        messageSid: messageSid
      });

      // Check if this message has already been processed or response already sent
      const existingMessage = await ProcessedMessage.findOne({ messageSid });
      if (existingMessage || sentResponses.has(messageSid)) {
        logger.info(`Message ${messageSid} already processed, preventing duplicate response`);
        
        // Return empty TwiML response to prevent duplicate messages
        // The user already received the response from the first webhook call
        res.type('text/xml');
        res.send('<Response></Response>');
        responseSent = true;
        return;
      }
      
      // Mark this message as being processed in memory immediately
      sentResponses.add(messageSid);

      // Mark message as being processed
      const processedMessage = new ProcessedMessage({
        messageSid,
        from: senderPhone,
        body: messageBody,
        status: 'processing'
      });
      await processedMessage.save();

      // Validate webhook (optional for development)
      if (process.env.NODE_ENV === 'production') {
        const signature = req.headers['x-twilio-signature'];
        const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
        
        if (!twilioService.validateWebhook(req, signature, url)) {
          logger.error('Invalid Twilio webhook signature');
          await ProcessedMessage.findOneAndUpdate(
            { messageSid },
            { status: 'failed', response: 'Invalid webhook signature' }
          );
          return res.status(403).send('Forbidden');
        }
      }

      // Parse message with Gemini AI
      const parsedCommand = await geminiService.parseMessage(messageBody);
      logger.info('Parsed command:', parsedCommand);

      // Execute command based on parsed result
      const response = await this.executeCommand(parsedCommand, senderPhone);

      // Update processed message with response
      await ProcessedMessage.findOneAndUpdate(
        { messageSid },
        { 
          status: 'completed', 
          response: response,
          command: parsedCommand.command
        }
      );

      // Return TwiML response (this is the primary way to respond to Twilio webhooks)
      // Only send if we haven't already sent a response
      if (!responseSent) {
        res.type('text/xml');
        res.send(`
          <Response>
            <Message>${response}</Message>
          </Response>
        `);
        responseSent = true;
        
        // Clean up in-memory tracking after successful response (prevent memory leaks)
        setTimeout(() => {
          sentResponses.delete(messageSid);
        }, 60000); // Remove after 1 minute
      }

    } catch (error) {
      logger.error('Error handling incoming SMS:', error);
      
      // Update processed message with error status
      try {
        await ProcessedMessage.findOneAndUpdate(
          { messageSid },
          { status: 'failed', response: 'Error processing message' }
        );
      } catch (updateError) {
        logger.error('Error updating processed message status:', updateError);
      }
      
      // Send user-friendly error response via TwiML
      const errorMessage = 'Sorry, there was an error processing your request. Please try again or contact support.';
      
      // Return TwiML error response only if we haven't already sent a response
      if (!responseSent) {
        res.type('text/xml');
        res.send(`
          <Response>
            <Message>${errorMessage}</Message>
          </Response>
        `);
        responseSent = true;
        
        // Clean up in-memory tracking after error response (prevent memory leaks)
        setTimeout(() => {
          sentResponses.delete(messageSid);
        }, 60000); // Remove after 1 minute
      }
    }
  }

  /**
   * Execute parsed command
   * @param {Object} command - Parsed command from AI
   * @param {string} agentPhone - Agent's phone number
   * @returns {Promise<string>} - Response message
   */
  async executeCommand(command, agentPhone) {
    try {
      switch (command.command) {
        case 'create_lead':
          return await this.handleCreateLead(command, agentPhone);

        case 'update_lead':
          return await this.handleUpdateLead(command, agentPhone);

        case 'set_followup':
          return await this.handleSetFollowUp(command, agentPhone);

        case 'get_lead_status':
          return await this.handleGetLeadStatus(command, agentPhone);

        case 'list_leads':
          return await this.handleListLeads(command, agentPhone);

        case 'help':
          return this.getHelpMessage();

        case 'send_booking_link':
          return await this.handleSendBookingLink(command, agentPhone);

        case 'send_review_link':
          return await this.handleSendReviewLink(command, agentPhone);

        default:
          return 'Unknown command. Send "help" for available commands.';
      }
    } catch (error) {
      logger.error('Error executing command:', error);
      
      // Handle multiple records error
      if (error.message.includes('MULTIPLE_RECORDS:')) {
        // Extract the user-friendly message from the error
        const userMessage = error.message.replace('MULTIPLE_RECORDS: ', '');
        return `⚠️ ${userMessage}`;
      }
      
      // Provide user-friendly error messages
      if (error.message.includes('Lead not found')) {
        return `❌ Lead not found. Check name/ID and try again.`;
      }
      
      if (error.message.includes('Agent validation failed') || error.message.includes('Agent not found')) {
        return '❌ Account issue. Contact support for help.';
      }
      
      if (error.message.includes('validation') || error.message.includes('required')) {
        return '❌ Missing required info. Check your message format.';
      }
      
      return `❌ Error processing request: ${error.message}`;
    }
  }

  /**
   * Handle create lead command
   * @param {Object} command - Parsed command
   * @param {string} agentPhone - Agent's phone number
   * @returns {Promise<string>} - Response message
   */
  async handleCreateLead(command, agentPhone) {
    const { data, followUp } = command;
    
    if (!data || !data.name) {
      return '❌ Please provide a name for the new lead.';
    }

    const lead = await leadService.createLead(data, agentPhone);
    socketService.emitLeadUpdate(lead, 'create');
    
    // Email Alerts (Non-blocking)
    emailService.sendAgentAlert(lead);
    emailService.sendClientWelcome(lead);
    
    // Keep response concise
    let response = `✅ Created: ${lead.name}`;
    if (data.status && data.status !== 'new') response += ` (${data.status})`;
    
    // Set follow-up if specified
    if (followUp && followUp.days) {
      await leadService.setFollowUp(lead._id.toString(), 'id', followUp.days, agentPhone);
      response += `\n📅 Follow-up in ${followUp.days} days`;
      
      // Schedule actual SMS
      if (lead.phone) {
        queueService.scheduleSMS(lead.phone, `Hi ${lead.name.split(' ')[0]}, just checking in!`, followUp.days * 24 * 60 * 60 * 1000);
      }
    }
    
    response += `\n📊 Manage in your CRM dashboard.`;
    
    return response;
  }

  /**
   * Handle update lead command
   * @param {Object} command - Parsed command
   * @param {string} agentPhone - Agent's phone number
   * @returns {Promise<string>} - Response message
   */
  async handleUpdateLead(command, agentPhone) {
    const { data } = command;
    
    if (!data || !data.leadIdentifier) {
      return '❌ Please provide a lead name or ID to update.';
    }

    if (!data.updateFields || Object.keys(data.updateFields).length === 0) {
      return '❌ Please specify what fields to update.';
    }

    const lead = await leadService.updateLead(
      data.leadIdentifier, 
      data.identifierType || 'name', 
      data.updateFields, 
      agentPhone
    );
    socketService.emitLeadUpdate(lead, 'update');
    
    const updatedFields = Object.keys(data.updateFields).join(', ');
    return `✅ ${lead.name} updated: ${updatedFields}\n📊 View in CRM dashboard.`;
  }

  /**
   * Handle set follow-up command
   * @param {Object} command - Parsed command
   * @param {string} agentPhone - Agent's phone number
   * @returns {Promise<string>} - Response message
   */
  async handleSetFollowUp(command, agentPhone) {
    const { data, followUp } = command;
    
    if (!data || !data.leadIdentifier) {
      return '❌ Please provide a lead name or ID for follow-up.';
    }

    if (!followUp || !followUp.days) {
      return '❌ Please specify how many days from now for the follow-up.';
    }

    const lead = await leadService.setFollowUp(
      data.leadIdentifier, 
      data.identifierType || 'name', 
      followUp.days, 
      agentPhone
    );
    socketService.emitLeadUpdate(lead, 'update');
    
    // Schedule actual SMS
    if (lead.phone) {
      queueService.scheduleSMS(lead.phone, `Hi ${lead.name.split(' ')[0]}, just checking in!`, followUp.days * 24 * 60 * 60 * 1000);
    }
    
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + followUp.days);
    
    return `📅 Follow-up scheduled for ${lead.name} on ${followUpDate.toLocaleDateString()}\n📊 Manage in CRM dashboard.`;
  }

  /**
   * Handle get lead status command
   * @param {Object} command - Parsed command
   * @param {string} agentPhone - Agent's phone number
   * @returns {Promise<string>} - Response message
   */
  async handleGetLeadStatus(command, agentPhone) {
    const { data } = command;
    
    if (!data || !data.leadIdentifier) {
      return 'Please provide a lead name or ID to check status.';
    }

    const lead = await leadService.getLeadStatus(
      data.leadIdentifier, 
      data.identifierType || 'name', 
      agentPhone
    );
    
    // Keep response concise for SMS
    let response = `📋 ${lead.name}\n`;
    response += `Status: ${lead.status}\n`;
    if (lead.email) response += `Email: ${lead.email}\n`;
    if (lead.phone) response += `Phone: ${lead.phone}\n`;
    
    // Show only next follow-up if exists
    if (lead.followUps && lead.followUps.length > 0) {
      const recentFollowUp = lead.followUps[lead.followUps.length - 1];
      response += `📅 Next: ${new Date(recentFollowUp.scheduledDate).toLocaleDateString()}\n`;
    }
    
    response += `\n📊 For full details, visit your CRM dashboard.`;
    
    return response;
  }

  /**
   * Handle list leads command
   * @param {Object} command - Parsed command
   * @param {string} agentPhone - Agent's phone number
   * @returns {Promise<string>} - Response message
   */
  async handleListLeads(command, agentPhone) {
    const { data } = command;
    const filter = data || { filter: 'all' };
    
    const leads = await leadService.listLeads(filter, agentPhone);
    
    if (leads.length === 0) {
      return 'No leads found.';
    }
    
    // Show only the latest lead
    const latestLead = leads[0];
    let response = `📋 Latest Lead:\n\n`;
    response += `Name: ${latestLead.name}\n`;
    response += `Status: ${latestLead.status}\n`;
    if (latestLead.email) response += `Email: ${latestLead.email}\n`;
    if (latestLead.phone) response += `Phone: ${latestLead.phone}\n`;
    response += `ID: ${latestLead._id}\n`;
    response += `Created: ${new Date(latestLead.createdAt).toLocaleDateString()}\n\n`;
    
    // Add dashboard reference
    response += `📊 For full lead list and management, visit the dashboard at your web portal.`;
    
    return response;
  }

  /**
   * Handle send booking link command
   */
  async handleSendBookingLink(command, agentPhone) {
    const { data } = command;
    if (!data || !data.leadIdentifier) return '❌ Specify a lead to send the link to.';

    const link = process.env.CALENDLY_LINK;
    if (!link || link.includes('your-link')) return '❌ Calendly link not configured in .env';

    const lead = await leadService.getLeadStatus(data.leadIdentifier, data.identifierType || 'name', agentPhone);
    if (!lead.phone) return `❌ Lead ${lead.name} has no phone number.`;

    const message = `Hi ${lead.name.split(' ')[0]}, here is the link to book our call: ${link}`;
    await twilioService.sendSMS(lead.phone, message);

    let responseMsg = `✅ Booking link sent to ${lead.name} via SMS (${lead.phone})`;

    // Send Email if available
    if (lead.email) {
        const emailSubject = `Let's schedule our call - ${lead.name}`;
        const emailBody = `Hi ${lead.name},\n\nLooking forward to speaking with you. Please choose a time that works best for you here:\n\n${link}\n\nBest,\nYour Agent`;
        const emailSent = await emailService.sendEmail({ 
            to: lead.email, 
            subject: emailSubject, 
            text: emailBody 
        });
        
        if (emailSent) {
            responseMsg += ` AND Email (${lead.email})`;
        }
    }

    return responseMsg;
  }

  /**
   * Handle send review link command
   */
  async handleSendReviewLink(command, agentPhone) {
    const { data } = command;
    if (!data || !data.leadIdentifier) return '❌ Specify a lead to send the link to.';

    const link = process.env.GOOGLE_REVIEW_LINK;
    if (!link || link.includes('your-review-link')) return '❌ Review link not configured in .env';

    const lead = await leadService.getLeadStatus(data.leadIdentifier, data.identifierType || 'name', agentPhone);
    if (!lead.phone) return `❌ Lead ${lead.name} has no phone number.`;

    const message = `Hi ${lead.name.split(' ')[0]}, thanks for working with us! Please leave a review here: ${link}`;
    await twilioService.sendSMS(lead.phone, message);

    return `✅ Review link sent to ${lead.name} (${lead.phone})`;
  }

  /**
   * Get help message
   * @returns {string} - Help message
   */
  getHelpMessage() {
    return `📋 SMS Commands:

➕ Create: "Add lead: John Doe..."
✏️ Update: "Update lead John..."
📅 Follow-up: "Follow up John in 3 days"
🔗 Booking: "Send booking link to John"
⭐ Review: "Send review link to John"
📊 Status: "Show status for John"
📋 List: "List all leads"

💡 Identifiers: Name, Email, Phone, ID`;
  }
}

module.exports = new SMSController(); 