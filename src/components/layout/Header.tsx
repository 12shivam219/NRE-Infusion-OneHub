import { useState, useCallback, memo } from 'react';
import { Bell, Menu as MenuIcon, Mail as MailIcon, Moon, Sun } from 'lucide-react';
import SyncControls from '../common/SyncControls';
import { CreateDropdown } from '../common/CreateDropdown';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { useThemeMode } from '../../hooks/useThemeMode';
import { useThemeSync } from '../../contexts/ThemeSyncContext';
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
import { Logo } from '../common/Logo';

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

export const Header = memo(({ onMenuClick }: HeaderProps) => {
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const { themeMode, toggleThemeMode } = useThemeMode();
  const { pathname } = useLocation();
  const [notificationsAnchorEl, setNotificationsAnchorEl] = useState<HTMLElement | null>(null);
  const { theme } = useThemeSync();
  const accent = theme.accent;
  const accentSoft = theme.accentSoft;
  const accentGlow = theme.accentGlow;

  const title = getPageTitle(pathname);
  const isCRMPage = pathname === '/crm';

  const handleNotificationClick = useCallback((notificationId: string, alreadyRead: boolean) => {
    if (!alreadyRead) {
      void markAsRead(notificationId);
    }
  }, [markAsRead]);

  const handleBulkEmailOpen = useCallback(() => {
    window.dispatchEvent(new CustomEvent('open-bulk-email'));
  }, []);

  const handleToolsClick = useCallback((e: React.MouseEvent<HTMLElement>) => {
    window.dispatchEvent(new CustomEvent('open-requirement-tools', { detail: { target: e.currentTarget } }));
  }, []);

  const handleNotificationsOpen = useCallback((e: React.MouseEvent<HTMLElement>) => {
    setNotificationsAnchorEl(e.currentTarget);
  }, []);

  const handleNotificationsClose = useCallback(() => {
    setNotificationsAnchorEl(null);
  }, []);

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        borderBottom: 1,
        borderColor: theme.headerBorder,
        backgroundImage: theme.headerBackground,
        backdropFilter: 'blur(12px)',
        backgroundColor: 'rgba(9, 12, 18, 0.68)',
        boxShadow: `0 18px 48px ${accentSoft}`,
        transition: 'all 420ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <Toolbar
        sx={{
          px: { xs: 2, sm: 3, md: 4 },
          py: 1,
          minHeight: { xs: 64, sm: 72 },
          transition: 'padding 300ms ease, min-height 300ms ease',
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
          {onMenuClick ? (
            <IconButton
              onClick={onMenuClick}
              aria-label="Toggle menu"
              sx={{
                display: { xs: 'inline-flex', md: 'none' },
                color: 'rgba(255,255,255,0.82)',
                borderRadius: 2,
                backgroundColor: 'rgba(255,255,255,0.05)',
                transition: 'all 320ms ease',
                '&:hover': {
                  color: accent,
                  backgroundColor: accentSoft,
                  boxShadow: `0 16px 36px ${accentGlow}`,
                },
              }}
            >
              <MenuIcon className="w-6 h-6" />
            </IconButton>
          ) : null}

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 1.5, sm: 2.5 },
              minWidth: 0,
              flex: 1,
            }}
          >
            <Box
              sx={{
                display: { xs: 'flex', sm: 'none' },
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Logo variant="icon" style="circular" className="w-10 h-10" animate />
            </Box>
            <Box
              sx={{
                display: { xs: 'none', sm: 'flex' },
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              <Logo
                variant="horizontal"
                style="circular"
                className="w-40"
                showTagline={false}
                animate
              />
            </Box>

            <Box sx={{ minWidth: 0 }}>
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 700,
                lineHeight: 1.1,
                fontFamily: '"Poppins", sans-serif',
                letterSpacing: '-0.015em',
                color: accent,
                fontSize: { xs: '1.125rem', sm: '1.25rem' },
                textShadow: `0 0 18px ${accentGlow}`,
                position: 'relative',
                transition: 'color 320ms ease, text-shadow 320ms ease',
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  bottom: -6,
                  width: '28%',
                  height: '2px',
                  borderRadius: '999px',
                  background: `linear-gradient(90deg, ${accent}, transparent)`
                }
              }} 
              noWrap
            >
              {title}
            </Typography>
            {user && (
              <Typography 
                variant="caption" 
                noWrap 
                sx={{
                  color: 'rgba(255, 255, 255, 0.72)',
                  fontSize: '0.75rem',
                  fontFamily: '"Inter", sans-serif',
                  transition: 'color 320ms ease',
                }}
              >
                Signed in as <Box component="strong" sx={{ color: accent, fontWeight: 600, transition: 'color 320ms ease' }}>{user.full_name}</Box>
              </Typography>
            )}
            </Box>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1.5} alignItems="center">
          {/* CRM Toolbar - only show on /crm */}
          {isCRMPage && (
            <>
              <Button
                variant="outlined"
                color="inherit"
                onClick={handleToolsClick}
                sx={{ 
                  display: { xs: 'none', sm: 'inline-flex' },
                  textTransform: 'none',
                  fontWeight: 600,
                  borderColor: '#FFFFFF',
                  color: '#FFFFFF',
                  fontSize: '0.875rem',
                  fontFamily: '"Inter", sans-serif',
                  '&:hover': {
                    borderColor: '#FFFFFF',
                    backgroundColor: 'rgba(255,255,255,0.12)',
                    boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
                  },
                }}
              >
                Tools
              </Button>

              {/* Create Dropdown Menu */}
              <Box sx={{ display: { xs: 'flex', sm: 'inline-flex' } }}>
                <CreateDropdown
                  items={[
                    {
                      label: 'Create Requirement',
                      onClick: () => window.dispatchEvent(new CustomEvent('open-requirement-form')),
                    },
                    {
                      label: 'Create Interview',
                      onClick: () => window.dispatchEvent(new CustomEvent('open-interview-form')),
                    },
                    {
                      label: 'Create Consultant',
                      onClick: () => window.dispatchEvent(new CustomEvent('open-consultant-form')),
                    },
                  ]}
                />
              </Box>

              <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' }, borderColor: 'rgba(234, 179, 8, 0.1)' }} />
            </>
          )}

          <SyncControls />

          <IconButton
            onClick={handleNotificationsOpen}
            aria-label="Notifications"
            sx={{
              color: '#FFFFFF',
              borderRadius: 2,
              backgroundColor: 'rgba(255,255,255,0.08)',
              transition: 'all 320ms ease',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.16)',
                boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
              },
            }}
          >
            <Badge
              color="warning"
              badgeContent={unreadCount > 9 ? '9+' : unreadCount}
              invisible={unreadCount === 0}
              sx={{
                '& .MuiBadge-badge': {
                  backgroundColor: '#FFFFFF',
                  color: '#11161F',
                  fontWeight: 700,
                },
              }}
            >
              <Bell className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
            </Badge>
          </IconButton>

          <IconButton
            onClick={handleBulkEmailOpen}
            aria-label="Open bulk email composer"
            sx={{
              color: '#FFFFFF',
              borderRadius: 2,
              backgroundColor: 'rgba(255,255,255,0.08)',
              transition: 'all 320ms ease',
              px: { xs: 2.5, sm: 3 },
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.16)',
                boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
              },
              gap: 1,
            }}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' }, fontWeight: 600, fontSize: '0.875rem' }}>
              Bulk Email
            </Box>
            <MailIcon className="h-5 w-5" />
          </IconButton>

          <IconButton
            onClick={toggleThemeMode}
            aria-label="Toggle theme"
            sx={{
              color: '#FFFFFF',
              borderRadius: 2,
              backgroundColor: 'rgba(255,255,255,0.08)',
              transition: 'all 320ms ease',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.16)',
                boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
              },
            }}
          >
            {themeMode === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </IconButton>

          <CreateDropdown
            items={[
              {
                label: 'Create Task',
                onClick: () => window.dispatchEvent(new CustomEvent('open-requirement-form')),
              },
              {
                label: 'Bulk Email',
                onClick: () => window.dispatchEvent(new CustomEvent('open-bulk-email')),
              },
            ]}
          />

          <Menu
            anchorEl={notificationsAnchorEl}
            open={Boolean(notificationsAnchorEl)}
            onClose={handleNotificationsClose}
            PaperProps={{
              sx: {
                width: 360,
                maxWidth: 'calc(100vw - 2rem)',
                backgroundColor: '#161B22',
                backgroundImage: 'linear-gradient(135deg, #161B22 0%, #0D1117 100%)',
                border: '1px solid rgba(234, 179, 8, 0.1)',
                borderRadius: '1rem',
                boxShadow: `0 0 30px ${accentGlow}`,
              },
            }}
          >
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 700,
                  fontFamily: '"Poppins", sans-serif',
                  color: '#FFFFFF',
                  letterSpacing: '-0.02em',
                }}
              >
                Notifications
              </Typography>
            </Box>
            <Divider sx={{ borderColor: 'rgba(234, 179, 8, 0.1)' }} />

            {notifications.length === 0 ? (
              <Box sx={{ px: 2, py: 2 }}>
                <Typography
                  variant="body2"
                  sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                >
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
                    bgcolor: !notification.read ? accentSoft : undefined,
                    '&:hover': {
                      backgroundColor: accentSoft,
                      filter: 'brightness(1.05)',
                    },
                    transition: 'all 200ms ease',
                  }}
                  aria-label={`Notification: ${notification.title}`}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          fontFamily: '"Poppins", sans-serif',
                          color: '#FFFFFF',
                        }}
                      >
                        {notification.title}
                      </Typography>
                      {!notification.read && (
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: accent,
                            mt: 0.75,
                            flexShrink: 0,
                            boxShadow: `0 0 12px ${accentGlow}`,
                          }}
                        />
                      )}
                    </Stack>
                    <Typography
                      variant="body2"
                      sx={{
                        mt: 0.5,
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontFamily: '"Inter", sans-serif',
                      }}
                    >
                      {notification.message}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        mt: 0.75,
                        color: 'rgba(255, 255, 255, 0.5)',
                        fontFamily: '"Inter", sans-serif',
                      }}
                    >
                      {new Date(notification.created_at).toLocaleString()}
                    </Typography>
                  </Box>
                </MenuItem>
              ))
            )}
          </Menu>
        </Stack>
      </Toolbar>
    </AppBar>
  );
});

Header.displayName = 'Header';
