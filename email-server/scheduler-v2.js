/**
 * Enhanced Scheduler with Configurable AI Agent Intervals
 * Phase 1 Features:
 * - Faster job extraction (10 minutes instead of 30)
 * - Maintains Gmail sync at user-configurable interval
 * - Graceful shutdown handling
 * - Execution logging
 * - Error recovery
 */

import dotenv from 'dotenv';
import { runJobExtractionAgent } from './job-extraction-agent-v2.js';

dotenv.config();

// ==========================================
// CONFIGURATION
// ==========================================

// Job Extraction Agent: Run every 10 minutes for faster remote job detection
const JOB_EXTRACTION_INTERVAL_MINUTES = parseInt(
  process.env.JOB_EXTRACTION_INTERVAL_MINUTES || '10',
  10
);

// Gmail Sync: Run every 60 minutes (can be customized per environment)
const GMAIL_SYNC_INTERVAL_MINUTES = parseInt(
  process.env.GMAIL_SYNC_INTERVAL_MINUTES || '60',
  10
);

let jobExtractionTimer = null;
let gmailSyncTimer = null;
let isShuttingDown = false;

// ==========================================
// SCHEDULER FUNCTIONS
// ==========================================

/**
 * Schedule job extraction agent to run at regular intervals
 * This is the core AI Agent task for detecting 100% remote jobs
 */
function scheduleJobExtractionAgent() {
  console.log(
    `\n⏰ Scheduling job extraction agent every ${JOB_EXTRACTION_INTERVAL_MINUTES} minutes`
  );
  console.log(`   • Detects 100% remote jobs automatically`);
  console.log(`   • Filters duplicates and low-confidence matches`);
  console.log(`   • Creates requirements without user intervention`);

  // Run immediately on startup
  console.log('\n🚀 Initial run on startup...');
  runJobExtractionAgent().catch(err => {
    console.error('❌ Error during initial run:', err.message);
  });

  // Schedule recurring execution
  jobExtractionTimer = setInterval(() => {
    if (!isShuttingDown) {
      console.log(
        `\n[${new Date().toISOString()}] 🤖 AI Agent: Extracting remote jobs...`
      );
      runJobExtractionAgent().catch(err => {
        console.error('❌ Error running AI agent:', err.message);
      });
    }
  }, JOB_EXTRACTION_INTERVAL_MINUTES * 60 * 1000);

  // Allow process to exit if this is the only timer
  if (jobExtractionTimer.unref) {
    jobExtractionTimer.unref();
  }
}

/**
 * Schedule Gmail sync scheduler
 * Fetches new emails and maintains sync tokens
 */
async function scheduleGmailSyncScheduler() {
  try {
    const { startSyncScheduler } = await import('./gmail-sync.js');
    console.log(`\n⏰ Scheduling Gmail sync every ${GMAIL_SYNC_INTERVAL_MINUTES} minutes`);
    console.log(`   • Maintains Gmail OAuth tokens`);
    console.log(`   • Incremental email sync`);
    await startSyncScheduler();
  } catch (err) {
    console.warn('⚠️  Gmail sync scheduler unavailable:', err.message);
    console.log('   Note: Job extraction agent will still run independently');
  }
}

/**
 * Graceful shutdown handler
 */
function setupGracefulShutdown() {
  const shutdown = (signal) => {
    console.log(`\n⚠️  Received ${signal}, shutting down gracefully...`);
    isShuttingDown = true;

    if (jobExtractionTimer) {
      clearInterval(jobExtractionTimer);
      console.log('   ✓ Job extraction agent stopped');
    }

    if (gmailSyncTimer) {
      clearInterval(gmailSyncTimer);
      console.log('   ✓ Gmail sync stopped');
    }

    console.log('   ✓ Scheduler shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// ==========================================
// MAIN ENTRY POINT
// ==========================================

async function start() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('📅 SCHEDULER WORKER - AI AGENT SYSTEM (PHASE 1)');
    console.log('='.repeat(70));
    console.log('\n🎯 Mission: Detect 100% remote job opportunities in Gmail');
    console.log('✨ Features:');
    console.log('   • Automated Gmail scanning (every ' + JOB_EXTRACTION_INTERVAL_MINUTES + ' min)');
    console.log('   • 100% remote jobs only');
    console.log('   • Duplicate detection & filtering');
    console.log('   • Auto-requirement creation');
    console.log('   • Confidence-based validation');
    console.log('   • Extraction audit logging');

    // Setup graceful shutdown
    setupGracefulShutdown();

    // Start Gmail sync (if available)
    await scheduleGmailSyncScheduler();

    // Start job extraction agent (core AI feature)
    scheduleJobExtractionAgent();

    console.log('\n✅ All schedulers started successfully');
    console.log('='.repeat(70) + '\n');
    
    console.log('📊 Configuration:');
    console.log(`   Job extraction interval: ${JOB_EXTRACTION_INTERVAL_MINUTES} minutes`);
    console.log(`   Gmail sync interval: ${GMAIL_SYNC_INTERVAL_MINUTES} minutes`);
    console.log(`   Process started at: ${new Date().toISOString()}`);
    console.log('\n💡 Press Ctrl+C to gracefully stop\n');
  } catch (err) {
    console.error('❌ Failed to start scheduler worker:', err.message || err);
    process.exit(1);
  }
}

// Start the scheduler
start();
