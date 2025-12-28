import { useState } from 'react';
import {
  Stack,
  Paper,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material';
import { Plus, Trash2, Edit2, Check } from 'lucide-react';

export interface EmailSignature {
  id: string;
  name: string;
  content: string;
  isDefault: boolean;
  createdAt: string;
}

interface SignatureManagerProps {
  signatures: EmailSignature[];
  onSignaturesChange: (signatures: EmailSignature[]) => void;
  onSignatureSelect?: (signature: EmailSignature) => void;
  disabled?: boolean;
}

export const SignatureManager = ({
  signatures,
  onSignaturesChange,
  onSignatureSelect,
  disabled = false,
}: SignatureManagerProps) => {
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    content: '',
  });

  // Open dialog for new signature
  const handleNew = () => {
    setEditingId(null);
    setFormData({ name: '', content: '' });
    setShowDialog(true);
  };

  // Open dialog for editing
  const handleEdit = (signature: EmailSignature) => {
    setEditingId(signature.id);
    setFormData({ name: signature.name, content: signature.content });
    setShowDialog(true);
  };

  // Save signature
  const handleSave = () => {
    if (!formData.name.trim() || !formData.content.trim()) {
      return;
    }

    if (editingId) {
      // Update existing
      onSignaturesChange(
        signatures.map(s =>
          s.id === editingId
            ? { ...s, name: formData.name, content: formData.content }
            : s
        )
      );
    } else {
      // Create new
      const newSignature: EmailSignature = {
        id: `sig-${Date.now()}`,
        name: formData.name,
        content: formData.content,
        isDefault: signatures.length === 0,
        createdAt: new Date().toISOString(),
      };
      onSignaturesChange([...signatures, newSignature]);
    }

    setShowDialog(false);
    setFormData({ name: '', content: '' });
  };

  // Delete signature
  const handleDelete = (id: string) => {
    const updated = signatures.filter(s => s.id !== id);
    
    // If deleted signature was default, set first remaining as default
    if (signatures.find(s => s.id === id)?.isDefault && updated.length > 0) {
      updated[0].isDefault = true;
    }

    onSignaturesChange(updated);
  };

  // Set as default
  const handleSetDefault = (id: string) => {
    onSignaturesChange(
      signatures.map(s => ({
        ...s,
        isDefault: s.id === id,
      }))
    );
  };

  // Insert signature
  const handleInsert = (signature: EmailSignature) => {
    if (onSignatureSelect) {
      onSignatureSelect(signature);
    }
  };

  return (
    <>
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          bgcolor: 'background.paper',
          borderColor: 'rgba(234,179,8,0.20)',
        }}
      >
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Email Signatures
            </Typography>
            <Button
              size="small"
              variant="contained"
              startIcon={<Plus className="w-4 h-4" />}
              onClick={handleNew}
              disabled={disabled}
            >
              New
            </Button>
          </Stack>

          {signatures.length === 0 ? (
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
              No signatures yet. Create one to add to emails.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {signatures.map(signature => (
                <Paper
                  key={signature.id}
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    bgcolor: 'rgba(234,179,8,0.02)',
                    borderColor: 'rgba(234,179,8,0.1)',
                  }}
                >
                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between" alignItems="start">
                      <Stack>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {signature.name}
                          </Typography>
                          {signature.isDefault && (
                            <Chip
                              label="Default"
                              size="small"
                              variant="outlined"
                              icon={<Check className="w-3 h-3" />}
                              sx={{
                                bgcolor: 'rgba(34,197,94,0.1)',
                                borderColor: 'rgba(34,197,94,0.3)',
                              }}
                            />
                          )}
                        </Stack>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}
                        >
                          {signature.content.substring(0, 100)}
                          {signature.content.length > 100 ? '...' : ''}
                        </Typography>
                      </Stack>

                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Use in email">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleInsert(signature)}
                            disabled={disabled}
                          >
                            Insert
                          </Button>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(signature)}
                            disabled={disabled}
                          >
                            <Edit2 className="w-4 h-4" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(signature.id)}
                            disabled={disabled}
                          >
                            <Trash2 className="w-4 h-4" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>

                    {!signature.isDefault && (
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => handleSetDefault(signature.id)}
                        disabled={disabled}
                      >
                        Set as Default
                      </Button>
                    )}
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Stack>
      </Paper>

      {/* Dialog */}
      <Dialog open={showDialog} onClose={() => setShowDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingId ? 'Edit Signature' : 'Create New Signature'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Signature Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Professional, Formal, Casual"
              fullWidth
              size="small"
              error={!formData.name.trim() && formData.content.trim() !== ''}
              helperText={!formData.name.trim() && formData.content.trim() !== '' ? 'Name is required' : ''}
            />

            <TextField
              label="Signature Content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder={`Best regards,
John Doe
john@example.com
(555) 123-4567`}
              multiline
              minRows={6}
              fullWidth
              size="small"
              error={!formData.content.trim() && formData.name.trim() !== ''}
              helperText={!formData.content.trim() && formData.name.trim() !== '' ? 'Content is required' : 'Use markdown for formatting'}
            />

            {/* Preview */}
            {formData.content && (
              <Paper
                sx={{
                  p: 1.5,
                  bgcolor: 'rgba(234,179,8,0.05)',
                  borderColor: 'rgba(234,179,8,0.2)',
                  border: '1px solid',
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Preview
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    whiteSpace: 'pre-wrap',
                    display: 'block',
                    mt: 0.5,
                    color: 'text.secondary',
                  }}
                >
                  {formData.content}
                </Typography>
              </Paper>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!formData.name.trim() || !formData.content.trim()}
          >
            {editingId ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
