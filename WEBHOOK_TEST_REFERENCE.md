# SMS Webhook Test Reference

## Complete Test Suite for SMS Commands and API Responses

This document provides a comprehensive reference for testing all SMS webhook commands and their expected API responses.

## Test Commands by Category

### 1. CREATE LEAD Commands

#### Basic Lead Creation
```
Input: "Add lead: Jane Smith, jane@example.com, 555-987-6543"
Expected Response: 
✅ Created: Jane Smith
📊 Manage in your CRM dashboard.
```

#### Lead Creation with Status
```
Input: "Add lead: Bob Wilson, bob@example.com, 555-111-2222, status qualified"
Expected Response:
✅ Created: Bob Wilson (qualified)
📊 Manage in your CRM dashboard.
```

#### Lead Creation with Follow-up
```
Input: "Add lead: Alice Johnson, alice@example.com, 555-333-4444, follow up in 5 days"
Expected Response:
✅ Created: Alice Johnson
📅 Follow-up in 5 days
📊 Manage in your CRM dashboard.
```

#### Lead Creation with Status and Follow-up
```
Input: "Add lead: Mike Davis, mike@example.com, 555-777-8888, status contacted, follow up in 1 week"
Expected Response:
✅ Created: Mike Davis (contacted)
📅 Follow-up in 7 days
📊 Manage in your CRM dashboard.
```

#### Minimal Lead Creation
```
Input: "Add lead: Minimal Lead"
Expected Response:
✅ Created: Minimal Lead
📊 Manage in your CRM dashboard.
```

#### Error Cases
```
Input: "Add lead: , jane@example.com, 555-987-6543"
Expected Response:
❌ Please provide a name for the new lead.
```

### 2. UPDATE LEAD Commands

#### Update Status by Name
```
Input: "Update lead John Doe status to qualified"
Expected Response:
✅ John Doe updated: status
📊 View in CRM dashboard.
```

#### Update Email by Phone
```
Input: "Update lead 555-123-4567 email to newemail@example.com"
Expected Response:
✅ John Doe updated: email
📊 View in CRM dashboard.
```

#### Update Multiple Fields
```
Input: "Update lead John Doe status to contacted, phone to 555-999-8888"
Expected Response:
✅ John Doe updated: status, phone
📊 View in CRM dashboard.
```

#### Error Cases
```
Input: "Update lead NonExistent status to qualified"
Expected Response:
Lead not found: NonExistent

Input: "Update lead status to qualified"
Expected Response:
❌ Please provide a lead name or ID to update.

Input: "Update lead John Doe"
Expected Response:
❌ Please specify what fields to update.
```

### 3. SET FOLLOW-UP Commands

#### Follow-up by Name
```
Input: "Follow up John Doe in 3 days"
Expected Response:
📅 Follow-up scheduled for John Doe on [DATE]
📊 Manage in CRM dashboard.
```

#### Follow-up by Email
```
Input: "Follow up john@example.com in 7 days"
Expected Response:
📅 Follow-up scheduled for John Doe on [DATE]
📊 Manage in CRM dashboard.
```

#### Follow-up by Phone
```
Input: "Follow up 555-123-4567 in 1 week"
Expected Response:
📅 Follow-up scheduled for John Doe on [DATE]
📊 Manage in CRM dashboard.
```

#### Time Variations
```
Input: "Follow up John Doe in 2 weeks"
Expected Response:
📅 Follow-up scheduled for John Doe on [DATE] (14 days from now)

Input: "Follow up John Doe in 1 month"
Expected Response:
📅 Follow-up scheduled for John Doe on [DATE] (30 days from now)
```

#### Error Cases
```
Input: "Follow up in 3 days"
Expected Response:
❌ Please provide a lead name or ID for follow-up.

Input: "Follow up John Doe"
Expected Response:
❌ Please specify how many days from now for the follow-up.

Input: "Follow up NonExistent in 3 days"
Expected Response:
Lead not found: NonExistent
```

### 4. GET LEAD STATUS Commands

#### Status by Name
```
Input: "Show status for John Doe"
Expected Response:
📋 John Doe
Status: new
Email: john@example.com
Phone: 555-123-4567
📅 Next: [DATE] (if follow-up exists)

📊 For full details, visit your CRM dashboard.
```

#### Status by Email
```
Input: "Show status for john@example.com"
Expected Response:
📋 John Doe
Status: new
Email: john@example.com
Phone: 555-123-4567

📊 For full details, visit your CRM dashboard.
```

#### Status by Phone
```
Input: "Show status for 555-123-4567"
Expected Response:
📋 John Doe
Status: new
Email: john@example.com
Phone: 555-123-4567

📊 For full details, visit your CRM dashboard.
```

#### Error Cases
```
Input: "Show status"
Expected Response:
Please provide a lead name or ID to check status.

Input: "Show status for NonExistent"
Expected Response:
Lead not found: NonExistent
```

### 5. LIST LEADS Commands

