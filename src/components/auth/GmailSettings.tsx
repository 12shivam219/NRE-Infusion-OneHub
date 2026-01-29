import { useState, useCallback, useEffect } from 'react';
import { Mail, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../lib/supabase';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';

interface GmailSettingsProps {
  open: boolean;
  onClose: () => void;
}

export const GmailSettings = ({ open, onClose }: GmailSettingsProps) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  const checkGmailStatus = useCallback(async () => {
    try {
      setIsCheckingStatus(true);
      const { data } = await supabase.auth.getUser();
      if (data.user?.user_metadata?.gmail_connected) {
        setIsConnected(true);
      } else {
        setIsConnected(false);
      }
    } catch (error) {
      console.error('Error checking Gmail status:', error);
      setIsConnected(false);
    } finally {
      setIsCheckingStatus(false);
    }
  }, []);

  // Check if Gmail is already connected
  useEffect(() => {
    if (open && user) {
      checkGmailStatus();
    }
  }, [open, user, checkGmailStatus]);

  const handleConnectGmail = useCallback(() => {
    try {
      setIsLoading(true);
      // Get Google OAuth URL from your backend or use this direct approach
      const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      const redirectUri = `${window.location.origin}/oauth/callback`;

      if (!googleClientId) {
        showToast({
          type: 'error',
          message: 'Google OAuth is not configured. Please contact support.',
        });
        return;
      }

      const googleOAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      googleOAuthUrl.searchParams.append('client_id', googleClientId);
      googleOAuthUrl.searchParams.append('redirect_uri', redirectUri);
      googleOAuthUrl.searchParams.append('response_type', 'code');
      googleOAuthUrl.searchParams.append('scope', 'https://www.googleapis.com/auth/gmail.readonly');
      googleOAuthUrl.searchParams.append('access_type', 'offline');
      googleOAuthUrl.searchParams.append('prompt', 'consent');
      googleOAuthUrl.searchParams.append('state', 'gmail-connection');

      // Redirect to Google OAuth
      window.location.href = googleOAuthUrl.toString();
    } catch (error) {
      console.error('Error connecting Gmail:', error);
      showToast({
        type: 'error',
        message: 'Failed to initiate Gmail connection',
      });
      setIsLoading(false);
    }
  }, [showToast]);

  const handleDisconnectGmail = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Update user metadata to remove Gmail connection
      const { error } = await supabase.auth.updateUser({
        data: {
          gmail_connected: false,
          gmail_refresh_token: null,
        },
      });

      if (error) throw error;

      setIsConnected(false);
      showToast({
        type: 'success',
        message: 'Gmail disconnected successfully',
      });
    } catch (error) {
      console.error('Error disconnecting Gmail:', error);
      showToast({
        type: 'error',
        message: 'Failed to disconnect Gmail',
      });
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  if (isCheckingStatus) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Gmail Settings</DialogTitle>
        <DialogContent sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>Gmail - Job Posting Scanner</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ py: 2 }}>
          {/* Purpose Notice */}
          <Box
            sx={{
              p: 2,
              backgroundColor: '#EFF6FF',
              borderRadius: '6px',
              border: '1px solid #BFDBFE',
            }}
          >
            <Typography sx={{ fontSize: '0.85rem', color: '#1E40AF', lineHeight: 1.5 }}>
              <strong>Purpose:</strong> Connect your Gmail to automatically scan incoming emails and extract job posting information for your job requirements.
            </Typography>
          </Box>

          {/* Status Card */}
          <Box
            sx={{
              p: 2.5,
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              backgroundColor: isConnected ? '#F0FDF4' : '#FEF2F2',
            }}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              {isConnected ? (
                <>
                  <CheckCircle size={24} color="#16A34A" />
                  <Box>
                    <Typography sx={{ fontWeight: 600, color: '#16A34A' }}>
                      Gmail Connected
                    </Typography>
                    <Typography sx={{ fontSize: '0.875rem', color: '#6B7280', mt: 0.25 }}>
                      Auto-scanning emails for job postings
                    </Typography>
                  </Box>
                </>
              ) : (
                <>
                  <AlertCircle size={24} color="#DC2626" />
                  <Box>
                    <Typography sx={{ fontWeight: 600, color: '#DC2626' }}>
                      Gmail Not Connected
                    </Typography>
                    <Typography sx={{ fontSize: '0.875rem', color: '#6B7280', mt: 0.25 }}>
                      Connect Gmail to auto-scan for job postings
                    </Typography>
                  </Box>
                </>
              )}
            </Stack>
          </Box>

          {/* Features List */}
          <Box>
            <Typography sx={{ fontWeight: 600, mb: 1.5, color: '#1F2937' }}>
              When connected, the system will:
            </Typography>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                <Mail size={18} color="#2563EB" style={{ marginTop: '2px', flexShrink: 0 }} />
                <Typography sx={{ fontSize: '0.875rem', color: '#6B7280' }}>
                  Scan your emails for job postings
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                <Mail size={18} color="#2563EB" style={{ marginTop: '2px', flexShrink: 0 }} />
                <Typography sx={{ fontSize: '0.875rem', color: '#6B7280' }}>
                  Extract job details automatically
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                <Mail size={18} color="#2563EB" style={{ marginTop: '2px', flexShrink: 0 }} />
                <Typography sx={{ fontSize: '0.875rem', color: '#6B7280' }}>
                  Pre-fill job requirement forms
                </Typography>
              </Stack>
            </Stack>
          </Box>

          {/* Privacy Notice */}
          <Box
            sx={{
              p: 2,
              backgroundColor: '#F3F4F6',
              borderRadius: '6px',
              border: '1px solid #D1D5DB',
            }}
          >
            <Typography sx={{ fontSize: '0.75rem', color: '#6B7280', lineHeight: 1.5 }}>
              <strong>Privacy:</strong> Your emails are processed on secure servers. We only read email metadata and content related to job postings. Your Gmail credentials are not stored on our servers.
            </Typography>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        {isConnected ? (
          <>
            <Button onClick={onClose} color="inherit">
              Close
            </Button>
            <Button
              onClick={handleDisconnectGmail}
              disabled={isLoading}
              variant="outlined"
              color="error"
              startIcon={isLoading ? <CircularProgress size={20} /> : <Trash2 size={18} />}
            >
              {isLoading ? 'Disconnecting...' : 'Disconnect Gmail'}
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onClose} color="inherit">
              Cancel
            </Button>
            <Button
              onClick={handleConnectGmail}
              disabled={isLoading}
              variant="contained"
              color="primary"
              startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <Mail size={18} />}
            >
              {isLoading ? 'Connecting...' : 'Connect Gmail'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default GmailSettings;
