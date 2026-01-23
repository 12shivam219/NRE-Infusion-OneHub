/**
 * Wake Word Settings Component
 * Allows users to configure wake word detection
 */

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Slider,
  FormControlLabel,
  Switch,
  Stack,
  Alert,
  CircularProgress,
  Box,
  Typography,
} from '@mui/material';
import { useState, useEffect, useCallback } from 'react';
import { DEFAULT_WAKE_WORDS } from '../../lib/chat/wakeWordDetection';
import { saveWakeWordSettings, getWakeWordSettings } from '../../lib/api/phase2';

interface WakeWordSettingsProps {
  open: boolean;
  userId?: string;
  onClose: () => void;
}

export function WakeWordSettings({ open, userId, onClose }: WakeWordSettingsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [wakeWord, setWakeWord] = useState('hey assistant');
  const [isEnabled, setIsEnabled] = useState(true);
  const [sensitivity, setSensitivity] = useState(0.7);
  const [autoListenDuration, setAutoListenDuration] = useState(5000);

  const loadSettings = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      const result = await getWakeWordSettings(userId);

      if (result.success && result.data) {
        setWakeWord(result.data.wakeWord);
        setIsEnabled(result.data.isEnabled);
        setSensitivity(result.data.sensitivity);
        setAutoListenDuration(result.data.autoListenDurationMs);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (open && userId) {
      loadSettings();
    }
  }, [open, userId, loadSettings]);

  const handleSave = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      setError(null);

      const result = await saveWakeWordSettings(userId, {
        wakeWord,
        isEnabled,
        sensitivity,
        autoListenDurationMs: autoListenDuration,
      });

      if (result.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error || 'Failed to save settings');
      }
    } finally {
      setIsLoading(false);
    }
  }, [userId, wakeWord, isEnabled, sensitivity, autoListenDuration]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Wake Word Settings</DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={3}>
          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">Settings saved successfully!</Alert>}

          {/* Enable/Disable Toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={isEnabled}
                onChange={e => setIsEnabled(e.target.checked)}
                disabled={isLoading}
              />
            }
            label="Enable Wake Word Detection"
          />

          {isEnabled && (
            <>
              {/* Wake Word Selection */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Wake Word
                </Typography>
                <TextField
                  fullWidth
                  value={wakeWord}
                  onChange={e => setWakeWord(e.target.value.toLowerCase().trim())}
                  placeholder="Enter wake word"
                  disabled={isLoading}
                  helperText="Common: 'hey assistant', 'hey ai', 'wake up'"
                />
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  {DEFAULT_WAKE_WORDS.map(word => (
                    <Button
                      key={word}
                      size="small"
                      variant="outlined"
                      onClick={() => setWakeWord(word)}
                      disabled={isLoading}
                    >
                      {word}
                    </Button>
                  ))}
                </Stack>
              </Box>

              {/* Sensitivity Slider */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Sensitivity: {(sensitivity * 100).toFixed(0)}%
                </Typography>
                <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 1 }}>
                  Higher = More sensitive to variations (more false positives)
                  <br />
                  Lower = Requires exact match (fewer false positives)
                </Typography>
                <Slider
                  value={sensitivity}
                  onChange={(_, value) => setSensitivity(value as number)}
                  min={0.1}
                  max={1.0}
                  step={0.1}
                  marks={[
                    { value: 0.1, label: 'Low' },
                    { value: 0.5, label: 'Medium' },
                    { value: 1.0, label: 'High' },
                  ]}
                  disabled={isLoading}
                />
              </Box>

              {/* Auto-Listen Duration */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Auto-Listen Duration: {(autoListenDuration / 1000).toFixed(1)}s
                </Typography>
                <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 1 }}>
                  How long to keep listening after wake word is detected
                </Typography>
                <Slider
                  value={autoListenDuration}
                  onChange={(_, value) => setAutoListenDuration(value as number)}
                  min={1000}
                  max={30000}
                  step={1000}
                  marks={[
                    { value: 1000, label: '1s' },
                    { value: 5000, label: '5s' },
                    { value: 30000, label: '30s' },
                  ]}
                  disabled={isLoading}
                />
              </Box>

              {/* Info Box */}
              <Alert severity="info">
                <Typography variant="body2">
                  💡 <strong>How it works:</strong>
                  <br />
                  When wake word detection is enabled, the chat will listen for your wake word
                  in the background. Once detected, it automatically starts listening for your
                  command for the specified duration.
                </Typography>
              </Alert>
            </>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={isLoading}
        >
          {isLoading ? <CircularProgress size={20} /> : 'Save Settings'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
