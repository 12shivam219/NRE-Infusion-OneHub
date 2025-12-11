import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import rateLimit from 'express-rate-limit';
import sanitizeHtml from 'sanitize-html';
import { encryptPassword, decryptPassword, isEncrypted } from './encryption.js';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = process.env.EMAIL_SERVER_PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Supabase client for persisting campaign status (server-side key required)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
  console.warn('⚠️  Supabase not configured. Campaign status will not be persisted.');
}

// SECURITY: Add HTTPS enforcement in production
if (NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

// SECURITY: Add strict security headers
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// SECURITY: Configure CORS with whitelist
const corsOptions = {
  origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(','),
  credentials: true,
  methods: ['POST', 'OPTIONS', 'GET'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 3600,
};
app.use(cors(corsOptions));

// SECURITY: Rate limiting to prevent abuse
const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(bodyParser.json({ limit: '10mb' }));

// SECURITY: HTML sanitization options using sanitize-html library
// Battle-tested library that properly handles XSS prevention
const SANITIZE_OPTIONS = {
  allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'div', 'span'],
  allowedAttributes: {
    'a': ['href', 'title']
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  disallowedTagsMode: 'escape'
};

// SECURITY: Validate email format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// SECURITY: Authenticate requests with API key
function authenticateRequest(req, res, next) {
  const authHeader = req.headers.authorization;
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    if (NODE_ENV === 'production') {
      return res.status(500).json({ error: 'Server misconfiguration' });
    }
    return next();
  }
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  
  const token = authHeader.substring(7);
  if (token !== apiKey) {
    return res.status(403).json({ success: false, error: 'Invalid credentials' });
  }
  
  next();
}

// Store multiple email transports
const emailAccounts = new Map();

// Initialize email accounts from environment variables
function initializeEmailAccounts() {
  // Parse email accounts from .env
  // Format: EMAIL_ACCOUNTS=email1:password1;email2:password2;email3:password3
  // Passwords can be encrypted (format: iv:encryptedData:authTag) or plain text
  const accountsEnv = process.env.EMAIL_ACCOUNTS;
  
  if (accountsEnv) {
    const accounts = accountsEnv.split(';');
    accounts.forEach((account, index) => {
      const [email, encryptedPassword] = account.split(':');
      if (email && encryptedPassword) {
        try {
          // Try to decrypt if encrypted, otherwise use as-is
          let password = encryptedPassword.trim();
          if (isEncrypted(encryptedPassword)) {
            password = decryptPassword(encryptedPassword.trim());
          }

          const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: email.trim(),
              pass: password,
            },
          });
          
          emailAccounts.set(email.trim(), {
            email: email.trim(),
            transporter: transporter,
            index: index + 1,
          });
          
          console.log(`✅ Email account ${index + 1} loaded: ${email.trim()}`);
        } catch (error) {
          console.error(`❌ Failed to initialize email account ${index + 1}:`, error.message);
        }
      }
    });
  }
  
  // Fallback: single account from legacy .env format
  if (emailAccounts.size === 0 && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    try {
      let password = process.env.EMAIL_PASSWORD;
      // Try to decrypt if encrypted
      if (isEncrypted(password)) {
        password = decryptPassword(password);
      }

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: password,
        },
      });
      
      emailAccounts.set(process.env.EMAIL_USER, {
        email: process.env.EMAIL_USER,
        transporter: transporter,
        index: 1,
      });
      
      console.log(`✅ Email account 1 loaded: ${process.env.EMAIL_USER}`);
    } catch (error) {
      console.error('❌ Failed to initialize email account:', error.message);
    }
  }
  
  if (emailAccounts.size === 0) {
    console.warn('⚠️  No email accounts configured. Please set EMAIL_ACCOUNTS or EMAIL_USER in .env');
  }
}

// Initialize on startup
initializeEmailAccounts();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'Email server is running',
    accountsConfigured: emailAccounts.size,
    accounts: Array.from(emailAccounts.keys()),
  });
});

// Encrypt password via server-side master key
app.post('/api/encrypt-password', authenticateRequest, async (req, res) => {
  try {
    const { plainText } = req.body || {};
    if (!plainText || typeof plainText !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing plainText in request body' });
    }

    if (plainText.length > 5000) {
      return res.status(400).json({ success: false, error: 'plainText too long' });
    }

    const encrypted = encryptPassword(plainText);
    return res.json({ success: true, encrypted });
  } catch (error) {
    console.error('Encrypt API error:', error);
    return res.status(500).json({ success: false, error: 'Encryption failed' });
  }
});

