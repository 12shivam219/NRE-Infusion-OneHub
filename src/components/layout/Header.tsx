import { useState, useCallback, memo } from 'react';
import { Bell, Menu as MenuIcon, Moon, Sun, LogOut, ChevronRight, FileText, Bot, LayoutDashboard, Briefcase, MessagesSquare, Users } from 'lucide-react';
import Tooltip from '@mui/material/Tooltip';
import { useSearchParams } from 'react-router-dom';
import SyncStatusBadge from '../common/SyncStatusBadge';
import { CreateDropdown } from '../common/CreateDropdown';
import { useCreateForm } from '../../hooks/useCreateForm';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { useThemeMode } from '../../hooks/useThemeMode';
import { useThemeSync } from '../../contexts/ThemeSyncContext';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Badge from '@mui/material/Badge';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import Avatar from '@mui/material/Avatar';
import { Logo } from '../common/Logo';

interface HeaderProps {
  onMenuClick?: () => void;
}

const getPageTitle = (pathname: string, searchParams?: URLSearchParams) => {
  if (pathname === '/crm' && searchParams) {
    const view = searchParams.get('view');
    switch (view) {
      case 'requirements':
        return 'Requirements';
      case 'interviews':
        return 'Interviews';
      case 'consultants':
        return 'Consultants';
      default:
        return 'Marketing & CRM';
    }
  }

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

const getPageIcon = (pathname: string, searchParams?: URLSearchParams) => {
  if (pathname === '/crm' && searchParams) {
    const view = searchParams.get('view');
    switch (view) {
      case 'requirements':
        return 'briefcase';
      case 'interviews':
        return 'messages-square';
      case 'consultants':
        return 'users';
      default:
        return 'briefcase';
    }
  }

  switch (pathname) {
    case '/documents':
      return 'file-text';
    case '/crm':
      return 'briefcase'; // Requirements is main view in CRM
    case '/admin':
      return 'bot';
    case '/dashboard':
    case '/':
    default:
      return 'layout-dashboard';
  }
};

export const Header = memo(({ onMenuClick }: HeaderProps) => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const { themeMode, toggleThemeMode } = useThemeMode();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const { openCreateForm } = useCreateForm();
  const [notificationsAnchorEl, setNotificationsAnchorEl] = useState<HTMLElement | null>(null);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [userMenuAnchorEl, setUserMenuAnchorEl] = useState<HTMLElement | null>(null);
  const { theme } = useThemeSync();
  const accent = theme.accent;
  const accentSoft = theme.accentSoft;
  const accentGlow = theme.accentGlow;

  const title = getPageTitle(pathname, searchParams);
  const pageIconName = getPageIcon(pathname, searchParams);
  const NOTIFICATIONS_PREVIEW_LIMIT = 5;

  // Helper function to render the appropriate icon
  const renderPageIcon = () => {
    const iconProps = {
      size: 26,
      color: accent,
      strokeWidth: 2,
      style: {
        transition: 'all 320ms ease',
        filter: `drop-shadow(0 0 8px ${accentGlow})`,
      },
    };

    switch (pageIconName) {
      case 'file-text':
        return <FileText {...iconProps} />;
      case 'briefcase':
        return <Briefcase {...iconProps} />;
      case 'messages-square':
        return <MessagesSquare {...iconProps} />;
      case 'users':
        return <Users {...iconProps} />;
      case 'bot':
        return <Bot {...iconProps} />;
      case 'layout-dashboard':
      default:
        return <LayoutDashboard {...iconProps} />;
    }
  };

  // Helper function to get user initials
  const getUserInitials = (fullName: string | undefined) => {
    if (!fullName) return '?';
    return fullName
      .split(' ')
      .map(name => name[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const userInitials = getUserInitials(user?.full_name);

  // Create dropdown handlers - open modals directly
  const handleCreateRequirement = useCallback(() => {
    openCreateForm('requirement');
  }, [openCreateForm]);

  const handleCreateInterview = useCallback(() => {
    openCreateForm('interview');
  }, [openCreateForm]);

  const handleCreateConsultant = useCallback(() => {
    openCreateForm('consultant');
  }, [openCreateForm]);

  const createItems = [
    { label: 'Create Requirement', onClick: handleCreateRequirement },
    { label: 'Create Interview', onClick: handleCreateInterview },
    { label: 'Create Consultant', onClick: handleCreateConsultant },
  ];

  const handleNotificationClick = useCallback((notificationId: string, alreadyRead: boolean) => {
    if (!alreadyRead) {
      void markAsRead(notificationId);
    }
  }, [markAsRead]);

  const handleNotificationsOpen = useCallback((e: React.MouseEvent<HTMLElement>) => {
    setNotificationsAnchorEl(e.currentTarget);
  }, []);

  const handleNotificationsClose = useCallback(() => {
    setNotificationsAnchorEl(null);
  }, []);

  const handleUserMenuOpen = useCallback((e: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchorEl(e.currentTarget);
  }, []);

  const handleUserMenuClose = useCallback(() => {
    setUserMenuAnchorEl(null);
  }, []);

  const handleLogout = useCallback(() => {
    handleUserMenuClose();
    logout();
  }, [handleUserMenuClose, logout]);

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        top: 0,
        zIndex: 100,
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
        {/* Container with max-width for centered layout */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            width: '100%',
            maxWidth: '1440px',
            margin: '0 auto',
            gap: { xs: 1, sm: 2, md: 3 },
            alignItems: 'center',
          }}
        >
          {/* LEFT SECTION: Branding */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 1.5, sm: 2 },
              minWidth: 0,
              flexShrink: 0,
            }}
          >
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

            {/* Logo - Icon on mobile, Horizontal on desktop */}
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

            {/* Vertical Divider */}
            <Divider
              orientation="vertical"
              sx={{
                display: { xs: 'none', sm: 'block' },
                height: 28,
                alignSelf: 'center',
                borderColor: 'rgba(255, 255, 255, 0.12)',
              }}
            />

            {/* Page Title Icon */}
            <Tooltip title={title} arrow placement="bottom">
              <Box
                sx={{
                  minWidth: 0,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 1.25,
                  borderRadius: 2,
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  transition: 'all 320ms ease',
                }}
              >
                {renderPageIcon()}
              </Box>
            </Tooltip>
          </Box>

          {/* RIGHT SECTION: Controls & User Info */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              gap: { xs: 1, sm: 1.5 },
              alignItems: 'center',
              justifyContent: 'flex-end',
              flexShrink: 0,
            }}
          >
            {/* Group A: Sync Status Badge */}
            <SyncStatusBadge />

            {/* Group B: Actions (Create Dropdown & Notifications) */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              {/* Create Dropdown Button */}
              <CreateDropdown
                items={createItems}
                variant="header"
              />

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
            </Box>

            {/* Group C: User & Settings (Theme Toggle, User Info, Logout) */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                paddingLeft: 1.5,
                borderLeft: '1px solid rgba(255, 255, 255, 0.12)',
              }}
            >
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

              {/* User Avatar Button */}
              {user && (
                <IconButton
                  onClick={handleUserMenuOpen}
                  aria-label="User menu"
                  sx={{
                    padding: 0,
                    width: 40,
                    height: 40,
                    transition: 'all 320ms ease',
                    '&:hover': {
                      transform: 'scale(1.05)',
                    },
                  }}
                >
                  <Avatar
                    sx={{
                      width: 40,
                      height: 40,
                      backgroundColor: accent,
                      color: '#11161F',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      boxShadow: `0 0 16px ${accentGlow}`,
                      border: `2px solid ${accentSoft}`,
                      cursor: 'pointer',
                    }}
                  >
                    {userInitials}
                  </Avatar>
                </IconButton>
              )}
            </Box>
          </Box>
        </Box>

        {/* User Menu */}
        {user && (
          <Menu
            anchorEl={userMenuAnchorEl}
            open={Boolean(userMenuAnchorEl)}
            onClose={handleUserMenuClose}
            disableScrollLock={true}
            PaperProps={{
              sx: {
                width: 280,
                backgroundColor: '#161B22',
                backgroundImage: 'linear-gradient(135deg, #161B22 0%, #0D1117 100%)',
                border: '1px solid rgba(234, 179, 8, 0.1)',
                borderRadius: '1rem',
                boxShadow: `0 0 30px ${accentGlow}`,
              },
            }}
          >
            {/* User Info Header */}
            <Box sx={{ px: 2, py: 2 }}>
              <Stack spacing={0.5}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    fontFamily: '"Poppins", sans-serif',
                    color: '#FFFFFF',
                  }}
                >
                  {user.full_name}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontFamily: '"Inter", sans-serif',
                  }}
                >
                  {user.email}
                </Typography>
              </Stack>
            </Box>
            <Divider sx={{ borderColor: 'rgba(234, 179, 8, 0.1)' }} />

            {/* Logout Option */}
            <MenuItem
              onClick={handleLogout}
              sx={{
                py: 1.5,
                '&:hover': {
                  backgroundColor: accentSoft,
                  filter: 'brightness(1.05)',
                },
                transition: 'all 200ms ease',
              }}
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4 mr-2" style={{ color: '#ff6b6b' }} />
              <Typography
                variant="body2"
                sx={{
                  fontFamily: '"Poppins", sans-serif',
                  color: '#ff6b6b',
                  fontWeight: 500,
                }}
              >
                Sign Out
              </Typography>
            </MenuItem>
          </Menu>
        )}
          <Menu
            anchorEl={notificationsAnchorEl}
            open={Boolean(notificationsAnchorEl)}
            onClose={handleNotificationsClose}
            disableScrollLock={true}
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
              <>
                {notifications.slice(0, showAllNotifications ? notifications.length : NOTIFICATIONS_PREVIEW_LIMIT).map((notification) => (
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
              ))}

                {notifications.length > NOTIFICATIONS_PREVIEW_LIMIT && (
                  <>
                    <Divider sx={{ borderColor: 'rgba(234, 179, 8, 0.1)' }} />
                    <MenuItem
                      onClick={() => setShowAllNotifications(!showAllNotifications)}
                      sx={{
                        justifyContent: 'space-between',
                        py: 1.5,
                        '&:hover': {
                          backgroundColor: accentSoft,
                          filter: 'brightness(1.05)',
                        },
                        transition: 'all 200ms ease',
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          fontFamily: '"Poppins", sans-serif',
                          color: accent,
                        }}
                      >
                        {showAllNotifications ? 'Show Less' : `View All (${notifications.length})`}
                      </Typography>
                      <ChevronRight className="w-4 h-4" style={{ color: accent }} />
                    </MenuItem>
                  </>
                )}
              </>
            )}
          </Menu>
      </Toolbar>
    </AppBar>
  );
});

Header.displayName = 'Header';
