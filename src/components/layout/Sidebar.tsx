import {
  LayoutDashboard,
  FileText,
  Briefcase,
  LogOut,
  Shield,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Logo } from '../common/Logo';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Avatar from '@mui/material/Avatar';
import { alpha, type Theme } from '@mui/material/styles';
import { preloadAdminPage, preloadCRMPage, preloadDashboard, preloadDocumentsPage } from '../../lib/lazyLoader';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar = ({ isOpen, onToggle }: SidebarProps) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const desktopDrawerWidth = isOpen ? 256 : 80;
  const mobileDrawerWidth = 256;

  const preloadForPath = (path: string) => {
    if (path === '/dashboard') void preloadDashboard();
    else if (path === '/documents') void preloadDocumentsPage();
    else if (path === '/crm') void preloadCRMPage();
    else if (path === '/admin') void preloadAdminPage();
  };

  const userLabel = user?.full_name || user?.email || '';
  const userInitials = userLabel
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['user', 'marketing', 'admin'] },
    { id: 'documents', label: 'Resume Editor', icon: FileText, path: '/documents', roles: ['user', 'admin'] },
    { id: 'crm', label: 'Marketing & CRM', icon: Briefcase, path: '/crm', roles: ['user', 'marketing', 'admin'] },
    { id: 'admin', label: 'Admin Panel', icon: Shield, path: '/admin', roles: ['admin'] },
  ];

  const filteredItems = menuItems.filter(item => {
    // Check if the current user's role is in the item's allowed roles
    const userRole = user?.role;
    return item.roles.includes(userRole as string);
  });

  const getIsActive = (path: string) => {
    return location.pathname === path;
  };

  const getNavItemSx = (isActive: boolean, forCollapsed: boolean) => ({
    borderRadius: 2,
    mb: 0.5,
    position: 'relative',
    color: isActive ? 'common.white' : 'grey.300',
    bgcolor: isActive ? (theme: Theme) => alpha(theme.palette.primary.main, 0.22) : 'transparent',
    '&::before': {
      content: '""',
      position: 'absolute',
      left: 0,
      top: 8,
      bottom: 8,
      width: 3,
      borderRadius: 999,
      bgcolor: isActive ? 'primary.main' : 'transparent',
    },
    '&:hover': {
      bgcolor: (theme: Theme) => alpha(theme.palette.primary.main, isActive ? 0.28 : 0.14),
      color: 'common.white',
    },
    '&.Mui-selected': {
      bgcolor: (theme: Theme) => alpha(theme.palette.primary.main, 0.22),
    },
    '&.Mui-selected:hover': {
      bgcolor: (theme: Theme) => alpha(theme.palette.primary.main, 0.28),
    },
    '&.Mui-focusVisible': {
      outline: (theme: Theme) => `2px solid ${alpha(theme.palette.primary.main, 0.55)}`,
      outlineOffset: 2,
    },
    justifyContent: forCollapsed ? 'center' : 'flex-start',
    px: forCollapsed ? 1.5 : 2,
    py: 1.25,
    minHeight: 44,
    transition: (theme: Theme) =>
      theme.transitions.create(['background-color', 'color'], {
        duration: theme.transitions.duration.shorter,
      }),
  });

  return (
    <>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: desktopDrawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: desktopDrawerWidth,
            boxSizing: 'border-box',
            borderRight: 0,
            bgcolor: 'grey.900',
            color: 'common.white',
            transition: (theme) => theme.transitions.create('width', { duration: theme.transitions.duration.standard }),
            overflowX: 'hidden',
            backgroundImage: 'linear-gradient(180deg, rgba(17,24,39,1) 0%, rgba(15,23,42,1) 60%, rgba(2,6,23,1) 100%)',
          },
        }}
      >
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <Box sx={{ 
            width: '100%', 
            position: 'relative',
            px: isOpen ? 2 : 1
          }}>
            {isOpen ? (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ flex: 1 }}>
                  <Logo variant="full" className="w-full" />
                </Box>
                <IconButton
                  onClick={onToggle}
                  aria-label="Collapse sidebar"
                  aria-expanded={true}
                  sx={{
                    bgcolor: 'grey.800',
                    border: 1,
                    borderColor: 'grey.700',
                    '&:hover': { 
                      bgcolor: (theme) => alpha(theme.palette.primary.main, 0.2) 
                    },
                    ml: 1,
                    flexShrink: 0
                  }}
                  size="small"
                >
                  <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                </IconButton>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <Logo variant="icon" className="w-8 h-8" />
                <IconButton
                  onClick={onToggle}
                  aria-label="Expand sidebar"
                  aria-expanded={false}
                  sx={{
                    bgcolor: 'grey.800',
                    border: 1,
                    borderColor: 'grey.700',
                    '&:hover': { 
                      bgcolor: (theme) => alpha(theme.palette.primary.main, 0.2) 
                    }
                  }}
                  size="small"
                >
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </IconButton>
              </Box>
            )}
          </Box>
        </Box>

          <Divider sx={{ borderColor: 'grey.800' }} />

          <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }} component="nav" aria-label="Main navigation">
            <List sx={{ px: 1 }}>
              {filteredItems.map((item) => {
                const Icon = item.icon;
                const isActive = getIsActive(item.path);

                return (
                  <Tooltip
                    key={item.id}
                    title={isOpen ? '' : item.label}
                    placement="right"
                    arrow
                    disableHoverListener={isOpen}
                    disableFocusListener={isOpen}
                    disableTouchListener={isOpen}
                  >
                    <ListItemButton
                      component={Link}
                      to={item.path}
                      selected={isActive}
                      aria-current={isActive ? 'page' : undefined}
                      aria-label={item.label}
                      onMouseEnter={() => preloadForPath(item.path)}
                      onFocus={() => preloadForPath(item.path)}
                      sx={getNavItemSx(isActive, !isOpen)}
                    >
                      <ListItemIcon sx={{ minWidth: 0, mr: isOpen ? 1.5 : 0, color: 'inherit' }}>
                        <Icon className="w-5 h-5" aria-hidden="true" />
                      </ListItemIcon>
                      {isOpen ? (
                        <ListItemText
                          primary={item.label}
                          primaryTypographyProps={{ sx: { fontWeight: 700, color: 'inherit' } }}
                        />
                      ) : null}
                    </ListItemButton>
                  </Tooltip>
                );
              })}
            </List>
          </Box>

          <Divider sx={{ borderColor: 'grey.800' }} />

          <Box sx={{ p: 1.5 }}>
            <Box
              sx={{
                px: isOpen ? 2 : 0,
                py: 1.25,
                bgcolor: isOpen ? 'rgba(255,255,255,0.05)' : 'transparent',
                borderRadius: 2,
                mb: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                justifyContent: isOpen ? 'flex-start' : 'center',
              }}
            >
              <Tooltip title={userLabel} placement="right" arrow disableHoverListener={Boolean(isOpen)}>
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.35),
                    color: 'common.white',
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  {userInitials || 'U'}
                </Avatar>
              </Tooltip>
              {isOpen ? (
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                    {user?.full_name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'grey.400' }} noWrap>
                    {user?.email}
                  </Typography>
                </Box>
              ) : null}
            </Box>

            {isOpen ? (
              <Button
                onClick={() => logout()}
                fullWidth
                variant="text"
                color="inherit"
                startIcon={<LogOut className="w-5 h-5" aria-hidden="true" />}
                aria-label="Sign out"
                sx={{
                  justifyContent: 'flex-start',
                  px: 2,
                  py: 1.25,
                  borderRadius: 2,
                  color: 'grey.300',
                  '&:hover': { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12), color: 'common.white' },
                }}
              >
                Sign Out
              </Button>
            ) : (
              <Tooltip title="Sign Out" placement="right" arrow>
                <IconButton
                  onClick={() => logout()}
                  aria-label="Sign out"
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    color: 'grey.300',
                    '&:hover': { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12), color: 'common.white' },
                  }}
                >
                  <LogOut className="w-5 h-5" aria-hidden="true" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
      </Drawer>

      <Drawer
        variant="temporary"
        open={isOpen}
        onClose={onToggle}
        disableEnforceFocus
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: mobileDrawerWidth,
            boxSizing: 'border-box',
            bgcolor: 'grey.900',
            color: 'common.white',
            backgroundImage: 'linear-gradient(180deg, rgba(17,24,39,1) 0%, rgba(15,23,42,1) 60%, rgba(2,6,23,1) 100%)',
          },
        }}
        role="navigation"
        aria-label="Mobile navigation"
      >
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ p: 2 }}>
            <Logo variant="full" className="w-full" />
            <IconButton onClick={onToggle} aria-label="Close sidebar" aria-expanded>
              <ChevronLeft className="w-5 h-5" aria-hidden="true" />
            </IconButton>
          </Stack>

          <Divider sx={{ borderColor: 'grey.800' }} />

          <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
            <List sx={{ px: 1 }}>
              {filteredItems.map((item) => {
                const Icon = item.icon;
                const isActive = getIsActive(item.path);

                return (
                  <ListItemButton
                    key={item.id}
                    component={Link}
                    to={item.path}
                    onClick={onToggle}
                    selected={isActive}
                    aria-current={isActive ? 'page' : undefined}
                    aria-label={item.label}
                    sx={getNavItemSx(isActive, false)}
                  >
                    <ListItemIcon sx={{ minWidth: 0, mr: 1.5, color: 'inherit' }}>
                      <Icon className="w-5 h-5" aria-hidden="true" />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{ sx: { fontWeight: 700, color: 'inherit' } }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Box>

          <Divider sx={{ borderColor: 'grey.800' }} />

          <Box sx={{ p: 1.5 }}>
            <Box
              sx={{
                px: 2,
                py: 1.25,
                bgcolor: 'rgba(255,255,255,0.05)',
                borderRadius: 2,
                mb: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.35),
                  color: 'common.white',
                  fontWeight: 800,
                  fontSize: 13,
                }}
              >
                {userInitials || 'U'}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>
                  {user?.full_name}
                </Typography>
                <Typography variant="caption" sx={{ color: 'grey.400' }} noWrap>
                  {user?.email}
                </Typography>
              </Box>
            </Box>

            <Button
              onClick={() => {
                logout();
                onToggle();
              }}
              fullWidth
              variant="text"
              color="inherit"
              startIcon={<LogOut className="w-5 h-5" aria-hidden="true" />}
              aria-label="Sign out"
              sx={{
                justifyContent: 'flex-start',
                px: 2,
                py: 1.25,
                borderRadius: 2,
                color: 'grey.300',
                '&:hover': { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12), color: 'common.white' },
              }}
            >
              Sign Out
            </Button>
          </Box>
        </Box>
      </Drawer>
    </>
  );
};
