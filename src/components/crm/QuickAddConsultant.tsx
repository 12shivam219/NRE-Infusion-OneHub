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

interface QuickAddConsultantProps {
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    email: string;
    phone: string;
    status: string;
    skills: string;
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

export const QuickAddConsultant = ({ onClose, onSubmit }: QuickAddConsultantProps) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    status: 'Active',
    skills: '',
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
      <DialogTitle sx={{ pr: 7, fontWeight: 500 }}>
        Add to Team
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }} aria-label="Close">
          <X className="w-5 h-5" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <form id="quick-add-consultant-form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              <StepIndicator completed={Boolean(formData.name)} />
              <Box sx={{ flex: 1 }}>
                <TextField
                  label="What's their name?"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Michael Johnson"
                  size="small"
                  fullWidth
                />
              </Box>
            </Stack>

            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              <StepIndicator completed={Boolean(formData.email)} />
              <Box sx={{ flex: 1 }}>
                <TextField
                  label="Email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="michael@email.com"
                  size="small"
                  fullWidth
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="Phone"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="555-0123"
                  size="small"
                  fullWidth
                />
              </Box>
            </Stack>

            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              <StepIndicator completed={Boolean(formData.status)} />
              <Box sx={{ flex: 1 }}>
                <TextField
                  select
                  label="Current status?"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  size="small"
                  fullWidth
                >
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Not Active">Not Active</MenuItem>
                  <MenuItem value="Recently Placed">Recently Placed</MenuItem>
                </TextField>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              <StepIndicator completed={Boolean(formData.skills)} />
              <Box sx={{ flex: 1 }}>
                <TextField
                  label="Key skill area?"
                  name="skills"
                  value={formData.skills}
                  onChange={handleChange}
                  placeholder="Full-Stack Developer"
                  size="small"
                  fullWidth
                />
              </Box>
            </Stack>
          </Stack>
        </form>
      </DialogContent>

      <DialogActions>
        <Button type="submit" form="quick-add-consultant-form" variant="contained" startIcon={<Plus className="w-4 h-4" />}>
          Add to Team
        </Button>
        <Button type="button" variant="outlined" color="inherit" onClick={onClose}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};
