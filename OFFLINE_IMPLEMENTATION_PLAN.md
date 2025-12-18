# Offline Feature Implementation Plan

## Current Status Analysis

### ✅ What's Already Working:

1. **Offline Detection**
   - File: `useOfflineCache.ts`
   - Detects `navigator.onLine` changes immediately
   - Shows "Working offline" banner via `OfflineIndicator.tsx`
   - Polls every 1 second to catch connection changes

2. **Offline Operations (CREATE/UPDATE/DELETE)**
   - Files: `CreateRequirementForm.tsx`, `RequirementDetailModal.tsx`, `KanbanBoard.tsx`
   - When user is offline:
     - **CREATE**: Form submission queues operation, creates temp ID, optimistically caches
     - **UPDATE**: Detail modal saves offline, queues to sync queue
     - **DELETE**: Delete action queues to sync queue
     - **STATUS UPDATE**: Kanban drag-drop queues status change
   - Users see "Queued for Sync" toast messages

3. **Sync Queue Infrastructure**
   - File: `offlineDB.ts`
   - IndexedDB table stores pending operations
   - Each operation: `id, operation, entityType, entityId, payload, timestamp, retries, status`
   - Supports exponential backoff with max 3 retries

4. **Auto-Sync Triggers** (4 mechanisms)
   - **On Reconnect**: `handleOnline()` in useOfflineCache triggers immediate sync
   - **On Window Focus**: `handleFocus()` syncs when user returns to tab
   - **Periodic Sync**: Every 30 seconds when online
   - **Service Worker**: Background sync registered (infrastructure in place)

