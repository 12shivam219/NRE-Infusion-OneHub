import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext';
import { LogoLoader } from '../components/common/LogoLoader';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';

export const OAuthCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const processOAuthCallback = async () => {
      try {
        // Get the authorization code from URL
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        if (error) {
          throw new Error(`OAuth error: ${error}`);
        }

        if (!code) {
          throw new Error('No authorization code received from Google');
        }

        if (state !== 'gmail-connection') {
          throw new Error('Invalid state parameter');
        }

        if (!user) {
          throw new Error('User not authenticated');
        }

        // Exchange code for token via backend
        const response = await fetch('/api/gmail/exchange-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            redirect_uri: `${window.location.origin}/oauth/callback`,
            userId: user.id,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Failed to exchange token: ${response.status}`);
        }

        const data = await response.json();

        showToast({
          type: 'success',
          title: 'Gmail Connected',
          message: `Successfully connected: ${data.email}`,
        });

        // Redirect back to settings with a small delay to ensure metadata is updated
        setTimeout(() => {
          navigate('/settings');
        }, 1000);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to process OAuth callback';
        console.error('OAuth callback error:', err);
        setError(message);
        showToast({
          type: 'error',
          title: 'Gmail Connection Failed',
          message,
        });

        // Redirect after showing error
        setTimeout(() => {
          navigate('/settings');
        }, 3000);
      } finally {
        setIsProcessing(false);
      }
    };

    processOAuthCallback();
  }, [searchParams, navigate, user, showToast]);

  if (isProcessing) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          backgroundColor: '#FFFFFF',
        }}
      >
        <LogoLoader fullScreen size="lg" showText label="Connecting Gmail..." />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          backgroundColor: '#FFFFFF',
          padding: 2,
        }}
      >
        <Card sx={{ maxWidth: 400 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Gmail Connection Error
            </Typography>
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
            <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
              Redirecting you back to settings...
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#FFFFFF',
      }}
    >
      <LogoLoader fullScreen size="lg" showText label="Finalizing Gmail connection..." />
    </Box>
  );
};
