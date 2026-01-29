import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Stack,
  Rating,
  Typography,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import { submitFeedback } from '../../lib/api/phase3';
import { createFeedback, validateFeedback } from '../../lib/chat/ai/aiTraining';
import { useAuth } from '../../hooks/useAuth';
import type { FeedbackType } from '../../lib/chat/ai/aiTraining';

interface FeedbackCollectorProps {
  open: boolean;
  onClose: () => void;
  conversationId: string;
  messageId: string;
  onFeedbackSubmitted?: () => void;
}

export function FeedbackCollector({
  open,
  onClose,
  conversationId,
  messageId,
  onFeedbackSubmitted,
}: FeedbackCollectorProps) {
  const { user } = useAuth();
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('neutral');
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [comment, setComment] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!user?.id) {
      setError('User not authenticated');
      return;
    }

    if (!comment.trim()) {
      setError('Comment is required');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const feedback = createFeedback(
        conversationId,
        messageId,
        user.id,
        feedbackType,
        rating,
        comment,
        { suggestedImprovement: suggestion || undefined }
      );

      const validation = validateFeedback(feedback);
      if (!validation.valid) {
        setError(validation.errors.join(', '));
        return;
      }

      const result = await submitFeedback(user.id, feedback);
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onClose();
          onFeedbackSubmitted?.();
        }, 2000);
      } else {
        setError(result.error || 'Failed to submit feedback');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Share Feedback</DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={3}>
          {error && <Alert severity="error">{error}</Alert>}
          {success && (
            <Alert severity="success">Thank you! Your feedback helps improve the AI.</Alert>
          )}

          {/* Feedback Type */}
          <FormControl fullWidth>
            <InputLabel>Feedback Type</InputLabel>
            <Select
              value={feedbackType}
              onChange={e => setFeedbackType(e.target.value as FeedbackType)}
              label="Feedback Type"
              disabled={isLoading}
            >
              <MenuItem value="positive">Positive / Helpful</MenuItem>
              <MenuItem value="negative">Negative / Unhelpful</MenuItem>
              <MenuItem value="neutral">Neutral</MenuItem>
              <MenuItem value="unclear">Unclear</MenuItem>
              <MenuItem value="inaccurate">Inaccurate</MenuItem>
            </Select>
          </FormControl>

          {/* Rating */}
          <div>
            <Typography component="legend">Rate this response</Typography>
            <Rating
              value={rating}
              onChange={(_e, newValue) => {
                if (newValue) setRating(newValue as 1 | 2 | 3 | 4 | 5);
              }}
              disabled={isLoading}
              size="large"
            />
          </div>

          {/* Comment */}
          <TextField
            label="Comment"
            value={comment}
            onChange={e => setComment(e.target.value)}
            fullWidth
            multiline
            rows={3}
            placeholder="Tell us what could be improved..."
            disabled={isLoading}
            required
            error={!comment.trim() && comment !== ''}
          />

          {/* Suggestion */}
          <TextField
            label="Suggested Improvement"
            value={suggestion}
            onChange={e => setSuggestion(e.target.value)}
            fullWidth
            multiline
            rows={2}
            placeholder="(Optional) How could the AI respond better?"
            disabled={isLoading}
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!comment.trim() || isLoading}
        >
          {isLoading ? <CircularProgress size={24} /> : 'Submit Feedback'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
