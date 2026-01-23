import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Stack,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import { DEFAULT_MODELS, type FinetuneConfig, compareModels } from '../../lib/chat/finetuning';
import { getModels } from '../../lib/api/phase3';
import { useAuth } from '../../hooks/useAuth';

interface ModelSelectorProps {
  open: boolean;
  onClose: () => void;
  onModelSelect: (model: FinetuneConfig) => void;
  currentModelId?: string;
}

export function ModelSelector({
  open,
  onClose,
  onModelSelect,
}: ModelSelectorProps) {
  const { user } = useAuth();
  const [models, setModels] = useState<FinetuneConfig[]>(DEFAULT_MODELS);
  const [selectedModel, setSelectedModel] = useState<FinetuneConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && user?.id) {
      loadModels();
    }
  }, [open, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadModels = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await getModels(user!.id);
      if (result.success && result.data) {
        setModels([...DEFAULT_MODELS, ...result.data]);
      } else {
        setError(result.error || 'Failed to load models');
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const handleModelSelect = (model: FinetuneConfig) => {
    setSelectedModel(model);
  };

  const handleConfirm = () => {
    if (selectedModel) {
      onModelSelect(selectedModel);
      onClose();
    }
  };

  const getModelComparison = () => {
    if (!selectedModel || models.length < 2) return null;
    const otherModel = models.find(m => m.id !== selectedModel.id);
    if (!otherModel) return null;
    return compareModels(selectedModel, otherModel);
  };

  const comparison = getModelComparison();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Select AI Model</DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={3}>
          {error && <Alert severity="error">{error}</Alert>}

          {isLoading ? (
            <CircularProgress sx={{ mx: 'auto' }} />
          ) : (
            <FormControl fullWidth>
              <InputLabel>Available Models</InputLabel>
              <Select
                value={selectedModel?.id || ''}
                onChange={e => {
                  const model = models.find(m => m.id === e.target.value);
                  if (model) handleModelSelect(model);
                }}
                label="Available Models"
              >
                {models.map(model => (
                  <MenuItem key={model.id} value={model.id}>
                    {model.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {selectedModel && (
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <div>
                    <Typography variant="h6">{selectedModel.name}</Typography>
                    <Typography color="textSecondary" variant="body2">
                      {selectedModel.description}
                    </Typography>
                  </div>

                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Chip
                      label={`Accuracy: ${(selectedModel.accuracy * 100).toFixed(1)}%`}
                      size="small"
                    />
                    <Chip label={`Latency: ${selectedModel.latency}ms`} size="small" />
                    <Chip
                      label={`Cost: $${selectedModel.costPerToken.toFixed(6)}/token`}
                      size="small"
                    />
                  </Stack>

                  {selectedModel.trainingMetrics.epochsCompleted > 0 && (
                    <div>
                      <Typography variant="subtitle2">Training Metrics</Typography>
                      <Typography variant="body2">
                        Loss: {selectedModel.trainingMetrics.loss.toFixed(4)} | Validation
                        Accuracy: {(selectedModel.trainingMetrics.validationAccuracy * 100).toFixed(1)}%
                        | Epochs: {selectedModel.trainingMetrics.epochsCompleted}
                      </Typography>
                    </div>
                  )}

                  {comparison && (
                    <div>
                      <Typography variant="subtitle2">Performance Comparison</Typography>
                      <Typography variant="body2">
                        Faster: {comparison.faster} | More Accurate: {comparison.moreAccurate}
                        | Cheaper: {comparison.cheaper}
                      </Typography>
                    </div>
                  )}
                </Stack>
              </CardContent>
            </Card>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={!selectedModel || isLoading}
        >
          Select Model
        </Button>
      </DialogActions>
    </Dialog>
  );
}
