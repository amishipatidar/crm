const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');

class GeminiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
  }

  /**
   * Parse SMS message using Gemini AI
   * @param {string} message - SMS message to parse
   * @returns {Promise<Object>} - Parsed command object
   */
  async parseMessage(message) {
    try {
      // Check if API key is configured
      if (!process.env.GEMINI_API_KEY) {
        logger.warn('GEMINI_API_KEY not configured, using fallback parser');
        return this.fallbackParse(message);
      }

      const prompt = this.buildPrompt();
      const result = await this.model.generateContent([prompt, message]);
      const response = result.response.text();
      
      // Try to parse JSON response
      try {
        const parsed = JSON.parse(response);
        logger.info('Successfully parsed message with Gemini AI');
        return parsed;
      } catch (parseError) {
        logger.warn('Failed to parse Gemini response as JSON, using fallback parser');
        return this.fallbackParse(message);
      }
    } catch (error) {
      logger.error('Error calling Gemini API:', error);
      
      // Check for specific error types
      if (error.message.includes('fetch failed') || error.message.includes('ENOTFOUND')) {
        logger.error('Network error connecting to Gemini API - check internet connection');
      } else if (error.message.includes('API_KEY_INVALID') || error.message.includes('403')) {
        logger.error('Invalid Gemini API key - check GEMINI_API_KEY environment variable');
      } else if (error.message.includes('QUOTA_EXCEEDED')) {
        logger.error('Gemini API quota exceeded');
      }
      
      return this.fallbackParse(message);
    }
  }

  /**
   * Build prompt for Gemini AI
   * @returns {string} - Formatted prompt
   */
  buildPrompt() {
    return `Parse SMS messages from real estate agents into JSON commands for lead management.

COMMANDS: create_lead, update_lead, set_followup, get_lead_status, list_leads, send_booking_link, send_review_link, help

EXTRACT:
- Command type
- Lead info: name, email, phone, status
- Lead identifier: name, email, phone, or ID
- Follow-up days (if mentioned)

STATUS OPTIONS: new, contacted, qualified, proposal_sent, closed, lost

EXAMPLES:

"Add lead: John Doe, john@email.com, 555-123-4567" → {"command":"create_lead","data":{"name":"John Doe","email":"john@email.com","phone":"555-123-4567"}}

"Add lead: Jane Smith, jane@example.com, 555-999-8888, status contacted, follow up in 5 days" → {"command":"create_lead","data":{"name":"Jane Smith","email":"jane@example.com","phone":"555-999-8888","status":"contacted"},"followUp":{"days":5}}

"Update lead John status to qualified" → {"command":"update_lead","data":{"leadIdentifier":"John","identifierType":"name","updateFields":{"status":"qualified"}}}

"Follow up John in 3 days" → {"command":"set_followup","data":{"leadIdentifier":"John","identifierType":"name"},"followUp":{"days":3}}

"Show status for John" → {"command":"get_lead_status","data":{"leadIdentifier":"John","identifierType":"name"}}

"List all leads" → {"command":"list_leads","data":{"filter":"all"}}

"help" → {"command":"help"}

"Send booking link to John" → {"command":"send_booking_link","data":{"leadIdentifier":"John","identifierType":"name"}}

"Send review link to Sarah" → {"command":"send_review_link","data":{"leadIdentifier":"Sarah","identifierType":"name"}}

RESPOND WITH ONLY VALID JSON. NO EXPLANATIONS.`;
  }

  /**
   * Fallback parser for when Gemini AI fails
   * @param {string} message - SMS message to parse
   * @returns {Object} - Parsed command object
   */
  fallbackParse(message) {
    const lowerMessage = message.toLowerCase();
    
    // Help command
    if (lowerMessage.includes('help')) {
      return { command: 'help' };
    }
    
    // List leads command
    if (lowerMessage.includes('list') && lowerMessage.includes('lead')) {
      if (lowerMessage.includes('qualified')) {
        return {
          command: 'list_leads',
          data: { filter: 'status', status: 'qualified' }
        };
      }
      return {
        command: 'list_leads',
        data: { filter: 'all' }
      };
    }
    
    // Create lead command
    if (lowerMessage.includes('add') || lowerMessage.includes('create')) {
      const nameMatch = message.match(/(?:add|create)\s+lead[:\s]+([^,]+)/i);
      const emailMatch = message.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      const phoneMatch = message.match(/(\d{3}[-.]?\d{3}[-.]?\d{4})/);
      const statusMatch = message.match(/status\s+(new|contacted|qualified|proposal_sent|closed|lost)/i);
      
      // Extract follow-up information
      const followUpMatch = message.match(/follow\s+up\s+in\s+(\d+)\s+(days?|weeks?)/i);
      let followUp = null;
      
      if (followUpMatch) {
        let days = parseInt(followUpMatch[1]);
        const timeUnit = followUpMatch[2].toLowerCase();
        
        // Convert weeks to days
        if (timeUnit.includes('week')) {
          days = days * 7;
        }
        
        followUp = { days };
      }
      
      const result = {
        command: 'create_lead',
        data: {
          name: nameMatch ? nameMatch[1].trim() : 'Unknown',
          email: emailMatch ? emailMatch[1] : undefined,
          phone: phoneMatch ? phoneMatch[1] : undefined,
          status: statusMatch ? statusMatch[1].toLowerCase() : 'new'
        }
      };
      
      // Add follow-up if found
      if (followUp) {
        result.followUp = followUp;
      }
      
      return result;
    }
    
    // Update lead command
    if (lowerMessage.includes('update')) {
      // Try to identify lead by different methods
      let leadIdentifier = null;
      let identifierType = 'name';
      
      // First try to extract the lead identifier from "update lead [identifier]" pattern
      const leadPatternMatch = message.match(/update\s+lead\s+([^,\s]+(?:\s+[^,\s]+)*?)(?:\s+(?:email|phone|status))/i);
      
      if (leadPatternMatch) {
        const identifier = leadPatternMatch[1].trim();
        
        // Check if the identifier is an email
        if (identifier.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) {
          leadIdentifier = identifier;
          identifierType = 'email';
        }
        // Check if the identifier is a phone number
        else if (identifier.match(/^\d{3}[-.]?\d{3}[-.]?\d{4}$/)) {
          leadIdentifier = identifier;
          identifierType = 'phone';
        }
        // Check if the identifier is a MongoDB ID
        else if (identifier.match(/^[a-f0-9]{24}$/)) {
          leadIdentifier = identifier;
          identifierType = 'id';
        }
        // Default to name
        else {
          leadIdentifier = identifier;
          identifierType = 'name';
        }
      }
      // Fallback: try to extract name after "update lead"
      else {
        const nameMatch = message.match(/update\s+lead\s+([^,\s]+(?:\s+[^,\s]+)*)/i);
        if (nameMatch) {
          leadIdentifier = nameMatch[1].trim();
          identifierType = 'name';
        }
      }
      
      if (leadIdentifier) {
        const updateFields = {};
        const emailUpdateMatch = message.match(/email\s+(?:to\s+)?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
        const phoneUpdateMatch = message.match(/phone\s+(?:to\s+)?(\d{3}[-.]?\d{3}[-.]?\d{4})/i);
        const statusUpdateMatch = message.match(/status\s+(?:to\s+)?(new|contacted|qualified|proposal_sent|closed|lost)/i);
        
        if (emailUpdateMatch) updateFields.email = emailUpdateMatch[1];
        if (phoneUpdateMatch) updateFields.phone = phoneUpdateMatch[1];
        if (statusUpdateMatch) updateFields.status = statusUpdateMatch[1].toLowerCase();
        
        return {
          command: 'update_lead',
          data: {
            leadIdentifier,
            identifierType,
            updateFields
          }
        };
      }
    }
    
    // Set follow-up command
    if (lowerMessage.includes('follow') && lowerMessage.includes('up')) {
      // Try to identify lead by different methods
      let leadIdentifier = null;
      let identifierType = 'name';
      
      // Check for email
      const emailMatch = message.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (emailMatch) {
        leadIdentifier = emailMatch[1];
        identifierType = 'email';
      }
      // Check for phone
      else if (message.match(/\d{3}[-.]?\d{3}[-.]?\d{4}/)) {
        const phoneMatch = message.match(/(\d{3}[-.]?\d{3}[-.]?\d{4})/);
        leadIdentifier = phoneMatch[1];
        identifierType = 'phone';
      }
      // Check for MongoDB ID
      else if (message.match(/[a-f0-9]{24}/)) {
        const idMatch = message.match(/([a-f0-9]{24})/);
        leadIdentifier = idMatch[1];
        identifierType = 'id';
      }
      // Default to name
      else {
        const nameMatch = message.match(/follow\s+up\s+([^,\s]+(?:\s+[^,\s]+)*)/i);
        if (nameMatch) {
          leadIdentifier = nameMatch[1];
          identifierType = 'name';
        }
      }
      
      const daysMatch = message.match(/(\d+)\s+days?/);
      const days = daysMatch ? parseInt(daysMatch[1]) : 1;
      
      if (leadIdentifier) {
        return {
          command: 'set_followup',
          data: {
            leadIdentifier,
            identifierType
          },
          followUp: { days }
        };
      }
    }
    
    // Get lead status command
    if (lowerMessage.includes('status') || lowerMessage.includes('show')) {
      // Try to identify lead by different methods
      let leadIdentifier = null;
      let identifierType = 'name';
      
      // Check for email
      const emailMatch = message.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (emailMatch) {
        leadIdentifier = emailMatch[1];
        identifierType = 'email';
      }
      // Check for phone
      else if (message.match(/\d{3}[-.]?\d{3}[-.]?\d{4}/)) {
        const phoneMatch = message.match(/(\d{3}[-.]?\d{3}[-.]?\d{4})/);
        leadIdentifier = phoneMatch[1];
        identifierType = 'phone';
      }
      // Check for MongoDB ID
      else if (message.match(/[a-f0-9]{24}/)) {
        const idMatch = message.match(/([a-f0-9]{24})/);
        leadIdentifier = idMatch[1];
        identifierType = 'id';
      }
      // Default to name
      else {
        const nameMatch = message.match(/(?:status|show).*?lead\s+([^,\s]+(?:\s+[^,\s]+)*)/i);
        if (nameMatch) {
          leadIdentifier = nameMatch[1];
          identifierType = 'name';
        }
      }
      
      if (leadIdentifier) {
        return {
          command: 'get_lead_status',
          data: {
            leadIdentifier,
            identifierType
          }
        };
      }
    }
    
    // Send booking link command
    if (lowerMessage.includes('booking') && lowerMessage.includes('link')) {
      // FIX: Capture everything after "to " until the end or special char, allowing spaces
      const nameMatch = message.match(/to\s+([^,]+)/i);
      const identifier = nameMatch ? nameMatch[1].trim() : 'Unknown';
      let identifierType = 'name';

      if (identifier.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) {
        identifierType = 'email';
      } else if (identifier.match(/^\d{3}[-.]?\d{3}[-.]?\d{4}$/)) {
        identifierType = 'phone';
      }

      return {
        command: 'send_booking_link',
        data: { leadIdentifier: identifier, identifierType }
      };
    }

    // Send review link command
    if (lowerMessage.includes('review') && lowerMessage.includes('link')) {
      const nameMatch = message.match(/to\s+([^,\s]+)/i);
      const leadIdentifier = nameMatch ? nameMatch[1] : 'Unknown';
      return {
        command: 'send_review_link',
        data: { leadIdentifier, identifierType: 'name' }
      };
    }
    
    // Default to help
    return { command: 'help' };
  }
}

module.exports = new GeminiService(); 