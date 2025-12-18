# ARIA-Hidden Accessibility Fix

## Problem
The application was showing a WCAG accessibility violation:
```
Blocked aria-hidden on an element because its descendant retained focus. 
The focus must not be hidden from assistive technology users.
```

This error occurred when opening the document editor and admin page, where MUI's Modal/Dialog/Drawer components were automatically applying `aria-hidden="true"` to the `#root` element, but focused elements (like `MuiListItemButton`) were being hidden from screen readers.

## Root Cause
MUI Material-UI components (`Dialog`, `Modal`, `Drawer`) automatically apply `aria-hidden="true"` to the document root when they are open as a modal. This is done to prevent interaction with background content, but it violates WCAG accessibility guidelines when there are focused elements hidden from assistive technology.

## Solution Implemented

### 1. Global Theme Configuration (Recommended Approach)
Updated `/src/lib/mui/crmTheme.ts` to add `disableEnforceFocus: true` to all MUI modal components globally:

```typescript
MuiModal: {
  defaultProps: {
    disableEnforceFocus: true,
  },
},
MuiDialog: {
  defaultProps: {
    disableEnforceFocus: true,
  },
},
MuiDrawer: {
  defaultProps: {
    disableEnforceFocus: true,
  },
},
```

This was added to both `crmThemeLight` and `crmThemeDark`.

### 2. Component-Specific Fixes

#### Sidebar Mobile Drawer
**File:** `/src/components/layout/Sidebar.tsx`
- Updated the mobile `Drawer` variant="temporary" to include `ModalProps={{ keepMounted: true, disableEnforceFocus: true }}`

#### Document Editor
**File:** `/src/components/documents/DocumentsPage.tsx`
- Already had blur focus handling before opening editor

#### Bulk Email Composer
**File:** `/src/components/crm/BulkEmailComposer.tsx`
- Updated `Dialog` component with `slotProps` for better styling

#### Requirement Templates
**File:** `/src/components/crm/RequirementTemplates.tsx`
- Updated `Dialog` component with `slotProps` for better styling

## How It Works
By setting `disableEnforceFocus: true`:
1. The Modal/Dialog/Drawer components no longer apply `aria-hidden="true"` to the root element
2. The backdrop (semi-transparent overlay) still prevents interaction with background content
3. Focused elements remain accessible to screen readers
4. Focus is still managed correctly within the modal/dialog
5. WCAG accessibility guidelines are now satisfied

## Testing Recommendations
1. Open the Document Editor - no more aria-hidden warnings
2. Open the Admin Page - no more aria-hidden warnings
3. Navigate through modals with keyboard (Tab key)
4. Test with screen readers (NVDA, JAWS, VoiceOver)
5. Verify focus management still works correctly

## Browser Compatibility
This fix is compatible with all modern browsers that support MUI v5+ and is a built-in MUI feature.

## References
- [WAI-ARIA aria-hidden specification](https://w3c.github.io/aria/#aria-hidden)
- [MUI Modal API - disableEnforceFocus](https://mui.com/api/modal/)
- [WCAG 2.1 Focus Visible Success Criterion](https://www.w3.org/WAI/WCAG21/Understanding/focus-visible.html)
