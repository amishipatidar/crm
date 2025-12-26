/**
 * Example Webhook Test
 * 
 * This file demonstrates how to test specific webhook scenarios
 * and validate the exact API responses you should expect.
 * 
 * Use this as a reference for testing your own custom commands
 * or when debugging webhook issues.
 */

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Import your application components
const smsRoutes = require('../src/routes/sms');
const Agent = require('../src/models/Agent');
const Lead = require('../src/models/Lead');

describe('Example Webhook Tests - Real Scenarios', () => {
  let mongoServer;
  let app;
  let testAgent;

  const AGENT_PHONE = '+14122524516'; // Use your actual agent phone
  
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use('/api/sms', smsRoutes);

    // Create test agent with the phone number from logs
    testAgent = new Agent({
      name: 'Test Agent',
      phoneNumber: AGENT_PHONE,
      email: 'test@agent.com',
      password: 'password123',
      role: 'agent'
    });
    await testAgent.save();
  });

  beforeEach(async () => {
    await Lead.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Helper to send webhook like Twilio does
  const sendTwilioWebhook = (body) => {
    return request(app)
      .post('/api/sms/webhook')
      .send({
        AccountSid: 'AC123456789',
        From: AGENT_PHONE,
        To: '+1987654321',
        Body: body,
        MessageSid: 'SM' + Math.random().toString(36).substr(2, 32),
        NumMedia: '0'
      });
  };

  describe('Real-world Command Examples', () => {
    test('Example 1: Create lead with follow-up (from your logs)', async () => {
      // This matches the command from your terminal logs
      const command = 'Update: John Jingleheimer, jingle@janhkr.com, 555-234-7890, status contacted, follow up in 1 weeks';
      
      const response = await sendTwilioWebhook(command);
      
      // Expected API Response
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/xml/);
      
      // The response should be TwiML format
      expect(response.text).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(response.text).toContain('<Response>');
      expect(response.text).toContain('<Message>');
      
      // Should create the lead since it doesn't exist
      expect(response.text).toContain('✅ Created: John Jingleheimer');
      expect(response.text).toContain('📅 Follow-up in 7 days'); // 1 week = 7 days
      expect(response.text).toContain('📊 Manage in your CRM dashboard');
      
      // Verify in database
      const createdLead = await Lead.findOne({ name: 'John Jingleheimer' });
      expect(createdLead).toBeTruthy();
      expect(createdLead.email).toBe('jingle@janhkr.com');
      expect(createdLead.phone).toBe('555-234-7890');
      expect(createdLead.status).toBe('contacted');
      expect(createdLead.followUps.length).toBeGreaterThan(0);
    });

    test('Example 2: Update existing lead', async () => {
      // First create a lead
      const existingLead = new Lead({
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '555-123-4567',
        status: 'new',
        agentId: testAgent._id.toString()
      });
      await existingLead.save();

      // Now update it
      const command = 'Update lead Jane Smith status to qualified';
      
      const response = await sendTwilioWebhook(command);
      
      // Expected API Response
      expect(response.status).toBe(200);
      expect(response.text).toContain('✅ Jane Smith updated: status');
      expect(response.text).toContain('📊 View in CRM dashboard');
      
      // Verify update in database
      const updatedLead = await Lead.findById(existingLead._id);
      expect(updatedLead.status).toBe('qualified');
    });

    test('Example 3: Set follow-up for existing lead', async () => {
      // Create existing lead
      const existingLead = new Lead({
        name: 'Bob Wilson',
        email: 'bob@example.com',
        phone: '555-987-6543',
        status: 'contacted',
        agentId: testAgent._id.toString()
      });
      await existingLead.save();

      const command = 'Follow up Bob Wilson in 5 days';
      
      const response = await sendTwilioWebhook(command);
      
      // Expected API Response
      expect(response.status).toBe(200);
      expect(response.text).toContain('📅 Follow-up scheduled for Bob Wilson');
      expect(response.text).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/); // Should contain date
      expect(response.text).toContain('📊 Manage in CRM dashboard');
      
      // Verify follow-up was added
      const updatedLead = await Lead.findById(existingLead._id);
      expect(updatedLead.followUps.length).toBeGreaterThan(0);
      
      const followUp = updatedLead.followUps[0];
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 5);
      expect(new Date(followUp.scheduledDate).toDateString()).toBe(expectedDate.toDateString());
    });

    test('Example 4: Get lead status', async () => {
      // Create lead with follow-up
      const leadWithFollowUp = new Lead({
        name: 'Alice Johnson',
        email: 'alice@example.com',
        phone: '555-111-2222',
        status: 'qualified',
        agentId: testAgent._id.toString(),
        followUps: [{
          scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
          completed: false,
          notes: 'Initial follow-up'
        }]
      });
      await leadWithFollowUp.save();

      const command = 'Show status for Alice Johnson';
      
      const response = await sendTwilioWebhook(command);
      
      // Expected API Response
      expect(response.status).toBe(200);
      expect(response.text).toContain('📋 Alice Johnson');
      expect(response.text).toContain('Status: qualified');
      expect(response.text).toContain('Email: alice@example.com');
      expect(response.text).toContain('Phone: 555-111-2222');
      expect(response.text).toContain('📅 Next:');
      expect(response.text).toContain('📊 For full details, visit your CRM dashboard');
    });

    test('Example 5: List leads', async () => {
      // Create multiple leads
      const leads = [
        {
          name: 'Lead One',
          email: 'lead1@example.com',
          status: 'new',
          agentId: testAgent._id.toString(),
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
        },
        {
          name: 'Lead Two',
          email: 'lead2@example.com',
          status: 'qualified',
          agentId: testAgent._id.toString(),
          createdAt: new Date() // Most recent
        }
      ];
      await Lead.insertMany(leads);

      const command = 'List all leads';
      
      const response = await sendTwilioWebhook(command);
      
      // Expected API Response
      expect(response.status).toBe(200);
      expect(response.text).toContain('📋 Latest Lead:');
      expect(response.text).toContain('Name: Lead Two'); // Most recent
      expect(response.text).toContain('Status: qualified');
      expect(response.text).toContain('📊 For complete list, visit your CRM dashboard');
    });

    test('Example 6: Help command', async () => {
      const command = 'help';
      
      const response = await sendTwilioWebhook(command);
      
      // Expected API Response
      expect(response.status).toBe(200);
      expect(response.text).toContain('📋 SMS Commands:');
      expect(response.text).toContain('➕ Create: "Add lead: John Doe, john@email.com, 555-123-4567"');
      expect(response.text).toContain('✏️ Update: "Update lead John status to qualified"');
      expect(response.text).toContain('📅 Follow-up: "Follow up John in 3 days"');
      expect(response.text).toContain('📊 Status: "Show status for John"');
      expect(response.text).toContain('📋 List: "List all leads"');
      expect(response.text).toContain('💡 Use name, email, phone, or ID to identify leads');
      expect(response.text).toContain('📊 For full management, visit your CRM dashboard');
    });
  });

  describe('Error Scenarios from Logs', () => {
    test('Lead not found error (from your logs)', async () => {
      // This matches the error from your logs where the lead wasn't found
      const command = 'Follow up jingle@janhkr.com in 1 week';
      
      const response = await sendTwilioWebhook(command);
      
      // Expected API Response for error
      expect(response.status).toBe(200); // Twilio expects 200 even for errors
      expect(response.text).toContain('Lead not found: jingle@janhkr.com');
    });

    test('Multiple records error', async () => {
      // Create duplicate leads
      const duplicates = [
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
      await Lead.insertMany(duplicates);

      const command = 'Update lead John Doe status to contacted';
      
      const response = await sendTwilioWebhook(command);
      
      // Expected API Response for multiple records
      expect(response.status).toBe(200);
      expect(response.text).toContain('You have 2 records with the same name: "John Doe"');
      expect(response.text).toContain('Please use more specific information like email or phone number');
    });

    test('Invalid command', async () => {
      const command = 'This is not a valid command';
      
      const response = await sendTwilioWebhook(command);
      
      // Expected API Response for unknown command
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
        const response = await sendTwilioWebhook(command);
        
        // All responses should be valid TwiML
        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/text\/xml/);
        expect(response.text).toContain('<?xml version="1.0" encoding="UTF-8"?>');
        expect(response.text).toContain('<Response>');
        expect(response.text).toContain('<Message>');
        expect(response.text).toContain('</Message>');
        expect(response.text).toContain('</Response>');
        
        // Should not contain unescaped special characters
        const messageContent = response.text.match(/<Message>(.*?)<\/Message>/s);
        if (messageContent && messageContent[1].includes('<') && !messageContent[1].includes('&lt;')) {
          // If it contains < but not &lt;, it's not properly escaped
          expect(messageContent[1]).not.toMatch(/<(?!\/Message>)/);
        }
      }
    });
  });
});

// Export helper functions for use in other tests
module.exports = {
  // You can export utility functions here if needed
};