// Decrypt password via server-side master key
app.post('/api/decrypt-password', authenticateRequest, async (req, res) => {
  try {
    const { encrypted } = req.body || {};
    if (!encrypted || typeof encrypted !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing encrypted in request body' });
    }

    const plainText = decryptPassword(encrypted);
    return res.json({ success: true, plainText });
  } catch (error) {
    console.error('Decrypt API error:', error);
    return res.status(500).json({ success: false, error: 'Decryption failed' });
  }
});

// Send email endpoint (single email)
app.post('/api/send-email', emailLimiter, authenticateRequest, async (req, res) => {
  try {
    const { to, subject, body, from } = req.body;

    // SECURITY: Validate required fields
    if (!to || !subject || !body) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // SECURITY: Validate email format
    if (!isValidEmail(to)) {
      return res.status(400).json({ success: false, error: 'Invalid email format' });
    }

    // SECURITY: Validate lengths
    if (subject.length < 1 || subject.length > 500) {
      return res.status(400).json({ success: false, error: 'Invalid subject length' });
    }

    if (body.length < 1 || body.length > 50000) {
      return res.status(400).json({ success: false, error: 'Invalid body length' });
    }

    // Get the specified account or use the first available
    let account;
    if (from && emailAccounts.has(from)) {
      account = emailAccounts.get(from);
    } else {
      account = emailAccounts.values().next().value;
    }

    if (!account) {
      return res.status(503).json({ success: false, error: 'Service unavailable' });
    }

    // SECURITY: Sanitize HTML content to prevent XSS injection
    // Using battle-tested sanitize-html library instead of regex
    const sanitizedBody = sanitizeHtml(body, SANITIZE_OPTIONS);
    const sanitizedSubject = sanitizeHtml(subject, {
      allowedTags: [],
      allowedAttributes: {}
    });

    // Create email options
    const mailOptions = {
      from: account.email,
      to: to,
      subject: sanitizedSubject,
      html: `<p style="font-family: Arial, sans-serif; white-space: pre-wrap;">${sanitizedBody.replace(/\n/g, '<br>')}</p>`,
      text: body,
    };

    // Send email
    const info = await account.transporter.sendMail(mailOptions);

    if (NODE_ENV === 'development') {
      console.log('Email sent:', info.messageId);
    }

    res.json({ success: true, message: 'Email sent', messageId: info.messageId });
  } catch (error) {
    if (NODE_ENV === 'development') {
      console.error('Error sending email:', error);
    }
    res.status(500).json({ success: false, error: 'Service unavailable' });
  }
});

