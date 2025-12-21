import { useState, useCallback } from 'react';
import { X, Plus } from 'lucide-react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import { BrandButton } from '../brand';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CheckIcon from '@mui/icons-material/Check';
import type { SelectChangeEvent } from '@mui/material/Select';

interface QuickAddRequirementProps {
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    company: string;
    description: string;
    timeline: string;
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

export const QuickAddRequirement = ({ onClose, onSubmit }: QuickAddRequirementProps) => {
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    description: '',
    timeline: '2 weeks',
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
          Quick Add Requirement
        </Typography>
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }} aria-label="Close">
          <X className="w-5 h-5" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <form id="quick-add-requirement-form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              <StepIndicator completed={Boolean(formData.title)} />
              <Box sx={{ flex: 1 }}>
                <TextField
                  label="What's the job title?"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Senior Java Developer"
                  size="small"
                  fullWidth
                />
              </Box>
            </Stack>

            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              <StepIndicator completed={Boolean(formData.company)} />
              <Box sx={{ flex: 1 }}>
                <TextField
                  label="Which company?"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder="TechCorp"
                  size="small"
                  fullWidth
                />
              </Box>
            </Stack>

            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              <StepIndicator completed={Boolean(formData.timeline)} />
              <Box sx={{ flex: 1 }}>
                <TextField
                  select
                  label="Timeline?"
                  name="timeline"
                  value={formData.timeline}
                  onChange={handleChange}
                  size="small"
                  fullWidth
                >
                  <MenuItem value="ASAP">ASAP</MenuItem>
                  <MenuItem value="1 week">1 week</MenuItem>
                  <MenuItem value="2 weeks">2 weeks</MenuItem>
                  <MenuItem value="1 month">1 month</MenuItem>
                  <MenuItem value="2 months">2 months</MenuItem>
                </TextField>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              <StepIndicator completed={Boolean(formData.description)} />
              <Box sx={{ flex: 1 }}>
                <TextField
                  label="Any special requirements?"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Optional"
                  size="small"
                  fullWidth
                />
              </Box>
            </Stack>
          </Stack>
        </form>
      </DialogContent>

      <DialogActions>
        <BrandButton type="submit" form="quick-add-requirement-form" variant="primary" size="md">
          <Plus className="w-4 h-4 mr-2" />
          Add to List
        </BrandButton>
        <BrandButton type="button" variant="secondary" size="md" onClick={onClose}>
          Cancel
        </BrandButton>
      </DialogActions>
    </Dialog>
  );
};
