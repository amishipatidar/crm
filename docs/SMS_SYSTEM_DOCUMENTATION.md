# SMS Lead Management System Documentation

## Overview
This system allows real estate agents to manage leads through SMS messages using natural language processing powered by Google Gemini AI. The system processes SMS commands and performs lead management operations automatically.

## Key Features
- ✅ **Natural Language Processing**: Understands conversational SMS commands
- ✅ **Duplicate Prevention**: Prevents processing the same message multiple times
- ✅ **Multiple Lead Identification**: Find leads by name, email, phone, or ID
- ✅ **Comprehensive Lead Management**: Create, update, view, and manage leads
- ✅ **Follow-up Scheduling**: Set automatic follow-up reminders
- ✅ **Dashboard Integration**: Full web interface for detailed management

## Available Operations

### 1. Create Lead
Create a new lead with contact information and optional follow-up scheduling.

**Command Examples:**
```
Add lead: John Doe, john@example.com, 555-123-4567
Add lead Jane Smith email jane@example.com phone 555-987-6543 status qualified
Add lead: Mike Johnson, mike@company.com, 555-456-7890, status contacted, follow up in 3 days
```

**Response Format:**
```
✅ Lead created: [Name] (ID: [LeadID])
Email: [Email]
Phone: [Phone]
Status: [Status]
📅 Follow-up scheduled in [X] days (if specified)
```

### 2. Update Lead
Update existing lead information using any identifier (name, email, phone, or ID).

**Command Examples:**
```
Update lead John Doe email to newemail@example.com
Update lead john@example.com status to qualified
Update lead 555-123-4567 phone to 555-999-8888
Update lead [LEAD_ID] status to proposal_sent
```

**Response Format:**
```
✅ Lead [Name] updated: [Updated Fields]
```

### 3. Set Follow-up
Schedule a follow-up reminder for any lead.

**Command Examples:**
```
Follow up John Doe in 3 days
Follow up john@example.com in 2 days
Follow up 555-123-4567 in 1 day
Follow up lead [LEAD_ID] in 5 days
```

**Response Format:**
```
📅 Follow-up scheduled for [Name] on [Date]
```

### 4. Get Lead Status
View detailed information about a specific lead.

**Command Examples:**
```
Show status for lead John Doe
Get lead status john@example.com
Show status for 555-123-4567
Get lead status [LEAD_ID]
```

**Response Format:**
```
📋 Lead Status: [Name]
ID: [LeadID]
Status: [Status]
Email: [Email]
Phone: [Phone]
Created: [Date]
📅 Next follow-up: [Date] (if scheduled)
```

### 5. List Leads
View the latest lead with reference to dashboard for full list.

**Command Examples:**
```
List all leads
List qualified leads
```

**Response Format:**
```
📋 Latest Lead:

Name: [Name]
Status: [Status]
Email: [Email]
Phone: [Phone]
ID: [LeadID]
Created: [Date]

📊 For full lead list and management, visit the dashboard at your web portal.
```

### 6. Help
Get a list of available commands and examples.

**Command:**
```
help
```

## Lead Status Options
- `new` - Newly created lead
- `contacted` - Initial contact made
- `qualified` - Lead is qualified and interested
- `proposal_sent` - Proposal has been sent
- `closed` - Deal closed successfully
- `lost` - Lead is no longer interested

## Lead Identification Methods
The system can identify leads using any of these methods:
- **Name**: "John Doe"
- **Email**: "john@example.com"
- **Phone**: "555-123-4567" (with or without formatting)
- **ID**: MongoDB ObjectId (24-character hex string)

## Natural Language Examples

### Creating Leads
- "Add a new lead named Sarah Wilson with email sarah@email.com"
- "Create lead: Tom Brown, 555-111-2222, status qualified"
- "Add lead Mike Davis email mike@company.com phone 555-333-4444 follow up in 2 days"

### Updating Leads
- "Change John's email to john.new@email.com"
- "Update Sarah's status to qualified"
- "Set Tom's phone number to 555-999-8888"

### Follow-ups
- "Remind me to follow up with John in 3 days"
- "Set follow-up for Sarah Wilson in 1 week"
- "Follow up with 555-123-4567 in 2 days"

### Status Checks
- "What's the status of John Doe?"
- "Show me information about sarah@email.com"
- "Get details for lead 555-123-4567"

## System Architecture

### Components
1. **SMS Controller**: Handles incoming SMS webhooks
2. **Gemini Service**: Natural language processing
3. **Lead Service**: Lead management operations
4. **Twilio Service**: SMS sending and webhook validation
5. **Processed Message Model**: Duplicate prevention

### Database Models
- **Lead**: Stores lead information and follow-ups
- **Agent**: Stores agent information
- **ProcessedMessage**: Prevents duplicate message processing

### Security Features
- Webhook signature validation (production)
- Rate limiting on webhook endpoints
- Message deduplication
- Input validation and sanitization

## Error Handling
The system provides user-friendly error messages for common issues:
- Lead not found
- Invalid command format
- Missing required information
- System errors

## Best Practices

### For Agents
1. **Be Specific**: Include names, emails, and phone numbers when creating leads
2. **Use Consistent Formatting**: Phone numbers work with or without formatting
3. **Set Follow-ups**: Use follow-up scheduling to stay organized
4. **Check Status**: Regularly check lead status to stay updated

### For System Administrators
1. **Monitor Logs**: Check application logs for errors and performance
2. **Database Maintenance**: ProcessedMessage records auto-expire after 7 days
3. **Rate Limiting**: Monitor rate limit usage and adjust if needed
4. **Webhook Security**: Ensure webhook signatures are validated in production

## Troubleshooting

### Common Issues
1. **Duplicate Messages**: Fixed with ProcessedMessage deduplication
2. **AI Parsing Errors**: Fallback parser handles most edge cases
3. **Twilio Limitations**: Trial accounts have sending restrictions
4. **Database Connection**: Check MongoDB connection and credentials

### Logs to Monitor
- SMS webhook reception
- Command parsing results
- Lead creation/updates
- SMS sending status
- Error messages and stack traces

## API Endpoints

### SMS Webhook
- **URL**: `/api/sms/webhook`
- **Method**: POST
- **Purpose**: Receives incoming SMS messages from Twilio

### Health Check
- **URL**: `/api/sms/health`
- **Method**: GET
- **Purpose**: System health monitoring

## Environment Variables
```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
MESSAGING_SERVICE=your_messaging_service_sid
TWILIO_WEBHOOK_SECRET=your_webhook_secret

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Database
MONGODB_URI=your_mongodb_connection_string

# Security
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret
```

## Support
For technical support or feature requests, contact the development team or check the system logs for detailed error information.
