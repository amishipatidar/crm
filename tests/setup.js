// Test setup and configuration
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
  process.env.GEMINI_API_KEY = 'test-gemini-key';
  
  // Suppress console logs during tests (optional)
  if (process.env.SUPPRESS_TEST_LOGS === 'true') {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  }
});

// Global test cleanup
afterAll(async () => {
  // Clean up any global resources
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

// Mock external services that we don't want to call during tests
jest.mock('../src/services/geminiService', () => ({
  parseMessage: jest.fn().mockImplementation((message) => {
    const lowerMessage = message.toLowerCase();
    
    // CREATE LEAD patterns
    if (lowerMessage.includes('add lead')) {
      const parts = message.split(',');
      const nameMatch = message.match(/add lead:?\s*([^,]+)/i);
      const emailMatch = message.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      const phoneMatch = message.match(/([\d\-\(\)\s]{10,})/);
      const statusMatch = message.match(/status\s+(\w+)/i);
      const followUpMatch = message.match(/follow\s+up\s+in\s+(\d+)\s+(days?|weeks?|months?)/i);
      
      const command = {
        command: 'create_lead',
        data: {
          name: nameMatch ? nameMatch[1].trim() : 'Unknown',
          email: emailMatch ? emailMatch[1] : null,
          phone: phoneMatch ? phoneMatch[1].trim() : null,
          status: statusMatch ? statusMatch[1] : 'new'
        }
      };
      
      if (followUpMatch) {
        let days = parseInt(followUpMatch[1]);
        const unit = followUpMatch[2].toLowerCase();
        if (unit.includes('week')) days *= 7;
        if (unit.includes('month')) days *= 30;
        command.followUp = { days };
      }
      
      return command;
    }
    
    // UPDATE LEAD patterns
    if (lowerMessage.includes('update lead')) {
      const leadMatch = message.match(/update\s+lead\s+([^,\s]+(?:\s+[^,\s]+)*?)(?:\s+status|\s+email|\s+phone|$)/i);
      const statusMatch = message.match(/status\s+(?:to\s+)?(\w+)/i);
      const emailMatch = message.match(/email\s+(?:to\s+)?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
      const phoneMatch = message.match(/phone\s+(?:to\s+)?([\d\s\-\(\)]+)/i);
      
      const updateFields = {};
      if (statusMatch) updateFields.status = statusMatch[1];
      if (emailMatch) updateFields.email = emailMatch[1];
      if (phoneMatch) updateFields.phone = phoneMatch[1].trim();
      
      // Handle multiple field updates
      const parts = message.split(',');
      if (parts.length > 1) {
        for (let i = 1; i < parts.length; i++) {
          const part = parts[i].trim();
          const partStatusMatch = part.match(/status\s+(?:to\s+)?(\w+)/i);
          const partPhoneMatch = part.match(/phone\s+(?:to\s+)?([\d\s\-\(\)]+)/i);
          if (partStatusMatch) updateFields.status = partStatusMatch[1];
          if (partPhoneMatch) updateFields.phone = partPhoneMatch[1].trim();
        }
      }
      
      return {
        command: 'update_lead',
        data: {
          leadIdentifier: leadMatch ? leadMatch[1].trim() : null,
          identifierType: 'name',
          updateFields
        }
      };
    }
    
    // FOLLOW UP patterns
    if (lowerMessage.includes('follow up')) {
      const leadMatch = message.match(/follow\s+up\s+([^,\s]+(?:\s+[^,\s]+)*?)\s+in\s+/i);
      const daysMatch = message.match(/in\s+(\d+)\s+(days?|weeks?|months?)/i);
      
      let days = 1;
      if (daysMatch) {
        days = parseInt(daysMatch[1]);
        const unit = daysMatch[2].toLowerCase();
        if (unit.includes('week')) days *= 7;
        if (unit.includes('month')) days *= 30;
      }
      
      return {
        command: 'set_followup',
        data: {
          leadIdentifier: leadMatch ? leadMatch[1].trim() : null,
          identifierType: leadMatch && leadMatch[1].includes('@') ? 'email' : 
                         leadMatch && /[\d\-\(\)\s]/.test(leadMatch[1]) ? 'phone' : 'name'
        },
        followUp: { days }
      };
    }
    
    // STATUS patterns
    if (lowerMessage.includes('show status') || lowerMessage.includes('status for')) {
      const leadMatch = message.match(/(?:show\s+status\s+for|status\s+for)\s+([^,\s]+(?:\s+[^,\s]+)*)/i);
      const identifier = leadMatch ? leadMatch[1].trim() : null;
      
      return {
        command: 'get_lead_status',
        data: {
          leadIdentifier: identifier,
          identifierType: identifier && identifier.includes('@') ? 'email' : 
                         identifier && /[\d\-\(\)\s]/.test(identifier) ? 'phone' : 'name'
        }
      };
    }
    
    // LIST patterns
    if (lowerMessage.includes('list') && lowerMessage.includes('lead')) {
      const filterMatch = message.match(/list\s+(\w+)\s+leads/i);
      
      return {
        command: 'list_leads',
        data: {
          filter: filterMatch ? filterMatch[1] : 'all'
        }
      };
    }
    
    // HELP patterns
    if (lowerMessage.trim() === 'help') {
      return {
        command: 'help'
      };
    }
    
    // Default fallback
    return {
      command: 'unknown',
      data: {}
    };
  })
}));

// Mock Twilio service
jest.mock('../src/services/twilioService', () => ({
  sendSMS: jest.fn().mockResolvedValue({
    sid: 'SM123456789',
    status: 'sent'
  }),
  validateWebhook: jest.fn().mockReturnValue(true)
}));

// Mock logger to avoid cluttering test output
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

module.exports = {
  // Test utilities can be exported here
};
