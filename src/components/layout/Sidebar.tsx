import {
  LayoutDashboard,
  FileText,
  Briefcase,
  Shield,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  BarChart3,
  Calendar,
  Users,
  Settings,
  User,
} from 'lucide-react';
import { useState, useCallback, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
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
import Tooltip from '@mui/material/Tooltip';
import Avatar from '@mui/material/Avatar';
import Collapse from '@mui/material/Collapse';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Popper from '@mui/material/Popper';
import Paper from '@mui/material/Paper';
import { alpha, type Theme } from '@mui/material/styles';
import { preloadAdminPage, preloadCRMPage, preloadDashboard, preloadDocumentsPage } from '../../lib/lazyLoader';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path?: string;
  roles: string[];
  children?: MenuItem[];
}

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

// Move menu template outside component - does not need to be recreated
const MENU_GROUPS_TEMPLATE: Array<{ groupId: string; label: string; items: MenuItem[] }> = [
  {
    groupId: 'main',
    label: 'Main',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['user', 'marketing', 'admin'] },
      { 
        id: 'crm', 
        label: 'Marketing & CRM', 
        icon: Briefcase, 
        roles: ['user', 'marketing', 'admin'],
        children: [
          { id: 'crm-dashboard', label: 'Dashboard', icon: BarChart3, path: '/crm?view=dashboard', roles: ['user', 'marketing', 'admin'] },
          { id: 'crm-requirements', label: 'Requirements', icon: FileText, path: '/crm?view=requirements', roles: ['user', 'marketing', 'admin'] },
          { id: 'crm-interviews', label: 'Interviews', icon: Calendar, path: '/crm?view=interviews', roles: ['user', 'marketing', 'admin'] },
          { id: 'crm-consultants', label: 'Consultants', icon: Users, path: '/crm?view=consultants', roles: ['user', 'marketing', 'admin'] },
        ]
      },
    ]
  },
  {
    groupId: 'tools',
    label: 'Tools',
    items: [
      { id: 'documents', label: 'Resume Editor', icon: FileText, path: '/documents', roles: ['user', 'admin'] },
    ]
  },
  {
    groupId: 'admin',
    label: 'Administration',
    items: [
      { id: 'admin', label: 'Admin Panel', icon: Shield, path: '/admin', roles: ['admin'] },
    ]
  }
];

