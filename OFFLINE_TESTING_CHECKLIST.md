# Offline Feature Testing Checklist

## Prerequisites
- ✅ Dev server running on http://localhost:5173
- ✅ Logged into application
- ✅ Browser DevTools open (F12)
- ✅ Open IndexedDB: DevTools → Application → IndexedDB → offlineDB

---

## Test 1: Offline Detection ✓

### Steps:
1. Open application in browser
2. Open DevTools Console
3. Run: `navigator.onLine` → Should show `true`
4. Check for "Working offline" banner → Should NOT appear
5. Open DevTools Network tab
6. Click "Offline" checkbox → Simulates no internet
7. Watch console for: `"[OfflineIndicator] Offline event triggered"`
8. Watch UI → Should show orange "Working offline" banner

### Expected Results:
- [x] Banner appears immediately
- [x] Console shows offline detection
- [x] App remains responsive
- [x] All UI buttons still work

### Status: ___________

---

## Test 2: CREATE Requirement While Offline ✓

### Setup:
1. Go offline (DevTools Network → Offline)
2. Navigate to CRM page
3. Click "New Requirement" button

### Steps:
1. Fill in form:
   - Title: `Test Offline Requirement`
   - Company: `TestCo`
   - Vendor Email: `test@example.com`
   - Rate: `$100`
2. Click "Save"

### Expected Results:
- [ ] Form closes
- [ ] Toast shows "Queued for Sync"
- [ ] Requirement appears in requirements table immediately
- [ ] Requirement ID is in format: `temp-TIMESTAMP-RANDOM` (not a UUID)
- [ ] Check IndexedDB → offlineDB → syncQueue table:
  - Should see 1 pending item
  - operation: `CREATE`
  - entityType: `requirement`
  - Status: `pending`

### Actual Results:
```
Toast Message: _______________
Requirement ID Format: _______________
IndexedDB syncQueue Count: _______________
```

### Status: ___________

---

## Test 3: UPDATE Requirement While Offline ✓

### Setup:
1. Still offline from Test 2
2. Open the temp requirement from Test 2

### Steps:
1. Edit a field (e.g., Title → "Updated Title")
2. Click "Save"

### Expected Results:
- [ ] Modal closes
- [ ] Toast shows "Queued for Sync"
- [ ] Title updates immediately in UI
- [ ] Check IndexedDB → syncQueue:
  - Should now see 2 pending items (1 CREATE + 1 UPDATE)
  - Second item operation: `UPDATE`

### Actual Results:
```
Total Items in syncQueue: _______________
Second Item Operation: _______________
```

### Status: ___________

---

## Test 4: DELETE Requirement While Offline ✓

### Setup:
1. Still offline
2. In requirements table, select the temp requirement

### Steps:
1. Click Delete button
2. Confirm delete

### Expected Results:
- [ ] Requirement disappears from UI
- [ ] Toast shows "Queued for Sync"
- [ ] Check IndexedDB → syncQueue:
  - Should now see 3 pending items (CREATE, UPDATE, DELETE)
  - Note: Later, server will process these in order (CREATE → UPDATE → DELETE)

### Actual Results:
```
Total Items in syncQueue: _______________
Last Item Operation: _______________
```

### Status: ___________

---

## Test 5: AUTO-SYNC ON RECONNECT ✓

### Setup:
1. Still have 3 pending items in sync queue from Tests 2-4
2. Go back online

### Steps:
1. Open DevTools Network tab
2. Uncheck "Offline" checkbox → App comes back online
3. Watch console for: `"App is online - syncing cache"`
4. Watch network tab for API calls to create/update/delete

### Expected Results:
- [ ] Within 2 seconds, sync starts automatically
- [ ] Console shows: `"[Offline Hook] Syncing X pending items..."`
- [ ] API calls appear in Network tab:
  - POST /auth/v1/rpc/insert_requirement (or similar)
  - PATCH/UPDATE calls
  - DELETE calls
- [ ] Toast shows "Sync completed: 3 processed, 0 failed"
- [ ] Requirement ID changes from `temp-xxx` to real UUID
- [ ] Check IndexedDB → syncQueue:
  - All 3 items should have status: `pending` → `syncing` → removed

### Actual Results:
```
Sync Started (seconds after reconnect): _______________
API Calls Made: _______________
Final Toast Message: _______________
Requirement ID Changed To: _______________
```

### Status: ___________

---

## Test 6: AUTO-SYNC ON WINDOW FOCUS ✓

### Setup:
1. Create a new offline requirement (different from previous tests)
2. Have it pending in sync queue
3. Go online BUT don't wait for periodic sync

### Steps:
1. Switch away from browser tab (Alt+Tab or click another window)
2. Wait 5 seconds
3. Click back to browser tab to regain focus

### Expected Results:
- [ ] Within 1 second of focus, sync triggers
- [ ] Console shows sync started
- [ ] Network shows API calls
- [ ] Requirement gets real ID

### Actual Results:
```
Sync Time After Focus (milliseconds): _______________
```

### Status: ___________

---

## Test 7: PERIODIC SYNC (30 seconds) ✓

### Setup:
1. Create another offline requirement
2. Go online
3. Don't switch tabs

### Steps:
1. Wait 30 seconds
2. Watch console and network tab

### Expected Results:
- [ ] At ~30 second mark, sync triggers automatically
- [ ] API calls appear even without manual action
- [ ] Requirement syncs

### Actual Results:
```
Sync Occurred At: _______________
Without Manual Trigger: YES / NO
```

### Status: ___________

---

## Test 8: CONFLICT DETECTION ✓

### Setup:
1. Have 2 browsers/tabs open to same app (same user)
2. Browser A: Go offline
3. Browser B: Stay online

