# Offline Feature Manual Testing Guide

## Overview
Your app has a comprehensive offline feature built with:
- **IndexedDB** for local caching (using Dexie.js)
- **Sync Queue** for offline operations (create/update/delete)
- **Offline Indicator** UI component
- **Service Worker** for background sync
- **Conflict Resolution** for sync conflicts
- **Analytics** tracking

## Step-by-Step Testing

### Step 1: Verify Initial Setup
1. Start your app: `npm run dev`
2. Open DevTools (F12)
3. Go to **Application > IndexedDB > NREOfflineDB**
4. You should see the "NREOfflineDB" database
5. Tables should include:
   - requirements (cached requirements)
   - consultants (cached consultants)
   - interviews (cached interviews)
   - drafts / draftModels (form drafts - DraftModel interface)
   - documents (cached documents)
   - emails (cached emails)
   - syncQueue (pending offline operations)
   - cacheMetadata (cache expiration tracking)
   - cachePreferences (user cache settings)
   - conflicts (conflict records)
   - analytics (offline usage analytics)

### Step 2: Test Cache Preferences
1. Go to **Settings/Admin Panel** (find OfflineCacheSettings component)
2. You should see:
   - Storage Usage (MB used/available)
   - Cache Preferences checkboxes:
     - Cache Requirements ✓
     - Cache Consultants ✓
     - Cache Interviews ✓
     - Cache Documents ✓
     - Cache Emails ✓
3. Toggle preferences on/off
4. Check DevTools > **Application > IndexedDB > NREOfflineDB > cachePreferences** table
5. You should see one record with:
   - **key**: `"userPreferences"` (primary key)
   - **cacheRequirements**: boolean (true/false)
   - **cacheConsultants**: boolean (true/false)
   - **cacheInterviews**: boolean (true/false)
   - **cacheDocuments**: boolean (true/false)
   - **cacheEmails**: boolean (true/false)
   - **maxCacheSize**: number (default: 100 MB)
   - **syncOnWiFiOnly**: boolean (true/false)

### Step 3: Preload Data (While Online)

**First: Verify You're Online**
1. Open DevTools (Press **F12**)
2. Click the **"Console"** tab
3. In the console input field (after the `>` prompt), type: `navigator.onLine`
4. **Press Enter** ⏎ on your keyboard
5. You should see the result:
   - `true` = You're online ✅
   - `false` = You're offline (go back to Step 4)

