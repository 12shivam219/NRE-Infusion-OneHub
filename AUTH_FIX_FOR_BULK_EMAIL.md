# Authentication Fix for Bulk Email Sending

## Problem
Error: `401 Unauthorized` when trying to send bulk emails via `/api/send-bulk-emails`

## Root Cause
The `sendBulkEmailCampaign()` function was not sending the required **Authorization header** to the email server.

The email server's `authenticateRequest` middleware expects:
```
Authorization: Bearer {API_KEY}
```

But the client was sending:
```
✗ No Authorization header
```

## Solution

### 1. Code Fix (Applied) ✅
Updated [src/lib/api/bulkEmailCampaigns.ts](src/lib/api/bulkEmailCampaigns.ts)

**Before:**
```typescript
const response = await fetch(`${emailServerUrl}/api/send-bulk-emails`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ ... }),
});
```

**After:**
```typescript
const emailServerUrl = import.meta.env.VITE_EMAIL_SERVER_URL || 'http://localhost:3001';
const emailApiKey = import.meta.env.VITE_EMAIL_SERVER_API_KEY || '';

const response = await fetch(`${emailServerUrl}/api/send-bulk-emails`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...(emailApiKey && { 'Authorization': `Bearer ${emailApiKey}` }),
  },
  body: JSON.stringify({ ... }),
});
```

### 2. Environment Variable Setup
You need to set the API key in your `.env` file:

```bash
# Create/update .env file in project root
VITE_EMAIL_SERVER_API_KEY=your_email_server_api_key
```

**Where to get this key:**
- The same key configured in your email server's `API_KEY` environment variable
- Default in email-server: Check your `email-server/.env` for `API_KEY`

### 3. How It Works

1. **Client** reads `VITE_EMAIL_SERVER_API_KEY` from `.env`
2. **Client** includes it in `Authorization: Bearer {KEY}` header
3. **Server** extracts the token from the Authorization header
4. **Server** validates it matches `process.env.API_KEY`
5. **Request allowed** ✅

## Environment Setup

### For Development
1. Get your email server API key (from email-server/.env)
2. Create `.env` in project root:
```env
VITE_EMAIL_SERVER_URL=http://localhost:3001
VITE_EMAIL_SERVER_API_KEY=your_api_key_here
```

3. Restart dev server if it's running
4. Try sending bulk email again

### For Production
⚠️ **IMPORTANT**: Do NOT add `VITE_EMAIL_SERVER_API_KEY` to production `.env` files!

Reason: Vite variables prefixed with `VITE_` are bundled into the browser code and visible to everyone.

Instead:
- Frontend calls your **backend** API endpoint
- Backend keeps the API key in server environment
- Backend securely calls the email server with the key

## Verification

After setting up the environment variable:
1. Open a requirement
2. Click "Emails" tab
3. Click "Send Email" button
4. Fill in recipients, subject, body
5. Click "Review"
6. Click "Send Campaign"
7. Should now work! ✅

## Related Files

- **Email Server Auth**: `email-server/server.js` (line 87-105)
- **Client Implementation**: `src/lib/api/bulkEmailCampaigns.ts` (line 279-296)
- **Other Email Endpoints**: Already have auth headers
  - `src/lib/api/emailAccounts.ts` ✅
  - `src/lib/api/emailThreading.ts` ✅

## Testing

TypeScript validation: ✅ Passed
ESLint validation: ✅ Passed

All existing functionality remains unchanged.

---

**Next Step**: Set up the environment variable in `.env` and try sending a bulk email campaign!
