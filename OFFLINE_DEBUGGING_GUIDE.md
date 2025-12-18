# Offline Feature Debugging Guide

## Quick Start

Copy and paste this into your browser console to set up debugging helpers:

```javascript
// === OFFLINE FEATURE DEBUGGING HELPERS ===

// Helper 1: Show online/offline status
window.checkStatus = () => {
  console.log('=== OFFLINE STATUS ===');
  console.log('Currently Online:', navigator.onLine);
  console.log('Timestamp:', new Date().toISOString());
};

// Helper 2: Show all pending sync items
window.showPending = async () => {
  const response = await fetch('/src/lib/offlineDB.ts');
  console.log('Fetching pending items...');
  // This will show via console logs from the app
};

// Helper 3: Manually trigger sync
window.syncNow = () => {
  console.log('Triggering manual sync...');
  window.dispatchEvent(new CustomEvent('retry-sync'));
};

// Helper 4: Monitor offline/online events
window.monitorConnectivity = () => {
  window.addEventListener('online', () => console.log('✅ ONLINE EVENT'));
  window.addEventListener('offline', () => console.log('❌ OFFLINE EVENT'));
  console.log('Monitoring connectivity events...');
};

// Helper 5: Check IndexedDB syncQueue (simplified)
window.checkSyncQueue = async () => {
  try {
    // IndexedDB check via DevTools Application tab
    console.log('📊 Check IndexedDB via DevTools:');
    console.log('  1. Open DevTools (F12)');
    console.log('  2. Go to "Application" tab');
    console.log('  3. Expand "IndexedDB"');
    console.log('  4. Click "offlineDB"');
    console.log('  5. Click "syncQueue"');
    console.log('  6. View pending items with status = "pending"');
  } catch (error) {
    console.error('Error:', error);
  }
};

// Helper 6: Toggle offline mode in console
window.goOffline = () => {
  // This doesn't actually disable network
  // Use DevTools Network tab instead
  console.log('To go offline, use DevTools Network tab:');
  console.log('  1. Open DevTools (F12)');
  console.log('  2. Go to "Network" tab');
  console.log('  3. Check "Offline" checkbox');
};

// Helper 7: Log all console messages for debugging
window.debugMode = () => {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  
  console.log = (...args) => {
    originalLog('[LOG]', ...args);
  };
  console.error = (...args) => {
    originalError('[ERROR]', ...args);
  };
  console.warn = (...args) => {
    originalWarn('[WARN]', ...args);
  };
  
  console.log('Debug mode enabled - all console messages will be prefixed');
};

// Helper 8: Watch for sync events
window.watchSyncEvents = () => {
  window.addEventListener('sync-complete', (e) => {
    console.log('✅ SYNC COMPLETE:', e.detail);
  });
  window.addEventListener('sync-error', (e) => {
    console.log('❌ SYNC ERROR:', e.detail);
  });
  window.addEventListener('sync-conflicts', (e) => {
    console.log('⚠️ SYNC CONFLICTS:', e.detail);
  });
  window.addEventListener('offline-mode-activated', (e) => {
    console.log('📴 OFFLINE MODE:', e.detail);
  });
  console.log('Watching sync events...');
};

// Helper 9: Get app state
window.getAppState = () => {
  console.log('=== APP STATE ===');
  console.log('Online Status:', navigator.onLine);
  console.log('Page URL:', window.location.href);
  console.log('Timestamp:', new Date().toISOString());
};

// === ACTIVATE HELPERS ===
window.checkStatus();
window.monitorConnectivity();
window.watchSyncEvents();

console.log('✅ Offline debugging helpers loaded!');
console.log('Available commands:');
console.log('  - checkStatus()');
console.log('  - checkSyncQueue()');
console.log('  - syncNow()');
console.log('  - goOffline()');
console.log('  - debugMode()');
console.log('  - watchSyncEvents()');
console.log('  - getAppState()');
```

---

## Step-by-Step Testing Procedure

### Test 1: Verify Offline Detection

```javascript
// In console, run:
navigator.onLine  // Should show: true

// Open DevTools Network tab and check "Offline"
// Then check again:
navigator.onLine  // Should show: false

// Watch console for log:
// "[OfflineIndicator] Offline event triggered"
```

### Test 2: Create & Queue Operation

```javascript
// 1. Go offline (DevTools Network → Offline checkbox)
// 2. Create a requirement form
// 3. Fill in fields and submit
// 4. Watch console for: "Queued for Sync"
// 5. Check IndexedDB:
//    DevTools → Application → IndexedDB → offlineDB → syncQueue
```

### Test 3: Monitor Sync Process

```javascript
// 1. Still have pending items
// 2. Go online (uncheck Offline in DevTools Network)
// 3. Watch console for:
//    - "[Offline Hook] Syncing X pending items..."
//    - Network tab shows POST/PATCH calls
//    - "Sync completed: X processed, 0 failed"
// 4. Check IndexedDB syncQueue → should be empty
```

---

