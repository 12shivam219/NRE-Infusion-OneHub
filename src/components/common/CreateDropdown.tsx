import { useState, useRef, useCallback, useEffect, ReactNode, memo } from 'react';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import { useThemeSync } from '../../contexts/ThemeSyncContext';

interface CreateDropdownItem {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
}

interface CreateDropdownProps {
  items: CreateDropdownItem[];
  label?: string;
  disabled?: boolean;
  className?: string;
  variant?: 'header' | 'standalone';
}

const CreateDropdownComponent = ({
  items,
  label = '',
  disabled = false,
  className = '',
  variant = 'standalone',
}: CreateDropdownProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { theme } = useThemeSync();
  const accent = theme.accent;

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleMenuItemClick = useCallback((callback: () => void) => {
    callback();
    handleClose();
  }, [handleClose]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const target = event.currentTarget;
      setAnchorEl(target);
    }
    if (event.key === 'Escape') {
      handleClose();
    }
  }, [handleClose]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [open, handleClose]);

  // Header variant styling
  if (variant === 'header') {
    return (
      <>
        <button
          ref={buttonRef}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-haspopup="true"
          aria-expanded={open}
          aria-controls={open ? 'create-menu' : undefined}
          className={`
            flex flex-shrink-0 items-center gap-1
            px-3 py-2
            rounded-md
            bg-[#0b252b]
            border border-[#12393f]
            text-gray-300
            transition-colors duration-200 ease-in-out
            hover:bg-[#0e2a30]
            hover:border-[#00ffd0]
            hover:text-[#00ffd0]
            focus:outline-none
            active:outline-none
            disabled:opacity-50
            disabled:cursor-not-allowed
            ${className}
          `}
          title={`${label || 'Create'} menu`}
        >
          <AddRoundedIcon
            sx={{
              fontSize: 20,
              transition: 'color 200ms ease-in-out',
            }}
          />
          <Box
            component="span"
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 200ms ease-in-out',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            <ExpandMoreRoundedIcon
              sx={{
                fontSize: 18,
                transition: 'color 200ms ease-in-out',
              }}
            />
          </Box>
        </button>

        <Menu
          id="create-menu"
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          disableScrollLock={true}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          slotProps={{
            paper: {
              sx: {
                minWidth: 200,
                boxShadow: `0 8px 24px rgba(0, 255, 208, 0.15), 0 4px 8px rgba(0, 0, 0, 0.4)`,
                borderRadius: '0.5rem',
                bgcolor: '#0e2a30',
                border: '1px solid #12393f',
                position: 'absolute',
              },
            },
          }}
          TransitionProps={{
            timeout: {
              enter: 150,
              exit: 100,
            },
          }}
        >
          {items.map((item, index) => (
            <MenuItem
              key={index}
              onClick={() => handleMenuItemClick(item.onClick)}
              sx={{
                py: 1,
                px: 2,
                color: '#CBD5E1',
                fontSize: '0.875rem',
                fontFamily: '"Inter", sans-serif',
                '&:hover': {
                  bgcolor: '#12393f',
                  color: accent,
                },
                transition: 'all 150ms ease-in-out',
              }}
            >
              {item.icon && (
                <Box
                  component="span"
                  sx={{
                    mr: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    color: 'inherit',
                  }}
                >
                  {item.icon}
                </Box>
              )}
              {item.label}
            </MenuItem>
          ))}
        </Menu>
      </>
    );
  }

  // Standalone variant (original styling)
  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? 'create-menu' : undefined}
        className={`
          flex items-center justify-center gap-1
          px-3 py-2
          bg-[color:var(--gold)]
          hover:bg-[#f5d547]
          text-[color:var(--dark-bg)]
          rounded-lg
          font-medium font-body
          transition-all duration-200
          hover:shadow-[0_0_12px_rgba(234,179,8,0.3)]
          disabled:opacity-50 disabled:cursor-not-allowed
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[color:var(--gold)]
          ${className}
        `}
        title={`${label || 'Create'} menu`}
      >
        <AddRoundedIcon fontSize="small" />
        <Box
          component="span"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s ease-in-out',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          <ExpandMoreRoundedIcon fontSize="small" />
        </Box>
        {label && <span className="text-sm font-heading">{label}</span>}
      </button>

      <Menu
        id="create-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        slotProps={{
          paper: {
            sx: {
              minWidth: 200,
              boxShadow: 'var(--shadow-gold-glow)',
              borderRadius: '0.75rem',
              bgcolor: 'var(--darkbg-surface)',
              border: '1px solid rgba(234, 179, 8, 0.2)',
            },
          },
        }}
        TransitionProps={{
          timeout: {
            enter: 200,
            exit: 150,
          },
        }}
      >
        {items.map((item, index) => (
          <MenuItem
            key={index}
            onClick={() => handleMenuItemClick(item.onClick)}
            sx={{
              py: 1,
              px: 2,
              color: 'var(--text-secondary)',
              fontSize: '0.875rem',
              fontFamily: 'var(--font-body)',
              '&:hover': {
                bgcolor: 'var(--darkbg-surface-light)',
                color: 'var(--gold)',
              },
              transition: 'all 0.2s ease-in-out',
            }}
          >
            {item.icon && (
              <Box
                component="span"
                sx={{
                  mr: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  color: 'inherit',
                }}
              >
                {item.icon}
              </Box>
            )}
            {item.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

// Memoize component to prevent re-renders when parent updates
export const CreateDropdown = memo(CreateDropdownComponent, (prevProps, nextProps) => {
  // Custom comparison: only re-render if props with actual value changes occur
  return (
    prevProps.label === nextProps.label &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.className === nextProps.className &&
    prevProps.variant === nextProps.variant &&
    prevProps.items.length === nextProps.items.length &&
    // Compare item labels to detect changes
    prevProps.items.every((item, index) => item.label === nextProps.items[index]?.label)
  );
});

CreateDropdown.displayName = 'CreateDropdown';
