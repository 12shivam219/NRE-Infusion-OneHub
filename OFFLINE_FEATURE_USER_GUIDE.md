# Offline Feature - User Guide

## How Users Know About Offline Feature

### 1. **Visual Indicators**

#### When Offline:
- **Orange Banner** appears at bottom-left corner
  - Shows "Working offline" message
  - Displays "Changes will sync when online"
  - Info icon (ℹ️) button appears on first use

#### When Syncing:
- **Blue Progress Bar** appears at bottom-left
  - Shows sync progress percentage
  - Displays number of items remaining
  - Shows failed items count if any

### 2. **First-Time User Experience**

When a user goes offline for the first time:

1. **Toast Notification** (Top-right)
   - Title: "Offline Mode Active"
   - Message: "You can continue working offline. Changes will sync automatically when you're back online."
   - Duration: 6 seconds

2. **Educational Banner** (Bottom-left, above indicator)
   - Appears automatically on first offline experience
   - Explains offline capabilities
   - "Got it!" button to dismiss permanently
   - "Dismiss" button to hide for this session

3. **Info Icon** on offline indicator
   - Click to show educational banner again
   - Only visible if user hasn't dismissed it permanently

### 3. **User Feedback During Offline Operations**

When users perform actions while offline:

- **Create Requirement**: Toast shows "Queued for Sync - Requirement will be created when you come back online"
- **Update Requirement**: Toast shows "Queued for Sync - Changes will be saved when you come back online"
- **Delete Requirement**: Toast shows "Queued for Sync - Requirement will be deleted when you come back online"
- **Status Change (Kanban)**: Toast shows "Queued for Sync - Status change will be saved when you come back online"

### 4. **Sync Status Visibility**

Users can see sync status in:
- **Offline Indicator** - Shows real-time sync progress
- **Admin Dashboard** - Full sync dashboard with analytics
- **Sync Controls** - Manual sync trigger button

### 5. **Settings & Configuration**

Users can configure offline features in:
- **Admin → Cache Settings** tab
- Configure what data to cache
- Set cache size limits
- View storage usage

## User Flow

### First Time Going Offline:
1. User loses internet connection
2. Orange banner appears with info icon
3. Toast notification appears (6 seconds)
4. Educational banner appears automatically
5. User can click "Got it!" to dismiss permanently
6. User continues working normally

### Subsequent Offline Sessions:
1. Orange banner appears
2. Toast notification appears (if not shown before)
3. No educational banner (user has seen it)
4. User works normally

### Coming Back Online:
1. Blue sync indicator appears
2. Progress bar shows sync progress
3. Toast notification: "Syncing data..."
4. Items sync automatically
5. Indicator disappears when complete

## Key Messages to Users

1. **"You can work offline"** - Main value proposition
2. **"Changes sync automatically"** - No manual action needed
3. **"All operations work offline"** - Create, edit, delete all work
4. **"Progress is visible"** - Users can see sync status

## Technical Details

- Offline indicator is always visible when offline
- Educational banner only shows once (stored in localStorage)
- Toast notifications respect user preferences
- All indicators are non-intrusive and dismissible