// Helper function to generate unique campaign ID
function generateCampaignId() {
  return `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// DB-backed helpers (Supabase)
async function createCampaignRecord(campaign) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('bulk_email_campaign_status').insert(campaign).select().single();
  if (error) {
    console.error('Supabase insert error:', error.message || error);
    return null;
  }
  return data;
}

async function updateCampaignRecord(id, updates) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('bulk_email_campaign_status').update(updates).eq('id', id).select().single();
  if (error) {
    console.error('Supabase update error:', error.message || error);
    return null;
  }
  return data;
}

async function getCampaignRecord(id) {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };
  const { data, error } = await supabase.from('bulk_email_campaign_status').select('*').eq('id', id).single();
  return { data, error };
}

// Background worker function - processes emails asynchronously and persists status to Supabase
async function processBulkEmailsInBackground(campaignId, emails, subject, body, rotationConfig, accounts) {
  // mark started
  await updateCampaignRecord(campaignId, { status: 'processing', started_at: new Date().toISOString() });

  for (let i = 0; i < emails.length; i++) {
    const recipient = emails[i];

    // Determine which account to use based on rotation
    let accountIndex = 0;
    if (rotationConfig && rotationConfig.emailsPerAccount) {
      accountIndex = Math.floor(i / rotationConfig.emailsPerAccount) % accounts.length;
    } else {
      accountIndex = i % accounts.length;
    }

    const account = accounts[accountIndex];

    try {
      const sanitizedBody = sanitizeHtml(body, SANITIZE_OPTIONS);
      const sanitizedSubject = sanitizeHtml(subject, { allowedTags: [], allowedAttributes: {} });

      const mailOptions = {
        from: account.email,
        to: typeof recipient === 'string' ? recipient : recipient.email,
        subject: sanitizedSubject,
        html: `<p style="font-family: Arial, sans-serif; white-space: pre-wrap;">${sanitizedBody.replace(/\n/g, '<br>')}</p>`,
        text: body,
      };

      const info = await account.transporter.sendMail(mailOptions);

      // Atomically append success event and increment counters via Postgres function
      if (supabase) {
        const event = {
          email: typeof recipient === 'string' ? recipient : recipient.email,
          status: 'sent',
          fromAccount: account.email,
          messageId: info.messageId,
          sentAt: new Date().toISOString(),
        };

        const p_progress = Math.round(((i + 1) / emails.length) * 100);
        const { data: rpcData, error: rpcError } = await supabase.rpc('append_campaign_event', {
          p_id: campaignId,
          p_event: [event],
          p_sent: 1,
          p_failed: 0,
          p_processed: i + 1,
          p_progress,
        });

        if (rpcError) {
          console.error('RPC append_campaign_event error:', rpcError.message || rpcError);
        }
      } else {
        // Fallback to read-modify-write if Supabase is not configured
        const { data: current } = await getCampaignRecord(campaignId);
        const details = (current && current.details) ? current.details : [];
        details.push({
          email: typeof recipient === 'string' ? recipient : recipient.email,
          status: 'sent',
          fromAccount: account.email,
          messageId: info.messageId,
          sentAt: new Date().toISOString(),
        });

        await updateCampaignRecord(campaignId, {
          sent: (current?.sent || 0) + 1,
          processed: i + 1,
          progress: Math.round(((i + 1) / emails.length) * 100),
          details,
        });
      }

      if (NODE_ENV === 'development') {
        console.log(`[${i + 1}/${emails.length}] Email sent to ${typeof recipient === 'string' ? recipient : recipient.email} from ${account.email}`);
      }

      if (i < emails.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`Failed to send email to ${typeof recipient === 'string' ? recipient : recipient.email}:`, error.message);
      if (supabase) {
        const event = {
          email: typeof recipient === 'string' ? recipient : recipient.email,
          status: 'failed',
          fromAccount: account.email,
          error: error.message,
          failedAt: new Date().toISOString(),
        };

        const p_progress = Math.round(((i + 1) / emails.length) * 100);
        const { data: rpcData, error: rpcError } = await supabase.rpc('append_campaign_event', {
          p_id: campaignId,
          p_event: [event],
          p_sent: 0,
          p_failed: 1,
          p_processed: i + 1,
          p_progress,
        });

        if (rpcError) {
          console.error('RPC append_campaign_event error:', rpcError.message || rpcError);
        }
      } else {
        const { data: current } = await getCampaignRecord(campaignId);
        const details = (current && current.details) ? current.details : [];
        details.push({
          email: typeof recipient === 'string' ? recipient : recipient.email,
          status: 'failed',
          fromAccount: account.email,
          error: error.message,
          failedAt: new Date().toISOString(),
        });

        await updateCampaignRecord(campaignId, {
          failed: (current?.failed || 0) + 1,
          processed: i + 1,
          progress: Math.round(((i + 1) / emails.length) * 100),
          details,
        });
      }
    }
  }

  if (supabase) {
    const { data, error } = await supabase.from('bulk_email_campaign_status').update({ status: 'completed', completed_at: new Date().toISOString(), progress: 100 }).eq('id', campaignId).select().single();
    if (error) console.error('Failed to mark campaign completed:', error.message || error);
  } else {
    await updateCampaignRecord(campaignId, { status: 'completed', completed_at: new Date().toISOString(), progress: 100 });
  }
}

// Bulk send emails with rotation - returns immediately with 202 Accepted
app.post('/api/send-bulk-emails', emailLimiter, authenticateRequest, async (req, res) => {
  try {
    const { emails, subject, body, rotationConfig } = req.body;

    // SECURITY: Validate inputs
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid emails array' });
    }

    // SECURITY: Limit bulk size to prevent DoS
    const MAX_BULK_SIZE = 1000;
    if (emails.length > MAX_BULK_SIZE) {
      return res.status(400).json({ success: false, error: 'Bulk limit exceeded' });
    }

    // SECURITY: Validate all email formats
    for (const email of emails) {
      if (typeof email === 'string' && !isValidEmail(email)) {
        return res.status(400).json({ success: false, error: 'Invalid email in list' });
      }
      if (typeof email === 'object' && !isValidEmail(email.email)) {
        return res.status(400).json({ success: false, error: 'Invalid email in list' });
      }
    }

    // SECURITY: Validate subject and body
    if (!subject || !body) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: subject, body',
      });
    }

    // Get available accounts
    const accounts = Array.from(emailAccounts.values());
    if (accounts.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'No email accounts configured',
      });
    }

    // Generate unique campaign ID
    const campaignId = generateCampaignId();

    // Initialize campaign status in Supabase (if configured)
    const initialRecord = {
      id: campaignId,
      status: 'queued',
      total: emails.length,
      sent: 0,
      failed: 0,
      processed: 0,
      progress: 0,
      details: [],
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
    };

    if (supabase) {
      const created = await createCampaignRecord(initialRecord);
      if (!created) {
        console.warn('Failed to persist campaign initial record to Supabase');
      }
    }

    // Return immediately with 202 Accepted status
    res.status(202).json({
      success: true,
      message: 'Email campaign queued for processing',
      campaignId: campaignId,
      total: emails.length,
      statusUrl: `/api/campaign-status/${campaignId}`,
    });

    // Process emails in background (no await - fire and forget)
    processBulkEmailsInBackground(campaignId, emails, subject, body, rotationConfig, accounts).catch(
      error => console.error(`Error processing campaign ${campaignId}:`, error)
    );
  } catch (error) {
    console.error('Error in bulk send endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process bulk emails',
    });
  }
});

// Get campaign status endpoint for polling
app.get('/api/campaign-status/:campaignId', async (req, res) => {
  const { campaignId } = req.params;

  if (!supabase) {
    return res.status(500).json({ success: false, error: 'Supabase not configured' });
  }

  const { data: campaign, error } = await getCampaignRecord(campaignId);
  if (error || !campaign) {
    return res.status(404).json({ success: false, error: 'Campaign not found' });
  }

  res.json({
    success: true,
    id: campaign.id,
    status: campaign.status,
    total: campaign.total,
    processed: campaign.processed,
    sent: campaign.sent,
    failed: campaign.failed,
    progress: campaign.progress,
    createdAt: campaign.created_at,
    startedAt: campaign.started_at,
    completedAt: campaign.completed_at,
  });
});

// Get campaign details endpoint (with email sending details)
app.get('/api/campaign-details/:campaignId', async (req, res) => {
  const { campaignId } = req.params;

  if (!supabase) {
    return res.status(500).json({ success: false, error: 'Supabase not configured' });
  }

  const { data: campaign, error } = await getCampaignRecord(campaignId);
  if (error || !campaign) {
    return res.status(404).json({ success: false, error: 'Campaign not found' });
  }

  res.json({ success: true, ...campaign });
});

// Get configured email accounts
app.get('/api/email-accounts', (req, res) => {
  const accounts = Array.from(emailAccounts.values()).map(account => ({
    email: account.email,
    index: account.index,
  }));

  res.json({
    success: true,
    accounts: accounts,
    count: accounts.length,
  });
});

// Manual email sync endpoint (optional)
app.post('/api/emails/sync-now', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required',
      });
    }

    // Dynamic import of gmail-sync module
    const { syncGmailEmails } = await import('./gmail-sync.js');
    const result = await syncGmailEmails(userId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Manual sync error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Start server
app.listen(PORT, async () => {
  console.log(`\n✅ Email server running on http://localhost:${PORT}`);
  console.log(`📧 Configured email accounts: ${emailAccounts.size}`);
  Array.from(emailAccounts.values()).forEach(account => {
    console.log(`   └─ ${account.email}`);
  });

  // Start Gmail sync scheduler (optional).
  // The scheduler has been moved to a dedicated worker process by default to
  // avoid duplicate runs in horizontally scaled deployments. To run the
  // scheduler in-process (not recommended for production), set
  // `START_SCHEDULER_IN_PROCESS=true` in the environment.
  if (process.env.START_SCHEDULER_IN_PROCESS === 'true') {
    try {
      const { startSyncScheduler } = await import('./gmail-sync.js');
      startSyncScheduler();
      console.log('📬 Gmail sync scheduler started (in-process)');
    } catch (error) {
      console.warn('⚠️  Gmail sync scheduler not available:', error.message);
    }
  }

  console.log('');
});
