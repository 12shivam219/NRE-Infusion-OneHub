# Marketing Section - Implementation Fixes & Code Solutions

## Quick Reference: All 5 Areas Reviewed

This document contains production-ready code fixes for the identified issues.

---

## ISSUE 1: Missing Delete Implementation

### Problem
Delete operations show success toast but don't call the delete API.

### Fix: RequirementsManagement.tsx

```typescript
// BEFORE (Line ~85)
const handleDelete = useCallback(async () => {
  if (!isAdmin) {
    showToast({
      type: 'error',
      title: 'Permission denied',
      message: 'Only admins can delete requirements.',
    });
    return;
  }

  if (confirm('Are you sure you want to delete this requirement?')) {
    setSelectedRequirement(null);
    showToast({ type: 'success', title: 'Requirement deleted', message: 'The requirement has been removed.' });
    await loadRequirements();
  }
}, [loadRequirements, isAdmin, showToast]);

// AFTER
import { deleteRequirement } from '../../lib/api/requirements'; // Add import

const handleDelete = useCallback(async () => {
  if (!isAdmin) {
    showToast({
      type: 'error',
      title: 'Permission denied',
      message: 'Only admins can delete requirements.',
    });
    return;
  }

  const requirement = selectedRequirement;
  if (!requirement) return;

  if (confirm('Are you sure you want to delete this requirement? This action cannot be undone.')) {
    try {
      const result = await deleteRequirement(requirement.id);
      if (result.success) {
        setSelectedRequirement(null);
        showToast({ type: 'success', title: 'Requirement deleted', message: 'The requirement has been removed.' });
        await loadRequirements();
      } else {
        showToast({ type: 'error', title: 'Failed to delete', message: result.error || 'Unknown error' });
      }
    } catch (error) {
      showToast({ type: 'error', title: 'Error', message: 'Failed to delete requirement' });
    }
  }
}, [loadRequirements, isAdmin, showToast, selectedRequirement]);
```

### Fix: InterviewTracking.tsx

The delete is already implemented but not exposed in the UI. Add delete button to InterviewCard:

```typescript
// In InterviewCard component, add:
<button
  onClick={(e) => {
    e.stopPropagation();
    if (isAdmin) {
      onDelete?.(interview.id);
    }
  }}
  className="px-3 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200 disabled:opacity-50"
  disabled={!isAdmin}
  title={isAdmin ? 'Delete interview' : 'Only admins can delete'}
>
  <Trash2 className="w-4 h-4" />
</button>
```

---

## ISSUE 2: Form Validation

### Problem
Forms lack proper validation for required fields, email formats, URLs, etc.

### Solution 1: Create Validation Utilities

Create `src/lib/formValidation.ts`:

```typescript
/**
 * Form validation utilities
 */

export interface ValidationError {
  isValid: boolean;
  errors: Record<string, string>;
}

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const isValidPhone = (phone: string): boolean => {
  // Remove common formatting characters
  const cleaned = phone.replace(/[\s\-()]/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15 && /^\d+$/.test(cleaned);
};

export const isValidRate = (rate: string): boolean => {
  // Accept formats like: "80k", "$80k-120k", "80000", "$80000"
  if (!rate.trim()) return false;
  return /^[\$]?\d+[k]?(-[\$]?\d+[k]?)?$/.test(rate.replace(/\s/g, ''));
};

export const validateRequirementForm = (data: {
  title: string;
  company: string;
  vendor_email?: string;
  client_website?: string;
  imp_website?: string;
  vendor_website?: string;
  rate?: string;
}): ValidationError => {
  const errors: Record<string, string> = {};

  if (!data.title?.trim()) {
    errors.title = 'Job title is required';
  }

  if (!data.company?.trim()) {
    errors.company = 'Company name is required';
  }

  if (data.vendor_email && !isValidEmail(data.vendor_email)) {
    errors.vendor_email = 'Invalid email format';
  }

  if (data.client_website && !isValidUrl(data.client_website)) {
    errors.client_website = 'Invalid URL format';
  }

  if (data.imp_website && !isValidUrl(data.imp_website)) {
    errors.imp_website = 'Invalid URL format';
  }

  if (data.vendor_website && !isValidUrl(data.vendor_website)) {
    errors.vendor_website = 'Invalid URL format';
  }

  if (data.rate && !isValidRate(data.rate)) {
    errors.rate = 'Invalid rate format (e.g., 80k or $80k-120k)';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateConsultantForm = (data: {
  name: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  expected_rate?: string;
}): ValidationError => {
  const errors: Record<string, string> = {};

  if (!data.name?.trim()) {
    errors.name = 'Name is required';
  }

  if (data.email && !isValidEmail(data.email)) {
    errors.email = 'Invalid email format';
  }

  if (data.phone && !isValidPhone(data.phone)) {
    errors.phone = 'Invalid phone format';
  }

  if (data.date_of_birth) {
    const dob = new Date(data.date_of_birth);
    const age = new Date().getFullYear() - dob.getFullYear();
    if (age < 18) {
      errors.date_of_birth = 'Must be at least 18 years old';
    }
    if (age > 120) {
      errors.date_of_birth = 'Invalid date of birth';
    }
  }

  if (data.expected_rate && !isValidRate(data.expected_rate)) {
    errors.expected_rate = 'Invalid rate format';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
```

