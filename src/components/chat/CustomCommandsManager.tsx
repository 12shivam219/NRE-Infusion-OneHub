/**
 * Custom Voice Commands Manager Component
 * Allows users to create and manage custom voice commands
 */

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Stack,
  Alert,
  CircularProgress,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useState, useEffect, useCallback } from 'react';
import {
  COMMAND_TEMPLATES,
  validateTriggerPhrase,
  sortCommandsByUsage,
  type CustomVoiceCommand,
} from '../../lib/chat/customCommands';
import {
  saveCustomCommand,
  getCustomCommands,
  deleteCustomCommand,
} from '../../lib/api/phase2';

interface CustomCommandsManagerProps {
  open: boolean;
  userId?: string;
  onClose: () => void;
}

export function CustomCommandsManager({ open, userId, onClose }: CustomCommandsManagerProps) {
  const [commands, setCommands] = useState<CustomVoiceCommand[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New command form
  const [triggerPhrase, setTriggerPhrase] = useState('');
  const [actionType, setActionType] = useState('navigate');
  const [actionTarget, setActionTarget] = useState('dashboard');
  const [triggerError, setTriggerError] = useState<string | null>(null);

  const loadCommands = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      const result = await getCustomCommands(userId);
      if (result.success && result.data) {
        setCommands(sortCommandsByUsage(result.data));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load commands');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (open && userId) {
      loadCommands();
    }
  }, [open, userId, loadCommands]);

  const handleAddCommand = useCallback(
    async () => {
      if (!userId) return;

      const validation = validateTriggerPhrase(triggerPhrase);
      if (!validation.valid) {
        setTriggerError(validation.error || 'Invalid trigger phrase');
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const result = await saveCustomCommand(userId, {
          triggerPhrase,
          actionType,
          actionTarget: actionTarget || undefined,
          isActive: true,
        });

        if (result.success && result.data) {
          setCommands(prev => [result.data as CustomVoiceCommand, ...prev]);
          setTriggerPhrase('');
          setTriggerError(null);
        } else {
          setError(result.error || 'Failed to save command');
        }
      } finally {
        setIsLoading(false);
      }
    },
    [userId, triggerPhrase, actionType, actionTarget]
  );

  const handleDeleteCommand = useCallback(
    async (commandId: string) => {
      if (!userId) return;

      try {
        const result = await deleteCustomCommand(commandId, userId);
        if (result.success) {
          setCommands(prev => prev.filter(c => c.id !== commandId));
        } else {
          setError(result.error || 'Failed to delete command');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Delete failed');
      }
    },
    [userId]
  );

  const handleUseTemplate = useCallback(
    (template: typeof COMMAND_TEMPLATES[0]) => {
      setTriggerPhrase(template.trigger);
      setActionType(template.actionType);
      setActionTarget(template.actionTarget || '');
      setTriggerError(null);
    },
    []
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Custom Voice Commands</DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}

          {/* Templates Section */}
          <div>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>Quick Templates</div>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {COMMAND_TEMPLATES.slice(0, 3).map(template => (
                <Chip
                  key={template.name}
                  label={template.name}
                  onClick={() => handleUseTemplate(template)}
                  variant="outlined"
                />
              ))}
            </Stack>
          </div>

          {/* New Command Form */}
          <div style={{ borderTop: '1px solid #ddd', paddingTop: 16 }}>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>Add New Command</div>

            <TextField
              fullWidth
              label="Trigger Phrase"
              placeholder="e.g., 'show dashboard'"
              value={triggerPhrase}
              onChange={e => {
                setTriggerPhrase(e.target.value);
                setTriggerError(null);
              }}
              error={!!triggerError}
              helperText={triggerError}
              disabled={isLoading}
              margin="normal"
            />

            <FormControl fullWidth margin="normal">
              <InputLabel>Action Type</InputLabel>
              <Select
                value={actionType}
                onChange={e => setActionType(e.target.value)}
                disabled={isLoading}
              >
                <MenuItem value="navigate">Navigate</MenuItem>
                <MenuItem value="create">Create</MenuItem>
                <MenuItem value="search">Search</MenuItem>
                <MenuItem value="analyze">Analyze</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth margin="normal">
              <InputLabel>Target</InputLabel>
              <Select
                value={actionTarget}
                onChange={e => setActionTarget(e.target.value)}
                disabled={isLoading}
              >
                <MenuItem value="dashboard">Dashboard</MenuItem>
                <MenuItem value="requirements">Requirements</MenuItem>
                <MenuItem value="interviews">Interviews</MenuItem>
                <MenuItem value="consultants">Consultants</MenuItem>
                <MenuItem value="documents">Documents</MenuItem>
              </Select>
            </FormControl>

            <Button
              fullWidth
              variant="outlined"
              startIcon={isLoading ? <CircularProgress size={20} /> : <AddIcon />}
              onClick={handleAddCommand}
              disabled={isLoading || !triggerPhrase.trim()}
              sx={{ mt: 2 }}
            >
              Add Command
            </Button>
          </div>

          {/* Existing Commands */}
          {commands.length > 0 && (
            <div style={{ borderTop: '1px solid #ddd', paddingTop: 16 }}>
              <div style={{ marginBottom: 8, fontWeight: 600 }}>Your Commands ({commands.length})</div>
              <List>
                {commands.map(cmd => (
                  <ListItem key={cmd.id}>
                    <ListItemText
                      primary={cmd.triggerPhrase}
                      secondary={`${cmd.actionType} → ${cmd.actionTarget || 'N/A'} (Used ${cmd.usageCount || 0}x)`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => handleDeleteCommand(cmd.id)}
                        disabled={isLoading}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </div>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
