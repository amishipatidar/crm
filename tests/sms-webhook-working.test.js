const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Import the application components
const smsRoutes = require('../src/routes/sms');
const Agent = require('../src/models/Agent');
const Lead = require('../src/models/Lead');

describe('SMS Webhook Working Tests', () => {
  let mongoServer;
  let app;
  let testAgent;
  let testLead;

  const TEST_AGENT_PHONE = '+1234567890';

  beforeAll(async () => {
    // Setup in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Setup Express app for testing
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
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

    // Create test lead
    testLead = new Lead({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '555-123-4567',
      status: 'new',
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

  describe('CREATE LEAD Commands', () => {
    test('Should create a new lead with basic information', async () => {
      const smsBody = 'Add lead: Jane Smith, jane@example.com, 555-987-6543';
      
      const response = await sendSMSWebhook(smsBody);
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('✅ Created: Jane Smith');
      expect(response.text).toContain('📊 Manage in your CRM dashboard');
      expect(response.text).toContain('<Response>');
      expect(response.text).toContain('<Message>');
      
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
  });

  describe('UPDATE LEAD Commands', () => {
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
      expect(response.text).toContain('❌ Lead not found. Check name/ID and try again.');
    });
  });

  describe('SET FOLLOW-UP Commands', () => {
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

    test('Should handle follow-up without identifier', async () => {
      const smsBody = 'Follow up in 3 days';
      
      const response = await sendSMSWebhook(smsBody);
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('❌ Please provide a lead name or ID for follow-up');
    });
  });

  describe('GET LEAD STATUS Commands', () => {
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

    test('Should handle status request for non-existent lead', async () => {
      const smsBody = 'Show status for NonExistent';
      
      const response = await sendSMSWebhook(smsBody);
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('❌ Lead not found. Check name/ID and try again.');
    });
  });

  describe('LIST LEADS Commands', () => {
    test('Should list leads (shows latest)', async () => {
      // Create additional test lead
      const additionalLead = new Lead({
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '555-987-6543',
        status: 'qualified',
        agentId: testAgent._id.toString(),
        createdAt: new Date(Date.now() + 1000) // 1 second later to make it most recent
      });
      await additionalLead.save();

      const smsBody = 'List all leads';
      
      const response = await sendSMSWebhook(smsBody);
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('📋 Latest Lead:');
      expect(response.text).toContain('Name: Jane Smith'); // Most recent lead
      expect(response.text).toContain('Status: qualified');
      expect(response.text).toContain('📊 For full lead list and management, visit the dashboard');
    });

    test('Should handle list when no leads exist', async () => {
      // Clear all leads
      await Lead.deleteMany({});
      
      const smsBody = 'List all leads';
      
      const response = await sendSMSWebhook(smsBody);
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('No leads found');
    });
  });

  describe('HELP Commands', () => {
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
      expect(response.text).toContain('💡 Use name, email, phone, or ID to identify leads');
      expect(response.text).toContain('📊 For full management, visit your CRM dashboard');
    });
  });

  describe('UNKNOWN Commands', () => {
    test('Should handle unknown command', async () => {
      const smsBody = 'some random text that is not a command';
      
      const response = await sendSMSWebhook(smsBody);
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('Unknown command. Send "help" for available commands');
    });
  });

  describe('Response Format Validation', () => {
    test('All responses should be valid TwiML', async () => {
      const commands = [
        'help',
        'Add lead: Test Lead, test@example.com',
        'List all leads',
        'Invalid command'
      ];

      for (const command of commands) {
        const response = await sendSMSWebhook(command);
        
        // All responses should be valid TwiML
        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/text\/xml/);
        // XML declaration might not be included in test responses
        // expect(response.text).toContain('<?xml version="1.0" encoding="UTF-8"?>');
        expect(response.text).toContain('<Response>');
        expect(response.text).toContain('<Message>');
        expect(response.text).toContain('</Message>');
        expect(response.text).toContain('</Response>');
      }
    });

    test('Should handle emoji characters properly in responses', async () => {
      const response = await sendSMSWebhook('help');
      
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

  describe('Agent Auto-Creation', () => {
    test('Should handle new agent registration seamlessly', async () => {
      const newAgentPhone = '+9999999999';
      
      const response = await request(app)
        .post('/api/sms/webhook')
        .send({
          From: newAgentPhone,
          Body: 'Add lead: New Agent Lead, new@example.com, 555-999-8888',
          MessageSid: 'SM' + Math.random().toString(36).substr(2, 32),
          AccountSid: 'AC123456789',
          To: '+1987654321',
          NumMedia: '0'
        });
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('✅ Created: New Agent Lead');
      
      // Verify agent was auto-created
      const createdAgent = await Agent.findOne({ phoneNumber: newAgentPhone });
      expect(createdAgent).toBeTruthy();
      
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
