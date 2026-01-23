import { useState, useCallback, useEffect } from 'react';
import { useAuth } from './useAuth';
import {
  saveLanguagePreference,
  getLanguagePreference,
  getTranslationFromCache,
  cacheTranslation,
} from '../lib/api/phase3';
import { getLanguageConfig, SUPPORTED_LANGUAGES, detectLanguage } from '../lib/chat/multilingual';

export function useMultilingual() {
  const { user } = useAuth();
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [translationCache, setTranslationCache] = useState<Map<string, string>>(new Map());

  // Load user's language preference on mount
  useEffect(() => {
    if (user?.id) {
      loadLanguagePreference();
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadLanguagePreference = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const result = await getLanguagePreference(user.id);
      if (result.success && result.data) {
        setCurrentLanguage(result.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load language preference');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const changeLanguage = useCallback(
    async (languageCode: string) => {
      if (!user?.id) return;

      const config = getLanguageConfig(languageCode);
      if (!config) {
        setError('Invalid language code');
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const result = await saveLanguagePreference(user.id, languageCode);
        if (result.success) {
          setCurrentLanguage(languageCode);
        } else {
          setError(result.error || 'Failed to change language');
        }
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id]
  );

  const detectAndSetLanguage = useCallback((text: string) => {
    const detection = detectLanguage(text);
    setDetectedLanguage(detection.language);
    return detection;
  }, []);

  const getTranslation = useCallback(
    async (
      text: string,
      sourceLanguage: string,
      targetLanguage: string
    ): Promise<string | null> => {
      if (sourceLanguage === targetLanguage) {
        return text;
      }

      const cacheKey = `${sourceLanguage}:${targetLanguage}:${text}`;

      // Check local cache first
      if (translationCache.has(cacheKey)) {
        return translationCache.get(cacheKey) || null;
      }

      if (!user?.id) return null;

      try {
        // Check database cache
        const cachedResult = await getTranslationFromCache(sourceLanguage, targetLanguage, text);
        if (cachedResult.success && cachedResult.data) {
          setTranslationCache(prev => new Map(prev).set(cacheKey, cachedResult.data));
          return cachedResult.data;
        }

        // In real implementation, would call translation API here
        return null;
      } catch (err) {
        console.error('Translation error:', err);
        return null;
      }
    },
    [user?.id, translationCache]
  );

  const cacheTranslationResult = useCallback(
    async (
      sourceLanguage: string,
      targetLanguage: string,
      originalText: string,
      translatedText: string
    ) => {
      if (!user?.id) return;

      try {
        await cacheTranslation(user.id, sourceLanguage, targetLanguage, originalText, translatedText);
        const cacheKey = `${sourceLanguage}:${targetLanguage}:${originalText}`;
        setTranslationCache(prev => new Map(prev).set(cacheKey, translatedText));
      } catch (err) {
        console.error('Failed to cache translation:', err);
      }
    },
    [user?.id]
  );

  return {
    currentLanguage,
    detectedLanguage,
    isLoading,
    error,
    changeLanguage,
    detectAndSetLanguage,
    getTranslation,
    cacheTranslationResult,
    supportedLanguages: SUPPORTED_LANGUAGES,
  };
}
