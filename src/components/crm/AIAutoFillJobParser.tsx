import { useCallback, useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';
import { useOfflineCache } from '../../hooks/useOfflineCache';
import { createRequirement } from '../../lib/api/requirements';
import { sanitizeText } from '../../lib/utils';
import { parseJD } from '../../lib/agents/jobExtractionAgent';
import { cacheRequirements, type CachedRequirement } from '../../lib/offlineDB';
import type { Database } from '../../lib/database.types';
import type { ExtractedJobDetails as JdExtractionResult } from '../../lib/agents/types';
import { ErrorAlert } from '../common/ErrorAlert';
import { BrandButton } from '../brand';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

type RequirementRow = Database['public']['Tables']['requirements']['Row'];

type SubmissionMode = 'auto' | 'review';

const makeRequirementPayload = (
  userId: string,
  extraction: JdExtractionResult,
  cleanedJobText: string
) => {
  const title = extraction.jobTitle ? sanitizeText(extraction.jobTitle) : '';
  const primaryTechStack = (extraction.keySkills ?? []).length
    ? (extraction.keySkills ?? []).join(', ')
    : '';

  const payload: Database['public']['Tables']['requirements']['Insert'] = {
    user_id: userId,
    title,
    company: extraction.hiringCompany
      ? sanitizeText(extraction.hiringCompany)
      : null,
    description: cleanedJobText ? sanitizeText(cleanedJobText) : null,
    location: extraction.location ? sanitizeText(extraction.location) : null,
    status: 'NEW',
    rate: extraction.rate ? extraction.rate : null,
    primary_tech_stack: primaryTechStack
      ? sanitizeText(primaryTechStack)
      : null,
    remote: extraction.workLocationType ?? null,
    duration: extraction.duration ?? null,
    vendor_company: extraction.vendor
      ? sanitizeText(extraction.vendor)
      : null,
    vendor_person_name: extraction.vendorContact
      ? sanitizeText(extraction.vendorContact)
      : null,
    vendor_phone: extraction.vendorPhone ?? null,
    vendor_email: extraction.vendorEmail ?? null,
    end_client: extraction.endClient
      ? sanitizeText(extraction.endClient)
      : null,
  };

  return payload;
};

export const AIAutoFillJobParser = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { isOnline, queueOfflineOperation } = useOfflineCache();

  const [rawInput, setRawInput] = useState('');
  const [submissionMode, setSubmissionMode] = useState<SubmissionMode>('auto');
  const [extracted, setExtracted] = useState<{
    extraction: JdExtractionResult;
    cleanedJobText: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ======================================================
     PARSE HANDLER
  ====================================================== */
  const handleParse = useCallback(async () => {
    setError(null);
    setExtracted(null);
    setLoading(true);

    const text = rawInput.trim();
    if (!text) {
      setLoading(false);
      showToast({
        type: 'error',
        title: 'Missing input',
        message: 'Paste a job description to extract.',
      });
      return;
    }

    try {
      const extraction = await parseJD(text);

      if (!extraction.jobTitle || extraction.jobTitle.trim().length < 3) {
        setError('Could not extract a valid job title from the description.');
        setLoading(false);
        showToast({
          type: 'error',
          title: 'Extraction failed',
          message: 'No valid job title found. Please check the input.',
        });
        return;
      }

      setExtracted({
        extraction,
        cleanedJobText: sanitizeText(text),
      });

      showToast({
        type: 'success',
        title: 'Extraction successful',
        message: `Job title: "${extraction.jobTitle}"`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Parsing failed';
      setError(msg);
      showToast({
        type: 'error',
        title: 'Parse failed',
        message: msg,
      });
    } finally {
      setLoading(false);
    }
  }, [rawInput, showToast]);

  /* ======================================================
     CREATE HANDLER (AUTO OR REVIEW)
  ====================================================== */
  const handleCreate = useCallback(async () => {
    if (!user || !extracted || loading) return;

    setError(null);
    setLoading(true);

    try {
      const payload = makeRequirementPayload(
        user.id,
        extracted.extraction,
        extracted.cleanedJobText
      );

      if (!payload.title || payload.title.trim().length < 3) {
        setError('Invalid job title.');
        setLoading(false);
        return;
      }

      if (!isOnline) {
        const tempId = `temp-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`;

        await queueOfflineOperation(
          'CREATE',
          'requirement',
          tempId,
          payload as unknown as Record<string, unknown>
        );

        const optimistic: RequirementRow = {
          id: tempId,
          requirement_number: 0,
          consultant_id: null,
          applied_for: null,
          imp_name: null,
          client_website: null,
          imp_website: null,
          vendor_website: null,
          next_step: null,
          created_by: user.id,
          updated_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...payload,
        } as RequirementRow;

        await cacheRequirements(
          [optimistic as unknown as CachedRequirement],
          user.id
        );

        showToast({
          type: 'info',
          title: 'Queued for Sync',
          message: `Requirement "${payload.title}" queued and will sync when back online.`,
        });

        onClose();
        return;
      }

      const result = await createRequirement(payload, user.id);
      if (result.success) {
        showToast({
          type: 'success',
          title: 'Created',
          message: `Requirement "${payload.title}" created successfully.`,
        });

        window.dispatchEvent(
          new CustomEvent('requirement-created', {
            detail: result.requirement,
          })
        );

        onClose();
      } else {
        setError(result.error || 'Failed to create requirement');
        showToast({
          type: 'error',
          title: 'Creation failed',
          message: result.error || 'Failed to create requirement',
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unexpected error';
      setError(msg);
      showToast({
        type: 'error',
        title: 'Error',
        message: msg,
      });
    } finally {
      setLoading(false);
    }
  }, [user, extracted, loading, isOnline, queueOfflineOperation, onClose, showToast]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      scroll="paper"
      disableScrollLock
      slotProps={{
        backdrop: {
          sx: {
            backdropFilter: 'blur(4px)',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      }}
      sx={{
        '& .MuiBackdrop-root': {
          backdropFilter: 'blur(4px)',
        },
      }}
    >
      <DialogTitle sx={{ pr: 7 }}>
        <Typography sx={{ fontWeight: 800 }}>🤖 AI Auto-Fill Job Parser</Typography>
        <IconButton
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <X className="w-6 h-6" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2.5}>
          {error && (
            <ErrorAlert
              title="Error"
              message={error}
              onDismiss={() => setError(null)}
            />
          )}

          {!extracted && (
            <>
              <TextField
                label="Paste job description"
                placeholder="Paste recruiter email or job description text here"
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                fullWidth
                multiline
                minRows={10}
                disabled={loading}
              />

              <Stack direction="row" spacing={1.5}>
                <BrandButton onClick={handleParse} disabled={loading}>
                  Extract with AI
                </BrandButton>

                <BrandButton
                  variant="secondary"
                  onClick={() => {
                    setRawInput('');
                    setError(null);
                  }}
                  disabled={loading}
                >
                  Clear
                </BrandButton>
              </Stack>
            </>
          )}

          {extracted && (
            <Stack spacing={2.5}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack spacing={1.5}>
                  <Typography sx={{ fontWeight: 800 }}>
                    Extracted Job Details
                  </Typography>

                  <Box component="pre" sx={{ fontSize: 12, maxHeight: 300, overflow: 'auto' }}>
                    {JSON.stringify(extracted.extraction, null, 2)}
                  </Box>
                </Stack>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                <Stack spacing={2}>
                  <Typography sx={{ fontWeight: 800 }}>
                    Create Requirement
                  </Typography>

                  <RadioGroup
                    value={submissionMode}
                    onChange={(e) => setSubmissionMode(e.target.value as SubmissionMode)}
                  >
                    <FormControlLabel
                      value="auto"
                      control={<Radio />}
                      label="Auto-Create (create immediately with extracted data)"
                      disabled={loading}
                    />
                    <FormControlLabel
                      value="review"
                      control={<Radio />}
                      label="Review First (open form for you to edit before creating)"
                      disabled={loading}
                    />
                  </RadioGroup>
                </Stack>
              </Paper>

              <Stack direction="row" spacing={1.5}>
                <BrandButton
                  onClick={handleCreate}
                  disabled={loading || !extracted}
                >
                  {loading ? 'Processing...' : 'Create Requirement'}
                </BrandButton>

                <BrandButton
                  variant="secondary"
                  onClick={() => {
                    setExtracted(null);
                    setRawInput('');
                    setError(null);
                  }}
                  disabled={loading}
                >
                  Parse Another
                </BrandButton>
              </Stack>
            </Stack>
          )}
        </Stack>
      </DialogContent>

      {!extracted && (
        <DialogActions>
          <BrandButton variant="secondary" onClick={onClose} disabled={loading}>
            Close
          </BrandButton>
        </DialogActions>
      )}
    </Dialog>
  );
};
