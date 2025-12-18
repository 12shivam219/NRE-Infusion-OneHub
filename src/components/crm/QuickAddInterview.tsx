import { useState, useCallback } from 'react';
import { X, Plus } from 'lucide-react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CheckIcon from '@mui/icons-material/Check';
import type { SelectChangeEvent } from '@mui/material/Select';

interface QuickAddInterviewProps {
  onClose: () => void;
  onSubmit: (data: {
    requirementId: string;
    consultantName: string;
    dateTime: string;
    mode: string;
    interviewer: string;
  }) => void;
}

const StepIndicator = ({ completed }: { completed: boolean }) => (
  <Box
    aria-hidden="true"
    sx={{
      width: 20,
      height: 20,
      borderRadius: 1,
      border: '1px solid',
      borderColor: completed ? 'primary.main' : 'divider',
      bgcolor: completed ? 'primary.main' : 'transparent',
      display: 'grid',
      placeItems: 'center',
      color: completed ? 'common.white' : 'transparent',
      flexShrink: 0,
    }}
  >
    <CheckIcon sx={{ fontSize: 16 }} />
  </Box>
);

export const QuickAddInterview = ({ onClose, onSubmit }: QuickAddInterviewProps) => {
  const [formData, setFormData] = useState({
    requirementId: '',
    consultantName: '',
    dateTime: '',
    mode: 'phone',
    interviewer: '',
  });

  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>
  ) => {
    const { name, value } = e.target as { name: string; value: string };
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pr: 7 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Schedule Interview
        </Typography>
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }} aria-label="Close">
          <X className="w-5 h-5" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <form id="quick-add-interview-form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              <StepIndicator completed={Boolean(formData.requirementId)} />
              <Box sx={{ flex: 1 }}>
                <TextField
                  label="Which requirement?"
                  name="requirementId"
                  value={formData.requirementId}
                  onChange={handleChange}
                  placeholder="Senior Java Developer - TechCorp"
                  size="small"
                  fullWidth
                />
              </Box>
            </Stack>

            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              <StepIndicator completed={Boolean(formData.consultantName)} />
              <Box sx={{ flex: 1 }}>
                <TextField
                  label="Which consultant?"
                  name="consultantName"
                  value={formData.consultantName}
                  onChange={handleChange}
                  placeholder="Sarah Chen"
                  size="small"
                  fullWidth
                />
              </Box>
            </Stack>

            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              <StepIndicator completed={Boolean(formData.dateTime)} />
              <Box sx={{ flex: 1 }}>
                <TextField
                  label="When? (date & time)"
                  type="datetime-local"
                  name="dateTime"
                  value={formData.dateTime}
                  onChange={handleChange}
                  size="small"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
            </Stack>

            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              <StepIndicator completed={Boolean(formData.mode)} />
              <Box sx={{ flex: 1 }}>
                <TextField
                  select
                  label="How are we meeting?"
                  name="mode"
                  value={formData.mode}
                  onChange={handleChange}
                  size="small"
                  fullWidth
                >
                  <MenuItem value="phone">Phone Call</MenuItem>
                  <MenuItem value="video">Video Call</MenuItem>
                  <MenuItem value="inperson">In-Person</MenuItem>
                </TextField>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              <StepIndicator completed={Boolean(formData.interviewer)} />
              <Box sx={{ flex: 1 }}>
                <TextField
                  label="Who's interviewing?"
                  name="interviewer"
                  value={formData.interviewer}
                  onChange={handleChange}
                  placeholder="John Smith"
                  size="small"
                  fullWidth
                />
              </Box>
            </Stack>
          </Stack>
        </form>
      </DialogContent>

      <DialogActions>
        <Button type="submit" form="quick-add-interview-form" variant="contained" startIcon={<Plus className="w-4 h-4" />}>
          Schedule
        </Button>
        <Button type="button" variant="outlined" color="inherit" onClick={onClose}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};
