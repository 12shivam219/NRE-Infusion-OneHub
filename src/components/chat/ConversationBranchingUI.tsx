import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Typography,
  Button,
  Chip,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Alert,
  CircularProgress,
} from '@mui/material';
import MergeIcon from '@mui/icons-material/Merge';
import { useConversationBranching } from '../../hooks/useConversationBranching';
import { calculateBranchDepth } from '../../lib/chat/conversationBranching';
import type { ConversationBranch } from '../../lib/chat/conversationBranching';

interface ConversationBranchingUIProps {
  conversationId: string;
  open: boolean;
  onClose: () => void;
}

export function ConversationBranchingUI({
  conversationId,
  open,
  onClose,
}: ConversationBranchingUIProps) {
  const {
    branches,
    activeBranchId,
    isLoading,
    error,
    createNewBranch,
    switchBranch,
    mergeBranches,
    reloadBranches,
  } = useConversationBranching(conversationId);

  const [branchName, setBranchName] = useState('');
  const [branchDescription, setBranchDescription] = useState('');
  const [selectedBranchForMerge, setSelectedBranchForMerge] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleCreateBranch = async () => {
    if (!branchName.trim()) {
      alert('Branch name is required');
      return;
    }

    const result = await createNewBranch(branchName, branchDescription);
    if (result.success) {
      setBranchName('');
      setBranchDescription('');
      setShowCreateForm(false);
      reloadBranches();
    } else {
      alert(result.error || 'Failed to create branch');
    }
  };

  const handleMergeBranches = async () => {
    if (!activeBranchId || !selectedBranchForMerge) {
      alert('Please select source and target branches');
      return;
    }

    const result = await mergeBranches(activeBranchId, selectedBranchForMerge);
    if (result.success) {
      alert('Branches merged successfully');
      setSelectedBranchForMerge(null);
      reloadBranches();
    } else {
      alert(result.error || 'Failed to merge branches');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Conversation Branches</DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={3}>
          {error && <Alert severity="error">{error}</Alert>}

          {isLoading ? (
            <CircularProgress sx={{ mx: 'auto' }} />
          ) : (
            <>
              {/* Create Branch Section */}
              <Card>
                <CardContent>
                  {showCreateForm ? (
                    <Stack spacing={2}>
                      <TextField
                        label="Branch Name"
                        value={branchName}
                        onChange={e => setBranchName(e.target.value)}
                        fullWidth
                        placeholder="e.g., Alternative Approach"
                      />
                      <TextField
                        label="Description"
                        value={branchDescription}
                        onChange={e => setBranchDescription(e.target.value)}
                        fullWidth
                        multiline
                        rows={2}
                        placeholder="What makes this branch different?"
                      />
                      <Stack direction="row" spacing={1}>
                        <Button
                          onClick={handleCreateBranch}
                          variant="contained"
                          disabled={!branchName.trim()}
                        >
                          Create Branch
                        </Button>
                        <Button onClick={() => setShowCreateForm(false)} variant="outlined">
                          Cancel
                        </Button>
                      </Stack>
                    </Stack>
                  ) : (
                    <Button
                      onClick={() => setShowCreateForm(true)}
                      variant="outlined"
                      fullWidth
                    >
                      + Create New Branch
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Branches List */}
              {branches.length > 0 ? (
                <Card>
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      Available Branches
                    </Typography>
                    <List>
                      {branches.map((branch: ConversationBranch) => (
                        <ListItem
                          component="li"
                          key={branch.id}
                          onClick={() => switchBranch(branch.id)}
                          sx={{
                            cursor: 'pointer',
                            borderLeft: branch.id === activeBranchId ? 3 : 0,
                            borderColor: 'primary.main',
                            ...(branch.id === activeBranchId && { bgcolor: 'action.selected' }),
                          }}
                        >
                          <ListItemText
                            primary={branch.branchName}
                            secondary={
                              <>
                                {branch.description}
                                <br />
                                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                  <Chip
                                    label={`${branch.messageCount} messages`}
                                    size="small"
                                  />
                                  <Chip
                                    label={`Depth: ${calculateBranchDepth(branch, branches)}`}
                                    size="small"
                                  />
                                </Stack>
                              </>
                            }
                          />
                          <IconButton
                            edge="end"
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedBranchForMerge(branch.id);
                            }}
                            size="small"
                          >
                            <MergeIcon />
                          </IconButton>
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              ) : (
                <Alert severity="info">No branches created yet. Create one to get started!</Alert>
              )}

              {/* Merge Section */}
              {activeBranchId && selectedBranchForMerge && activeBranchId !== selectedBranchForMerge && (
                <Card sx={{ backgroundColor: 'action.hover' }}>
                  <CardContent>
                    <Stack spacing={2}>
                      <Typography variant="subtitle2">Merge Branches</Typography>
                      <Typography variant="body2">
                        Merge{' '}
                        <strong>
                          {branches.find((b: ConversationBranch) => b.id === activeBranchId)?.branchName}
                        </strong>{' '}
                        into{' '}
                        <strong>
                          {branches.find((b: ConversationBranch) => b.id === selectedBranchForMerge)?.branchName}
                        </strong>
                      </Typography>
                      <Stack direction="row" spacing={1}>
                        <Button
                          onClick={handleMergeBranches}
                          variant="contained"
                          color="success"
                          startIcon={<MergeIcon />}
                        >
                          Confirm Merge
                        </Button>
                        <Button
                          onClick={() => setSelectedBranchForMerge(null)}
                          variant="outlined"
                        >
                          Cancel
                        </Button>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
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
