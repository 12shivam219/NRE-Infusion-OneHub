import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import rateLimit from 'express-rate-limit';
import { encryptPassword, decryptPassword, isEncrypted } from './encryption.js';

dotenv.config();

const app = express();
const PORT = process.env.EMAIL_SERVER_PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

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

// SECURITY: Function to sanitize HTML content
function sanitizeHtml(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .trim();
}

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

    // SECURITY: Sanitize HTML content to prevent injection
    const sanitizedBody = sanitizeHtml(body);
    const sanitizedSubject = sanitizeHtml(subject);

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

// Bulk send emails with rotation
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

    const results = {
      success: true,
      total: emails.length,
      sent: 0,
      failed: 0,
      details: [],
    };

    // Get available accounts
    const accounts = Array.from(emailAccounts.values());
    if (accounts.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'No email accounts configured',
      });
    }

    // Process emails with rotation
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
        const mailOptions = {
          from: account.email,
          to: recipient.email,
          subject: subject,
          html: `<p>${body.replace(/\n/g, '<br>')}</p>`,
          text: body,
        };

        const info = await account.transporter.sendMail(mailOptions);

        results.sent++;
        results.details.push({
          email: recipient.email,
          status: 'sent',
          fromAccount: account.email,
          messageId: info.messageId,
        });

        console.log(`[${i + 1}/${emails.length}] Email sent to ${recipient.email} from ${account.email}`);

        // Add delay between emails to avoid rate limiting (2 seconds)
        if (i < emails.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        results.failed++;
        results.details.push({
          email: recipient.email,
          status: 'failed',
          fromAccount: account.email,
          error: error.message,
        });

        console.error(`Failed to send email to ${recipient.email}:`, error.message);
      }
    }

    res.json(results);
  } catch (error) {
    console.error('Error in bulk send:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process bulk emails',
    });
  }
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

  // Start Gmail sync scheduler (optional)
  try {
    const { startSyncScheduler } = await import('./gmail-sync.js');
    startSyncScheduler();
    console.log('📬 Gmail sync scheduler started');
  } catch (error) {
    console.warn('⚠️  Gmail sync scheduler not available:', error.message);
  }

  console.log('');
});
