import { useState, useRef } from 'react';
import {
  Box,
  Stack,
  Paper,
  Typography,
  Button,
  LinearProgress,
  Tooltip,
  Alert,
} from '@mui/material';
import { File, Image, Trash2 } from 'lucide-react';

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  file: File;
  uploadProgress?: number;
}

interface AttachmentManagerProps {
  attachments: Attachment[];
  onAttachmentsChange: (attachments: Attachment[]) => void;
  maxFileSize?: number; // in MB
  maxTotalSize?: number; // in MB
  disabled?: boolean;
}

export const AttachmentManager = ({
  attachments,
  onAttachmentsChange,
  maxFileSize = 25,
  maxTotalSize = 100,
  disabled = false,
}: AttachmentManagerProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDropZoneRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Get file icon
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  // Validate file
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      return {
        valid: false,
        error: `File too large. Max size: ${maxFileSize}MB`,
      };
    }

    // Check total size
    const totalSize = attachments.reduce((acc, a) => acc + a.size, 0) + file.size;
    if (totalSize > maxTotalSize * 1024 * 1024) {
      return {
        valid: false,
        error: `Total attachment size exceeds ${maxTotalSize}MB limit`,
      };
    }

    return { valid: true };
  };

  // Handle file selection
  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    setError(null);

    const newAttachments: Attachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validation = validateFile(file);

      if (!validation.valid) {
        setError(`${file.name}: ${validation.error}`);
        continue;
      }

      const attachment: Attachment = {
        id: `${Date.now()}-${i}`,
        name: file.name,
        size: file.size,
        type: file.type,
        file: file,
      };

      newAttachments.push(attachment);
    }

    if (newAttachments.length > 0) {
      onAttachmentsChange([...attachments, ...newAttachments]);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle drag and drop
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    handleFileSelect(files);
  };

  // Remove attachment
  const removeAttachment = (id: string) => {
    onAttachmentsChange(attachments.filter(a => a.id !== id));
  };

  // Get total size
  const totalSize = attachments.reduce((acc, a) => acc + a.size, 0);
  const totalSizePercent = (totalSize / (maxTotalSize * 1024 * 1024)) * 100;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        bgcolor: 'background.paper',
        borderColor: 'rgba(234,179,8,0.20)',
      }}
    >
      <Stack spacing={2}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Attachments
        </Typography>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Drop Zone */}
        <Box
          ref={dragDropZoneRef}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          sx={{
            p: 3,
            textAlign: 'center',
            border: '2px dashed',
            borderColor: isDragging ? 'primary.main' : 'rgba(234,179,8,0.2)',
            borderRadius: 2,
            bgcolor: isDragging ? 'rgba(234,179,8,0.08)' : 'rgba(234,179,8,0.02)',
            transition: 'all 0.2s',
            cursor: 'pointer',
            '&:hover': {
              borderColor: 'rgba(234,179,8,0.4)',
              bgcolor: 'rgba(234,179,8,0.05)',
            },
          }}
        >
          <Stack spacing={1} alignItems="center">
            <Box sx={{ fontSize: '2rem' }}>☁️</Box>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Drag and drop files here or{' '}
                <Button
                  component="span"
                  size="small"
                  variant="text"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled}
                  sx={{ textTransform: 'none' }}
                >
                  browse
                </Button>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Max file size: {maxFileSize}MB • Max total: {maxTotalSize}MB
              </Typography>
            </Box>
          </Stack>
        </Box>

        {/* Hidden Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          disabled={disabled}
          style={{ display: 'none' }}
          aria-label="Upload attachments"
        />

        {/* Attachments List */}
        {attachments.length > 0 && (
          <Stack spacing={1.5}>
            {/* Size Indicator */}
            <Box>
              <Stack direction="row" justifyContent="space-between" mb={0.5}>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  Storage Used
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatFileSize(totalSize)} / {formatFileSize(maxTotalSize * 1024 * 1024)}
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={Math.min(totalSizePercent, 100)}
                sx={{
                  height: 6,
                  borderRadius: 1,
                  backgroundColor: 'rgba(234,179,8,0.1)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor:
                      totalSizePercent > 80
                        ? '#ef4444'
                        : totalSizePercent > 60
                          ? '#f97316'
                          : 'rgba(34,197,94,0.7)',
                  },
                }}
              />
            </Box>

            {/* Attachment Items */}
            <Stack spacing={1}>
              {attachments.map((attachment) => (
                <Paper
                  key={attachment.id}
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    bgcolor: 'rgba(234,179,8,0.02)',
                    borderColor: 'rgba(234,179,8,0.1)',
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={1.5}
                    alignItems="center"
                    sx={{ flex: 1, minWidth: 0 }}
                  >
                    <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                      {getFileIcon(attachment.type)}
                    </Box>
                    <Stack sx={{ flex: 1, minWidth: 0 }}>
                      <Tooltip title={attachment.name}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {attachment.name}
                        </Typography>
                      </Tooltip>
                      <Typography variant="caption" color="text.secondary">
                        {formatFileSize(attachment.size)}
                      </Typography>
                    </Stack>
                  </Stack>

                  {attachment.uploadProgress !== undefined && (
                    <LinearProgress
                      variant="determinate"
                      value={attachment.uploadProgress}
                      sx={{ width: 60, mr: 1 }}
                    />
                  )}

                  <Tooltip title="Remove">
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => removeAttachment(attachment.id)}
                      disabled={disabled}
                      sx={{ minWidth: 0, p: 0.5 }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </Tooltip>
                </Paper>
              ))}
            </Stack>

            {/* Upload Info */}
            <Alert severity="info">
              {attachments.length} file(s) attached • {formatFileSize(totalSize)} used
            </Alert>
          </Stack>
        )}

        {/* Empty State */}
        {attachments.length === 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', py: 1 }}>
            No attachments yet
          </Typography>
        )}
      </Stack>
    </Paper>
  );
};
