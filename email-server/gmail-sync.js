import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';
import pLimit from 'p-limit'; // [FIX 3] Import p-limit

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const REDIS_URL = process.env.REDIS_URL;

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
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
} else {
  console.warn('⚠️  Supabase credentials not configured. Gmail sync scheduler disabled.');
}

// ============================================
// [FIX 5] Token Management & Refresh
// ============================================

async function refreshGmailToken(refreshToken) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.VITE_GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  
  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Failed to refresh token: ${err.error_description || response.statusText}`);
  }
  return response.json();
}

// Wrapper to handle 401 errors automatically
async function fetchWithRetry(url, options, tokenData, userId) {
  let response = await fetch(url, options);

  // If unauthorized, try to refresh token once
  if (response.status === 401) {
    console.log(`[Sync] Token expired for user ${userId}, attempting refresh...`);
    try {
      const newTokens = await refreshGmailToken(tokenData.refresh_token);
      
      // Update DB with new token
      await supabase.from('gmail_sync_tokens')
        .update({
          access_token: newTokens.access_token,
          token_expires_at: new Date(Date.now() + (newTokens.expires_in || 3600) * 1000).toISOString()
        })
        .eq('user_id', userId);

      // Retry original request with new token
      const newOptions = { ...options };
      newOptions.headers = { ...newOptions.headers, Authorization: `Bearer ${newTokens.access_token}` };
      response = await fetch(url, newOptions);
      
    } catch (refreshError) {
      console.error(`[Sync] Critical: Could not refresh token for user ${userId}`, refreshError);
      throw refreshError; 
    }
  }
  return response;
}

// ============================================
// Gmail API Integration
// ============================================

async function getGmailMessages(accessToken, refreshToken, userId, pageToken = null) {
  const params = new URLSearchParams({ maxResults: '100', q: 'from:me' });
  if (pageToken) params.append('pageToken', pageToken);

  const url = `https://www.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`;
  const options = { headers: { Authorization: `Bearer ${accessToken}` } };

  // Use retry wrapper
  const response = await fetchWithRetry(url, options, { refresh_token: refreshToken }, userId);

  if (!response.ok) throw new Error(`Gmail API error (list): ${response.status}`);
  return response.json();
}

async function getGmailMessageDetails(accessToken, refreshToken, userId, messageId) {
  const url = `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`;
  const options = { headers: { Authorization: `Bearer ${accessToken}` } };

  // Use retry wrapper
  const response = await fetchWithRetry(url, options, { refresh_token: refreshToken }, userId);

  if (!response.ok) throw new Error(`Gmail API error (details): ${response.status}`);
  return response.json();
}

function parseEmailHeaders(headers) {
  const headerObj = {};
  if (headers) headers.forEach(h => headerObj[h.name] = h.value);
  return headerObj;
}

function getBase64Body(message) {
  let body = '';
  if (message.parts) {
    for (const part of message.parts) {
      if ((part.mimeType === 'text/plain' || part.mimeType === 'text/html') && part.body.data) {
        body = Buffer.from(part.body.data, 'base64').toString('utf-8');
        break;
      }
    }
  } else if (message.body?.data) {
    body = Buffer.from(message.body.data, 'base64').toString('utf-8');
  }
  return body;
}

