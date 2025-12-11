-- Migration: atomic append function for campaign details and counters

-- Function: append_campaign_event(p_id text, p_event jsonb, p_sent int, p_failed int, p_processed int, p_progress int)

CREATE OR REPLACE FUNCTION public.append_campaign_event(
  p_id text,
  p_event jsonb,
  p_sent integer,
  p_failed integer,
  p_processed integer,
  p_progress integer
)
RETURNS TABLE(id text, status text, total integer, sent integer, failed integer, processed integer, progress integer, details jsonb, created_at timestamptz, started_at timestamptz, completed_at timestamptz) AS $$
BEGIN
  UPDATE public.bulk_email_campaign_status
  SET
    sent = COALESCE(sent,0) + COALESCE(p_sent,0),
    failed = COALESCE(failed,0) + COALESCE(p_failed,0),
    processed = GREATEST(COALESCE(processed,0), COALESCE(p_processed,0)),
    progress = GREATEST(COALESCE(progress,0), COALESCE(p_progress,0)),
    details = COALESCE(details,'[]'::jsonb) || COALESCE(p_event, '[]'::jsonb)
  WHERE id = p_id
  RETURNING id, status, total, sent, failed, processed, progress, details, created_at, started_at, completed_at
  INTO id, status, total, sent, failed, processed, progress, details, created_at, started_at, completed_at;

  IF NOT FOUND THEN
    -- If record doesn't exist, create it
    INSERT INTO public.bulk_email_campaign_status(id, status, total, sent, failed, processed, progress, details, created_at)
    VALUES (p_id, 'processing', 0, COALESCE(p_sent,0), COALESCE(p_failed,0), COALESCE(p_processed,0), COALESCE(p_progress,0),
            COALESCE(p_event, '[]'::jsonb), now())
    RETURNING id, status, total, sent, failed, processed, progress, details, created_at, started_at, completed_at
    INTO id, status, total, sent, failed, processed, progress, details, created_at, started_at, completed_at;
  END IF;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to anon if needed (be cautious) -- keep restricted to service role in production
-- GRANT EXECUTE ON FUNCTION public.append_campaign_event(text, jsonb, integer, integer, integer, integer) TO anon;
