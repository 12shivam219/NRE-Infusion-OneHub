import { useState } from 'react';
import { Mail, User, Shield, Settings as SettingsIcon } from 'lucide-react';
import { EmailConnections } from '../components/settings/EmailConnections';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';

type SettingsTab = 'email' | 'profile' | 'security' | 'preferences';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('email');

  const tabs: Array<{ id: SettingsTab; label: string; icon: React.ReactNode; description: string }> = [
    {
      id: 'email',
      label: 'Email Connections',
      icon: <Mail size={20} />,
      description: 'Manage Gmail and email accounts',
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: <User size={20} />,
      description: 'Update your profile information',
    },
    {
      id: 'security',
      label: 'Security',
      icon: <Shield size={20} />,
      description: 'Manage passwords and sessions',
    },
    {
      id: 'preferences',
      label: 'Preferences',
      icon: <SettingsIcon size={20} />,
      description: 'Customize your experience',
    },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'email':
        return <EmailConnections />;
      case 'profile':
        return (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h6" color="textSecondary">
              Profile settings coming soon
            </Typography>
          </Box>
        );
      case 'security':
        return (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h6" color="textSecondary">
              Security settings coming soon
            </Typography>
          </Box>
        );
      case 'preferences':
        return (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h6" color="textSecondary">
              Preference settings coming soon
            </Typography>
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '250px 1fr' }, gap: 3 }}>
        {/* Sidebar Navigation */}
        <Paper sx={{ height: 'fit-content', position: 'sticky', top: 80 }}>
          <List sx={{ py: 1 }}>
            {tabs.map((tab) => (
              <div key={tab.id}>
                <ListItem
                  onClick={() => setActiveTab(tab.id)}
                  component="div"
                  sx={{
                    cursor: 'pointer',
                    backgroundColor: activeTab === tab.id ? '#F3F4F6' : 'transparent',
                    borderLeft: activeTab === tab.id ? '3px solid #2563EB' : '3px solid transparent',
                    '&:hover': {
                      backgroundColor: '#F9FAFB',
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: activeTab === tab.id ? '#2563EB' : '#6B7280', minWidth: 40 }}>
                    {tab.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={<Typography sx={{ fontWeight: activeTab === tab.id ? 600 : 500 }}>{tab.label}</Typography>}
                    secondary={<Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{tab.description}</Typography>}
                  />
                </ListItem>
                {tab.id !== tabs[tabs.length - 1].id && <Divider />}
              </div>
            ))}
          </List>
        </Paper>

        {/* Main Content */}
        <Box sx={{ minHeight: '500px' }}>
          {renderContent()}
        </Box>
      </Box>
    </Container>
  );
};

export default SettingsPage;