### Solution 2: Update CreateRequirementForm.tsx

```typescript
// Add imports
import { validateRequirementForm } from '../../lib/formValidation';

// In component state
const [formErrors, setFormErrors] = useState<Record<string, string>>({});

// Update handleSubmit
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!user) return;

  // Validate form
  const validation = validateRequirementForm({
    title: formData.title,
    company: formData.company,
    vendor_email: formData.vendor_email,
    client_website: formData.client_website,
    imp_website: formData.imp_website,
    vendor_website: formData.vendor_website,
    rate: formData.rate,
  });

  if (!validation.isValid) {
    setFormErrors(validation.errors);
    showToast({
      type: 'error',
      title: 'Validation Error',
      message: 'Please fix the errors below',
    });
    return;
  }

  setFormErrors({});
  setLoading(true);
  const result = await createRequirement({ /* ... */ });
  setLoading(false);
  if (result.success) {
    onSuccess();
  } else {
    showToast({ type: 'error', title: 'Failed', message: result.error });
  }
};

// Update FormField component to display errors
const FormField = memo(function FormField({
  label,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  required = false,
  options,
  error, // Add this prop
}: FormFieldProps & { error?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {/* ... select/textarea/input fields ... */}
      {error && (
        <div className="flex items-center gap-2 mt-2 text-red-600 text-sm bg-red-50 p-2 rounded">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
});

// In form JSX, pass errors:
<FormField
  label="What's the job title?"
  name="title"
  placeholder="Senior Java Developer"
  value={formData.title}
  onChange={handleChange}
  required
  error={formErrors.title}
/>
<FormField
  label="Which company is hiring?"
  name="company"
  placeholder="TechCorp Inc"
  value={formData.company}
  onChange={handleChange}
  required
  error={formErrors.company}
/>
```

### Solution 3: Update CreateConsultantForm.tsx

Same pattern - add validation errors state and display in FormField components.

---

## ISSUE 3: Error State Display

### Problem
No persistent error display, only toast notifications.

### Create Error State Component

`src/components/common/ErrorAlert.tsx`:

```typescript
import { AlertCircle, X } from 'lucide-react';

interface ErrorAlertProps {
  title: string;
  message: string;
  onRetry?: () => void;
  onDismiss: () => void;
  retryLabel?: string;
}

export const ErrorAlert = ({
  title,
  message,
  onRetry,
  onDismiss,
  retryLabel = 'Try Again',
}: ErrorAlertProps) => (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3 flex-col sm:flex-row">
    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
    
    <div className="flex-1">
      <h3 className="font-semibold text-red-900 mb-1">{title}</h3>
      <p className="text-red-800 text-sm mb-3">{message}</p>
      
      <div className="flex gap-2 flex-wrap">
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition text-sm"
          >
            {retryLabel}
          </button>
        )}
        <button
          onClick={onDismiss}
          className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg font-medium hover:bg-gray-300 transition text-sm flex items-center gap-1"
        >
          <X className="w-4 h-4" />
          Dismiss
        </button>
      </div>
    </div>
  </div>
);
```

### Update RequirementsManagement.tsx

