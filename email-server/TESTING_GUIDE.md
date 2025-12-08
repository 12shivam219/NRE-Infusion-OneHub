# Email System Testing Guide

## Quick Start Testing

### Prerequisites
1. Email server running on localhost:3001
2. Gmail account configured with App Password in `.env`
3. Node.js installed

### Running Tests

#### Option 1: NPM Script
```bash
cd email-server
npm test
```

#### Option 2: Direct Node Command
```bash
cd email-server
node test-all-scenarios.js
```

#### Option 3: Start Server and Test Separately
```bash
# Terminal 1: Start the server
cd email-server
node server.js

# Terminal 2: Run tests
cd email-server
node test-all-scenarios.js
```

---

## Test Coverage

The test suite covers **10 comprehensive scenarios**:

### 1. **Health Check**
- Verifies server is running
- Checks account configuration

### 2. **Get Email Accounts**
- Lists configured email accounts
- Verifies account availability

### 3. **Send Single Email**
- Basic single email functionality
- Verifies message ID returned

### 4. **Bulk Email (No Rotation)**
- Multiple recipients from single account
- Verifies all emails sent

### 5. **Bulk Email (With Rotation)**
- Multiple recipients distributed across accounts
- Configurable emails-per-account limit

### 6. **Error Handling - Invalid Email**
- Rejects malformed email addresses
- Returns proper error message

### 7. **Error Handling - Missing Fields**
- Rejects incomplete requests
- Validates required fields

### 8. **HTML Email**
- Sends formatted email content
- Converts line breaks to HTML

### 9. **Large Bulk Send (Rate Limiting)**
- Tests rate limiting with 10 recipients
- Verifies 2-second delays between emails

### 10. **Email with Attachments**
- Sends attachments (text and JSON)
- Verifies attachment encoding

---

## Expected Results

All 10 tests should pass:

```
==============================================
            TEST SUMMARY
==============================================
1. Health Check: ✅ PASSED
2. Get Email Accounts: ✅ PASSED
3. Single Email: ✅ PASSED
4. Bulk Email (No Rotation): ✅ PASSED
5. Bulk Email (With Rotation): ✅ PASSED
6. Invalid Email Error Handling: ✅ PASSED
7. Missing Fields Error Handling: ✅ PASSED
8. HTML Email: ✅ PASSED
9. Large Bulk Send (Rate Limiting): ✅ PASSED
10. Email with Attachments: ✅ PASSED

Total: 10/10 tests passed
==============================================
🎉 All tests passed! Your email system is working correctly.
```

---

## Manual Testing via API

### Test Single Email Send

```bash
curl -X POST http://localhost:3001/api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "your-email@gmail.com",
    "subject": "Test Email",
    "body": "This is a test email"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Email sent successfully",
  "messageId": "<unique-id@gmail.com>",
  "fromEmail": "12shivamtiwari219@gmail.com"
}
```

### Test Bulk Email Send

```bash
curl -X POST http://localhost:3001/api/send-bulk-emails \
  -H "Content-Type: application/json" \
  -d '{
    "emails": [
      { "email": "recipient1@gmail.com", "name": "User 1" },
      { "email": "recipient2@gmail.com", "name": "User 2" },
      { "email": "recipient3@gmail.com", "name": "User 3" }
    ],
    "subject": "Bulk Test",
    "body": "This is a bulk test email",
    "rotationConfig": {
      "emailsPerAccount": 2
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "total": 3,
  "sent": 3,
  "failed": 0,
  "details": [...]
}
```

### Get Available Accounts

```bash
curl http://localhost:3001/api/email-accounts
```

**Expected Response:**
```json
{
  "accounts": ["12shivamtiwari219@gmail.com"]
}
```

---

## Troubleshooting

### Server Won't Start
**Error:** `EADDRINUSE: address already in use :::3001`

**Solution:** Kill the existing process
```bash
# Windows
taskkill /F /IM node.exe

# Mac/Linux
lsof -ti:3001 | xargs kill -9
```

### Invalid Gmail Credentials
**Error:** `Invalid login: 535-5.7.8 Username and Password not accepted`

**Solution:**
1. Generate new App Password: https://myaccount.google.com/apppasswords
2. Update `.env` file with new password
3. Restart server

### Emails Not Being Sent
**Troubleshoot:**
1. Check email server logs
2. Verify Gmail account is configured
3. Check `.env` file has correct credentials
4. Ensure recipient emails are valid
5. Check Gmail sending limits (Gmail limits to 500/day from app passwords)

### Tests Taking Too Long
The large bulk send test (Test 9) should take ~53 seconds due to rate limiting (2 seconds per email × 10 emails = ~20 seconds for sending + overhead).

This is **expected behavior** to prevent Gmail rate limiting.

---

## Production Checklist

- [ ] Email server running 24/7 (use PM2 or systemd)
- [ ] `.env` file secured (not committed to git)
- [ ] Email accounts configured with Gmail App Passwords
- [ ] Database migrations executed in Supabase
- [ ] EmailAccountsSettings component accessible in Admin panel
- [ ] BulkEmailComposer accessible in CRM panel
- [ ] Error logs monitored
- [ ] Email delivery tracking implemented
- [ ] Rate limiting verified (2-second delays)
- [ ] Test suite runs successfully

---

## Support

For detailed test results, see: `EMAIL_TEST_REPORT.md`

For implementation details, see:
- `IMPLEMENTATION_CHECKLIST.md`
- `MULTI_ACCOUNT_EMAIL_COMPLETE.md`
- `EMAIL_INTEGRATION.md`