export const Sidebar = ({ isOpen, onToggle }: SidebarProps) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const desktopDrawerWidth = isOpen ? 256 : 80;
  const mobileDrawerWidth = 256;
  
  // Track which accordion groups are expanded
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['main']));
  // Track which menu items with children are expanded
  const [expandedMenuItems, setExpandedMenuItems] = useState<Set<string>>(new Set(['crm']));
  // Track profile dropdown menu
  const [profileMenuAnchor, setProfileMenuAnchor] = useState<null | HTMLElement>(null);
  // Track popup menu for collapsed sidebar nested items
  const [popupMenuAnchor, setPopupMenuAnchor] = useState<null | HTMLElement>(null);
  const [popupMenuItems, setPopupMenuItems] = useState<MenuItem[] | null>(null);

  // Memoize filtered groups based on user role
  const menuGroups = useMemo(() => {
    const userRole = user?.role as string;
    return MENU_GROUPS_TEMPLATE.map(group => ({
      ...group,
      items: group.items.filter(item => item.roles.includes(userRole))
    }));
  }, [user?.role]);

  const preloadForPath = useCallback((path: string) => {
    if (path === '/dashboard') void preloadDashboard();
    else if (path === '/documents') void preloadDocumentsPage();
    else if (path === '/crm') void preloadCRMPage();
    else if (path === '/admin') void preloadAdminPage();
  }, []);

  const userLabel = user?.full_name || user?.email || '';
  const userInitials = userLabel
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(groupId)) {
        newExpanded.delete(groupId);
      } else {
        newExpanded.add(groupId);
      }
      return newExpanded;
    });
  }, []);

  const toggleMenuItem = useCallback((menuItemId: string) => {
    setExpandedMenuItems(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(menuItemId)) {
        newExpanded.delete(menuItemId);
      } else {
        newExpanded.add(menuItemId);
      }
      return newExpanded;
    });
  }, []);

  const getIsActive = useCallback((path: string) => {
    if (path?.includes('?view=')) {
      const [basePath, queryPart] = path.split('?');
      if (location.pathname === basePath && location.search === `?${queryPart}`) {
        return true;
      }
    }
    return location.pathname === path;
  }, [location.pathname, location.search]);

  const filterItemsByRole = useCallback((items: MenuItem[]): MenuItem[] => {
    const userRole = user?.role as string;
    return items.filter(item => item.roles.includes(userRole));
  }, [user?.role]);

  const getNavItemSx = useCallback((isActive: boolean, forCollapsed: boolean) => ({
    borderRadius: 2,
    mb: 0.5,
    position: 'relative',
    color: isActive ? '#0B1220' : 'grey.300',
    bgcolor: isActive ? '#F5C542' : 'transparent',
    '&:hover': {
      bgcolor: isActive ? '#F5C542' : (theme: Theme) => alpha(theme.palette.primary.main, 0.14),
      color: isActive ? '#0B1220' : 'common.white',
    },
    '&.Mui-selected': {
      bgcolor: '#F5C542',
      color: '#0B1220',
    },
    '&.Mui-selected:hover': {
      bgcolor: '#F5C542',
      color: '#0B1220',
    },
    '&.Mui-focusVisible': {
      outline: (theme: Theme) => `2px solid ${alpha(theme.palette.primary.main, 0.55)}`,
      outlineOffset: 2,
    },
    justifyContent: forCollapsed ? 'center' : 'flex-start',
    px: forCollapsed ? 1.5 : 2,
    py: 1.75,
    minHeight: 44,
    transition: (theme: Theme) =>
      theme.transitions.create(['background-color', 'color'], {
        duration: 200,
      }),
  }), []);

  const getAccordionButtonSx = useCallback((forCollapsed: boolean) => ({
    borderRadius: 2,
    mb: 0.5,
    color: 'grey.200',
    px: forCollapsed ? 1.5 : 2,
    py: 1.75,
    minHeight: 44,
    justifyContent: forCollapsed ? 'center' : 'space-between',
    '&:hover': {
      bgcolor: (theme: Theme) => alpha(theme.palette.primary.main, 0.12),
      color: 'common.white',
    },
    transition: (theme: Theme) =>
      theme.transitions.create(['background-color', 'color'], {
        duration: 200,
      }),
  }), []);

  const filterGroupsByItems = useCallback((groups: typeof MENU_GROUPS_TEMPLATE) => {
    return groups.filter(group => filterItemsByRole(group.items).length > 0);
  }, [filterItemsByRole]);

  const renderMenuGroup = (group: typeof menuGroups[0], isExpanded: boolean) => {
    const filteredItems = filterItemsByRole(group.items);
    if (filteredItems.length === 0) return null;

    return (
      <Box key={group.groupId}>
        <ListItemButton
          onClick={() => toggleGroup(group.groupId)}
          disabled={!isOpen}
          disableRipple
          aria-expanded={isExpanded}
          aria-controls={`accordion-${group.groupId}`}
          sx={{
            ...getAccordionButtonSx(!isOpen),
            opacity: isOpen ? 1 : 0.7,
          }}
        >
          <ListItemText
            primary={group.label}
            primaryTypographyProps={{
              sx: {
                fontWeight: 700,
                fontSize: '0.65rem',
                letterSpacing: '0.1em',
                color: '#9ca3af',
                textTransform: 'uppercase',
                display: isOpen ? 'block' : 'none',
              }
            }}
          />
          {isOpen && (
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          )}
        </ListItemButton>

        {isOpen && (
          <Collapse in={isExpanded} timeout="auto" id={`accordion-${group.groupId}`}>
            <List component="div" disablePadding>
              {filteredItems.map((item) => {
                const Icon = item.icon;
                const hasChildren = item.children && item.children.length > 0;
                const isMenuItemExpanded = expandedMenuItems.has(item.id);

                if (hasChildren) {
                  // Render parent item with children (collapsible)
                  return (
                    <Box key={item.id}>
                      <ListItemButton
                        onClick={(event) => {
                          if (isOpen) {
                            // Expanded mode: toggle collapse
                            toggleMenuItem(item.id);
                          } else {
                            // Collapsed mode: show popup menu
                            setPopupMenuAnchor(event.currentTarget);
                            setPopupMenuItems(item.children || []);
                          }
                        }}
                        aria-expanded={isMenuItemExpanded}
                        aria-controls={`nested-menu-${item.id}`}
                        disableRipple
                        sx={{
                          borderRadius: 2,
                          mb: 0.5,
                          color: 'grey.300',
                          px: 2,
                          py: 1.75,
                          minHeight: 44,
                          justifyContent: 'space-between',
                          ml: 1,
                          transition: (theme: Theme) => theme.transitions.create(['background-color', 'color'], { duration: 200 }),
                          '&:hover': {
                            bgcolor: (theme: Theme) => alpha(theme.palette.primary.main, 0.14),
                            color: 'common.white',
                          },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                          <ListItemIcon sx={{ minWidth: 0, color: 'inherit' }}>
                            <Icon className="w-5 h-5" aria-hidden="true" />
                          </ListItemIcon>
                          <ListItemText
                            primary={item.label}
                            primaryTypographyProps={{ sx: { fontWeight: 500, color: 'inherit' } }}
                          />
                        </Box>
                        {isOpen && (
                          <ChevronDown
                            className={`w-4 h-4 transition-transform duration-200 flex-shrink-0 ${isMenuItemExpanded ? "rotate-180" : ""}`}
                            aria-hidden="true"
                          />
                        )}
                      </ListItemButton>

                      {/* Nested children - only show when expanded */}
                      {isOpen && (
                        <Collapse in={isMenuItemExpanded} timeout="auto" id={`nested-menu-${item.id}`}>
                          <List component="div" disablePadding>
                            {item.children?.map((child) => {
                              const ChildIcon = child.icon;
                              const isChildActive = getIsActive(child.path || '');

                              return (
                                <Tooltip
                                  key={child.id}
                                  title=""
                                  placement="right"
                                >
                                  <ListItemButton
                                    component={Link}
                                    to={child.path || '#'}
                                    selected={isChildActive}
                                    disableRipple
                                    aria-current={isChildActive ? 'page' : undefined}
                                    aria-label={child.label}
                                    onMouseEnter={() => child.path && preloadForPath(child.path)}
                                    onFocus={() => child.path && preloadForPath(child.path)}
                                    sx={{
                                      ...getNavItemSx(isChildActive, false),
                                      ml: 3,
                                    }}
                                  >
                                    <ListItemIcon sx={{ minWidth: 0, mr: 1.5, color: 'inherit' }}>
                                      <ChildIcon className="w-5 h-5" aria-hidden="true" />
                                    </ListItemIcon>
                                    <ListItemText
                                      primary={child.label}
                                      primaryTypographyProps={{ sx: { fontWeight: 500, color: 'inherit' } }}
                                    />
                                  </ListItemButton>
                                </Tooltip>
                              );
                            })}
                          </List>
                        </Collapse>
                      )}
                    </Box>
                  );
                } else {
                  // Render regular menu item (no children)
                  const isActive = getIsActive(item.path || '');

                  return (
                    <Tooltip
                      key={item.id}
                      title=""
                      placement="right"
                    >
                      <ListItemButton
                        component={Link}
                        to={item.path || '#'}
                        selected={isActive}
                        aria-current={isActive ? 'page' : undefined}
                        aria-label={item.label}
                        onMouseEnter={() => item.path && preloadForPath(item.path)}
                        onFocus={() => item.path && preloadForPath(item.path)}
                        sx={{
                          ...getNavItemSx(isActive, false),
                          ml: 1,
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 0, mr: 1.5, color: 'inherit' }}>
                          <Icon className="w-5 h-5" aria-hidden="true" />
                        </ListItemIcon>
                        <ListItemText
                          primary={item.label}
                          primaryTypographyProps={{ sx: { fontWeight: 500, color: 'inherit' } }}
                        />
                      </ListItemButton>
                    </Tooltip>
                  );
                }
              })}
            </List>
          </Collapse>
        )}
      </Box>
    );
  };

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
            transition: 'width 300ms ease-in-out',
            overflowX: 'hidden',
            backgroundImage: 'linear-gradient(180deg, rgba(13,17,23,1) 0%, rgba(10,14,19,1) 100%)',
          },
        }}
      >
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ py: 1.5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ 
            width: '100%', 
            position: 'relative',
            px: isOpen ? 2 : 1
          }}>
            {isOpen ? (
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center'
              }}>
                <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontFamily: '"Poppins", sans-serif',
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: '#eab308',
                    }}
                  >
                    NRETech OneHub
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 500,
                      letterSpacing: '0.28em',
                      textTransform: 'uppercase',
                      color: 'rgba(156,163,175,0.8)',
                    }}
                  >
                    Mission Control
                  </Typography>
                </Stack>
                <IconButton
                  onClick={onToggle}
                  aria-label="Collapse sidebar"
                  aria-expanded={true}
                  sx={{
                    bgcolor: 'rgba(55, 65, 81, 0.5)',
                    border: 1,
                    borderColor: 'rgba(75, 85, 99, 0.6)',
                    color: 'rgba(156, 163, 175, 1)',
                    transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': { 
                      bgcolor: 'rgba(79, 70, 229, 0.15)',
                      borderColor: 'rgba(234, 179, 8, 0.4)',
                      color: 'rgba(234, 179, 8, 1)',
                      boxShadow: '0 0 12px rgba(234, 179, 8, 0.25)'
                    },
                    flexShrink: 0,
                    p: 0.75
                  }}
                  size="small"
                >
                  <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                </IconButton>
              </Box>
            ) : (
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                py: 2
              }}>
                <IconButton
                  onClick={onToggle}
                  aria-label="Expand sidebar"
                  aria-expanded={false}
                  sx={{
                    bgcolor: 'rgba(55, 65, 81, 0.5)',
                    border: 1,
                    borderColor: 'rgba(75, 85, 99, 0.6)',
                    color: 'rgba(156, 163, 175, 1)',
                    transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': { 
                      bgcolor: 'rgba(79, 70, 229, 0.15)',
                      borderColor: 'rgba(234, 179, 8, 0.4)',
                      color: 'rgba(234, 179, 8, 1)',
                      boxShadow: '0 0 12px rgba(234, 179, 8, 0.25)',
                      transform: 'scale(1.05)'
                    },
                    '&:active': {
                      transform: 'scale(0.95)'
                    },
                    p: 0.75
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
              {filterGroupsByItems(menuGroups).map((group) => 
                renderMenuGroup(group, expandedGroups.has(group.groupId))
              )}
            </List>
          </Box>

          <Divider sx={{ borderColor: 'grey.800' }} />

          <Box sx={{ p: 1.5, pb: 2 }}>
            <Box
              component="button"
              onClick={(e) => isOpen && setProfileMenuAnchor(e.currentTarget)}
              sx={{
                width: '100%',
                px: isOpen ? 2 : 0,
                py: 1.5,
                bgcolor: isOpen ? 'rgba(255,255,255,0.05)' : 'transparent',
                borderRadius: 2,
                mb: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                justifyContent: isOpen ? 'flex-start' : 'center',
                border: 'none',
                cursor: isOpen ? 'pointer' : 'default',
                transition: (theme: Theme) =>
                  theme.transitions.create(['background-color'], {
                    duration: 200,
                  }),
                '&:hover': isOpen ? {
                  bgcolor: 'rgba(255,255,255,0.1)',
                } : {},
              }}
            >
              <Box sx={{ position: 'relative' }}>
                <Avatar
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.35),
                    color: 'common.white',
                    fontWeight: 500,
                    fontSize: '0.75rem',
                  }}
                >
                  {userInitials || 'U'}
                </Avatar>
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    bgcolor: '#4ade80',
                    border: '2px solid',
                    borderColor: 'grey.900',
                  }}
                />
              </Box>
              {isOpen ? (
                <Box sx={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'common.white' }} noWrap>
                    {user?.full_name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'grey.500', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={user?.email}>
                    {user?.email}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#eab308', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.18em', mt: 0.5 }}>
                    On Orbit
                  </Typography>
                </Box>
              ) : null}
            </Box>

            {/* Profile Dropdown Menu */}
            <Menu
              anchorEl={profileMenuAnchor}
              open={Boolean(profileMenuAnchor)}
              onClose={() => setProfileMenuAnchor(null)}
              PaperProps={{
                sx: {
                  bgcolor: 'grey.900',
                  color: 'common.white',
                  minWidth: 200,
                  '& .MuiMenuItem-root': {
                    '&:hover': {
                      bgcolor: (theme: Theme) => alpha(theme.palette.primary.main, 0.12),
                    },
                  },
                },
              }}
            >
              <MenuItem disabled sx={{ pb: 1 }}>
                <Box sx={{ py: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {user?.full_name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'grey.400' }}>
                    {user?.email}
                  </Typography>
                </Box>
              </MenuItem>
              <Divider sx={{ borderColor: 'grey.800' }} />
              <MenuItem
                onClick={() => {
                  setProfileMenuAnchor(null);
                }}
                sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}
              >
                <User className="w-4 h-4" />
                <span>Profile</span>
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setProfileMenuAnchor(null);
                }}
                sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </MenuItem>
            </Menu>
          </Box>

          {isOpen && <Box sx={{ height: 24 }} />}
        </Box>
        <Popper
          open={Boolean(popupMenuAnchor)}
          anchorEl={popupMenuAnchor}
          placement="right-start"
          sx={{ zIndex: 1300 }}
          modifiers={[
            {
              name: 'offset',
              options: {
                offset: [8, 0],
              },
            },
          ]}
        >
          <Paper
            sx={{
              bgcolor: 'grey.900',
              color: 'common.white',
              minWidth: 200,
              borderRadius: 2,
              boxShadow: (theme) => theme.shadows[8],
              border: '1px solid',
              borderColor: 'grey.800',
            }}
          >
            <List disablePadding>
              {popupMenuItems?.map((item) => {
                const Icon = item.icon;
                const isActive = getIsActive(item.path || '');

                return (
                  <ListItemButton
                    key={item.id}
                    component={Link}
                    to={item.path || '#'}
                    selected={isActive}
                    onClick={() => setPopupMenuAnchor(null)}
                    disableRipple
                    sx={{
                      px: 2,
                      py: 1.5,
                      color: isActive ? 'primary.main' : 'grey.300',
                      bgcolor: isActive ? (theme: Theme) => alpha(theme.palette.primary.main, 0.22) : 'transparent',
                      '&:hover': {
                        bgcolor: (theme: Theme) => alpha(theme.palette.primary.main, 0.14),
                        color: 'common.white',
                      },
                      '&:first-of-type': {
                        borderTopLeftRadius: 2,
                        borderTopRightRadius: 2,
                      },
                      '&:last-of-type': {
                        borderBottomLeftRadius: 2,
                        borderBottomRightRadius: 2,
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 0, mr: 1.5, color: 'inherit' }}>
                      <Icon className="w-5 h-5" aria-hidden="true" />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{ sx: { fontWeight: 500, color: 'inherit' } }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Paper>
        </Popper>
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
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end" sx={{ p: 2 }}>
            <IconButton onClick={onToggle} aria-label="Close sidebar" aria-expanded>
              <ChevronLeft className="w-5 h-5" aria-hidden="true" />
            </IconButton>
          </Stack>

          <Divider sx={{ borderColor: 'grey.800' }} />

          <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
            <List sx={{ px: 1 }}>
              {filterGroupsByItems(menuGroups).map((group) => {
                const isExpanded = expandedGroups.has(group.groupId);
                const filteredItems = filterItemsByRole(group.items);
                if (filteredItems.length === 0) return null;

                return (
                  <Box key={group.groupId}>
                    <ListItemButton
                      onClick={() => toggleGroup(group.groupId)}
                      disableRipple
                      aria-expanded={isExpanded}
                      aria-controls={`mobile-accordion-${group.groupId}`}
                      sx={{
                        borderRadius: 2,
                        mb: 0.5,
                        color: 'grey.200',
                        px: 2,
                        py: 1.25,
                        minHeight: 44,
                        justifyContent: 'space-between',
                        '&:hover': {
                          bgcolor: (theme: Theme) => alpha(theme.palette.primary.main, 0.14),
                          color: 'common.white',
                        },
                      }}
                    >
                      <ListItemText
                        primary={group.label}
                        primaryTypographyProps={{
                          sx: {
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            letterSpacing: '0.5px',
                            color: 'inherit',
                          }
                        }}
                      />
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ml-2 flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`}
                        aria-hidden="true"
                      />
                    </ListItemButton>

                    <Collapse in={isExpanded} timeout="auto" id={`mobile-accordion-${group.groupId}`}>
                      <List component="div" disablePadding>
                        {filteredItems.map((item) => {
                          const Icon = item.icon;
                          const hasChildren = item.children && item.children.length > 0;
                          const isMenuItemExpanded = expandedMenuItems.has(item.id);

                          if (hasChildren) {
                            // Render parent item with children
                            return (
                              <Box key={item.id}>
                                <ListItemButton
                                  onClick={() => toggleMenuItem(item.id)}
                                  aria-expanded={isMenuItemExpanded}
                                  aria-controls={`mobile-nested-menu-${item.id}`}
                                  disableRipple
                                  sx={{
                                    borderRadius: 2,
                                    mb: 0.5,
                                    color: 'grey.300',
                                    px: 2,
                                    py: 1.75,
                                    minHeight: 44,
                                    justifyContent: 'space-between',
                                    ml: 1,
                                    transition: (theme: Theme) => theme.transitions.create(['background-color', 'color'], { duration: 200 }),
                                    '&:hover': {
                                      bgcolor: (theme: Theme) => alpha(theme.palette.primary.main, 0.14),
                                      color: 'common.white',
                                    },
                                  }}
                                >
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                                    <ListItemIcon sx={{ minWidth: 0, color: 'inherit' }}>
                                      <Icon className="w-5 h-5" aria-hidden="true" />
                                    </ListItemIcon>
                                    <ListItemText
                                      primary={item.label}
                                      primaryTypographyProps={{ sx: { fontWeight: 500, color: 'inherit' } }}
                                    />
                                  </Box>
                                  <ChevronDown
                                    className={`w-4 h-4 transition-transform duration-200 flex-shrink-0 ${isMenuItemExpanded ? "rotate-180" : ""}`}
                                    aria-hidden="true"
                                  />
                                </ListItemButton>

                                <Collapse in={isMenuItemExpanded} timeout="auto" id={`mobile-nested-menu-${item.id}`}>
                                  <List component="div" disablePadding>
                                    {item.children?.map((child) => {
                                      const ChildIcon = child.icon;
                                      const isChildActive = getIsActive(child.path || '');

                                      return (
                                        <ListItemButton
                                          key={child.id}
                                          component={Link}
                                          to={child.path || '#'}
                                          onClick={onToggle}
                                          selected={isChildActive}
                                          disableRipple
                                          aria-current={isChildActive ? 'page' : undefined}
                                          aria-label={child.label}
                                          sx={{
                                            ...getNavItemSx(isChildActive, false),
                                            ml: 3,
                                          }}
                                        >
                                          <ListItemIcon sx={{ minWidth: 0, mr: 1.5, color: 'inherit' }}>
                                            <ChildIcon className="w-5 h-5" aria-hidden="true" />
                                          </ListItemIcon>
                                          <ListItemText
                                            primary={child.label}
                                            primaryTypographyProps={{ sx: { fontWeight: 500, color: 'inherit' } }}
                                          />
                                        </ListItemButton>
                                      );
                                    })}
                                  </List>
                                </Collapse>
                              </Box>
                            );
                          } else {
                            // Render regular menu item
                            const isActive = getIsActive(item.path || '');

                            return (
                              <ListItemButton
                                key={item.id}
                                component={Link}
                                to={item.path || '#'}
                                onClick={onToggle}
                                selected={isActive}
                                aria-current={isActive ? 'page' : undefined}
                                aria-label={item.label}
                                sx={{
                                  ...getNavItemSx(isActive, false),
                                  ml: 1,
                                }}
                              >
                                <ListItemIcon sx={{ minWidth: 0, mr: 1.5, color: 'inherit' }}>
                                  <Icon className="w-5 h-5" aria-hidden="true" />
                                </ListItemIcon>
                                <ListItemText
                                  primary={item.label}
                                  primaryTypographyProps={{ sx: { fontWeight: 500, color: 'inherit' } }}
                                />
                              </ListItemButton>
                            );
                          }
                        })}
                      </List>
                    </Collapse>
                  </Box>
                );
              })}
            </List>
          </Box>

          <Divider sx={{ borderColor: 'grey.800' }} />

          <Box sx={{ p: 1.5 }}>
            <Box
              component="button"
              onClick={(e) => setProfileMenuAnchor(e.currentTarget)}
              sx={{
                width: '100%',
                px: 2,
                py: 1.5,
                bgcolor: 'rgba(255,255,255,0.05)',
                borderRadius: 2,
                mb: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                border: 'none',
                cursor: 'pointer',
                transition: (theme: Theme) =>
                  theme.transitions.create(['background-color'], {
                    duration: 200,
                  }),
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.1)',
                },
              }}
            >
              <Box sx={{ position: 'relative' }}>
                <Avatar
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.35),
                    color: 'common.white',
                    fontWeight: 500,
                    fontSize: '0.75rem',
                  }}
                >
                  {userInitials || 'U'}
                </Avatar>
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    bgcolor: '#4ade80',
                    border: '2px solid',
                    borderColor: 'grey.900',
                  }}
                />
              </Box>
              <Box sx={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'common.white' }} noWrap>
                  {user?.full_name}
                </Typography>
                <Typography variant="caption" sx={{ color: 'grey.500', display: 'block' }} noWrap>
                  {user?.email}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Drawer>
    </>
  );
};