```typescript
import { ErrorAlert } from '../common/ErrorAlert';

// Add to state
const [error, setError] = useState<{ title: string; message: string } | null>(null);

// Update loadRequirements
const loadRequirements = useCallback(async () => {
  if (!user) return;
  try {
    setError(null); // Clear previous error
    const reqResult = await getRequirements(user.id);
    if (reqResult.success && reqResult.requirements) {
      setRequirements(reqResult.requirements);
    } else {
      setError({
        title: 'Failed to load requirements',
        message: reqResult.error || 'An unexpected error occurred',
      });
    }
  } catch (err) {
    setError({
      title: 'Error',
      message: err instanceof Error ? err.message : 'Failed to load requirements',
    });
  } finally {
    setLoading(false);
  }
}, [user]);

// In JSX, add after header
{error && (
  <ErrorAlert
    title={error.title}
    message={error.message}
    onRetry={() => loadRequirements()}
    onDismiss={() => setError(null)}
    retryLabel="Try Again"
  />
)}
```

---

## ISSUE 4: Modal Refresh After Updates

### Problem
After updating requirement in detail modal, parent list doesn't refresh.

### Solution: Lift onSuccess Handler

**Update RequirementDetailModal.tsx:**

```typescript
interface RequirementDetailModalProps {
  requirement: Requirement;
  onClose: () => void;
  onUpdate?: () => void; // Add this prop
}

export const RequirementDetailModal = ({ requirement, onClose, onUpdate }: RequirementDetailModalProps) => {
  // ... component code ...

  const handleUpdate = async () => {
    const result = await updateRequirement(requirement.id, updates, user?.id);
    if (result.success) {
      showToast({ type: 'success', message: 'Requirement updated' });
      onUpdate?.(); // Call parent callback
      onClose();
    }
  };

  // ... rest of component
};
```

**Update RequirementsManagement.tsx:**

```typescript
const handleViewDetails = (req: Requirement) => {
  setSelectedRequirement(req);
};

// In JSX
{selectedRequirement && (
  <RequirementDetailModal
    requirement={selectedRequirement}
    onClose={() => setSelectedRequirement(null)}
    onUpdate={() => loadRequirements()} // Refresh list on update
  />
)}
```

---

## ISSUE 5: Real-Time Subscriptions

### Problem
No automatic updates when data changes externally.

### Create Realtime Service

`src/lib/api/realtimeSync.ts`:

```typescript
import { supabase } from '../supabase';
import type { Database } from '../database.types';

type Requirement = Database['public']['Tables']['requirements']['Row'];
type Interview = Database['public']['Tables']['interviews']['Row'];
type Consultant = Database['public']['Tables']['consultants']['Row'];

export interface RealtimeUpdate<T> {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  record: T;
}

/**
 * Subscribe to requirement changes in real-time
 */
export const subscribeToRequirements = (
  userId: string,
  onUpdate: (update: RealtimeUpdate<Requirement>) => void
): (() => void) => {
  const channel = supabase
    .channel(`requirements:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'requirements',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          onUpdate({
            type: 'INSERT',
            record: payload.new as Requirement,
          });
        } else if (payload.eventType === 'UPDATE') {
          onUpdate({
            type: 'UPDATE',
            record: payload.new as Requirement,
          });
        } else if (payload.eventType === 'DELETE') {
          onUpdate({
            type: 'DELETE',
            record: payload.old as Requirement,
          });
        }
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * Subscribe to interview changes in real-time
 */
