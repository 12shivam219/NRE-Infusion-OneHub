import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const REDIS_URL = process.env.REDIS_URL;

// Redis client used for distributed locking (optional)
let redis = null;
const instanceId = `${process.pid}-${Date.now()}`;

if (REDIS_URL) {
  try {
    redis = new Redis(REDIS_URL);
    redis.on('error', (err) => console.error('Redis error:', err));
  } catch (err) {
    console.error('Failed to initialize Redis client:', err.message);
    redis = null;
  }
}

let supabase = null;

// Only initialize Supabase if credentials are provided
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
} else {
  console.warn('⚠️  Supabase credentials not configured. Gmail sync scheduler disabled.');
}

// ============================================
// Gmail API Integration
// ============================================

async function getGmailMessages(accessToken, pageToken = null) {
  const params = new URLSearchParams({
    maxResults: '100',
    q: 'from:me', // Only sent emails
  });

  if (pageToken) {
    params.append('pageToken', pageToken);
  }

  const response = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Gmail API error: ${response.status}`);
  }

  return response.json();
}

async function getGmailMessageDetails(accessToken, messageId) {
  const response = await fetch(
    `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Gmail API error: ${response.status}`);
  }

  return response.json();
}

function parseEmailHeaders(headers) {
  const headerObj = {};
  if (headers) {
    headers.forEach((header) => {
      headerObj[header.name] = header.value;
    });
  }
  return headerObj;
}

function getBase64Body(message) {
  let body = '';

  if (message.parts) {
    // Multipart email
    for (const part of message.parts) {
      if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
        if (part.body.data) {
          body = Buffer.from(part.body.data, 'base64').toString('utf-8');
          break;
        }
      }
    }
  } else if (message.body?.data) {
    // Simple email
    body = Buffer.from(message.body.data, 'base64').toString('utf-8');
  }

  return body;
}

function extractRecipients(headerObj) {
  // Extract email addresses from To header
  const toHeader = headerObj.To || '';
  const emails = [];

  // Regex to match email addresses
  const emailRegex = /([a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  const matches = toHeader.match(emailRegex);

  if (matches) {
    matches.forEach((email) => {
      emails.push({
        email: email.toLowerCase(),
        name: extractNameFromEmail(toHeader, email),
      });
    });
  }

  return emails;
}

function extractNameFromEmail(headerValue, email) {
  // Try to extract display name from "Name <email>" format
  const escapedEmail = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`([^<]*)<${escapedEmail}>`, 'i');
  const match = headerValue.match(regex);
  if (match) {
    return match[1].trim().replace(/["']/g, '');
  }
  return email.split('@')[0];
}

// ============================================
// Keyword Matching & Confidence Scoring
// ============================================

function extractKeywords(text) {
  if (!text) return [];

  // Convert to lowercase and remove special characters
  const clean = text.toLowerCase().replace(/[^\w\s]/g, ' ');

  // Split into words and remove common words
  const commonWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'be', 'been',
    'have', 'has', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'if', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it',
    'we', 'they', 'what', 'which', 'who', 'where', 'when', 'why', 'how',
  ]);

  const words = clean.split(/\s+/).filter(
    (word) => word.length > 2 && !commonWords.has(word)
  );

  return [...new Set(words)]; // Remove duplicates
}

function calculateMatchConfidence(requirementKeywords, emailSubject, emailBody) {
  if (requirementKeywords.length === 0) {
    return 0;
  }

  const emailContent = `${emailSubject || ''} ${emailBody || ''}`.toLowerCase();
  let matches = 0;

  // Check how many requirement keywords appear in email
  for (const keyword of requirementKeywords) {
    if (emailContent.includes(keyword)) {
      matches++;
    }
  }

  // Calculate confidence as percentage
  const confidence = Math.round((matches / requirementKeywords.length) * 100);

  // Boost confidence if there are strong indicators
  if (emailSubject && emailSubject.toLowerCase().includes(requirementKeywords[0])) {
    return Math.min(100, confidence + 20);
  }

  return confidence;
}

// ============================================
// Email Sync & Matching Logic
// ============================================

async function syncGmailEmails(userId) {
  const startTime = new Date();
  let logId = null;

  try {
    // Get user's Gmail token
    const { data: tokenData, error: tokenError } = await supabase
      .from('gmail_sync_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (tokenError || !tokenData) {
      console.log(`No active Gmail token for user ${userId}`);
      return null;
    }

    // Check if token is expired and refresh if needed
    const tokenExpiresAt = new Date(tokenData.token_expires_at);
    if (new Date() > tokenExpiresAt) {
      console.log('Token expired, would need refresh token flow here');
      // TODO: Implement refresh token flow
      return null;
    }

    // Create sync log entry
    const { data: log, error: logError } = await supabase
      .from('email_sync_logs')
      .insert({
        user_id: userId,
        status: 'in_progress',
      })
      .select()
      .single();

    if (logError) {
      throw logError;
    }

    logId = log.id;
    let emailsFetched = 0;
    let emailsProcessed = 0;
    let emailsMatched = 0;
    let emailsCreated = 0;

    // Fetch messages from Gmail
    const messages = await getGmailMessages(tokenData.access_token, tokenData.last_sync_message_id);
    emailsFetched = messages.messages?.length || 0;

    if (!messages.messages || messages.messages.length === 0) {
      console.log('No new emails to sync');

      // Update sync log
      await supabase
        .from('email_sync_logs')
        .update({
          sync_completed_at: new Date().toISOString(),
          emails_fetched: 0,
          status: 'completed',
        })
        .eq('id', logId);

      return log;
    }

    // Get user's requirements for matching
    const { data: requirements, error: reqError } = await supabase
      .from('requirements')
      .select('id, title, description')
      .eq('user_id', userId);

    if (reqError) {
      throw reqError;
    }

    // Process each message
    for (const message of messages.messages) {
      try {
        emailsProcessed++;

        // Get full message details
        const messageDetails = await getGmailMessageDetails(
          tokenData.access_token,
          message.id
        );

        const headers = parseEmailHeaders(messageDetails.payload.headers);
        const body = getBase64Body(messageDetails.payload);
        const recipients = extractRecipients(headers);
        const sentDate = new Date(parseInt(messageDetails.internalDate));

        // Check if email already exists
        const { data: existing } = await supabase
          .from('requirement_emails')
          .select('id')
          .eq('message_id', message.id)
          .single();

        if (existing) {
          console.log(`Email ${message.id} already synced`);
          continue;
        }

        // Try to match email to requirements
        let bestMatch = null;
        let bestConfidence = 0;

        for (const requirement of requirements) {
          const requirementKeywords = extractKeywords(
            `${requirement.title} ${requirement.description}`
          );

          const confidence = calculateMatchConfidence(
            requirementKeywords,
            headers.Subject,
            body
          );

          if (confidence > bestConfidence) {
            bestConfidence = confidence;
            bestMatch = requirement;
          }
        }

        // Determine if match should be auto-linked or needs confirmation
        const confidenceLevel = tokenData.auto_link_confidence_level || 'medium';
        const autoLinkThreshold = confidenceLevel === 'high' ? 95 : confidenceLevel === 'medium' ? 70 : 0;
        const needsConfirmation = bestConfidence < autoLinkThreshold && bestMatch;

        // Insert email record
        if (bestMatch) {
          for (const recipient of recipients) {
            const { data: created, error: insertError } = await supabase
              .from('requirement_emails')
              .insert({
                requirement_id: bestMatch.id,
                recipient_email: recipient.email,
                recipient_name: recipient.name,
                sent_via: 'gmail_synced',
                subject: headers.Subject,
                body_preview: body.substring(0, 500),
                message_id: message.id,
                sent_date: sentDate.toISOString(),
                status: 'sent',
                match_confidence: bestConfidence,
                needs_user_confirmation: needsConfirmation,
                created_by: userId,
              })
              .select()
              .single();

            if (!insertError) {
              emailsCreated++;
              if (bestConfidence >= autoLinkThreshold) {
                emailsMatched++;
              }
            } else {
              console.error('Error inserting email:', insertError);
            }
          }
        }
      } catch (error) {
        console.error(`Error processing message ${message.id}:`, error);
      }
    }

    // Update sync log with completion
    const { error: updateError } = await supabase
      .from('email_sync_logs')
      .update({
        sync_completed_at: new Date().toISOString(),
        emails_fetched: emailsFetched,
        emails_processed: emailsProcessed,
        emails_matched: emailsMatched,
        emails_created: emailsCreated,
        status: 'completed',
      })
      .eq('id', logId);

    if (updateError) {
      throw updateError;
    }

    // Update last sync time and message ID
    await supabase
      .from('gmail_sync_tokens')
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_message_id: messages.nextPageToken || messages.messages[0].id,
      })
      .eq('user_id', userId);

    console.log(`Sync completed for user ${userId}:
      - Fetched: ${emailsFetched}
      - Processed: ${emailsProcessed}
      - Matched: ${emailsMatched}
      - Created: ${emailsCreated}`);

    return {
      userId,
      emailsFetched,
      emailsProcessed,
      emailsMatched,
      emailsCreated,
      duration: new Date() - startTime,
    };
  } catch (error) {
    console.error('Error syncing Gmail emails:', error);

    if (logId) {
      await supabase
        .from('email_sync_logs')
        .update({
          sync_completed_at: new Date().toISOString(),
          status: 'failed',
          error_message: error.message,
        })
        .eq('id', logId);
    }

    throw error;
  }
}

// ============================================
// Sync Scheduler
// ============================================

async function startSyncScheduler() {
  // Check if Supabase is properly configured
  if (!supabase) {
    console.warn('⚠️  Gmail sync scheduler not started: Supabase not configured');
    return;
  }

  console.log('Starting Gmail sync scheduler...');

  // Initial sync for all active users
  const { data: allUsers, error } = await supabase
    .from('gmail_sync_tokens')
    .select('user_id, sync_frequency_minutes')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching users:', error);
    return;
  }

  // Create a map of users with their sync frequencies
  const userSyncMap = new Map();

  for (const user of allUsers) {
    const frequency = user.sync_frequency_minutes || 15;
    if (!userSyncMap.has(frequency)) {
      userSyncMap.set(frequency, []);
    }
    userSyncMap.get(frequency).push(user.user_id);
  }

  // Schedule sync for each frequency. Use a Redis-based distributed lock when available so
  // only one instance performs the sync per frequency interval.
  for (const [frequency, users] of userSyncMap) {
    setInterval(async () => {
      const lockKey = `gmail_sync_lock:${frequency}`;
      const lockTtl = Math.max(60, frequency * 60 + 60); // seconds
      let acquired = true;

      if (redis) {
        try {
          const res = await redis.set(lockKey, instanceId, 'NX', 'EX', lockTtl);
          if (!res) {
            console.log(`Another instance holds lock for frequency ${frequency} — skipping this run.`);
            acquired = false;
          } else {
            console.log(`Acquired lock ${lockKey} as ${instanceId}`);
          }
        } catch (err) {
          console.error('Redis lock error — proceeding without lock:', err.message);
        }
      } else {
        console.warn('No REDIS_URL configured — scheduler may run on every instance.');
      }

      if (!acquired) return;

      try {
        console.log(`Running sync for ${users.length} users (${frequency}min interval)`);

        for (const userId of users) {
          try {
            await syncGmailEmails(userId);
          } catch (error) {
            console.error(`Failed to sync user ${userId}:`, error.message);
          }
        }
      } finally {
        if (redis) {
          try {
            const cur = await redis.get(lockKey);
            if (cur === instanceId) {
              await redis.del(lockKey);
              console.log(`Released lock ${lockKey}`);
            }
          } catch (err) {
            console.error('Error releasing Redis lock:', err.message);
          }
        }
      }
    }, frequency * 60 * 1000); // Convert minutes to milliseconds
  }

  console.log('Gmail sync scheduler started');
}

// ============================================
// Export functions
// ============================================

export { syncGmailEmails, startSyncScheduler };