function extractRecipients(headerObj) {
  const toHeader = headerObj.To || '';
  const emails = [];
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
  const escapedEmail = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`([^<]*)<${escapedEmail}>`, 'i');
  const match = headerValue.match(regex);
  if (match) return match[1].trim().replace(/["']/g, '');
  return email.split('@')[0];
}

// ============================================
// Keyword Matching Logic
// ============================================

function extractKeywords(text) {
  if (!text) return [];
  const clean = text.toLowerCase().replace(/[^\w\s]/g, ' ');
  const commonWords = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','by','from','as','is','was','are','be','been','have','has','do','does','did','will','would','could','should','if','this','that','these','those','i','you','he','she','it','we','they','what','which','who','where','when','why','how']);
  
  return [...new Set(clean.split(/\s+/).filter(w => w.length > 2 && !commonWords.has(w)))];
}

function calculateMatchConfidence(requirementKeywords, emailSubject, emailBody) {
  if (requirementKeywords.length === 0) return 0;
  const emailContent = `${emailSubject || ''} ${emailBody || ''}`.toLowerCase();
  let matches = 0;
  for (const keyword of requirementKeywords) {
    if (emailContent.includes(keyword)) matches++;
  }
  const confidence = Math.round((matches / requirementKeywords.length) * 100);
  if (emailSubject && emailSubject.toLowerCase().includes(requirementKeywords[0])) {
    return Math.min(100, confidence + 20);
  }
  return confidence;
}

// ============================================
// [FIX 3] Optimized Sync Logic (Parallel)
// ============================================

async function syncGmailEmails(userId) {
  const startTime = new Date();
  let logId = null;

  try {
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

    const { data: log, error: logError } = await supabase
      .from('email_sync_logs')
      .insert({ user_id: userId, status: 'in_progress' })
      .select().single();

    if (logError) throw logError;
    logId = log.id;

    // Fetch messages (pass refresh_token and user_id for retry logic)
    const messages = await getGmailMessages(tokenData.access_token, tokenData.refresh_token, userId, tokenData.last_sync_message_id);
    const emailList = messages.messages || [];

    if (emailList.length === 0) {
      await supabase.from('email_sync_logs').update({
          sync_completed_at: new Date().toISOString(),
          emails_fetched: 0,
          status: 'completed',
      }).eq('id', logId);
      return log;
    }

    const { data: requirements } = await supabase.from('requirements').select('id, title, description').eq('user_id', userId);

    // [FIX 3] PARALLEL PROCESSING
    const limit = pLimit(10); // Concurrent limit
    let emailsMatched = 0;
    let emailsCreated = 0;

    const processPromises = emailList.map(message => {
      return limit(async () => {
        try {
          const { data: existing } = await supabase
             .from('requirement_emails')
             .select('id')
             .eq('message_id', message.id)
             .single();
             
          if (existing) return;

          const messageDetails = await getGmailMessageDetails(tokenData.access_token, tokenData.refresh_token, userId, message.id);
          const headers = parseEmailHeaders(messageDetails.payload.headers);
          const body = getBase64Body(messageDetails.payload);
          const recipients = extractRecipients(headers);
          const sentDate = new Date(parseInt(messageDetails.internalDate));

          let bestMatch = null;
          let bestConfidence = 0;

          if (requirements) {
            for (const requirement of requirements) {
                const requirementKeywords = extractKeywords(`${requirement.title} ${requirement.description}`);
                const confidence = calculateMatchConfidence(requirementKeywords, headers.Subject, body);
                if (confidence > bestConfidence) {
                    bestConfidence = confidence;
                    bestMatch = requirement;
                }
            }
          }

          const confidenceLevel = tokenData.auto_link_confidence_level || 'medium';
          const autoLinkThreshold = confidenceLevel === 'high' ? 95 : confidenceLevel === 'medium' ? 70 : 0;
          const needsConfirmation = bestConfidence < autoLinkThreshold && bestMatch;

          if (bestMatch) {
            for (const recipient of recipients) {
                const { error: insertError } = await supabase.from('requirement_emails').insert({
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
                });

                if (!insertError) {
                    emailsCreated++;
                    if (bestConfidence >= autoLinkThreshold) emailsMatched++;
                }
            }
          }
        } catch (msgErr) {
          console.error(`Error processing message ${message.id}:`, msgErr);
        }
      });
    });

    await Promise.all(processPromises);

    // Final Update
    await supabase.from('email_sync_logs').update({
        sync_completed_at: new Date().toISOString(),
        emails_fetched: emailList.length,
        emails_processed: emailList.length, // approximation
        emails_matched: emailsMatched,
        emails_created: emailsCreated,
        status: 'completed',
    }).eq('id', logId);

    // Update Token Cursor
    await supabase.from('gmail_sync_tokens').update({
        last_sync_at: new Date().toISOString(),
        last_sync_message_id: messages.nextPageToken || emailList[0].id,
    }).eq('user_id', userId);

    return { userId, emailsFetched: emailList.length, emailsCreated, duration: new Date() - startTime };

  } catch (error) {
    console.error('Error syncing Gmail emails:', error);
    if (logId) {
      await supabase.from('email_sync_logs').update({
        sync_completed_at: new Date().toISOString(),
        status: 'failed',
        error_message: error.message,
      }).eq('id', logId);
    }
    throw error;
  }
}

// ============================================
// Sync Scheduler
// ============================================

async function startSyncScheduler() {
  if (!supabase) {
    console.warn('⚠️  Gmail sync scheduler not started: Supabase not configured');
    return;
  }

  console.log('Starting Gmail sync scheduler...');

  const { data: allUsers, error } = await supabase
    .from('gmail_sync_tokens')
    .select('user_id, sync_frequency_minutes')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching users:', error);
    return;
  }

  const userSyncMap = new Map();
  for (const user of allUsers) {
    const frequency = user.sync_frequency_minutes || 15;
    if (!userSyncMap.has(frequency)) userSyncMap.set(frequency, []);
    userSyncMap.get(frequency).push(user.user_id);
  }

  for (const [frequency, users] of userSyncMap) {
    setInterval(async () => {
      const lockKey = `gmail_sync_lock:${frequency}`;
      const lockTtl = Math.max(60, frequency * 60 + 60);
      let acquired = true;

      if (redis) {
        try {
          const res = await redis.set(lockKey, instanceId, 'NX', 'EX', lockTtl);
          if (!res) acquired = false;
        } catch (err) {
          console.error('Redis lock error:', err.message);
        }
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
            if (cur === instanceId) await redis.del(lockKey);
          } catch (err) { console.error(err); }
        }
      }
    }, frequency * 60 * 1000);
  }
}

export { syncGmailEmails, startSyncScheduler };