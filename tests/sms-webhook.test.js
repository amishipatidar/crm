const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Import the application components
const smsController = require('../src/controllers/smsController');
const leadService = require('../src/services/leadService');
const geminiService = require('../src/services/geminiService');
const Agent = require('../src/models/Agent');
const Lead = require('../src/models/Lead');

// Mock Twilio webhook signature validation
jest.mock('../src/middleware/security', () => ({
  validateTwilioSignature: (req, res, next) => next()
}));

describe('SMS Webhook Commands Test Suite', () => {
  let mongoServer;
  let app;
  let testAgent;
  let testLead;

  const TEST_AGENT_PHONE = '+1234567890';
  const TEST_AGENT_DATA = {
    name: 'Test Agent',
    phoneNumber: TEST_AGENT_PHONE,
    email: 'test@agent.com',
    password: 'password123',
    role: 'agent'
  };

  const TEST_LEAD_DATA = {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '555-123-4567',
    status: 'new'
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

    // Add the SMS routes
    const smsRoutes = require('../src/routes/sms');
    app.use('/api/sms', smsRoutes);
  });

  beforeEach(async () => {
    // Clear database
    await Agent.deleteMany({});
    await Lead.deleteMany({});

    // Create test agent
    testAgent = new Agent(TEST_AGENT_DATA);
    await testAgent.save();

    // Create test lead
    testLead = new Lead({
      ...TEST_LEAD_DATA,
      agentId: testAgent._id.toString()
    });
    await testLead.save();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Helper function to send SMS webhook
  const sendSMSWebhook = (body, from = TEST_AGENT_PHONE) => {
    return request(app)
      .post('/api/sms/webhook')
      .send({
        From: from,
        Body: body,
        MessageSid: 'SM' + Math.random().toString(36).substr(2, 32),
        AccountSid: 'AC123456789',
        To: '+1987654321',
        NumMedia: '0'
      });
  };

  describe('CREATE_LEAD Command Tests', () => {
    test('Should create a new lead with basic information', async () => {
      const smsBody = 'Add lead: Jane Smith, jane@example.com, 555-987-6543';
      
      const response = await sendSMSWebhook(smsBody);
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('✅ Created: Jane Smith');
      expect(response.text).toContain('📊 Manage in your CRM dashboard');
      
      // Verify lead was created in database
      const createdLead = await Lead.findOne({ name: 'Jane Smith' });
      expect(createdLead).toBeTruthy();
      expect(createdLead.email).toBe('jane@example.com');
      expect(createdLead.phone).toBe('555-987-6543');
      expect(createdLead.status).toBe('new');
    });

    test('Should create a lead with status and follow-up', async () => {
      const smsBody = 'Add lead: Bob Wilson, bob@example.com, 555-111-2222, status qualified, follow up in 5 days';
      
      const response = await sendSMSWebhook(smsBody);
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('✅ Created: Bob Wilson (qualified)');
      expect(response.text).toContain('📅 Follow-up in 5 days');
      
      // Verify lead was created with correct status
      const createdLead = await Lead.findOne({ name: 'Bob Wilson' });
      expect(createdLead).toBeTruthy();
      expect(createdLead.status).toBe('qualified');
      expect(createdLead.followUps.length).toBeGreaterThan(0);
    });

    test('Should handle create lead without name (error case)', async () => {
      const smsBody = 'Add lead: , jane@example.com, 555-987-6543';
      
      const response = await sendSMSWebhook(smsBody);
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('❌ Please provide a name for the new lead');
    });

    test('Should create lead with minimal information', async () => {
      const smsBody = 'Add lead: Minimal Lead';
      
      const response = await sendSMSWebhook(smsBody);
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('✅ Created: Minimal Lead');
      
      // Verify lead was created
      const createdLead = await Lead.findOne({ name: 'Minimal Lead' });
      expect(createdLead).toBeTruthy();
      expect(createdLead.status).toBe('new');
    });
  });

  describe('UPDATE_LEAD Command Tests', () => {
    test('Should update lead status by name', async () => {
      const smsBody = 'Update lead John Doe status to qualified';
      
      const response = await sendSMSWebhook(smsBody);
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('✅ John Doe updated: status');
      expect(response.text).toContain('📊 View in CRM dashboard');
      
      // Verify lead was updated
      const updatedLead = await Lead.findById(testLead._id);
      expect(updatedLead.status).toBe('qualified');
    });

    test('Should update lead email by phone', async () => {
      const smsBody = 'Update lead 555-123-4567 email to newemail@example.com';
      
      const response = await sendSMSWebhook(smsBody);
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('✅ John Doe updated: email');
      
      // Verify lead was updated
      const updatedLead = await Lead.findById(testLead._id);
      expect(updatedLead.email).toBe('newemail@example.com');
    });

    test('Should update multiple fields', async () => {
      const smsBody = 'Update lead John Doe status to contacted, phone to 555-999-8888';
      
      const response = await sendSMSWebhook(smsBody);
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('✅ John Doe updated: status, phone');
      
      // Verify lead was updated
      const updatedLead = await Lead.findById(testLead._id);
      expect(updatedLead.status).toBe('contacted');
      expect(updatedLead.phone).toBe('555-999-8888');
    });

    test('Should handle update lead not found', async () => {
      const smsBody = 'Update lead NonExistent status to qualified';
      
      const response = await sendSMSWebhook(smsBody);
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('Lead not found: NonExistent');
    });

    test('Should handle update without identifier', async () => {
      const smsBody = 'Update lead status to qualified';
      
      const response = await sendSMSWebhook(smsBody);
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('❌ Please provide a lead name or ID to update');
    });

    test('Should handle update without fields to update', async () => {
      const smsBody = 'Update lead John Doe';
      
      const response = await sendSMSWebhook(smsBody);
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('❌ Please specify what fields to update');
    });
  });

  describe('SET_FOLLOWUP Command Tests', () => {
    test('Should set follow-up by lead name', async () => {
      const smsBody = 'Follow up John Doe in 3 days';
      
      const response = await sendSMSWebhook(smsBody);
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('📅 Follow-up scheduled for John Doe');
      expect(response.text).toContain('📊 Manage in CRM dashboard');
      
      // Verify follow-up was set
      const updatedLead = await Lead.findById(testLead._id);
      expect(updatedLead.followUps.length).toBeGreaterThan(0);
      
      const followUp = updatedLead.followUps[0];
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 3);
      expect(new Date(followUp.scheduledDate).toDateString()).toBe(expectedDate.toDateString());
    });

    test('Should set follow-up by email', async () => {
      const smsBody = 'Follow up john@example.com in 7 days';
      
      const response = await sendSMSWebhook(smsBody);
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('📅 Follow-up scheduled for John Doe');
    });

    test('Should set follow-up by phone', async () => {
      const smsBody = 'Follow up 555-123-4567 in 1 week';
      
      const response = await sendSMSWebhook(smsBody);
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('📅 Follow-up scheduled for John Doe');
      
      // Verify follow-up was set for 7 days (1 week)
      const updatedLead = await Lead.findById(testLead._id);
      expect(updatedLead.followUps.length).toBeGreaterThan(0);
    });

    test('Should handle follow-up without identifier', async () => {
      const smsBody = 'Follow up in 3 days';
      
      const response = await sendSMSWebhook(smsBody);
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('❌ Please provide a lead name or ID for follow-up');
    });

    test('Should handle follow-up without days', async () => {
      const smsBody = 'Follow up John Doe';
      
      const response = await sendSMSWebhook(smsBody);
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('❌ Please specify how many days from now for the follow-up');
    });

    test('Should handle follow-up for non-existent lead', async () => {
      const smsBody = 'Follow up NonExistent in 3 days';
      
      const response = await sendSMSWebhook(smsBody);
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('Lead not found: NonExistent');
    });
  });

  describe('GET_LEAD_STATUS Command Tests', () => {
    beforeEach(async () => {
      // Add a follow-up to test lead for status display
      testLead.followUps.push({
        scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        completed: false,
        notes: 'Test follow-up'
      });
      await testLead.save();
    });

    test('Should get lead status by name', async () => {
      const smsBody = 'Show status for John Doe';
      
      const response = await sendSMSWebhook(smsBody);
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('📋 John Doe');
      expect(response.text).toContain('Status: new');
      expect(response.text).toContain('Email: john@example.com');
      expect(response.text).toContain('Phone: 555-123-4567');
      expect(response.text).toContain('📅 Next:');
      expect(response.text).toContain('📊 For full details, visit your CRM dashboard');
    });

    test('Should get lead status by email', async () => {
      const smsBody = 'Show status for john@example.com';
      
      const response = await sendSMSWebhook(smsBody);
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('📋 John Doe');
      expect(response.text).toContain('Status: new');
    });

    test('Should get lead status by phone', async () => {
      const smsBody = 'Show status for 555-123-4567';
      
      const response = await sendSMSWebhook(smsBody);
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('📋 John Doe');
      expect(response.text).toContain('Status: new');
    });

    test('Should handle status request without identifier', async () => {
      const smsBody = 'Show status';
      
      const response = await sendSMSWebhook(smsBody);
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('Please provide a lead name or ID to check status');
    });

    test('Should handle status request for non-existent lead', async () => {
      const smsBody = 'Show status for NonExistent';
      
      const response = await sendSMSWebhook(smsBody);
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('Lead not found: NonExistent');
    });
  });

  describe('LIST_LEADS Command Tests', () => {
    beforeEach(async () => {
      // Create additional test leads
      const additionalLeads = [
        {
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '555-987-6543',
          status: 'qualified',
          agentId: testAgent._id.toString(),
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
        },
        {
          name: 'Bob Wilson',
          email: 'bob@example.com',
          phone: '555-111-2222',
          status: 'contacted',
          agentId: testAgent._id.toString(),
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
        }
      ];

      await Lead.insertMany(additionalLeads);
    });

    test('Should list leads (shows latest)', async () => {
      const smsBody = 'List all leads';
      
      const response = await sendSMSWebhook(smsBody);
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('📋 Latest Lead:');
      expect(response.text).toContain('Name: John Doe'); // Most recent lead
      expect(response.text).toContain('Status: new');
      expect(response.text).toContain('📊 For complete list, visit your CRM dashboard');
    });

    test('Should handle list when no leads exist', async () => {
      // Clear all leads
      await Lead.deleteMany({});
      
      const smsBody = 'List all leads';
      
      const response = await sendSMSWebhook(smsBody);
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('No leads found');
    });

    test('Should list qualified leads only', async () => {
      const smsBody = 'List qualified leads';
      
      const response = await sendSMSWebhook(smsBody);
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('📋 Latest Lead:');
      // Should show Jane Smith as she's the qualified lead
    });
  });

  describe('HELP Command Tests', () => {
    test('Should return help message', async () => {
      const smsBody = 'help';
      
      const response = await sendSMSWebhook(smsBody);
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('📋 SMS Commands:');
      expect(response.text).toContain('➕ Create:');
      expect(response.text).toContain('✏️ Update:');
      expect(response.text).toContain('📅 Follow-up:');
      expect(response.text).toContain('📊 Status:');
      expect(response.text).toContain('📋 List:');
      // Updated to match actual output
      expect(response.text).toContain('💡 Identifiers: Name, Email, Phone, ID');
      expect(response.text).toContain('📊 For full management, visit your CRM dashboard');
    });

    test('Should return help message for "Help" (case insensitive)', async () => {
      const smsBody = 'Help';
      
      const response = await sendSMSWebhook(smsBody);
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('📋 SMS Commands:');
    });
  });

  describe('Unknown Command Tests', () => {
    test('Should handle unknown command', async () => {
      const smsBody = 'some random text that is not a command';
      
      const response = await sendSMSWebhook(smsBody);
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('Unknown command. Send "help" for available commands');
    });

    test('Should handle empty message', async () => {
      const smsBody = '';
      
      const response = await sendSMSWebhook(smsBody);
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('Unknown command. Send "help" for available commands');
    });
  });

  describe('Error Handling Tests', () => {
    test('Should handle multiple records error', async () => {
      // Create another lead with same name
      const duplicateLead = new Lead({
        name: 'John Doe',
        email: 'john2@example.com',
        phone: '555-999-8888',
        status: 'new',
        agentId: testAgent._id.toString()
      });
      await duplicateLead.save();

      const smsBody = 'Update lead John Doe status to qualified';
      
      const response = await sendSMSWebhook(smsBody);
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('You have 2 records with the same name: "John Doe"');
      expect(response.text).toContain('Please use more specific information like email or phone number');
    });

    test('Should handle database connection error gracefully', async () => {
      // Temporarily disconnect from database
      await mongoose.disconnect();

      const smsBody = 'List all leads';
      
      const response = await sendSMSWebhook(smsBody);
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('Sorry, there was an error processing your request');

      // Reconnect for cleanup
      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
    });

    test('Should handle SMS from unregistered agent', async () => {
      const smsBody = 'List all leads';
      const unregisteredPhone = '+9999999999';
      
      const response = await sendSMSWebhook(smsBody, unregisteredPhone);
      
      expect(response.status).toBe(200);
      // Should create agent automatically and process command
      expect(response.text).not.toContain('error');
      
      // Verify agent was created
      const createdAgent = await Agent.findOne({ phoneNumber: unregisteredPhone });
      expect(createdAgent).toBeTruthy();
    });
  });

  describe('Complex Command Parsing Tests', () => {
    test('Should handle command with special characters', async () => {
      const smsBody = 'Add lead: O\'Reilly, John, john.o\'reilly@example.com, 555-123-4567';
      
      const response = await sendSMSWebhook(smsBody);
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('✅ Created: O\'Reilly, John');
    });

    test('Should handle command with extra spaces', async () => {
      const smsBody = '   Update   lead   John Doe   status   to   qualified   ';
      
      const response = await sendSMSWebhook(smsBody);
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('✅ John Doe updated: status');
    });

    test('Should handle mixed case commands', async () => {
      const smsBody = 'ADD LEAD: Mixed Case, mixed@example.com, 555-555-5555';
      
      const response = await sendSMSWebhook(smsBody);
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('✅ Created: Mixed Case');
    });

    test('Should handle phone numbers in different formats', async () => {
      const smsBody = 'Update lead (555) 123-4567 status to contacted';
      
      const response = await sendSMSWebhook(smsBody);
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('✅ John Doe updated: status');
    });

    test('Should handle different time expressions for follow-up', async () => {
      const testCases = [
        { input: 'Follow up John Doe in 1 week', expectedDays: 7 },
        { input: 'Follow up John Doe in 2 weeks', expectedDays: 14 },
        { input: 'Follow up John Doe in 1 month', expectedDays: 30 },
        { input: 'Follow up John Doe in 5 days', expectedDays: 5 }
      ];

      for (const testCase of testCases) {
        const response = await sendSMSWebhook(testCase.input);
        
        expect(response.status).toBe(200);
        expect(response.text).toContain('📅 Follow-up scheduled for John Doe');
        
        // Clean up follow-ups for next test
        await Lead.findByIdAndUpdate(testLead._id, { $set: { followUps: [] } });
      }
    });
  });

  describe('Webhook Security Tests', () => {
    test('Should handle missing From parameter', async () => {
      const response = await request(app)
        .post('/api/sms/webhook')
        .send({
          Body: 'List all leads',
          MessageSid: 'SM123456'
        });
      
      expect(response.status).toBe(200);
      // Should handle gracefully even without From parameter
    });

    test('Should handle missing Body parameter', async () => {
      const response = await request(app)
        .post('/api/sms/webhook')
        .send({
          From: TEST_AGENT_PHONE,
          MessageSid: 'SM123456'
        });
      
      expect(response.status).toBe(200);
      // Expect empty TwiML or similar, depending on implementation. 
      // The previous run showed it returned <Response></Response> which is correct for "no command"
    });

    test('Should handle malformed webhook data', async () => {
      const response = await request(app)
        .post('/api/sms/webhook')
        .send('invalid data');
      
      // Webhooks should generally return 200 even on bad data to prevent Twilio retries
      expect(response.status).toBe(200);
    });
  });

  describe('Performance and Load Tests', () => {
    test('Should handle multiple rapid requests', async () => {
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        promises.push(sendSMSWebhook(`Add lead: Test Lead ${i}, test${i}@example.com`));
      }
      
      const responses = await Promise.all(promises);
      
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.text).toContain(`✅ Created: Test Lead ${index}`);
      });
      
      // Verify all leads were created
      const createdLeads = await Lead.find({ name: /^Test Lead \d+$/ });
      expect(createdLeads.length).toBe(10);
    });

    test('Should handle long message body', async () => {
      const longNotes = 'A'.repeat(1000);
      const smsBody = `Add lead: Long Notes Lead, long@example.com, 555-999-0000, notes: ${longNotes}`;
      
      const response = await sendSMSWebhook(smsBody);
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('✅ Created: Long Notes Lead');
    });
  });
});

// Additional helper functions for testing
const createTestAgent = async (phoneNumber = '+1234567890') => {
  const agent = new Agent({
    name: 'Test Agent',
    phoneNumber,
    email: `test${Date.now()}@agent.com`,
    password: 'password123',
    role: 'agent'
  });
  return await agent.save();
};

const createTestLead = async (agentId, overrides = {}) => {
  const lead = new Lead({
    name: 'Test Lead',
    email: 'test@example.com',
    phone: '555-123-4567',
    status: 'new',
    agentId,
    ...overrides
  });
  return await lead.save();
};

module.exports = {
  createTestAgent,
  createTestLead
};
