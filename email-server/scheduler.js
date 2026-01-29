import dotenv from 'dotenv';
import { runJobExtractionAgent } from './job-extraction-agent.js';

dotenv.config();

// Dedicated scheduler worker. Run this as a single, independently-deployed process
// to avoid duplicate Gmail sync runs when scaling the API server horizontally.

// Configuration
const JOB_EXTRACTION_INTERVAL_MINUTES = parseInt(process.env.JOB_EXTRACTION_INTERVAL_MINUTES || '30', 10);
const GMAIL_SYNC_INTERVAL_MINUTES = parseInt(process.env.GMAIL_SYNC_INTERVAL_MINUTES || '60', 10);

let jobExtractionTimer = null;
let gmailSyncTimer = null;

/**
 * Schedule the job extraction agent to run at regular intervals
 */
function scheduleJobExtractionAgent() {
  console.log(`\n⏰ Scheduling job extraction agent to run every ${JOB_EXTRACTION_INTERVAL_MINUTES} minutes`);
  
  // Run immediately on startup
  console.log('🚀 Running job extraction agent on startup...');
  runJobExtractionAgent().catch(err => {
    console.error('Error running job extraction agent:', err);
  });

  // Schedule recurring execution
  jobExtractionTimer = setInterval(() => {
    console.log(`\n[${new Date().toISOString()}] 🤖 Triggering scheduled job extraction agent run...`);
    runJobExtractionAgent().catch(err => {
      console.error('Error running job extraction agent:', err);
    });
  }, JOB_EXTRACTION_INTERVAL_MINUTES * 60 * 1000);

  // Prevent Node from exiting
  jobExtractionTimer.unref?.();
}

/**
 * Schedule the Gmail sync scheduler
 */
async function scheduleGmailSyncScheduler() {
  try {
    const { startSyncScheduler } = await import('./gmail-sync.js');
    console.log(`\n⏰ Scheduling Gmail sync to run every ${GMAIL_SYNC_INTERVAL_MINUTES} minutes`);
    await startSyncScheduler();
  } catch (err) {
    console.warn('Gmail sync scheduler not available:', err.message);
  }
}

/**
 * Start all schedulers
 */
async function start() {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('📅 SCHEDULER WORKER STARTING');
    console.log('='.repeat(60));
    
    // Schedule Gmail sync (original)
    await scheduleGmailSyncScheduler();
    
    // Schedule job extraction agent (new)
    scheduleJobExtractionAgent();

    console.log('\n✅ All schedulers started successfully');
    console.log('='.repeat(60) + '\n');
  } catch (err) {
    console.error('Failed to start scheduler worker:', err.message || err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n⚠️  Received SIGTERM, shutting down gracefully...');
  if (jobExtractionTimer) clearInterval(jobExtractionTimer);
  if (gmailSyncTimer) clearInterval(gmailSyncTimer);
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n⚠️  Received SIGINT, shutting down gracefully...');
  if (jobExtractionTimer) clearInterval(jobExtractionTimer);
  if (gmailSyncTimer) clearInterval(gmailSyncTimer);
  process.exit(0);
});

start();
