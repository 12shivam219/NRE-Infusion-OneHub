/**
 * Export/Share Conversation Component
 * Allows users to export and share conversations
 */

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel,
  Box,
  CircularProgress,
  Alert,
  Chip,
  Stack,
} from '@mui/material';
import { useState, useCallback } from 'react';
import { exportToJSON, exportToMarkdown, generateDownloadBlob, downloadFile } from '../../lib/chat/exportUtils';
import { saveExport, shareExport } from '../../lib/api/phase2';
import type { Message } from '../../lib/chat/types';

interface ExportShareDialogProps {
  open: boolean;
  messages: Message[];
  conversationId: string;
  onClose: () => void;
  userId?: string;
}

export function ExportShareDialog({
  open,
  messages,
  conversationId,
  onClose,
  userId,
}: ExportShareDialogProps) {
  const [format, setFormat] = useState<'json' | 'markdown' | 'pdf'>('markdown');
  const [title, setTitle] = useState('Conversation Export');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      let content: string;
      switch (format) {
        case 'json':
          content = exportToJSON(messages, { title, description });
          break;
        case 'markdown':
          content = exportToMarkdown(messages, { title, description });
          break;
        case 'pdf':
          // PDF export would use a library like jsPDF
          // For now, fallback to JSON
          content = exportToJSON(messages, { title, description });
          break;
        default:
          throw new Error('Invalid format');
      }

      const { blob, filename } = generateDownloadBlob(content, format);
      downloadFile(blob, filename);

      // Save to database if userId available
      if (userId) {
        await saveExport(userId, {
          title,
          description,
          format,
          conversationId,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [format, title, description, messages, conversationId, userId]);

  const handleShare = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!userId) {
        setError('Must be logged in to share');
        return;
      }

      // First export to database
      const exportResult = await saveExport(userId, {
        title,
        description,
        format,
        conversationId,
      });

      if (!exportResult.success || !exportResult.data?.id) {
        throw new Error(exportResult.error || 'Failed to create export');
      }

      // Then generate share link
      const shareResult = await shareExport(exportResult.data.id, userId);

      if (!shareResult.success) {
        throw new Error(shareResult.error || 'Failed to generate share link');
      }

      const baseUrl = window.location.origin;
      const link = `${baseUrl}/shared/conversation/${shareResult.data?.share_token}`;
      setShareLink(link);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Share failed';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [userId, title, description, format, conversationId]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Export & Share Conversation</DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            fullWidth
            label="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            disabled={isLoading}
          />

          <TextField
            fullWidth
            label="Description (optional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            multiline
            rows={2}
            disabled={isLoading}
          />

          <Box>
            <FormLabel>Format</FormLabel>
            <RadioGroup value={format} onChange={e => setFormat(e.target.value as 'json' | 'markdown' | 'pdf')}>
              <FormControlLabel value="markdown" control={<Radio />} label="Markdown" />
              <FormControlLabel value="json" control={<Radio />} label="JSON" />
              <FormControlLabel value="pdf" control={<Radio />} label="PDF (download only)" />
            </RadioGroup>
          </Box>

          {shareLink && (
            <Box>
              <Alert severity="success">
                Share link created! Copy and share:
              </Alert>
              <Chip
                label={shareLink}
                onDelete={() => {
                  navigator.clipboard.writeText(shareLink);
                }}
                sx={{ mt: 1 }}
              />
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          onClick={handleShare}
          disabled={isLoading || !userId}
          variant="outlined"
        >
          {isLoading ? <CircularProgress size={20} /> : 'Share'}
        </Button>
        <Button
          onClick={handleExport}
          disabled={isLoading}
          variant="contained"
        >
          {isLoading ? <CircularProgress size={20} /> : 'Download'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
