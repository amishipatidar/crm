const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Import the application components
const smsRoutes = require('../src/routes/sms');
const Agent = require('../src/models/Agent');
const Lead = require('../src/models/Lead');

describe('SMS Webhook API Response Tests', () => {
  let mongoServer;
  let app;
  let testAgent;

  const TEST_AGENT_PHONE = '+1234567890';
  const TWILIO_WEBHOOK_DATA = {
    AccountSid: 'AC123456789',
    From: TEST_AGENT_PHONE,
    To: '+1987654321',
    MessageSid: 'SM123456789abcdef',
    NumMedia: '0'
  };

  beforeAll(async () => {
    // Setup in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Setup Express app for testing
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // Add SMS routes
    app.use('/api/sms', smsRoutes);
  });

  beforeEach(async () => {
    // Clear database
    await Agent.deleteMany({});
    await Lead.deleteMany({});

    // Create test agent
    testAgent = new Agent({
      name: 'Test Agent',
      phoneNumber: TEST_AGENT_PHONE,
      email: 'test@agent.com',
      password: 'password123',
      role: 'agent'
    });
    await testAgent.save();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Helper function to send webhook request
  const sendWebhookRequest = (body, additionalData = {}) => {
    return request(app)
      .post('/api/sms/webhook')
      .send({
        ...TWILIO_WEBHOOK_DATA,
        Body: body,
        ...additionalData
      });
  };

  describe('Webhook Response Format Tests', () => {
    test('Should return 200 status for valid webhook', async () => {
      const response = await sendWebhookRequest('help');
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/xml/);
    });

    test('Should return TwiML response format', async () => {
      const response = await sendWebhookRequest('help');
      
      expect(response.text).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(response.text).toContain('<Response>');
      expect(response.text).toContain('<Message>');
      expect(response.text).toContain('</Message>');
      expect(response.text).toContain('</Response>');
    });

    test('Should escape special characters in TwiML', async () => {
      // Create a lead with special characters
      await new Lead({
        name: 'John & Jane <Test>',
        email: 'test@example.com',
        phone: '555-123-4567',
        status: 'new',
        agentId: testAgent._id.toString()
      }).save();

      const response = await sendWebhookRequest('Show status for John & Jane <Test>');
      
      expect(response.status).toBe(200);
      // Check that special characters are properly escaped in XML
      expect(response.text).toContain('&amp;');
      expect(response.text).toContain('&lt;');
      expect(response.text).toContain('&gt;');
    });
  });

  describe('Command Response Content Tests', () => {
    test('CREATE_LEAD - Should return success message with lead details', async () => {
      const response = await sendWebhookRequest('Add lead: Jane Doe, jane@example.com, 555-987-6543');
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('✅ Created: Jane Doe');
      expect(response.text).toContain('📊 Manage in your CRM dashboard');
      
      // Verify the response is wrapped in TwiML
      expect(response.text).toContain('<Message>');
      expect(response.text).toContain('</Message>');
    });

    test('CREATE_LEAD with follow-up - Should include follow-up information', async () => {
      const response = await sendWebhookRequest('Add lead: Bob Smith, bob@example.com, 555-111-2222, follow up in 5 days');
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('✅ Created: Bob Smith');
      expect(response.text).toContain('📅 Follow-up in 5 days');
      expect(response.text).toContain('📊 Manage in your CRM dashboard');
    });

    test('UPDATE_LEAD - Should return update confirmation', async () => {
      // Create a lead first
      await new Lead({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-123-4567',
        status: 'new',
        agentId: testAgent._id.toString()
      }).save();

      const response = await sendWebhookRequest('Update lead John Doe status to qualified');
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('✅ John Doe updated: status');
      expect(response.text).toContain('📊 View in CRM dashboard');
    });

    test('SET_FOLLOWUP - Should return follow-up confirmation with date', async () => {
      // Create a lead first
      await new Lead({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-123-4567',
        status: 'new',
        agentId: testAgent._id.toString()
      }).save();

      const response = await sendWebhookRequest('Follow up John Doe in 3 days');
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('📅 Follow-up scheduled for John Doe');
      expect(response.text).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/); // Date format
      expect(response.text).toContain('📊 Manage in CRM dashboard');
    });

    test('GET_LEAD_STATUS - Should return comprehensive lead information', async () => {
      // Create a lead with follow-up
      const lead = await new Lead({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-123-4567',
        status: 'qualified',
        agentId: testAgent._id.toString(),
        followUps: [{
          scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          completed: false,
          notes: 'Test follow-up'
        }]
      }).save();

      const response = await sendWebhookRequest('Show status for John Doe');
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('📋 John Doe');
      expect(response.text).toContain('Status: qualified');
      expect(response.text).toContain('Email: john@example.com');
      expect(response.text).toContain('Phone: 555-123-4567');
      expect(response.text).toContain('📅 Next:');
      expect(response.text).toContain('📊 For full details, visit your CRM dashboard');
    });

    test('LIST_LEADS - Should return latest lead information', async () => {
      // Create multiple leads
      const leads = [
        {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '555-123-4567',
          status: 'new',
          agentId: testAgent._id.toString(),
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
        },
        {
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '555-987-6543',
          status: 'qualified',
          agentId: testAgent._id.toString(),
          createdAt: new Date() // Most recent
        }
      ];
      await Lead.insertMany(leads);

      const response = await sendWebhookRequest('List all leads');
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('📋 Latest Lead:');
      expect(response.text).toContain('Name: Jane Smith'); // Most recent lead
      expect(response.text).toContain('Status: qualified');
      expect(response.text).toContain('📊 For complete list, visit your CRM dashboard');
    });

    test('HELP - Should return formatted help message', async () => {
      const response = await sendWebhookRequest('help');
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('📋 SMS Commands:');
      expect(response.text).toContain('➕ Create:');
      expect(response.text).toContain('✏️ Update:');
      expect(response.text).toContain('📅 Follow-up:');
      expect(response.text).toContain('📊 Status:');
      expect(response.text).toContain('📋 List:');
      expect(response.text).toContain('💡 Use name, email, phone, or ID');
      expect(response.text).toContain('📊 For full management, visit your CRM dashboard');
    });
  });

  describe('Error Response Tests', () => {
    test('Should return user-friendly error for missing lead name in create', async () => {
      const response = await sendWebhookRequest('Add lead: , jane@example.com, 555-987-6543');
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('❌ Please provide a name for the new lead');
    });

    test('Should return error for lead not found', async () => {
      const response = await sendWebhookRequest('Update lead NonExistent status to qualified');
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('Lead not found: NonExistent');
    });

    test('Should return error for missing follow-up identifier', async () => {
      const response = await sendWebhookRequest('Follow up in 3 days');
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('❌ Please provide a lead name or ID for follow-up');
    });

    test('Should return error for missing follow-up days', async () => {
      const response = await sendWebhookRequest('Follow up John Doe');
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('❌ Please specify how many days from now for the follow-up');
    });

    test('Should handle multiple records error gracefully', async () => {
      // Create duplicate leads
      const duplicateLeads = [
        {
          name: 'John Doe',
          email: 'john1@example.com',
          phone: '555-111-1111',
          status: 'new',
          agentId: testAgent._id.toString()
        },
        {
          name: 'John Doe',
          email: 'john2@example.com',
          phone: '555-222-2222',
          status: 'qualified',
          agentId: testAgent._id.toString()
        }
      ];
      await Lead.insertMany(duplicateLeads);

      const response = await sendWebhookRequest('Update lead John Doe status to contacted');
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('You have 2 records with the same name: "John Doe"');
      expect(response.text).toContain('Please use more specific information like email or phone number');
    });

    test('Should return generic error for unknown commands', async () => {
      const response = await sendWebhookRequest('This is not a valid command');
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('Unknown command. Send "help" for available commands');
    });

    test('Should handle database errors gracefully', async () => {
      // Temporarily disconnect from database to simulate error
      await mongoose.disconnect();

      const response = await sendWebhookRequest('List all leads');
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('Sorry, there was an error processing your request');

      // Reconnect for cleanup
      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
    });
  });

  describe('Response Length and Format Tests', () => {
    test('Should keep responses under SMS character limit', async () => {
      // Create a lead with very long name and details
      const longLead = await new Lead({
        name: 'This Is A Very Long Lead Name That Could Potentially Cause Issues With SMS Character Limits',
        email: 'verylongemailaddress@verylongdomainname.com',
        phone: '555-123-4567',
        status: 'new',
        agentId: testAgent._id.toString()
      }).save();

      const response = await sendWebhookRequest('Show status for This Is A Very Long Lead Name That Could Potentially Cause Issues With SMS Character Limits');
      
      expect(response.status).toBe(200);
      // SMS character limit is typically 160 characters per message, but modern systems handle longer messages
      // We'll check that the response is reasonable but not excessively long
      const messageContent = response.text.match(/<Message>(.*?)<\/Message>/s);
      if (messageContent) {
        expect(messageContent[1].length).toBeLessThan(1600); // 10x SMS limit for safety
      }
    });

    test('Should format phone numbers consistently in responses', async () => {
      // Create lead with formatted phone number
      await new Lead({
        name: 'Phone Test',
        email: 'phone@example.com',
        phone: '+1-555-123-4567',
        status: 'new',
        agentId: testAgent._id.toString()
      }).save();

      const response = await sendWebhookRequest('Show status for Phone Test');
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('Phone:');
      // Should contain the phone number in some consistent format
      expect(response.text).toMatch(/Phone:\s*[\+\-\d\s\(\)]+/);
    });

    test('Should handle emoji characters properly in responses', async () => {
      const response = await sendWebhookRequest('help');
      
      expect(response.status).toBe(200);
      // Should contain various emoji characters
      expect(response.text).toContain('📋');
      expect(response.text).toContain('➕');
      expect(response.text).toContain('✏️');
      expect(response.text).toContain('📅');
      expect(response.text).toContain('📊');
      expect(response.text).toContain('💡');
    });
  });

  describe('Response Timing Tests', () => {
    test('Should respond within reasonable time limit', async () => {
      const startTime = Date.now();
      
      const response = await sendWebhookRequest('List all leads');
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
    });

    test('Should handle concurrent requests properly', async () => {
      const promises = [];
      
      // Send 5 concurrent requests
      for (let i = 0; i < 5; i++) {
        promises.push(sendWebhookRequest(`Add lead: Concurrent Lead ${i}, test${i}@example.com`));
      }
      
      const responses = await Promise.all(promises);
      
      // All should succeed
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.text).toContain(`✅ Created: Concurrent Lead ${index}`);
      });
      
      // Verify all leads were created
      const createdLeads = await Lead.find({ name: /^Concurrent Lead \d+$/ });
      expect(createdLeads.length).toBe(5);
    });
  });

  describe('Agent Auto-Creation Response Tests', () => {
    test('Should handle new agent registration seamlessly', async () => {
      const newAgentPhone = '+9999999999';
      
      const response = await request(app)
        .post('/api/sms/webhook')
        .send({
          ...TWILIO_WEBHOOK_DATA,
          From: newAgentPhone,
          Body: 'Add lead: New Agent Lead, new@example.com, 555-999-8888'
        });
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('✅ Created: New Agent Lead');
      
      // Verify agent was auto-created
      const createdAgent = await Agent.findOne({ phoneNumber: newAgentPhone });
      expect(createdAgent).toBeTruthy();
      expect(createdAgent.name).toContain('Agent'); // Auto-generated name
      
      // Verify lead was associated with new agent
      const createdLead = await Lead.findOne({ name: 'New Agent Lead' });
      expect(createdLead).toBeTruthy();
      expect(createdLead.agentId).toBe(createdAgent._id.toString());
    });
  });
});

module.exports = {
  // Export test utilities if needed
};
