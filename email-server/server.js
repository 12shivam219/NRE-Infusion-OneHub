import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';

dotenv.config();

const app = express();
const PORT = process.env.EMAIL_SERVER_PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Store multiple email transports
const emailAccounts = new Map();

// Initialize email accounts from environment variables
function initializeEmailAccounts() {
  // Parse email accounts from .env
  // Format: EMAIL_ACCOUNTS=email1:password1;email2:password2;email3:password3
  const accountsEnv = process.env.EMAIL_ACCOUNTS;
  
  if (accountsEnv) {
    const accounts = accountsEnv.split(';');
    accounts.forEach((account, index) => {
      const [email, password] = account.split(':');
      if (email && password) {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: email.trim(),
            pass: password.trim(),
          },
        });
        
        emailAccounts.set(email.trim(), {
          email: email.trim(),
          transporter: transporter,
          index: index + 1,
        });
        
        console.log(`✅ Email account ${index + 1} loaded: ${email.trim()}`);
      }
    });
  }
  
  // Fallback: single account from legacy .env format
  if (emailAccounts.size === 0 && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
    
    emailAccounts.set(process.env.EMAIL_USER, {
      email: process.env.EMAIL_USER,
      transporter: transporter,
      index: 1,
    });
    
    console.log(`✅ Email account 1 loaded: ${process.env.EMAIL_USER}`);
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
app.post('/api/send-email', async (req, res) => {
  try {
    const { to, subject, body, from } = req.body;

    // Validate required fields
    if (!to || !subject || !body) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, subject, body',
      });
    }

    // Get the specified account or use the first available
    let account;
    if (from && emailAccounts.has(from)) {
      account = emailAccounts.get(from);
    } else {
      account = emailAccounts.values().next().value;
    }

    if (!account) {
      return res.status(500).json({
        success: false,
        error: 'No email accounts configured',
      });
    }

    // Create email options
    const mailOptions = {
      from: account.email,
      to: to,
      subject: subject,
      html: `<p>${body.replace(/\n/g, '<br>')}</p>`,
      text: body,
    };

    // Send email
    const info = await account.transporter.sendMail(mailOptions);

    console.log('Email sent:', info.messageId, 'from:', account.email);

    res.json({
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId,
      fromEmail: account.email,
    });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send email',
    });
  }
});

// Bulk send emails with rotation
app.post('/api/send-bulk-emails', async (req, res) => {
  try {
    const { emails, subject, body, rotationConfig } = req.body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid emails array',
      });
    }

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
