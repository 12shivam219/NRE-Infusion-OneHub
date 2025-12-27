# RLS Policy Fix for Campaign Recipients

## Problem
Error: `42501 - new row violates row-level security policy for table "campaign_recipients"`

The `campaign_recipients` table either:
1. Has RLS enabled but NO policies allowing INSERT
2. Has a policy that doesn't match the user context
3. The policy can't verify the user owns the campaign

## Solution

A new migration has been created: `013_fix_campaign_recipients_rls.sql`

### What the migration does:

1. **Enables RLS on campaign_recipients** with proper policies:
   - ✅ Users can view recipients of campaigns they created
   - ✅ Users can insert recipients for campaigns they created
   - ✅ Users can update recipients of campaigns they created
   - ✅ Users can delete recipients of campaigns they created

2. **Fixes bulk_email_campaigns RLS** with policies:
   - ✅ Users can view campaigns they created
   - ✅ Users can insert campaigns
   - ✅ Users can update campaigns they created
   - ✅ Users can delete campaigns they created

3. **Creates performance indexes**:
   - campaign_recipients → campaign_id (for fast lookups)
   - campaign_recipients → status
   - bulk_email_campaigns → user_id
   - bulk_email_campaigns → requirement_id

## How to Apply

### Option 1: Using Supabase CLI (Recommended)
```bash
cd c:\Users\12shi\Music\NRE-Infusion-OneHub
supabase migration up
```

### Option 2: Manual SQL in Supabase Dashboard
1. Go to: https://app.supabase.com/project/YOUR_PROJECT
2. Navigate to SQL Editor
3. Copy contents of `supabase/migrations/013_fix_campaign_recipients_rls.sql`
4. Paste and run

### Option 3: Using psql (if you have direct DB access)
```bash
psql "postgresql://..." < supabase/migrations/013_fix_campaign_recipients_rls.sql
```

## RLS Policy Logic

The policies use a **relational check** pattern:

```sql
-- User can INSERT campaign_recipients if:
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bulk_email_campaigns
    WHERE bulk_email_campaigns.id = campaign_recipients.campaign_id
    AND bulk_email_campaigns.user_id = auth.uid()  -- ← User owns the campaign
  )
);
```

This means:
- When inserting into `campaign_recipients`, Postgres checks:
  - Does the `campaign_id` exist?
  - Do we have a matching campaign where `user_id = auth.uid()`?
  - If YES → INSERT allowed
  - If NO → 42501 Forbidden error

## Migration File Location
```
supabase/migrations/013_fix_campaign_recipients_rls.sql
```

## After Applying

Try sending an email again:
1. Open a requirement
2. Click "Emails" tab
3. Click "Send Email" button
4. Fill in recipients, subject, body
5. Click "Review"
6. Click "Send Campaign"
7. Should now work! ✅

## Verification

To verify the RLS is working correctly, you can check in Supabase dashboard:
- SQL Editor
- Run: `SELECT * FROM information_schema.role_routine_grants WHERE routine_name LIKE '%campaign%';`
- Or check the Policies tab in the `campaign_recipients` table

---

**Next Step**: Apply the migration, then try sending a campaign email again!
