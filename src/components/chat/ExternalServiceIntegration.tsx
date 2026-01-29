import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Typography,
  Button,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  IconButton,
  FormControlLabel,
  Checkbox,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { getServices, registerService as apiRegisterService, deleteService } from '../../lib/api/phase3';
import {
  createServiceConfig,
  validateServiceConfig,
  SERVICE_TEMPLATES,
  type TriggerEvent,
  type ServiceConfig,
} from '../../lib/chat/integrations/externalServices';
import { useAuth } from '../../hooks/useAuth';

interface ExternalServiceIntegrationProps {
  open: boolean;
  onClose: () => void;
}

export function ExternalServiceIntegration({
  open,
  onClose,
}: ExternalServiceIntegrationProps) {
  const { user } = useAuth();
  const [services, setServices] = useState<ServiceConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [serviceName, setServiceName] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [selectedTriggers, setSelectedTriggers] = useState<TriggerEvent[]>([]);
  const [apiKey, setApiKey] = useState('');

  const TRIGGER_OPTIONS: TriggerEvent[] = [
    'conversation:start',
    'conversation:end',
    'message:sent',
    'message:received',
    'feedback:submitted',
    'training:completed',
    'model:updated',
    'branch:created',
    'export:completed',
  ];

  useEffect(() => {
    if (open && user?.id) {
      loadServices();
    }
  }, [open, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadServices = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await getServices(user!.id);
      if (result.success && result.data) {
        setServices(result.data);
      } else {
        setError(result.error || 'Failed to load services');
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const handleRegisterService = async () => {
    if (!user?.id) {
      setError('User not authenticated');
      return;
    }

    if (!serviceName.trim() || !endpoint.trim()) {
      setError('Service name and endpoint are required');
      return;
    }

    if (selectedTriggers.length === 0) {
      setError('At least one trigger event must be selected');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const service = createServiceConfig(serviceName, '', 'webhook', endpoint, {
        triggers: selectedTriggers,
        authentication: apiKey
          ? {
              type: 'api-key',
              credentials: btoa(apiKey),
              headers: { 'X-API-Key': apiKey },
            }
          : { type: 'none' },
      });

      const validation = validateServiceConfig(service);
      if (!validation.valid) {
        setError(validation.errors.join(', '));
        return;
      }

      const result = await apiRegisterService(user.id, service);
      if (result.success) {
        setServices(prev => [...prev, service]);
        setServiceName('');
        setEndpoint('');
        setApiKey('');
        setSelectedTriggers([]);
        setShowForm(false);
      } else {
        setError(result.error || 'Failed to register service');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!user?.id || !window.confirm('Are you sure you want to delete this service?')) {
      return;
    }

    try {
      const result = await deleteService(user.id, serviceId);
      if (result.success) {
        setServices(prev => prev.filter(s => s.id !== serviceId));
      } else {
        setError(result.error || 'Failed to delete service');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete service');
    }
  };

  const handleUseTemplate = (templateName: string) => {
    const template = SERVICE_TEMPLATES[templateName] as Partial<ServiceConfig> | undefined;
    if (template) {
      setServiceName(template.name || '');
      setSelectedTriggers((template.triggers || []) as TriggerEvent[]);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>External Service Integration</DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={3}>
          {error && <Alert severity="error">{error}</Alert>}

          {isLoading ? (
            <CircularProgress sx={{ mx: 'auto' }} />
          ) : (
            <>
              {/* Service Templates */}
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    Popular Services
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {Object.entries(SERVICE_TEMPLATES).map(([key, template]) => (
                      <Button
                        key={key}
                        onClick={() => handleUseTemplate(key)}
                        variant="outlined"
                        size="small"
                      >
                        {(template as Partial<ServiceConfig> | undefined)?.name}
                      </Button>
                    ))}
                  </Stack>
                </CardContent>
              </Card>

              {/* Add Service Form */}
              {showForm ? (
                <Card>
                  <CardContent>
                    <Stack spacing={2}>
                      <Typography variant="subtitle2">Add New Service</Typography>

                      <TextField
                        label="Service Name"
                        value={serviceName}
                        onChange={e => setServiceName(e.target.value)}
                        fullWidth
                        placeholder="e.g., Slack Notifications"
                      />

                      <TextField
                        label="Webhook URL"
                        value={endpoint}
                        onChange={e => setEndpoint(e.target.value)}
                        fullWidth
                        placeholder="https://example.com/webhook"
                        type="url"
                      />

                      <TextField
                        label="API Key (Optional)"
                        value={apiKey}
                        onChange={e => setApiKey(e.target.value)}
                        fullWidth
                        type="password"
                        placeholder="Your API key for authentication"
                      />

                      <div>
                        <Typography variant="subtitle2" gutterBottom>
                          Trigger Events
                        </Typography>
                        <Stack spacing={1}>
                          {TRIGGER_OPTIONS.map(trigger => (
                            <FormControlLabel
                              key={trigger}
                              control={
                                <Checkbox
                                  checked={selectedTriggers.includes(trigger)}
                                  onChange={e => {
                                    if (e.target.checked) {
                                      setSelectedTriggers(prev => [...prev, trigger]);
                                    } else {
                                      setSelectedTriggers(prev =>
                                        prev.filter(t => t !== trigger)
                                      );
                                    }
                                  }}
                                />
                              }
                              label={trigger}
                            />
                          ))}
                        </Stack>
                      </div>

                      <Stack direction="row" spacing={1}>
                        <Button
                          onClick={handleRegisterService}
                          variant="contained"
                          disabled={!serviceName.trim() || !endpoint.trim()}
                        >
                          Register Service
                        </Button>
                        <Button
                          onClick={() => setShowForm(false)}
                          variant="outlined"
                        >
                          Cancel
                        </Button>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ) : (
                <Button
                  onClick={() => setShowForm(true)}
                  variant="outlined"
                  fullWidth
                >
                  + Add Custom Service
                </Button>
              )}

              {/* Registered Services */}
              {services.length > 0 ? (
                <Card>
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      Registered Services ({services.length})
                    </Typography>
                    <List>
                      {services.map(service => (
                        <ListItem
                          key={service.id}
                          secondaryAction={
                            <IconButton
                              edge="end"
                              onClick={() => handleDeleteService(service.id)}
                              size="small"
                            >
                              <DeleteIcon />
                            </IconButton>
                          }
                        >
                          <ListItemText
                            primary={
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Typography variant="subtitle2">{service.name}</Typography>
                                <Chip
                                  label={service.isActive ? 'Active' : 'Inactive'}
                                  size="small"
                                  color={service.isActive ? 'success' : 'default'}
                                />
                              </Stack>
                            }
                            secondary={
                              <Stack spacing={0.5}>
                                <Typography variant="caption">
                                  {service.endpoint}
                                </Typography>
                                <Stack direction="row" spacing={0.5}>
                                  {service.triggers.slice(0, 3).map((trigger: TriggerEvent) => (
                                    <Chip
                                      key={trigger}
                                      label={trigger}
                                      size="small"
                                      variant="outlined"
                                    />
                                  ))}
                                  {service.triggers.length > 3 && (
                                    <Chip
                                      label={`+${service.triggers.length - 3}`}
                                      size="small"
                                    />
                                  )}
                                </Stack>
                              </Stack>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              ) : (
                <Alert severity="info">
                  No services registered yet. Add one to enable webhooks and integrations.
                </Alert>
              )}
            </>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
