import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Stack,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useMultilingual } from '../../hooks/useMultilingual';
import { getPhrase } from '../../lib/chat/utils/multilingual';
import type { LanguageConfig } from '../../lib/chat/utils/multilingual';

interface LanguageSelectorProps {
  open: boolean;
  onClose: () => void;
}

export function LanguageSelector({ open, onClose }: LanguageSelectorProps) {
  const { currentLanguage, changeLanguage, isLoading, error, supportedLanguages } = useMultilingual();
  const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage);

  const handleLanguageChange = (languageCode: string) => {
    setSelectedLanguage(languageCode);
  };

  const handleConfirm = async () => {
    await changeLanguage(selectedLanguage);
    onClose();
  };

  const selectedLangConfig = supportedLanguages.find((lang: LanguageConfig) => lang.code === selectedLanguage);
  const currentLangConfig = supportedLanguages.find((lang: LanguageConfig) => lang.code === currentLanguage);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{getPhrase('hello', currentLanguage)} - {getPhrase('hello', selectedLanguage)}</DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={3}>
          {error && <Alert severity="error">{error}</Alert>}

          {isLoading ? (
            <CircularProgress sx={{ mx: 'auto' }} />
          ) : (
            <FormControl fullWidth>
              <InputLabel>Language</InputLabel>
              <Select
                value={selectedLanguage}
                onChange={e => handleLanguageChange(e.target.value)}
                label="Language"
              >
                {supportedLanguages.map((lang: LanguageConfig) => (
                  <MenuItem key={lang.code} value={lang.code}>
                    {lang.nativeName} ({lang.name})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {selectedLangConfig && (
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <div>
                    <Typography variant="h6">{selectedLangConfig.nativeName}</Typography>
                    <Typography color="textSecondary" variant="body2">
                      {selectedLangConfig.name}
                    </Typography>
                  </div>

                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Chip
                      label={`Direction: ${selectedLangConfig.direction === 'rtl' ? 'Right-to-Left' : 'Left-to-Right'}`}
                      size="small"
                    />
                    <Chip
                      label={`Provider: ${selectedLangConfig.translationProvider}`}
                      size="small"
                    />
                  </Stack>

                  {currentLanguage !== selectedLanguage && (
                    <div>
                      <Typography variant="subtitle2">Common Phrases</Typography>
                      <Stack spacing={1}>
                        <Typography variant="body2">
                          {getPhrase('thank_you', currentLanguage)} →{' '}
                          {getPhrase('thank_you', selectedLanguage)}
                        </Typography>
                        <Typography variant="body2">
                          {getPhrase('yes', currentLanguage)} →{' '}
                          {getPhrase('yes', selectedLanguage)}
                        </Typography>
                      </Stack>
                    </div>
                  )}

                  {currentLangConfig && (
                    <div>
                      <Typography variant="caption" color="textSecondary">
                        Current language: {currentLangConfig.nativeName}
                      </Typography>
                    </div>
                  )}
                </Stack>
              </CardContent>
            </Card>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={isLoading || selectedLanguage === currentLanguage}
        >
          Change Language
        </Button>
      </DialogActions>
    </Dialog>
  );
}