#### List All Leads
```
Input: "List all leads"
Expected Response:
📋 Latest Lead:

Name: [Most Recent Lead Name]
Status: [Status]
Email: [Email]
Phone: [Phone]

📊 For complete list, visit your CRM dashboard.
```

#### List Qualified Leads
```
Input: "List qualified leads"
Expected Response:
📋 Latest Lead:

Name: [Most Recent Qualified Lead]
Status: qualified
Email: [Email]
Phone: [Phone]

📊 For complete list, visit your CRM dashboard.
```

#### No Leads Found
```
Input: "List all leads" (when no leads exist)
Expected Response:
No leads found.
```

### 6. HELP Command

#### Help Message
```
Input: "help" or "Help"
Expected Response:
📋 SMS Commands:

➕ Create: "Add lead: John Doe, john@email.com, 555-123-4567"
✏️ Update: "Update lead John status to qualified"
📅 Follow-up: "Follow up John in 3 days"
📊 Status: "Show status for John"
📋 List: "List all leads"

💡 Use name, email, phone, or ID to identify leads
📊 For full management, visit your CRM dashboard
```

### 7. UNKNOWN Commands

#### Invalid Command
```
Input: "This is not a valid command"
Expected Response:
Unknown command. Send "help" for available commands.

Input: "" (empty message)
Expected Response:
Unknown command. Send "help" for available commands.
```

## Error Scenarios and Responses

### Multiple Records Error
```
Scenario: Two leads with same name "John Doe"
Input: "Update lead John Doe status to qualified"
Expected Response:
You have 2 records with the same name: "John Doe". Please use more specific information like email or phone number.
```

### Database Connection Error
```
Scenario: Database unavailable
Input: Any valid command
Expected Response:
Sorry, there was an error processing your request. Please try again later.
```

### Unregistered Agent
```
Scenario: SMS from new phone number
Input: Any valid command
Expected Response: 
[Command executes normally - agent is auto-created]
```

## API Response Format

### Success Response Structure
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>[SUCCESS_MESSAGE_WITH_EMOJIS]</Message>
</Response>
```

### Error Response Structure
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>[ERROR_MESSAGE_WITH_EMOJIS]</Message>
</Response>
```

### HTTP Status Codes
- **200 OK**: All responses (including errors) return 200 for Twilio compatibility
- **Content-Type**: `text/xml; charset=utf-8`

### Character Escaping
Special characters in responses are properly XML-escaped:
- `<` becomes `&lt;`
- `>` becomes `&gt;`
- `&` becomes `&amp;`
- `"` becomes `&quot;`
- `'` becomes `&apos;`

## Test Execution

### Install Dependencies
```bash
npm install
```

### Run All Tests
```bash
npm test
```

### Run Specific Tests
```bash
# Run webhook command tests
npm run test:webhook

# Run API response format tests
npm run test:api

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Run with Custom Script
```bash
# Run all tests with summary
node run-tests.js

# Run with coverage
node run-tests.js --coverage

# Run specific test suite
node run-tests.js --webhook
node run-tests.js --api

# Show help
node run-tests.js --help
```

## Performance Expectations

### Response Times
- **Standard Commands**: < 2 seconds
- **Database Operations**: < 5 seconds
- **Complex Queries**: < 10 seconds

### Concurrency
- **Simultaneous Requests**: Up to 10 concurrent SMS webhooks
- **Rate Limiting**: Handled by Twilio (1 message per second per phone)

### Message Limits
- **SMS Character Limit**: Responses optimized for 160 characters per SMS segment
- **Long Messages**: Automatically split by carriers
- **Emoji Support**: Full Unicode emoji support

## Debugging Failed Tests

### Common Issues
1. **Database Connection**: Ensure MongoDB is running
2. **Environment Variables**: Check JWT_SECRET and other required vars
3. **Dependencies**: Run `npm install` to ensure all packages installed
4. **Port Conflicts**: Ensure test ports are available

### Debug Commands
```bash
# Verbose test output
npm test -- --verbose

# Run specific test
npm test -- --testNamePattern="Should create a new lead"

# Debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Log Analysis
- Check console output for detailed error messages
- Review database connection logs
- Verify mock service responses

## Integration with CI/CD

### GitHub Actions Example
```yaml
name: Test SMS Webhooks
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
```

### Environment Variables for Testing
```bash
NODE_ENV=test
JWT_SECRET=test-jwt-secret-key
SUPPRESS_TEST_LOGS=true  # Optional: reduce console output
```

## Real-world Testing

### Using Twilio Console
1. Go to Twilio Console > Phone Numbers
2. Configure webhook URL: `https://your-domain.com/api/sms/webhook`
3. Send test SMS to your Twilio number
4. Verify responses in Twilio logs

### Using ngrok for Local Testing
```bash
# Install ngrok
npm install -g ngrok

# Start your server
npm start

# In another terminal, expose local server
ngrok http 3000

# Use ngrok URL in Twilio webhook configuration
```

This comprehensive test suite ensures your SMS webhook functionality works correctly across all supported commands and edge cases.
