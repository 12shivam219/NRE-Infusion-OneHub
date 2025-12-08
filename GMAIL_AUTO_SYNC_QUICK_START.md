# Gmail Auto-Sync - Quick Start Guide

## 📋 Quick Implementation Checklist (15 minutes)

### Step 1: Database Setup (2 minutes)
```bash
# 1. Go to Supabase dashboard
# 2. SQL Editor
# 3. Copy & paste from: supabase/migrations/002_add_gmail_sync.sql
# 4. Click "Run"
# Done! ✅ 4 tables created
```

### Step 2: Google OAuth Setup (5 minutes)
```bash
# 1. Visit: https://console.cloud.google.com/
# 2. Create new project OR select existing
# 3. Search for "Gmail API" → Enable it
# 4. Go to "Credentials"
# 5. Create OAuth 2.0 Client ID (Web Application)
# 6. Add redirect URIs:
#    - http://localhost:5173/oauth/callback
#    - https://yourdomain.com/oauth/callback
# 7. Copy Client ID & Secret
```

### Step 3: Environment Configuration (2 minutes)
```bash
# Add to .env.local:
VITE_GOOGLE_CLIENT_ID=your_client_id
VITE_GOOGLE_CLIENT_SECRET=your_client_secret
VITE_GOOGLE_REDIRECT_URI=http://localhost:5173/oauth/callback
SUPABASE_SERVICE_KEY=your_service_key
```

### Step 4: Component Integration (3 minutes)

**In `src/components/admin/AdminPage.tsx`:**
```tsx
import GmailSyncSettings from './GmailSyncSettings';

// Add to your admin tabs/sections:
<div className="space-y-6">
  {/* ... existing content ... */}
  <GmailSyncSettings />
</div>
```

**In requirement detail views:**
```tsx
import EmailHistoryPanel from '../crm/EmailHistoryPanel';

// Add to requirement details:
<EmailHistoryPanel requirementId={requirementId} />
```

### Step 5: Backend Service (2 minutes)

**Update `email-server/server.js`:**
```javascript
import { startSyncScheduler } from './gmail-sync.js';

// After server initialization:
app.listen(3001, () => {
  console.log('Email server running on port 3001');
  startSyncScheduler(); // ← Add this line
});
```

### Step 6: Optional - Manual Sync Endpoint (1 minute)

Add to `email-server/server.js`:
```javascript
import { syncGmailEmails } from './gmail-sync.js';

app.post('/api/emails/sync-now', async (req, res) => {
  try {
    const result = await syncGmailEmails(req.body.userId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

---

## 🎯 What Users See

### Admin Panel
1. New "Gmail Integration" section in admin settings
2. "Connect Gmail Account" button
3. After connecting:
   - Gmail address displayed
   - Last sync timestamp
   - Sync frequency selector (5, 10, 15, 30, 60 min)
   - Confidence level selector
   - "Update Settings" button
   - "Disconnect" button

### Requirement Details
1. New "Email History" panel
2. Shows all emails (Loster app + Gmail auto-synced)
3. Click to expand and see:
   - Recipient name/email
   - Email subject
   - Email preview
   - Match confidence (for Gmail emails)
   - Sent date/time
   - Status (sent, failed, etc.)

---

## ⚡ How It Works (User Perspective)

**First Time Setup:**
1. User clicks "Connect Gmail Account"
2. Redirected to Google login
3. User authorizes "Loster CRM"
4. Automatically back to Loster
5. "Gmail connected!" message appears
6. Done!

**Ongoing Usage:**
1. Every 5-15 minutes, system syncs Gmail emails
2. Emails automatically matched to requirements
3. Users see emails in requirement details
4. Low-confidence matches flagged for review
5. Zero manual work required

---

## 📊 What Gets Tracked

For each email sent via Gmail:
- ✅ Recipient (email, name)
- ✅ Subject line
- ✅ Email preview (500 chars)
- ✅ Sent date/time
- ✅ Which requirement it matches
- ✅ Confidence level of match
- ✅ Status (sent, failed, bounced)
- ✅ Source (Gmail vs Loster app)

---

## 🔒 Security & Privacy

**What we access:**
- Read-only access to sent emails
- Only "from:me" (user's own sent emails)
- No access to receive, delete, or modify

**What we store:**
- Encrypted access token
- Encrypted refresh token
- Email metadata (not full content)
- Matching confidence scores

**User control:**
- Can disconnect anytime
- Tokens auto-expire
- Can set sync frequency
- Can change confidence thresholds

---

## 🧪 Testing

### Quick Test
1. Connect Gmail account
2. Send an email from Gmail to any address
3. Wait 1-15 minutes
4. Go to requirement details
5. See email in "Email History" panel ✅

### Verify Matching
1. Requirement title: "React Developer - Senior"
2. Send email with subject: "Re: React Developer position"
3. System should auto-match with 80%+ confidence ✅

### Test Settings
1. Change sync frequency to "Every 5 minutes"
2. Change confidence to "High"
3. Send test email
4. Should match only if very similar ✅

---

## 📁 Files Added (Reference)

```
supabase/migrations/
  └── 002_add_gmail_sync.sql (4 tables, RLS policies)

email-server/
  └── gmail-sync.js (background sync service)

src/lib/
  ├── gmailMatcher.ts (matching algorithm)
  └── api/
      ├── gmailIntegration.ts (OAuth & API)
      └── requirementEmails.ts (CRUD operations)

src/components/
  ├── admin/
  │   └── GmailSyncSettings.tsx (admin UI)
  └── crm/
      └── EmailHistoryPanel.tsx (email history)
```

---

## 💡 Pro Tips

1. **For best matching**: Use descriptive requirement titles with keywords
2. **Confidence levels**:
   - Use "High" if you want only very certain matches
   - Use "Medium" for balanced matching (recommended)
   - Use "Low" if you want to see all possible matches
3. **Sync frequency**: 
   - 5 min = real-time but higher API usage
   - 15 min = good balance (default)
   - 60 min = minimal API usage

---

## ❓ FAQ

**Q: Will this modify my Gmail emails?**
A: No! We only have read-only access to sent emails.

**Q: Can I stop syncing anytime?**
A: Yes, just click "Disconnect" button.

**Q: What if email matches wrong requirement?**
A: Click email to see confidence score, or adjust confidence level higher.

**Q: How often does it sync?**
A: Configurable from 5 to 60 minutes. Default is 15.

**Q: Will this slow down my app?**
A: No, syncing happens in background. Only uses Gmail API quota.

**Q: Can I see sync history?**
A: Yes, check `email_sync_logs` table for detailed audit trail.

---

## 🚀 You're Ready!

All code is production-ready. Just follow the 6 steps above and you're done!

Questions? Check `GMAIL_AUTO_SYNC_COMPLETE.md` for detailed documentation.

**Happy syncing!** 📧✨
