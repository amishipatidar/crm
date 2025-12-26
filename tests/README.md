# SMS Webhook Test Suite

This directory contains comprehensive unit tests for the SMS webhook functionality of the AI Twilio Lead Management System.

## Test Files

### 1. `sms-webhook.test.js`
Complete unit tests for all SMS commands and webhook functionality:

- **CREATE_LEAD Command Tests**
  - Basic lead creation
  - Lead creation with status and follow-up
  - Error handling for missing required fields
  - Minimal information handling

- **UPDATE_LEAD Command Tests**
  - Update by name, email, phone
  - Multiple field updates
  - Error handling for non-existent leads
  - Missing parameter validation

- **SET_FOLLOWUP Command Tests**
  - Follow-up by different identifiers
  - Time expression parsing (days, weeks, months)
  - Error handling for missing parameters
  - Non-existent lead handling

- **GET_LEAD_STATUS Command Tests**
  - Status retrieval by various identifiers
  - Follow-up information display
  - Error handling for missing leads

- **LIST_LEADS Command Tests**
  - Lead listing with filters
  - Empty result handling
  - Latest lead display

- **HELP Command Tests**
  - Help message formatting
  - Case insensitive handling

- **Error Handling Tests**
  - Multiple records error
  - Database connection errors
  - Unregistered agent handling

- **Complex Command Parsing Tests**
  - Special characters handling
  - Extra spaces and formatting
  - Mixed case commands
  - Different phone number formats
  - Time expression variations

### 2. `api-responses.test.js`
Tests focused specifically on API response formats and webhook integration:

- **Webhook Response Format Tests**
  - TwiML XML format validation
  - Special character escaping
  - Response structure verification

- **Command Response Content Tests**
  - Success message formatting
  - Error message clarity
  - Emoji and formatting consistency

- **Response Length and Format Tests**
  - SMS character limit compliance
  - Phone number formatting
  - Emoji character handling

- **Response Timing Tests**
  - Response time limits
  - Concurrent request handling

### 3. `setup.js`
Test configuration and mocking setup:

- MongoDB in-memory server setup
- External service mocking (Gemini AI, Twilio)
- Test environment configuration
- Logger mocking

## Running Tests

### Install Dependencies
```bash
npm install
```

### Run All Tests
```bash
npm test
```

### Run Specific Test Files
```bash
# Run webhook functionality tests
npm run test:webhook

# Run API response tests
npm run test:api
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Generate Coverage Report
```bash
npm run test:coverage
```

## Test Commands Coverage

The test suite covers all SMS commands with various scenarios:

### Create Lead Commands
- `"Add lead: John Doe, john@email.com, 555-123-4567"`
- `"Add lead: Jane Smith, jane@example.com, 555-987-6543, status qualified, follow up in 5 days"`
- `"Add lead: Minimal Lead"` (name only)

### Update Lead Commands
- `"Update lead John Doe status to qualified"`
- `"Update lead 555-123-4567 email to newemail@example.com"`
- `"Update lead John Doe status to contacted, phone to 555-999-8888"`

### Follow-up Commands
- `"Follow up John Doe in 3 days"`
- `"Follow up john@example.com in 7 days"`
- `"Follow up 555-123-4567 in 1 week"`

### Status Commands
- `"Show status for John Doe"`
- `"Show status for john@example.com"`
- `"Show status for 555-123-4567"`

### List Commands
- `"List all leads"`
- `"List qualified leads"`

### Help Commands
- `"help"`
- `"Help"` (case insensitive)

## Expected API Responses

### Success Responses
All successful commands return HTTP 200 with TwiML format:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>✅ Created: John Doe
📊 Manage in your CRM dashboard.</Message>
</Response>
```

### Error Responses
Errors are returned as user-friendly messages in TwiML format:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>❌ Please provide a name for the new lead.</Message>
</Response>
```

### Response Elements
- **Emojis**: Used for visual clarity (✅, ❌, 📋, 📅, 📊)
- **Status indicators**: Clear success/error messaging
- **Actionable information**: Links to dashboard for full management
- **Concise format**: Optimized for SMS character limits

## Test Data

The tests use consistent test data:

- **Test Agent**: `+1234567890`
- **Test Lead**: John Doe, john@example.com, 555-123-4567
- **Database**: In-memory MongoDB for isolation
- **Mocking**: External services mocked for reliability

## Error Scenarios Tested

1. **Missing required fields**
2. **Non-existent leads**
3. **Duplicate records**
4. **Database connection issues**
5. **Invalid command formats**
6. **Malformed webhook data**
7. **Character limit edge cases**
8. **Concurrent request handling**

## Performance Tests

- Response time validation (< 5 seconds)
- Concurrent request handling (up to 10 simultaneous)
- Long message handling
- Character limit compliance

## Configuration

Tests are configured via `jest.config.js`:
- Test timeout: 30 seconds
- Coverage collection enabled
- In-memory database for each test
- Mock cleanup between tests

## Debugging Tests

To debug failing tests:

1. **Enable verbose logging**:
   ```bash
   SUPPRESS_TEST_LOGS=false npm test
   ```

2. **Run single test**:
   ```bash
   npm test -- --testNamePattern="Should create a new lead"
   ```

3. **Debug mode**:
   ```bash
   node --inspect-brk node_modules/.bin/jest --runInBand
   ```

## Adding New Tests

When adding new SMS commands or functionality:

1. Add command tests to `sms-webhook.test.js`
2. Add response format tests to `api-responses.test.js`
3. Update mock implementations in `setup.js`
4. Add expected responses to this README

## Continuous Integration

These tests are designed to run in CI/CD environments:
- No external dependencies
- Deterministic results
- Comprehensive error handling
- Performance benchmarks
