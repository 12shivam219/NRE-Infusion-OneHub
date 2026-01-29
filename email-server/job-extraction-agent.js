/**
 * Automated Job Extraction Agent
 * Runs periodically to:
 * 1. Fetch unprocessed emails from all users' Gmail accounts
 * 2. Extract job details using Groq AI
 * 3. Auto-create requirements without user intervention
 * 4. Track processing status and execution logs
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

// ==========================================
// CONFIGURATION
// ==========================================

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

// Confidence threshold for auto-creating requirements (0-100)
const CONFIDENCE_THRESHOLD = 75;

// Maximum emails to process per run (reduced to avoid rate limits)
const MAX_EMAILS_PER_RUN = 10;

// Batch size for API calls
const BATCH_SIZE = 2;

// ==========================================
// SUPABASE CLIENT
// ==========================================

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ==========================================
// GROQ API INTEGRATION
// ==========================================

async function extractJobWithGroq(emailContent, retries = 3) {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured');
  }

  // Limit email content to first 1000 chars to reduce tokens
  const limitedContent = emailContent.substring(0, 1000);

  const prompt = `Is this a job email? Extract key info. Return JSON.
{"isJobEmail":true/false,"title":"","company":"","location":"","salary":"","skills":"","confidence":0-100}`;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            {
              role: 'user',
              content: `${prompt}\n\n${limitedContent}`,
            },
          ],
          temperature: 0.1,
          max_tokens: 300,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        const errorMsg = error.error?.message || response.statusText;
        
        // Rate limit - wait and retry
        if (response.status === 429 && attempt < retries - 1) {
          const waitMs = Math.pow(2, attempt) * 2000; // 2s, 4s, 8s
          console.log(`   ⏳ Rate limited, waiting ${waitMs}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitMs));
          continue;
        }
        throw new Error(`Groq API error: ${errorMsg}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('No response from Groq API');
      }

      // Try to parse JSON - be more lenient
      let result;
      try {
        result = JSON.parse(content);
      } catch (err) {
        // Try to extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Invalid JSON in response');
        }
      }
      
      return result;
    } catch (err) {
      if (attempt === retries - 1) {
        throw err;
      }
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// ==========================================
// GMAIL API
// ==========================================

async function getGmailProfile(accessToken) {
  const response = await fetch('https://www.googleapis.com/gmail/v1/users/me/profile', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Gmail profile: ${response.status}`);
  }

  return response.json();
}

async function fetchGmailEmails(accessToken, maxResults = MAX_EMAILS_PER_RUN) {
  try {
    // Fetch unread emails with common job keywords
    const query = encodeURIComponent('is:unread (job OR position OR opening OR opportunity OR recruitment OR hiring OR apply OR interview) -label:Trash -label:Spam');
    
    const response = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=${maxResults}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch Gmail messages: ${response.status}`);
    }

    const data = await response.json();
    return data.messages || [];
  } catch (error) {
    console.error('Error fetching Gmail emails:', error.message);
    return [];
  }
}

async function getGmailMessage(accessToken, messageId) {
  const response = await fetch(
    `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get Gmail message ${messageId}: ${response.status}`);
  }

  return response.json();
}

function extractEmailContent(message) {
  try {
    const headers = message.payload?.headers || [];
    const subject = headers.find(h => h.name === 'Subject')?.value || '(No Subject)';
    const from = headers.find(h => h.name === 'From')?.value || '(Unknown)';
    
    let body = '';
    const parts = message.payload?.parts || [];
    
    if (parts.length > 0) {
      const textPart = parts.find(p => p.mimeType === 'text/plain');
      if (textPart?.body?.data) {
        body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
      }
    } else if (message.payload?.body?.data) {
      body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
    }

    return {
      subject,
      from,
      body: body.substring(0, 5000), // Limit to 5000 chars
      fullContent: `Subject: ${subject}\n\nFrom: ${from}\n\n${body}`,
    };
  } catch (error) {
    console.error('Error extracting email content:', error);
    return null;
  }
}

// ==========================================
// REQUIREMENT CREATION
// ==========================================

async function createRequirementFromJob(userId, jobData, emailInfo) {
  try {
    // Map compact field names from AI response
    const requirementPayload = {
      user_id: userId,
      title: jobData.jobTitle || jobData.title || 'Job Opening',
      company: jobData.companyName || jobData.company || 'Unknown Company',
      location: jobData.location || null,
      rate: jobData.salary || null,
      primary_tech_stack: jobData.requirements || jobData.skills || null,
      remote: (jobData.jobType || jobData.type || '').toLowerCase().includes('remote') ? 'Yes' : null,
      description: buildDescription(jobData, emailInfo),
      next_step: `Email: "${emailInfo.subject}" | From: ${emailInfo.from} | AI Confidence: ${jobData.confidenceScore || jobData.confidence || 0}%`,
      status: 'NEW',
      created_by: userId,
      updated_by: userId,
    };

    // Insert into requirements table
    const { data: requirement, error } = await supabase
      .from('requirements')
      .insert([requirementPayload])
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create requirement: ${error.message}`);
    }

    return requirement;
  } catch (error) {
    console.error('Error creating requirement:', error);
    throw error;
  }
}

// Helper to build comprehensive description from job data
function buildDescription(jobData, emailInfo) {
  const parts = [];
  
  if (jobData.description) {
    parts.push(`**Job Details:**\n${jobData.description}`);
  }
  
  if (jobData.jobType) {
    parts.push(`\n**Job Type:** ${jobData.jobType}`);
  }
  
  if (jobData.applicationLink) {
    parts.push(`\n**Application Link:** ${jobData.applicationLink}`);
  }
  
  if (jobData.keyPoints && jobData.keyPoints.length > 0) {
    parts.push(`\n**Key Points:**\n${jobData.keyPoints.map(p => `• ${p}`).join('\n')}`);
  }
  
  if (jobData.extractionNotes) {
    parts.push(`\n**Notes:** ${jobData.extractionNotes}`);
  }
  
  if (!parts.length) {
    return emailInfo.body || 'Auto-extracted from email';
  }
  
  return parts.join('\n');
}

// ==========================================
// PROCESSING LOGIC
// ==========================================

async function processUserEmails(userId, accessToken) {
  const startTime = new Date();
  let emailsProcessed = 0;
  let jobsFound = 0;
  let requirementsCreated = 0;
  const errors = [];

  try {
    console.log(`\n📧 Processing emails for user: ${userId}`);

    // Fetch unprocessed emails
    const messages = await fetchGmailEmails(accessToken);
    console.log(`   Found ${messages.length} unread job-related emails`);

    if (messages.length === 0) {
      return { emailsProcessed: 0, jobsFound: 0, requirementsCreated: 0, errors: [] };
    }

    // Process emails in batches
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);

      for (const message of batch) {
        try {
          emailsProcessed++;

          // Fetch full message
          const fullMessage = await getGmailMessage(accessToken, message.id);
          const emailContent = extractEmailContent(fullMessage);

          if (!emailContent) {
            throw new Error('Could not extract email content');
          }

          console.log(`   📨 Processing: "${emailContent.subject}"`);

          // Add larger delay to avoid rate limiting (500ms between requests)
          await new Promise(resolve => setTimeout(resolve, 500));

          // Extract job information using Groq AI
          const jobData = await extractJobWithGroq(emailContent.fullContent);

          // If not a job email, skip
          if (!jobData.isJobEmail) {
            console.log(`   ⏭️  Not a job email (confidence: ${jobData.confidence || jobData.confidenceScore || 0}%)`);
            continue;
          }

          jobsFound++;
          console.log(`   ✅ Found job: "${jobData.jobTitle || jobData.title || 'Unknown'}" (Confidence: ${jobData.confidence || jobData.confidenceScore || 0}%)`);

          // Auto-create requirement if confidence is high enough
          if ((jobData.confidence || jobData.confidenceScore || 0) >= CONFIDENCE_THRESHOLD) {
            try {
              const requirement = await createRequirementFromJob(userId, jobData, {
                messageId: message.id,
                subject: emailContent.subject,
                from: emailContent.from,
                body: emailContent.body,
              });

              requirementsCreated++;
              console.log(`   🎯 Auto-created requirement: ${requirement.id}`);
            } catch (err) {
              errors.push(`Failed to create requirement for email "${emailContent.subject}": ${err.message}`);
              console.error(`   ❌ Error creating requirement:`, err.message);
            }
          } else {
            console.log(`   📌 Confidence too low (${jobData.confidenceScore}%) - skipping auto-creation`);
          }
        } catch (err) {
          errors.push(`Error processing email: ${err.message}`);
          console.error(`   ❌ Error:`, err.message);
        }
      }
    }

    return { emailsProcessed, jobsFound, requirementsCreated, errors };
  } catch (error) {
    console.error('Error processing user emails:', error);
    return { emailsProcessed, jobsFound, requirementsCreated, errors: [error.message] };
  }
}

// ==========================================
// MAIN EXECUTION
// ==========================================

export async function runJobExtractionAgent() {
  const executionStart = new Date();
  console.log('\n' + '='.repeat(60));
  console.log('🤖 JOB EXTRACTION AGENT STARTED');
  console.log('='.repeat(60));
  console.log(`⏰ Started at: ${executionStart.toISOString()}`);

  try {
    // Fetch all users with Gmail connection
    const { data: users, error: usersError } = await supabase
      .from('gmail_sync_tokens')
      .select('user_id, access_token, is_active')
      .eq('is_active', true);

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    if (!users || users.length === 0) {
      console.log('ℹ️  No active Gmail connections found');
      return;
    }

    console.log(`\n👥 Found ${users.length} users with active Gmail connections`);

    let totalEmailsProcessed = 0;
    let totalJobsFound = 0;
    let totalRequirementsCreated = 0;
    const allErrors = [];

    // Process each user's emails
    for (const userToken of users) {
      try {
        const result = await processUserEmails(userToken.user_id, userToken.access_token);
        totalEmailsProcessed += result.emailsProcessed;
        totalJobsFound += result.jobsFound;
        totalRequirementsCreated += result.requirementsCreated;
        allErrors.push(...result.errors);
      } catch (err) {
        console.error(`Error processing user ${userToken.user_id}:`, err.message);
        allErrors.push(`User ${userToken.user_id}: ${err.message}`);
      }
    }

    // Log execution summary
    const executionEnd = new Date();
    const durationSeconds = Math.round((executionEnd - executionStart) / 1000);

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 AGENT EXECUTION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✉️  Emails Processed: ${totalEmailsProcessed}`);
    console.log(`🎯 Jobs Found: ${totalJobsFound}`);
    console.log(`📝 Requirements Created: ${totalRequirementsCreated}`);
    console.log(`⏱️  Duration: ${durationSeconds}s`);
    console.log(`⏰ Completed at: ${executionEnd.toISOString()}`);

    if (allErrors.length > 0) {
      console.log(`\n⚠️  Errors (${allErrors.length}):`);
      allErrors.slice(0, 5).forEach(err => console.log(`   • ${err}`));
    }

    console.log('='.repeat(60) + '\n');
  } catch (error) {
    console.error('\n❌ AGENT EXECUTION FAILED');
    console.error(error);
  }
}

// Run immediately if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runJobExtractionAgent()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}