### Steps:
1. Browser B: Open a requirement, edit it, save
2. Browser A: Open same requirement (will show old data from cache), edit different field, save
   - Note: Browser A will queue this as UPDATE offline
3. Browser A: Go back online

### Expected Results:
- [ ] Sync runs
- [ ] Console shows: `"Sync conflicts detected - checking..."`
- [ ] Check IndexedDB → conflictRecords table:
  - Should have 1 entry with:
    - localVersion: Browser A's version
    - remoteVersion: Server's version (with Browser B's changes)
    - entityId: The requirement ID
- [ ] UI shows conflict panel with comparison
- [ ] Local version wins (A's changes overwrite B's on server)

### Actual Results:
```
Conflicts Detected: YES / NO
Conflict Count: _______________
Local Win Applied: YES / NO
```

### Status: ___________

---

## Test 9: SYNC ERROR HANDLING ✓

### Setup:
1. Create offline requirement
2. Simulate network error before sync completes

### Steps:
1. Go offline
2. Create requirement
3. Go online
4. Immediately go offline again before sync completes
5. Wait 30+ seconds (to let retries fail)

### Expected Results:
- [ ] SyncErrorHandler shows red banner
- [ ] Shows: "1 failed item"
- [ ] Details panel shows the failed operation
- [ ] Click "Retry Failed Items" button
- [ ] Go online
- [ ] Item syncs successfully

### Actual Results:
```
Failed Item Shown: YES / NO
Retry Button Works: YES / NO
Item Synced After Retry: YES / NO
```

### Status: ___________

---

## Test 10: STATUS UPDATE (KANBAN) OFFLINE ✓

### Setup:
1. Go offline
2. Navigate to Kanban board view

### Steps:
1. Drag a requirement card from one status to another
2. Watch for toast

### Expected Results:
- [ ] Toast shows "Will sync when online"
- [ ] Card appears in new column immediately
- [ ] Check IndexedDB → syncQueue:
  - New UPDATE item with operation payload showing new status
- [ ] Go online → Sync runs → Card stays in new position on server

### Actual Results:
```
Toast Message: _______________
IndexedDB Item Created: YES / NO
Status Synced: YES / NO
```

### Status: ___________

---

## Test 11: CACHE VISIBILITY OFFLINE ✓

### Setup:
1. Go offline
2. Navigate away from CRM page
3. Come back to CRM page

### Steps:
1. With offline still active, try to load requirements
2. Watch if they appear

### Expected Results:
- [ ] Requirements appear from cache even though offline
- [ ] Data is readable
- [ ] Still can edit/create/delete with offline queueing

### Actual Results:
```
Requirements Visible Offline: YES / NO
Data From Cache: YES / NO
```

### Status: ___________

---

## Test 12: DATABASE VERIFICATION ✓

### Setup:
1. After Test 2 syncs successfully
2. Open Supabase dashboard

### Steps:
1. Navigate to requirements table
2. Find the requirement that was created offline
3. Verify fields match what was entered

### Expected Results:
- [ ] Requirement exists with correct data
- [ ] All fields populated correctly
- [ ] created_at and updated_at timestamps set
- [ ] user_id matches current user
- [ ] No temp ID in database

### Actual Results:
```
Requirement Found: YES / NO
Data Matches: YES / NO
Temp ID Removed: YES / NO
```

### Status: ___________

---

## Test 13: MULTI-OPERATION BATCHING ✓

### Setup:
1. Go offline
2. Create 5 requirements rapidly

### Steps:
1. Fill and save 5 different requirement forms
2. Check IndexedDB → syncQueue

### Expected Results:
- [ ] All 5 items in syncQueue as pending
- [ ] Go online
- [ ] Console shows: "Syncing 5 pending items..."
- [ ] All 5 sync in batch
- [ ] All 5 appear with real IDs

### Actual Results:
```
Items Queued: _______________
Items Synced: _______________
Batch Processing: YES / NO
```

### Status: ___________

---

## Summary

### All Tests Passed: YES / NO

### Issues Found:
```
1. ___________________________________
2. ___________________________________
3. ___________________________________
```

### Recommendations:
```
1. ___________________________________
2. ___________________________________
3. ___________________________________
```

### Final Status:
- ✅ Offline Detection: _________
- ✅ CREATE Operations: _________
- ✅ UPDATE Operations: _________
- ✅ DELETE Operations: _________
- ✅ Auto-Sync (Reconnect): _________
- ✅ Auto-Sync (Focus): _________
- ✅ Periodic Sync: _________
- ✅ Conflict Detection: _________
- ✅ Error Handling: _________
- ✅ Kanban Offline: _________
- ✅ Cache Visibility: _________
- ✅ Database Sync: _________
- ✅ Batch Operations: _________

---

## Browser DevTools Commands

Run these in browser console to debug:

```javascript
// Check if online
navigator.onLine

// Get pending sync items
const db = await import('/src/lib/offlineDB.ts');
db.getPendingSyncItems().then(items => console.log('Pending:', items))

// Get conflict records
db.getUnresolvedConflicts().then(conflicts => console.log('Conflicts:', conflicts))

// Trigger manual sync
window.dispatchEvent(new CustomEvent('retry-sync'))

// Check sync status
db.getSyncStatus().then(status => console.log('Status:', status))

// Get cache metadata
db.db.metadata.toArray().then(m => console.log('Metadata:', m))
```

---

## Notes
- Record actual results in each test
- Screenshot key moments (offline banner, sync complete, etc.)
- Monitor browser console for errors
- Check network tab for API calls
- Verify IndexedDB changes in DevTools

