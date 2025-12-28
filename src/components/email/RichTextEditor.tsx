import React, { useState } from 'react';
import {
  Box,
  Paper,
  Stack,
  Tooltip,
  IconButton,
  Divider,
  TextField,
  Typography,
  Button,
} from '@mui/material';
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  StrikethroughS,
  FormatListBulleted,
  FormatListNumbered,
  FormatAlignLeft,
  FormatAlignCenter,
  FormatAlignRight,
  Link as LinkIcon,
  Code,
  Undo,
  Redo,
  Palette,
} from '@mui/icons-material';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minRows?: number;
  maxRows?: number;
  fullWidth?: boolean;
  disabled?: boolean;
  showFormatting?: boolean;
}

export const RichTextEditor = ({
  value,
  onChange,
  placeholder = 'Write your email...',
  minRows = 6,
  maxRows = 12,
  fullWidth = true,
  disabled = false,
  showFormatting = true,
}: RichTextEditorProps) => {
  const [history, setHistory] = useState<string[]>([value]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [textColor, setTextColor] = useState('#000000');
  const [fontSize, setFontSize] = useState('16');
  const [fontFamily, setFontFamily] = useState('Arial');
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');

  // Apply formatting
  const applyFormatting = (before: string, after: string = '') => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end);
    const newValue = value.substring(0, start) + before + selected + after + value.substring(end);

    onChange(newValue);
    addToHistory(newValue);

    // Restore cursor position
    setTimeout(() => {
      textarea.selectionStart = start + before.length;
      textarea.selectionEnd = start + before.length + selected.length;
      textarea.focus();
    }, 0);
  };

  // Add to history for undo/redo
  const addToHistory = (newValue: string) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newValue);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Undo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      onChange(history[newIndex]);
    }
  };

  // Redo
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      onChange(history[newIndex]);
    }
  };

  // Handle value change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    addToHistory(newValue);
  };

  // Insert link
  const handleInsertLink = () => {
    if (!linkUrl || !linkText) return;
    const link = `[${linkText}](${linkUrl})`;
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    const start = textarea.selectionStart;
    const newValue = value.substring(0, start) + link + value.substring(start);
    onChange(newValue);
    addToHistory(newValue);
    setShowLinkDialog(false);
    setLinkUrl('');
    setLinkText('');
  };

  // Insert snippet
  const insertSnippet = (snippet: string) => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    const start = textarea.selectionStart;
    const newValue = value.substring(0, start) + snippet + value.substring(start);
    onChange(newValue);
    addToHistory(newValue);
  };

  // Get character and word count
  const charCount = value.length;
  const wordCount = value.trim().split(/\s+/).filter(w => w.length > 0).length;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        bgcolor: 'background.paper',
        borderColor: 'rgba(234,179,8,0.20)',
      }}
    >
      <Stack spacing={1.5}>
        {/* Toolbar */}
        {showFormatting && (
          <>
            <Stack spacing={1}>
              {/* Row 1: Basic Formatting */}
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                <Tooltip title="Bold (Ctrl+B)">
                  <IconButton
                    size="small"
                    onClick={() => applyFormatting('**', '**')}
                    disabled={disabled}
                    sx={{ '&:hover': { bgcolor: 'rgba(234,179,8,0.1)' } }}
                  >
                    <FormatBold fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Italic (Ctrl+I)">
                  <IconButton
                    size="small"
                    onClick={() => applyFormatting('*', '*')}
                    disabled={disabled}
                    sx={{ '&:hover': { bgcolor: 'rgba(234,179,8,0.1)' } }}
                  >
                    <FormatItalic fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Underline">
                  <IconButton
                    size="small"
                    onClick={() => applyFormatting('<u>', '</u>')}
                    disabled={disabled}
                    sx={{ '&:hover': { bgcolor: 'rgba(234,179,8,0.1)' } }}
                  >
                    <FormatUnderlined fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Strikethrough">
                  <IconButton
                    size="small"
                    onClick={() => applyFormatting('~~', '~~')}
                    disabled={disabled}
                    sx={{ '&:hover': { bgcolor: 'rgba(234,179,8,0.1)' } }}
                  >
                    <StrikethroughS fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Divider orientation="vertical" flexItem />

                {/* Font Size */}
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(e.target.value)}
                  disabled={disabled}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid rgba(234,179,8,0.2)',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  <option value="12">12px</option>
                  <option value="14">14px</option>
                  <option value="16">16px</option>
                  <option value="18">18px</option>
                  <option value="20">20px</option>
                  <option value="24">24px</option>
                </select>

                {/* Font Family */}
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  disabled={disabled}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid rgba(234,179,8,0.2)',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontFamily: fontFamily,
                  }}
                >
                  <option value="Arial">Arial</option>
                  <option value="Verdana">Verdana</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Courier New">Courier New</option>
                  <option value="Trebuchet MS">Trebuchet MS</option>
                </select>

                <Divider orientation="vertical" flexItem />

                {/* Lists */}
                <Tooltip title="Bullet List">
                  <IconButton
                    size="small"
                    onClick={() => applyFormatting('• ')}
                    disabled={disabled}
                    sx={{ '&:hover': { bgcolor: 'rgba(234,179,8,0.1)' } }}
                  >
                    <FormatListBulleted fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Numbered List">
                  <IconButton
                    size="small"
                    onClick={() => applyFormatting('1. ')}
                    disabled={disabled}
                    sx={{ '&:hover': { bgcolor: 'rgba(234,179,8,0.1)' } }}
                  >
                    <FormatListNumbered fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Divider orientation="vertical" flexItem />

                {/* Alignment */}
                <Tooltip title="Align Left">
                  <IconButton
                    size="small"
                    onClick={() => applyFormatting('\n⬅ ')}
                    disabled={disabled}
                    sx={{ '&:hover': { bgcolor: 'rgba(234,179,8,0.1)' } }}
                  >
                    <FormatAlignLeft fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Align Center">
                  <IconButton
                    size="small"
                    onClick={() => applyFormatting('\n🔹 ')}
                    disabled={disabled}
                    sx={{ '&:hover': { bgcolor: 'rgba(234,179,8,0.1)' } }}
                  >
                    <FormatAlignCenter fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Align Right">
                  <IconButton
                    size="small"
                    onClick={() => applyFormatting('\n➡ ')}
                    disabled={disabled}
                    sx={{ '&:hover': { bgcolor: 'rgba(234,179,8,0.1)' } }}
                  >
                    <FormatAlignRight fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Divider orientation="vertical" flexItem />

                {/* Link */}
                <Tooltip title="Insert Link">
                  <IconButton
                    size="small"
                    onClick={() => setShowLinkDialog(true)}
                    disabled={disabled}
                    sx={{ '&:hover': { bgcolor: 'rgba(234,179,8,0.1)' } }}
                  >
                    <LinkIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

                {/* Code */}
                <Tooltip title="Code Block">
                  <IconButton
                    size="small"
                    onClick={() => applyFormatting('```\n', '\n```')}
                    disabled={disabled}
                    sx={{ '&:hover': { bgcolor: 'rgba(234,179,8,0.1)' } }}
                  >
                    <Code fontSize="small" />
                  </IconButton>
                </Tooltip>

                {/* Color */}
                <Tooltip title="Text Color">
                  <Box position="relative">
                    <IconButton
                      size="small"
                      onClick={() => setShowColorPicker(!showColorPicker)}
                      disabled={disabled}
                      sx={{ '&:hover': { bgcolor: 'rgba(234,179,8,0.1)' } }}
                    >
                      <Palette fontSize="small" />
                    </IconButton>
                    {showColorPicker && (
                      <Paper
                        sx={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          zIndex: 1000,
                          p: 1,
                          display: 'grid',
                          gridTemplateColumns: 'repeat(4, 1fr)',
                          gap: 1,
                          mt: 1,
                        }}
                      >
                        {['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#808080'].map((color) => (
                          <Box
                            key={color}
                            onClick={() => {
                              setTextColor(color);
                              setShowColorPicker(false);
                            }}
                            sx={{
                              width: '24px',
                              height: '24px',
                              bgcolor: color,
                              borderRadius: '4px',
                              cursor: 'pointer',
                              border: textColor === color ? '2px solid gold' : '1px solid #ccc',
                            }}
                          />
                        ))}
                      </Paper>
                    )}
                  </Box>
                </Tooltip>

                <Divider orientation="vertical" flexItem />

                {/* Undo/Redo */}
                <Tooltip title="Undo">
                  <IconButton
                    size="small"
                    onClick={handleUndo}
                    disabled={disabled || historyIndex === 0}
                    sx={{ '&:hover': { bgcolor: 'rgba(234,179,8,0.1)' } }}
                  >
                    <Undo fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Redo">
                  <IconButton
                    size="small"
                    onClick={handleRedo}
                    disabled={disabled || historyIndex === history.length - 1}
                    sx={{ '&:hover': { bgcolor: 'rgba(234,179,8,0.1)' } }}
                  >
                    <Redo fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>

              {/* Row 2: Quick Snippets */}
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => insertSnippet('Best regards,\n')}
                  disabled={disabled}
                  sx={{ fontSize: '11px' }}
                >
                  Best Regards
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => insertSnippet('Thank you for your attention.\n')}
                  disabled={disabled}
                  sx={{ fontSize: '11px' }}
                >
                  Thank You
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => insertSnippet('Looking forward to hearing from you.\n')}
                  disabled={disabled}
                  sx={{ fontSize: '11px' }}
                >
                  Looking Forward
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => insertSnippet('If you have any questions, please feel free to reach out.\n')}
                  disabled={disabled}
                  sx={{ fontSize: '11px' }}
                >
                  Questions
                </Button>
              </Box>
            </Stack>

            <Divider />
          </>
        )}

        {/* Text Area */}
        <TextField
          multiline
          minRows={minRows}
          maxRows={maxRows}
          fullWidth={fullWidth}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          variant="outlined"
          size="small"
          inputProps={{
            'aria-label': 'Email body',
            spellCheck: 'true',
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              fontFamily: fontFamily,
              fontSize: `${fontSize}px`,
              color: textColor,
            },
          }}
        />

        {/* Character/Word Count */}
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="caption" color="text.secondary">
            Characters: {charCount} | Words: {wordCount}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {charCount > 5000 && <span style={{ color: 'orange' }}>⚠ Large email</span>}
          </Typography>
        </Stack>

        {/* Link Dialog */}
        {showLinkDialog && (
          <Paper sx={{ p: 2, bgcolor: 'rgba(234,179,8,0.1)' }}>
            <Stack spacing={1}>
              <Typography variant="subtitle2">Insert Link</Typography>
              <TextField
                size="small"
                label="Link Text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="Display text"
                fullWidth
              />
              <TextField
                size="small"
                label="URL"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                fullWidth
              />
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button size="small" onClick={() => setShowLinkDialog(false)}>
                  Cancel
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleInsertLink}
                  disabled={!linkUrl || !linkText}
                >
                  Insert
                </Button>
              </Stack>
            </Stack>
          </Paper>
        )}
      </Stack>
    </Paper>
  );
};