5. **Conflict Resolution**
   - File: `processSyncQueue()` in offlineDB.ts
   - Detects conflicts by comparing timestamps: `local_timestamp > server.updated_at` → conflict
   - Strategy: **LOCAL WINS** (user's offline changes overwrite server)
   - Records conflicts with both versions for audit trail

6. **Error & Conflict Monitoring UI**
   - File: `SyncErrorHandler.tsx`
   - Shows failed items panel with "Retry" button
   - Shows conflicts panel with version comparison
   - Auto-checks every 10 seconds
   - Listens to sync events in real-time

7. **Local Caching**
   - File: `offlineDB.ts`
   - Caches requirements, consultants, interviews, documents
   - TTL: 10 minutes for requirements, 5 minutes for interviews
   - User can view cached data even when offline

---

## Implementation Approach

### Phase 1: Verification & Testing (IMMEDIATE)
1. **Test Create Offline**
   - Go offline → Open Create Requirement Form → Fill in data → Submit
   - ✓ Should show "Queued for Sync" toast
   - ✓ Requirement should appear with temp ID (format: `temp-timestamp-random`)
   - ✓ Go online → Should sync automatically

2. **Test Update Offline**
   - Go offline → Open requirement detail → Edit field → Save
   - ✓ Should show "Queued for Sync" toast
   - ✓ Go online → Should sync

3. **Test Delete Offline**
   - Go offline → Delete requirement → Confirm
   - ✓ Should show "Queued for Sync" toast
   - ✓ Go online → Should sync

4. **Test Status Update Offline** (Kanban)
   - Go offline → Drag requirement to new status
   - ✓ Should show "Will sync when online" toast
   - ✓ Go online → Status should update on server

5. **Test Auto-Sync Triggers**
   - Create offline item → Reconnect → ✓ Syncs in <2 seconds
   - Create offline item → Switch browser tab & return → ✓ Syncs on focus
   - Create offline item → Wait 30s → ✓ Syncs periodically

6. **Test Conflict Handling**
   - Go offline → Update requirement
   - Meanwhile (on different device/browser) → Update same requirement
   - Reconnect → ✓ Should show conflict panel in SyncErrorHandler
   - ✓ Local version should win (overwrite server)

---

### Phase 2: Enhanced Monitoring (Optional)
1. **Add More Detailed Logging**
   - When operation queued
   - When sync starts/completes
   - When conflicts detected
   - Toast notifications for each milestone

2. **Add Sync Progress Indicator**
   - Show: "Syncing 3 of 5 items..."
   - Show percent progress

3. **Add Manual Retry UI**
   - SyncErrorHandler already has "Retry Failed" button
   - Users can manually trigger sync

---

### Phase 3: Production Optimization (If needed)
1. **Reduce Polling Overhead**
   - Current: Checks sync status every 2 seconds
   - Could reduce to 5-10 seconds if performance needed

2. **Reduce Periodic Sync Frequency**
   - Current: Every 30 seconds
   - Could increase to 60 seconds for less battery drain

3. **Add Service Worker Optimization**
   - Currently registered but not fully active
   - Could enhance for background sync in web workers

---

## Key Files & Components

| Component | File | Purpose |
|-----------|------|---------|
| **Offline Detection** | `useOfflineCache.ts` | Detects online/offline, triggers sync |
| **Cache Layer** | `offlineDB.ts` | IndexedDB operations, sync queue |
| **UI Indicator** | `OfflineIndicator.tsx` | Shows offline status banner |
| **Error Handler** | `SyncErrorHandler.tsx` | Shows failed items & conflicts |
| **Create Form** | `CreateRequirementForm.tsx` | Queues create operations |
| **Detail Modal** | `RequirementDetailModal.tsx` | Queues update/delete operations |
| **Kanban Board** | `KanbanBoard.tsx` | Queues status updates |

---

## User Experience Flow

### Scenario 1: Create Requirement While Offline
```
1. User creates requirement form
2. App detects offline → shows "Working offline" banner
3. User clicks "Save"
4. Operation queues with temp ID (temp-1234567-abc123)
5. Requirement appears immediately (optimistic update)
6. Toast shows "Queued for Sync"
7. User goes back online
8. Toast auto-syncs in <2 seconds
9. Requirement ID changes from temp-xxx to real ID on server
```

### Scenario 2: Update While Someone Else Also Updates (Conflict)
```
1. User goes offline
2. User updates Requirement A
3. Meanwhile, someone else updates Requirement A (different device)
4. User reconnects
5. Sync detects conflict (user's timestamp > server's timestamp)
6. Local version wins (overwrites server)
7. SyncErrorHandler shows "1 conflict resolved"
8. Both versions logged for audit trail
```

### Scenario 3: Sync Failure & Retry
```
1. User creates requirement while offline
2. Comes online but server is unreachable
3. Sync fails after 3 retries with exponential backoff
4. SyncErrorHandler shows red "1 failed item" banner
5. User clicks "Retry Failed Items"
6. Sync tries again immediately
7. Success! Requirement synced
```

---

## What I Will Do

1. ✅ **Verify all offline features are working** - Read through code and trace execution
2. ✅ **Test each scenario** - Create test checklist
3. ✅ **Ensure UI feedback is clear** - Verify toasts, banners, panels
4. ✅ **Check error handling** - Verify failures show in SyncErrorHandler
5. ✅ **Verify database sync** - Requirements actually appear on server after offline creation

---

## After Your Approval (YES)

I will:
1. Run comprehensive manual tests for each scenario
2. Check browser DevTools to verify IndexedDB operations
3. Monitor Supabase to verify data actually syncs
4. Create detailed test report with screenshots
5. Make any fixes needed if something isn't working
6. Provide final verification checklist

---

## Questions Before Implementation

- ✅ Should conflicts **always** use "LOCAL WINS" or would you prefer user choice?
- ✅ Should failed syncs **auto-retry** periodically or wait for manual retry?
- ✅ Should sync happen **silently** or show progress to user?

---

## Summary

**Current Status:** ~90% implemented and integrated
- Offline detection ✅
- Cache system ✅
- Sync queue ✅
- CRUD operations queuing ✅
- Multiple sync triggers ✅
- Conflict detection ✅
- Error UI ✅

**Next Step:** Full end-to-end testing to verify everything works together
