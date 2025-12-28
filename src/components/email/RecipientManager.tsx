import { useState } from 'react';
import {
  Box,
  Stack,
  Typography,
  Button,
  Chip,
  TextField,
  Paper,
  Tooltip,
} from '@mui/material';
import { Add, Close } from '@mui/icons-material';

interface Recipient {
  email: string;
  name?: string;
}

interface RecipientManagerProps {
  to: Recipient[];
  cc?: Recipient[];
  bcc?: Recipient[];
  onToChange?: (recipients: Recipient[]) => void;
  onCcChange?: (recipients: Recipient[]) => void;
  onBccChange?: (recipients: Recipient[]) => void;
  disabled?: boolean;
}

export const RecipientManager = ({
  to,
  cc = [],
  bcc = [],
  onToChange,
  onCcChange,
  onBccChange,
  disabled = false,
}: RecipientManagerProps) => {
  const [expandedField, setExpandedField] = useState<'to' | 'cc' | 'bcc' | null>('to');
  const [newRecipient, setNewRecipient] = useState('');
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  // Validate email format
  const isValidEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email.trim());
  };

  // Parse recipient input (supports "email" or "Name <email>")
  const parseRecipient = (input: string): Recipient | null => {
    const trimmed = input.trim();
    if (!trimmed) return null;

    // Format: Name <email>
    const bracketsMatch = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
    if (bracketsMatch) {
      const [, name, email] = bracketsMatch;
      if (isValidEmail(email)) {
        return { email: email.trim(), name: name.trim() };
      }
    }

    // Format: email
    if (isValidEmail(trimmed)) {
      return { email: trimmed };
    }

    // Format: email, Name
    const commaMatch = trimmed.match(/^([^,]+),\s*(.+)$/);
    if (commaMatch) {
      const [, email, name] = commaMatch;
      if (isValidEmail(email)) {
        return { email: email.trim(), name: name.trim() };
      }
    }

    return null;
  };

  // Check for duplicates
  const isDuplicate = (email: string): boolean => {
    const allEmails = [
      ...to.map(r => r.email.toLowerCase()),
      ...cc.map(r => r.email.toLowerCase()),
      ...bcc.map(r => r.email.toLowerCase()),
    ];
    return allEmails.includes(email.toLowerCase());
  };

  // Add recipient
  const addRecipient = (field: 'to' | 'cc' | 'bcc') => {
    const recipient = parseRecipient(newRecipient);
    if (!recipient) {
      setDuplicateError('Invalid email format');
      return;
    }

    if (isDuplicate(recipient.email)) {
      setDuplicateError('This email is already added');
      return;
    }

    setDuplicateError(null);

    if (field === 'to' && onToChange) {
      onToChange([...to, recipient]);
    } else if (field === 'cc' && onCcChange) {
      onCcChange([...cc, recipient]);
    } else if (field === 'bcc' && onBccChange) {
      onBccChange([...bcc, recipient]);
    }

    setNewRecipient('');
  };

  // Remove recipient
  const removeRecipient = (
    field: 'to' | 'cc' | 'bcc',
    email: string
  ) => {
    if (field === 'to' && onToChange) {
      onToChange(to.filter(r => r.email !== email));
    } else if (field === 'cc' && onCcChange) {
      onCcChange(cc.filter(r => r.email !== email));
    } else if (field === 'bcc' && onBccChange) {
      onBccChange(bcc.filter(r => r.email !== email));
    }
  };

  const renderRecipientField = (
    field: 'to' | 'cc' | 'bcc',
    recipients: Recipient[],
    label: string,
    tooltip: string
  ) => {
    const isExpanded = expandedField === field;

    return (
      <Box key={field}>
        <Tooltip title={tooltip}>
          <Button
            variant="text"
            size="small"
            onClick={() => setExpandedField(isExpanded ? null : field)}
            sx={{
              justifyContent: 'flex-start',
              textTransform: 'none',
              fontWeight: 500,
              mb: 1,
              pl: 0,
            }}
          >
            {label}: {recipients.length > 0 && `(${recipients.length})`}
          </Button>
        </Tooltip>

        {isExpanded && (
          <Paper
            sx={{
              p: 2,
              mb: 1.5,
              bgcolor: 'rgba(234,179,8,0.05)',
              borderColor: 'rgba(234,179,8,0.2)',
              border: '1px solid',
            }}
          >
            <Stack spacing={1.5}>
              {/* Add new recipient */}
              <Stack direction="row" spacing={1}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder={`Add recipient: email@example.com or "Name" <email@example.com>`}
                  value={newRecipient}
                  onChange={(e) => {
                    setNewRecipient(e.target.value);
                    setDuplicateError(null);
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addRecipient(field);
                    }
                  }}
                  disabled={disabled}
                  error={!!duplicateError}
                  helperText={duplicateError}
                />
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => addRecipient(field)}
                  disabled={disabled || !newRecipient.trim()}
                  startIcon={<Add fontSize="small" />}
                >
                  Add
                </Button>
              </Stack>

              {/* Display recipients */}
              {recipients.length > 0 ? (
                <Stack spacing={0.5}>
                  {recipients.map((recipient) => (
                    <Chip
                      key={recipient.email}
                      label={
                        recipient.name
                          ? `${recipient.name} <${recipient.email}>`
                          : recipient.email
                      }
                      onDelete={() => removeRecipient(field, recipient.email)}
                      icon={<Close fontSize="small" />}
                      variant="outlined"
                      sx={{
                        justifyContent: 'space-between',
                        '& .MuiChip-label': { flex: 1 },
                      }}
                    />
                  ))}
                </Stack>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  No recipients added yet
                </Typography>
              )}

              {/* Field info */}
              <Typography variant="caption" color="text.secondary">
                {field === 'to' && '✓ Recipients can see all To addresses'}
                {field === 'cc' && '✓ CC recipients can see all addresses'}
                {field === 'bcc' && '✓ BCC recipients are hidden from everyone'}
              </Typography>
            </Stack>
          </Paper>
        )}
      </Box>
    );
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        bgcolor: 'background.paper',
        borderColor: 'rgba(234,179,8,0.20)',
      }}
    >
      <Stack spacing={2}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Recipients
        </Typography>

        {renderRecipientField(
          'to',
          to,
          'To',
          'Primary recipients - they can see all addresses'
        )}

        {renderRecipientField(
          'cc',
          cc,
          'CC',
          'Carbon Copy - visible to all recipients'
        )}

        {renderRecipientField(
          'bcc',
          bcc,
          'BCC',
          'Blind Carbon Copy - hidden from other recipients'
        )}

        {/* Summary */}
        <Paper
          sx={{
            p: 1.5,
            bgcolor: 'rgba(34,197,94,0.08)',
            borderColor: 'rgba(34,197,94,0.2)',
            border: '1px solid',
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Total Recipients: <strong>{to.length + cc.length + bcc.length}</strong>
          </Typography>
        </Paper>
      </Stack>
    </Paper>
  );
};