**Then: Load and Cache Data**
1. Navigate to **Requirements page**
2. Wait for data to load from API (you'll see the list populate)
3. Check **Console** for logs like: `[getCachedRequirements] Using cache`
4. Go to **DevTools > Application > IndexedDB > NREOfflineDB > requirements** table
5. Click the **Refresh button** (🔄) at top-right of the IndexedDB viewer
6. ✅ You should see requirement records in the table

**Verify in Settings:**
- Go to Settings/Admin Panel
- Check "Cache Requirements" is ✅ enabled
- If unchecked, the data won't cache - check it first!

### Step 4: Go Offline - Simulate Network Failure
**Option A: DevTools Method (Recommended)**
1. Open DevTools (F12)
2. Go to **Network** tab
3. Check the throttling dropdown (top right of Network tab)
4. Set to **Offline**

**Option B: Browser DevTools Network Condition**
1. DevTools > Three dots menu > More tools > Network conditions
2. Check "Offline" checkbox

**Option C: Actual Disconnect**
1. Unplug network/WiFi
2. Or open app in another device without network

### Step 5: Test Offline Indicator
1. While offline, you should see:
   - **Amber banner** at bottom-left: "Working offline - Changes will sync when online"
   - **Blue info banner** (first time): "✨ Offline Mode Active" with details
2. Click "Got it!" to dismiss the info banner
3. Verify the offline indicator shows

### Step 6: Test Viewing Cached Data
1. While offline, navigate to:
   - Requirements page - should show cached data
   - Consultants page - should show cached data
   - Interviews page - should show cached data
2. Check console (DevTools > Console):
   - Look for logs like "[getCachedRequirements] Using expired cache (offline: true)"
3. Data should load from IndexedDB (very fast, <10ms)

### Step 7: Test Offline Create Operation
1. While offline, try to create a new requirement
2. Fill in the form and click "Create"
3. Watch for:
   - Success message/toast notification
   - Item appears in list immediately (from cache)
   - Check **DevTools > Application > IndexedDB > syncQueue** table
   - New item should appear with status: "pending"
4. Verify the sync queue has the pending operation:
   - operation: "CREATE"
   - entityType: "requirement"
   - status: "pending"

### Step 8: Test Offline Update Operation
1. While offline, click on a cached requirement to edit it
2. Make changes and save
3. Verify in **syncQueue** table:
   - New item added with operation: "UPDATE"
   - status: "pending"
4. The UI should immediately show the updated data

### Step 9: Test Offline Delete Operation
1. While offline, delete a requirement/consultant/interview
2. Check **syncQueue** table:
   - Item appears with operation: "DELETE"
   - status: "pending"
3. Verify item is removed from UI

### Step 10: Test Multiple Offline Operations
1. Create 2-3 items offline
2. Update 1-2 items offline
3. Delete 1 item offline
4. Check **syncQueue** table should have 5-6 pending items
5. Verify console shows: `[sync-queue-changed]` events dispatched

### Step 11: Test Offline Drafts
1. While offline, start creating a new form but DON'T submit
2. Close the form or navigate away
3. DevTools > Application > LocalStorage > search for `offline_draft:`
4. You should see the draft saved
5. Come back to the form - draft should auto-restore

### Step 12: Go Back Online - Test Auto Sync
1. In DevTools Network tab, click the Offline dropdown and select **No throttling**
2. Or check the Network conditions checkbox to uncheck "Offline"
3. Alternatively, reconnect network/enable WiFi

**Watch for sync behavior:**
1. **Console** should show: `App is online - syncing cache`
2. **Blue syncing indicator** should appear (bottom-left):
   - Shows: "Syncing data" with progress bar
   - "X items remaining"
3. **DevTools > Application > IndexedDB > syncQueue**:
   - Items should change from status "pending" → "syncing" → removed (on success)

### Step 13: Verify Sync Completion
1. Wait for sync to complete (~5-10 seconds depending on items)
2. Console should show: `Sync completed: X processed, Y failed, Z conflicts`
3. Syncing indicator should disappear
4. If you go to server/API - verify the new items/updates were synced
5. Check **syncQueue** table - should be empty (or have only failed items)

### Step 14: Test Sync with Failures
1. Simulate a sync failure:
   - Go offline while syncing is happening (unlikely but possible)
   - Or manually trigger a network error
2. Check **syncQueue**:
   - Items should have status "failed"
   - `lastError` field shows error message
3. Console shows warning about failed items
4. Retry automatically happens (with exponential backoff)

### Step 15: Test Conflict Resolution
1. Create an item offline
2. Go back online and let it start syncing
3. **Before sync completes**, go back offline
4. Create/update the same item again offline
5. Go online again
6. Check console for: `[Sync] X conflict(s) detected`
7. Local version should be applied (current strategy)
8. Check **conflicts** table in IndexedDB for conflict records

### Step 16: Test Offline Indicators Features
1. While offline with pending items, try to refresh the page (F5)
2. You should get a browser confirmation: "Are you sure you want to leave?"
3. This prevents accidental data loss
4. Also watch console for: `reload-blocked` event

### Step 17: Check Service Worker (Advanced)
1. DevTools > Application > Service Workers
2. Should show a service worker registered
3. Check **Messages** tab to see sync-related messages
4. Go offline > go online > SW should trigger background sync

### Step 18: Test Cache Analytics
1. Enable "Cache Analytics" logging (if available in your settings)
2. Do offline operations
3. Check **DevTools > Application > IndexedDB > cacheAnalytics** table
4. Should record:
   - `offlineTime`: minutes spent offline
   - `itemsCreatedOffline`: count
   - `itemsUpdatedOffline`: count
   - `itemsDeletedOffline`: count
   - `syncSuccessRate`: percentage
   - `averageSyncTime`: ms

### Step 19: Test Storage Limits
1. In OfflineCacheSettings, check "Storage Usage"
2. Should show:
   - Used: X MB
   - Available: Y MB
   - Percentage bar
3. Try to exceed storage limits (add lots of documents)
4. App should enforce max cache size
5. Check console for storage limit warnings

### Step 20: Test Persistent Storage
1. In OfflineCacheSettings, click "Enable Persistent Storage"
2. Browser should prompt for permission
3. Once enabled, storage won't be cleared by browser
4. Badge should show "Persistent"

## Quick Testing Checklist

- [ ] Offline indicator appears when offline
- [ ] Can create items offline (added to syncQueue)
- [ ] Can update items offline
- [ ] Can delete items offline
- [ ] Auto-sync when coming back online
- [ ] Sync progress bar shows
- [ ] Items synced to server
- [ ] SyncQueue cleared after successful sync
- [ ] Failed items stay in queue with error
- [ ] Drafts auto-save offline
- [ ] Page refresh blocked when offline with pending items
- [ ] Cache preferences persist
- [ ] Storage usage shows correctly

## Console Logs to Watch For

```
// Offline mode
[offline] App is offline - using cache
[offline] Syncing pending items...

// Sync progress
start-sync: {detail: {items: [...]}}
[sync] Syncing item: requirement-123

// Sync completion
sync-complete: {detail: {processed: 5, failed: 0, conflicts: 0}}
Sync completed: 5 processed, 0 failed, 0 conflicts

// Conflicts
[Sync] 2 conflict(s) detected - local version applied

// Analytics
offline_create: {entityType: 'requirement'}
offline_update: {entityType: 'consultant'}
sync_complete: {itemsSynced: 5, timeMs: 1234}

// Errors
Failed to cache requirements: [error details]
Failed to sync pending items: [error details]
```

## Key Files to Reference

- [offlineDB.ts](src/lib/offlineDB.ts) - Core offline logic
- [useOfflineCache.ts](src/hooks/useOfflineCache.ts) - Offline hook
- [OfflineIndicator.tsx](src/components/common/OfflineIndicator.tsx) - UI component
- [OfflineCacheSettings.tsx](src/components/admin/OfflineCacheSettings.tsx) - Settings
- [sw.js](public/sw.js) - Service worker
