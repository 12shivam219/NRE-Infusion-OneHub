import dotenv from 'dotenv';
dotenv.config();

// Dedicated scheduler worker. Run this as a single, independently-deployed process
// to avoid duplicate Gmail sync runs when scaling the API server horizontally.

async function start() {
  try {
    const { startSyncScheduler } = await import('./gmail-sync.js');
    await startSyncScheduler();
    console.log('Scheduler worker started');
  } catch (err) {
    console.error('Failed to start scheduler worker:', err.message || err);
    process.exit(1);
  }
}

start();
