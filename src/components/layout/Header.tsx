import { useState } from 'react';
import { Bell, Menu as MenuIcon, Mail as MailIcon, Moon, Sun } from 'lucide-react';
import SyncControls from '../common/SyncControls';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { useThemeMode } from '../../hooks/useThemeMode';
import { Logo } from '../common/Logo';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Badge from '@mui/material/Badge';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';

interface HeaderProps {
  onMenuClick?: () => void;
}

const getPageTitle = (pathname: string) => {
  switch (pathname) {
    case '/documents':
      return 'Resume Editor';
    case '/crm':
      return 'Marketing & CRM';
    case '/admin':
      return 'Admin Panel';
    case '/dashboard':
    case '/':
    default:
      return 'Dashboard';
  }
};

export const Header = ({ onMenuClick }: HeaderProps) => {
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const { themeMode, toggleThemeMode } = useThemeMode();
  const { pathname } = useLocation();
  const [notificationsAnchorEl, setNotificationsAnchorEl] = useState<HTMLElement | null>(null);

  const title = getPageTitle(pathname);

  const handleNotificationClick = (notificationId: string, alreadyRead: boolean) => {
    if (!alreadyRead) {
      void markAsRead(notificationId);
    }
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        borderBottom: 1,
        backgroundImage: 'none',
        borderColor: 'divider',
      }}
    >
      <Toolbar sx={{ px: { xs: 2, sm: 3, md: 4 }, py: 1, minHeight: { xs: 64, sm: 72 } }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            <Logo variant="icon" className="w-8 h-8" />
          </Box>
          <IconButton
            onClick={onMenuClick}
            aria-label="Toggle menu"
            sx={{ display: { xs: 'inline-flex', md: 'none' } }}
          >
            <MenuIcon className="w-6 h-6" />
          </IconButton>

          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.1 }} noWrap>
              {title}
            </Typography>
            {user && (
              <Typography variant="caption" noWrap color="text.secondary">
                Signed in as <Box component="strong" sx={{ color: 'text.primary' }}>{user.full_name}</Box>
              </Typography>
            )}
          </Box>
        </Stack>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <SyncControls />

          <IconButton
            onClick={toggleThemeMode}
            aria-label={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={themeMode === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {themeMode === 'dark' ? (
              <Sun className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
            ) : (
              <Moon className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
            )}
          </IconButton>

          <Divider orientation="vertical" flexItem />

          <Button
            onClick={() => window.dispatchEvent(new CustomEvent('open-bulk-email'))}
            variant="text"
            startIcon={<MailIcon className="w-5 h-5" />}
            aria-label="Send bulk emails"
            title="Send bulk emails to multiple recipients"
            sx={{
              minWidth: 0,
              px: { xs: 1, sm: 1.5 },
              '& .MuiButton-startIcon': { mr: { xs: 0, sm: 1 } },
            }}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
              Bulk Email
            </Box>
          </Button>

          <Box>
            <IconButton
              onClick={(e) => {
                if (notificationsAnchorEl) setNotificationsAnchorEl(null);
                else setNotificationsAnchorEl(e.currentTarget);
              }}
              aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
              aria-haspopup="true"
              aria-expanded={Boolean(notificationsAnchorEl)}
            >
              <Badge badgeContent={unreadCount > 9 ? '9+' : unreadCount} color="primary" invisible={unreadCount === 0}>
                <Bell className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
              </Badge>
            </IconButton>

            <Menu
              anchorEl={notificationsAnchorEl}
              open={Boolean(notificationsAnchorEl)}
              onClose={() => {
                setNotificationsAnchorEl(null);
              }}
              slotProps={{
                paper: {
                  sx: {
                    width: 360,
                    maxWidth: 'calc(100vw - 2rem)',
                  },
                },
              }}
            >
              <Box sx={{ px: 2, py: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Notifications
                </Typography>
              </Box>
              <Divider />

              {notifications.length === 0 ? (
                <Box sx={{ px: 2, py: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    No notifications
                  </Typography>
                </Box>
              ) : (
                notifications.slice(0, 5).map((notification) => (
                  <MenuItem
                    key={notification.id}
                    onClick={() => {
                      handleNotificationClick(notification.id, notification.read);
                      setNotificationsAnchorEl(null);
                    }}
                    sx={{
                      alignItems: 'flex-start',
                      whiteSpace: 'normal',
                      py: 1.5,
                      bgcolor: !notification.read ? 'rgba(212,175,55,0.10)' : undefined,
                    }}
                    aria-label={`Notification: ${notification.title}`}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {notification.title}
                        </Typography>
                        {!notification.read && (
                          <Box
                            sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', mt: 0.75, flexShrink: 0 }}
                          />
                        )}
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {notification.message}
                      </Typography>
                      <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.75 }}>
                        {new Date(notification.created_at).toLocaleString()}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))
              )}
            </Menu>
          </Box>
        </Stack>
      </Toolbar>
    </AppBar>
  );
};
