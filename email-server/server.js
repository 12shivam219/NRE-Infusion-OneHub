import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import rateLimit from 'express-rate-limit';
import sanitizeHtml from 'sanitize-html';
import { encryptPassword, decryptPassword, isEncrypted } from './encryption.js';
import { createClient } from '@supabase/supabase-js';
// [FIX 1] Import Queue and Redis dependencies
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { RedisStore } from 'rate-limit-redis';

dotenv.config();

const app = express();
const PORT = process.env.EMAIL_SERVER_PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// [FIX 1] Redis Connection Setup
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null, // Required for BullMQ
});

// [FIX 1] Create Persistent Email Queue
const emailQueue = new Queue('bulk-email-queue', { connection });

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

// [FIX 4] SECURITY: Distributed Rate limiting using Redis
const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests',
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args) => connection.call(...args),
  }),
});

app.use(bodyParser.json({ limit: '10mb' }));

// SECURITY: HTML sanitization options using sanitize-html library
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
  const accountsEnv = process.env.EMAIL_ACCOUNTS;
  
  if (accountsEnv) {
    const accounts = accountsEnv.split(';');
    accounts.forEach((account, index) => {
      const [email, encryptedPassword] = account.split(':');
      if (email && encryptedPassword) {
        try {
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
  
  if (emailAccounts.size === 0 && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    try {
      let password = process.env.EMAIL_PASSWORD;
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

// ==========================================
// [FIX 1] BACKGROUND WORKER LOGIC
// Replaces processBulkEmailsInBackground with a persistent worker
// ==========================================

const emailWorker = new Worker('bulk-email-queue', async (job) => {
  const { campaignId, emails, subject, body, rotationConfig, accountEmails, recipientAccountMap } = job.data;
  
  console.log(`[Worker] Processing campaign ${campaignId} with ${emails.length} emails`);
  
  // Rehydrate Transporters: Look up the transporter objects using the emails passed in the job
  // (We cannot pass the transporter objects via Redis because they are not JSON serializable)
  const activeAccounts = [];
  if (accountEmails && Array.isArray(accountEmails)) {
    accountEmails.forEach(email => {
      const acc = emailAccounts.get(email);
      if (acc) activeAccounts.push(acc);
    });
  }

  // Fallback if no specific accounts found/passed (should not happen if valid req)
  if (activeAccounts.length === 0) {
    console.warn('[Worker] No valid accounts found for job, using all available.');
    activeAccounts.push(...emailAccounts.values());
  }
  
  // Execute the sending logic
  await processBulkEmailsLogic(campaignId, emails, subject, body, rotationConfig, activeAccounts, recipientAccountMap);

}, { connection });

// Handle worker errors
emailWorker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job.id} failed with error ${err.message}`);
});

// The core sending logic (Refactored for Batching)
async function processBulkEmailsLogic(campaignId, emails, subject, body, rotationConfig, accounts, recipientAccountMap = {}) {
  const startTime = Date.now();
  console.log(`[processBulkEmailsLogic] Started. Using ${accounts.length} accounts.`);
  
  await updateCampaignRecord(campaignId, { status: 'processing', started_at: new Date().toISOString() });

  const normalizedRecipientMap = {};
  for (const [k, v] of Object.entries(recipientAccountMap || {})) {
    if (typeof k === 'string' && k.trim()) {
      normalizedRecipientMap[k.toLowerCase()] = (v || '').toLowerCase();
    }
  }

  const accountEmailMap = new Map();
  for (const acc of accounts) {
    if (acc && acc.email) accountEmailMap.set(acc.email.toLowerCase(), acc);
  }

  // [FIX 2] Batching Configuration
  const EVENT_BATCH_SIZE = 50; 
  let eventBuffer = [];
  let sentCount = 0;
  let failedCount = 0;

  // Helper to flush events to DB
  const flushEvents = async () => {
    if (eventBuffer.length === 0) return;

    if (supabase) {
      // Use RPC for atomic batch updates to reduce connection overhead
      // You must have the 'append_campaign_event' RPC function in Supabase
      const progress = Math.round(((sentCount + failedCount) / emails.length) * 100);
      
      const { error: rpcError } = await supabase.rpc('append_campaign_event', {
        p_id: campaignId,
        p_event: eventBuffer, // Pass array of events
        p_sent: sentCount,    // Pass cumulative totals
        p_failed: failedCount,
        p_processed: sentCount + failedCount,
        p_progress: progress,
      });

      if (rpcError) {
        console.error('RPC append_campaign_event error:', rpcError.message);
        // Fallback: If RPC fails, try standard update (slower but safer)
        await updateCampaignRecord(campaignId, {
            processed: sentCount + failedCount,
            progress: progress
        });
      }
    } else {
      // Fallback for no-supabase mode (update JSON column)
      const { data: current } = await getCampaignRecord(campaignId);
      const details = (current && current.details) ? [...current.details, ...eventBuffer] : [...eventBuffer];
      await updateCampaignRecord(campaignId, {
        sent: sentCount,
        failed: failedCount,
        processed: sentCount + failedCount,
        progress: Math.round(((sentCount + failedCount) / emails.length) * 100),
        details,
      });
    }
    
    // Clear buffer after writing
    eventBuffer = [];
  };

  for (let i = 0; i < emails.length; i++) {
    const recipient = emails[i];
    const recipientEmail = typeof recipient === 'string' ? recipient : (recipient.email || '').toString();

    const mappedAccountEmail = normalizedRecipientMap[recipientEmail.toLowerCase()];
    let account;
    if (mappedAccountEmail && accountEmailMap.has(mappedAccountEmail)) {
      account = accountEmailMap.get(mappedAccountEmail);
    } else {
      const accountIndex = accounts.length > 1 ? i % accounts.length : 0;
      account = accounts[accountIndex];
    }

    try {
      const sanitizedBody = sanitizeHtml(body, SANITIZE_OPTIONS);
      const sanitizedSubject = sanitizeHtml(subject, { allowedTags: [], allowedAttributes: {} });

      const mailOptions = {
        from: account.email,
        to: recipientEmail,
        subject: sanitizedSubject,
        html: `<p style="font-family: Arial, sans-serif; white-space: pre-wrap;">${sanitizedBody.replace(/\n/g, '<br>')}</p>`,
        text: body,
      };

      const info = await account.transporter.sendMail(mailOptions);

      sentCount++;
      // Push to buffer instead of writing immediately
      eventBuffer.push({
        email: recipientEmail,
        status: 'sent',
        fromAccount: account.email,
        messageId: info.messageId,
        sentAt: new Date().toISOString(),
      });

    } catch (error) {
      console.error(`Failed to send email to ${recipientEmail}:`, error.message);
      failedCount++;
      eventBuffer.push({
        email: recipientEmail,
        status: 'failed',
        fromAccount: account.email,
        error: error.message,
        failedAt: new Date().toISOString(),
      });
    }

    // Flush batch if full
    if (eventBuffer.length >= EVENT_BATCH_SIZE) {
      await flushEvents();
    }

    // Throttle slightly (50ms) to prevent absolute network saturation
    if (i < emails.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  // Final flush for remaining events
  await flushEvents();

  console.log(`[processBulkEmailsLogic] Completing campaign ${campaignId}`);
  
  if (supabase) {
    const { error } = await supabase.from('bulk_email_campaign_status')
      .update({ status: 'completed', completed_at: new Date().toISOString(), progress: 100 })
      .eq('id', campaignId);
    if (error) console.error('Failed to mark campaign completed:', error.message);
  } else {
    await updateCampaignRecord(campaignId, { status: 'completed', completed_at: new Date().toISOString(), progress: 100 });
  }

  const totalTime = Date.now() - startTime;
  console.log(`[Worker] Campaign ${campaignId} finished in ${totalTime}ms`);
}


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

// Decrypt endpoint intentionally disabled - server should never return plaintext secrets
app.post('/api/decrypt-password', authenticateRequest, (_req, res) => {
  return res.status(410).json({
    success: false,
    error: 'Decrypt endpoint is disabled for security. Perform decryption server-side only.',
  });
});

// Send email endpoint (single email)
app.post('/api/send-email', emailLimiter, authenticateRequest, async (req, res) => {
  try {
    const { to, subject, body, from } = req.body;

    if (!to || !subject || !body) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    if (!isValidEmail(to)) {
      return res.status(400).json({ success: false, error: 'Invalid email format' });
    }
    if (subject.length < 1 || subject.length > 500) {
      return res.status(400).json({ success: false, error: 'Invalid subject length' });
    }
    if (body.length < 1 || body.length > 50000) {
      return res.status(400).json({ success: false, error: 'Invalid body length' });
    }

    let account;
    if (from && emailAccounts.has(from)) {
      account = emailAccounts.get(from);
    } else {
      account = emailAccounts.values().next().value;
    }

    if (!account) {
      return res.status(503).json({ success: false, error: 'Service unavailable' });
    }

    const sanitizedBody = sanitizeHtml(body, SANITIZE_OPTIONS);
    const sanitizedSubject = sanitizeHtml(subject, { allowedTags: [], allowedAttributes: {} });

    const mailOptions = {
      from: account.email,
      to: to,
      subject: sanitizedSubject,
      html: `<p style="font-family: Arial, sans-serif; white-space: pre-wrap;">${sanitizedBody.replace(/\n/g, '<br>')}</p>`,
      text: body,
    };

    const info = await account.transporter.sendMail(mailOptions);

    if (NODE_ENV === 'development') console.log('Email sent:', info.messageId);

    res.json({ success: true, message: 'Email sent', messageId: info.messageId });
  } catch (error) {
    if (NODE_ENV === 'development') console.error('Error sending email:', error);
    res.status(500).json({ success: false, error: 'Service unavailable' });
  }
});

function generateCampaignId() {
  return `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// DB-backed helpers (Supabase)
async function createCampaignRecord(campaign) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('bulk_email_campaign_status').insert(campaign).select().single();
  if (error) console.error('❌ Supabase insert error:', error.message);
  return data;
}

async function updateCampaignRecord(id, updates) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('bulk_email_campaign_status').update(updates).eq('id', id).select().single();
  if (error) console.error('Supabase update error:', error.message);
  return data;
}

async function getCampaignRecord(id) {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };
  const { data, error } = await supabase.from('bulk_email_campaign_status').select('*').eq('id', id).single();
  return { data, error };
}

// Bulk send emails - Updated to use Queue
app.post('/api/send-bulk-emails', emailLimiter, authenticateRequest, async (req, res) => {
  try {
    const { emails, subject, body, rotationConfig, selectedAccountEmails = [], selectedAccountIds = [], recipientAccountMap = {} } = req.body;

    // Validation
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid emails array' });
    }
    const MAX_BULK_SIZE = 5000; // Increased limit because Queue can handle it
    if (emails.length > MAX_BULK_SIZE) {
      return res.status(400).json({ success: false, error: 'Bulk limit exceeded' });
    }
    if (!subject || !body) {
      return res.status(400).json({ success: false, error: 'Missing required fields: subject, body' });
    }

    // Account Selection
    const allAccounts = Array.from(emailAccounts.values());
    if (allAccounts.length === 0) return res.status(500).json({ success: false, error: 'No email accounts configured' });

    let selectedAccounts = allAccounts;
    if (selectedAccountEmails.length > 0) {
      selectedAccounts = allAccounts.filter(acc => selectedAccountEmails.some(email => email.toLowerCase() === acc.email.toLowerCase()));
    } else if (selectedAccountIds.length > 0) {
      selectedAccounts = allAccounts.filter(acc => selectedAccountIds.includes(acc.id));
    }

    if (selectedAccounts.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid email accounts selected' });
    }

    const campaignId = generateCampaignId();

    // Initialize DB Record
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
      await createCampaignRecord(initialRecord);
    }

    // [FIX 1] ADD TO QUEUE
    // We pass the *email addresses* of the accounts to the worker so it can retrieve the transporters
    const accountEmailsList = selectedAccounts.map(a => a.email);

    await emailQueue.add('send-campaign', {
      campaignId,
      emails,
      subject,
      body,
      rotationConfig,
      accountEmails: accountEmailsList, // Pass list of emails, not objects
      recipientAccountMap
    }, {
      removeOnComplete: true, // Auto clean up successful jobs
      removeOnFail: 500 // Keep failed jobs for inspection
    });

    res.status(202).json({
      success: true,
      message: 'Email campaign queued for processing',
      campaignId: campaignId,
      total: emails.length,
      statusUrl: `/api/campaign-status/${campaignId}`,
    });

  } catch (error) {
    console.error('Error in bulk send endpoint:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get campaign status endpoint for polling
app.get('/api/campaign-status/:campaignId', async (req, res) => {
  const { campaignId } = req.params;
  if (!supabase) return res.status(500).json({ success: false, error: 'Supabase not configured' });

  const { data: campaign, error } = await getCampaignRecord(campaignId);
  if (error || !campaign) return res.status(404).json({ success: false, error: 'Campaign not found' });

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
  if (!supabase) return res.status(500).json({ success: false, error: 'Supabase not configured' });

  const { data: campaign, error } = await getCampaignRecord(campaignId);
  if (error || !campaign) return res.status(404).json({ success: false, error: 'Campaign not found' });

  res.json({ success: true, ...campaign });
});

// Get configured email accounts
app.get('/api/email-accounts', (req, res) => {
  const accounts = Array.from(emailAccounts.values()).map(account => ({
    email: account.email,
    index: account.index,
  }));

  res.json({ success: true, accounts: accounts, count: accounts.length });
});

// Manual email sync endpoint
app.post('/api/emails/sync-now', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, error: 'userId is required' });

    const { syncGmailEmails } = await import('./gmail-sync.js');
    const result = await syncGmailEmails(userId);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Manual sync error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
app.listen(PORT, async () => {
  console.log(`\n✅ Email server running on http://localhost:${PORT}`);
  console.log(`📧 Configured email accounts: ${emailAccounts.size}`);
  Array.from(emailAccounts.values()).forEach(account => {
    console.log(`   └─ ${account.email}`);
  });

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