export const subscribeToInterviews = (
  userId: string,
  onUpdate: (update: RealtimeUpdate<Interview>) => void
): (() => void) => {
  const channel = supabase
    .channel(`interviews:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'interviews',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          onUpdate({
            type: 'INSERT',
            record: payload.new as Interview,
          });
        } else if (payload.eventType === 'UPDATE') {
          onUpdate({
            type: 'UPDATE',
            record: payload.new as Interview,
          });
        } else if (payload.eventType === 'DELETE') {
          onUpdate({
            type: 'DELETE',
            record: payload.old as Interview,
          });
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * Subscribe to consultant changes in real-time
 */
export const subscribeToConsultants = (
  userId: string,
  onUpdate: (update: RealtimeUpdate<Consultant>) => void
): (() => void) => {
  const channel = supabase
    .channel(`consultants:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'consultants',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          onUpdate({
            type: 'INSERT',
            record: payload.new as Consultant,
          });
        } else if (payload.eventType === 'UPDATE') {
          onUpdate({
            type: 'UPDATE',
            record: payload.new as Consultant,
          });
        } else if (payload.eventType === 'DELETE') {
          onUpdate({
            type: 'DELETE',
            record: payload.old as Consultant,
          });
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
```

### Use in RequirementsManagement.tsx

```typescript
import { subscribeToRequirements, type RealtimeUpdate } from '../../lib/api/realtimeSync';

// In component
useEffect(() => {
  loadRequirements();

  // Subscribe to real-time changes
  let unsubscribe: (() => void) | undefined;
  if (user) {
    unsubscribe = subscribeToRequirements(user.id, (update: RealtimeUpdate<Requirement>) => {
      if (update.type === 'INSERT') {
        setRequirements(prev => [update.record, ...prev]);
      } else if (update.type === 'UPDATE') {
        setRequirements(prev =>
          prev.map(r => (r.id === update.record.id ? update.record : r))
        );
      } else if (update.type === 'DELETE') {
        setRequirements(prev => prev.filter(r => r.id !== update.record.id));
      }
    });
  }

  return () => {
    unsubscribe?.();
  };
}, [loadRequirements, user]);
```

---

## ISSUE 6: Pagination Improvements

### Add Jump to Page & Items Per Page

```typescript
// In RequirementsManagement component

const [itemsPerPage, setItemsPerPage] = useState(6);
const [jumpToPageInput, setJumpToPageInput] = useState('');

const totalPages = Math.ceil(filteredRequirements.length / itemsPerPage);

// In JSX, add pagination controls:
<div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-4 bg-gray-50 rounded-lg flex-wrap">
  <span className="text-sm text-gray-600">
    Showing {currentPage * itemsPerPage + 1} to {Math.min((currentPage + 1) * itemsPerPage, filteredRequirements.length)} of {filteredRequirements.length}
  </span>

  <div className="flex items-center gap-2 flex-wrap justify-center">
    {/* Items per page selector */}
    <select
      value={itemsPerPage}
      onChange={(e) => {
        setItemsPerPage(Number(e.target.value));
        setCurrentPage(0);
      }}
      className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
      title="Items per page"
    >
      <option value="6">6 per page</option>
      <option value="12">12 per page</option>
      <option value="24">24 per page</option>
      <option value="50">50 per page</option>
    </select>

    {/* Jump to page input */}
    <input
      type="number"
      placeholder="Go to page"
      value={jumpToPageInput}
      onChange={(e) => setJumpToPageInput(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          const page = Math.max(1, Math.min(Number(jumpToPageInput), totalPages));
          setCurrentPage(page - 1);
          setJumpToPageInput('');
        }
      }}
      className="w-20 px-3 py-2 text-sm border border-gray-300 rounded-lg"
      title="Enter page number and press Enter"
    />
  </div>

  <div className="flex gap-2">
    <button
      onClick={() => setCurrentPage(0)}
      disabled={currentPage === 0}
      className="px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition"
      title="First page"
    >
      First
    </button>
    <button
      onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
      disabled={currentPage === 0}
      className="px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition"
      title="Previous page"
    >
      Prev
    </button>
    <span className="px-3 py-2 text-sm text-gray-600">
      Page {currentPage + 1} of {totalPages}
    </span>
    <button
      onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
      disabled={currentPage >= totalPages - 1}
      className="px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition"
      title="Next page"
    >
      Next
    </button>
    <button
      onClick={() => setCurrentPage(totalPages - 1)}
      disabled={currentPage >= totalPages - 1}
      className="px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition"
      title="Last page"
    >
      Last
    </button>
  </div>
</div>
```

---

## Implementation Roadmap

### Phase 1: Critical (Day 1-2)
- [ ] Add form validation utilities
- [ ] Update all forms with validation
- [ ] Fix delete operations to call APIs
- [ ] Add error state display (ErrorAlert component)

### Phase 2: Important (Day 3-4)
- [ ] Implement real-time subscriptions
- [ ] Add modal refresh callbacks
- [ ] Enhance pagination controls
- [ ] Test all error scenarios

### Phase 3: Nice to Have (Day 5+)
- [ ] Add virtualization for 500+ items
- [ ] Implement keyboard shortcuts
- [ ] Add loading skeletons everywhere
- [ ] Performance optimization

---

## Testing Checklist

- [ ] Create requirement with invalid email - form shows error
- [ ] Delete requirement - API called, list refreshed
- [ ] Open detail modal, edit, save - parent list auto-refreshes
- [ ] Network error during create - error displayed with retry
- [ ] Two users open same page, one updates - other sees change (realtime)
- [ ] Pagination: select 24/page, jump to page 5, sort - all work together
- [ ] Long form submission - loading state shows, success/error clear