## What to Look For in Console

### ✅ Good Signs (Everything Working):
```
[Offline Hook] Initialized with online status: true
[OfflineIndicator] Initializing with online state: true
[OfflineIndicator] Offline event triggered
App is offline - using cache
App is online - syncing cache
[Offline Hook] Syncing 3 pending items...
Sync completed: 3 processed, 0 failed
```

### ❌ Warning Signs (Something Wrong):
```
Error loading authenticated user
Failed to sync pending items
WARN: [Sync] X conflict(s) detected
Failed to update sync item
[SyncErrorHandler] X failed sync item(s) detected
```

---

## IndexedDB Navigation Guide

### To View Sync Queue:

1. Open DevTools: **F12**
2. Go to **Application** tab
3. Expand **IndexedDB** (left sidebar)
4. Click **offlineDB** 
5. Click **syncQueue** table

### Expected Columns:
- `id` - Unique ID of sync item
- `operation` - CREATE, UPDATE, or DELETE
- `entityType` - requirement, consultant, interview, document
- `entityId` - The requirement/consultant ID
- `payload` - Object with data to sync
- `status` - pending, syncing, or failed
- `timestamp` - When operation was queued
- `retries` - Number of retry attempts
- `lastError` - Error message if failed

### Example Pending Item:
```javascript
{
  id: "sync-abc123",
  operation: "CREATE",
  entityType: "requirement",
  entityId: "temp-1702571234567-xyz789",
  payload: {
    title: "Test Requirement",
    company: "TestCo",
    status: "open",
    // ... other fields
  },
  timestamp: 1702571234567,
  retries: 0,
  status: "pending"
}
```

---

## Network Inspection Guide

### To View API Calls:

1. Open DevTools: **F12**
2. Go to **Network** tab
3. Filter by: **Fetch/XHR**

### What to Expect During Sync:

After going online, you should see:
- `POST` requests to create requirements
- `PATCH` requests to update requirements
- `DELETE` requests to remove requirements
- Response status: `200` or `201` (success)

### Example Request Headers:
```
POST /rest/v1/requirements HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json

{
  "user_id": "...",
  "title": "Test Requirement",
  "company": "TestCo",
  ...
}
```

---

## Common Issues & Debugging

### Issue: Requirement doesn't queue when offline

**Check:**
1. Is the app actually offline? Run: `navigator.onLine` → Should be `false`
2. Check console for errors: Look for red error messages
3. Check that `useOfflineCache` hook is being used in component
4. Verify IndexedDB is accessible: Check Application → Storage

### Issue: Sync doesn't trigger when coming online

**Check:**
1. Console should show: `"App is online - syncing cache"`
2. If not, check: `window.addEventListener('online', ...)` registered?
3. Try manual trigger: `window.dispatchEvent(new CustomEvent('retry-sync'))`
4. Check if there are actually pending items: View IndexedDB syncQueue

### Issue: Synced requirement still has temp ID

**Check:**
1. Sync may have failed - check for errors in console
2. Check IndexedDB syncQueue - is item marked as `failed`?
3. Check Network tab - did request succeed (200 response)?
4. If request failed, retry from SyncErrorHandler UI

### Issue: Conflicts detected but not resolved

**Check:**
1. Console should show: `"[Sync] X conflict(s) detected - local version applied"`
2. Check IndexedDB → conflictRecords table
3. Verify local version won (overwrote server): Check in Supabase dashboard
4. If not resolved, try manual retry from SyncErrorHandler

---

## Performance Metrics

### Expected Performance:
- Offline detection: < 100ms
- Queue operation: < 50ms
- Sync trigger on reconnect: < 2 seconds
- Batch sync (3 items): < 3 seconds
- Periodic sync: Every 30 seconds

### How to Measure:
1. Open DevTools Performance tab
2. Start recording
3. Perform action (create offline, go online, watch sync)
4. Stop recording
5. Look for timing of API calls and events

---

## Reset Debugging State

If you need to start fresh:

```javascript
// Clear all pending items (WARNING: will lose queued changes!)
// Only do this if you want to start over
// This requires accessing IndexedDB directly
```

Or use Application tab:
1. DevTools → Application
2. Storage section → IndexedDB
3. Right-click offlineDB → Delete → Confirm

---

## Log All Events

To capture a complete trace:

```javascript
// Run this BEFORE performing actions
window.captureTrace = () => {
  const logs = [];
  const originalLog = console.log;
  
  console.log = (...args) => {
    logs.push({
      time: new Date().toISOString(),
      message: args.join(' ')
    });
    originalLog(...args);
  };
  
  // Stop and get logs:
  // console.log = originalLog;
  // Copy the logs array to save
};
```

---

## Support Info to Include When Reporting Issues

When reporting an offline feature bug, include:

1. Browser name and version
2. Operating system
3. Step-by-step reproduction steps
4. Screenshots of:
   - Console errors
   - Network requests
   - IndexedDB state
5. Output of: `getAppState()`
6. Time when issue occurred

