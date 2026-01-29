/**
 * Multilingual Support
 * Language detection, translation, and localization utilities
 */

export interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  isActive: boolean;
  translationProvider: 'google' | 'deepl' | 'groq' | 'local';
}

export interface TranslationResult {
  original: string;
  translated: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
  cached: boolean;
}

export interface LanguageDetectionResult {
  language: string;
  confidence: number;
  alternatives: Array<{ language: string; confidence: number }>;
}

// Supported languages
export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
    isActive: true,
    translationProvider: 'groq',
  },
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    direction: 'ltr',
    isActive: true,
    translationProvider: 'groq',
  },
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    direction: 'ltr',
    isActive: true,
    translationProvider: 'groq',
  },
  {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    direction: 'ltr',
    isActive: true,
    translationProvider: 'groq',
  },
  {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文',
    direction: 'ltr',
    isActive: true,
    translationProvider: 'groq',
  },
  {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    direction: 'ltr',
    isActive: true,
    translationProvider: 'groq',
  },
  {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    direction: 'ltr',
    isActive: true,
    translationProvider: 'groq',
  },
  {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    direction: 'ltr',
    isActive: true,
    translationProvider: 'groq',
  },
  {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    direction: 'rtl',
    isActive: true,
    translationProvider: 'groq',
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    direction: 'ltr',
    isActive: true,
    translationProvider: 'groq',
  },
];

// Common language phrases
export const LANGUAGE_PHRASES: Record<string, Record<string, string>> = {
  en: {
    hello: 'Hello',
    goodbye: 'Goodbye',
    thank_you: 'Thank you',
    please: 'Please',
    yes: 'Yes',
    no: 'No',
  },
  es: {
    hello: 'Hola',
    goodbye: 'Adiós',
    thank_you: 'Gracias',
    please: 'Por favor',
    yes: 'Sí',
    no: 'No',
  },
  fr: {
    hello: 'Bonjour',
    goodbye: 'Au revoir',
    thank_you: 'Merci',
    please: 'S\'il vous plaît',
    yes: 'Oui',
    no: 'Non',
  },
};

/**
 * Detect language from text using character analysis
 */
export function detectLanguage(text: string): LanguageDetectionResult {
  // Simplified language detection based on character ranges
  const arabicRegex = /[\u0600-\u06FF]/g;
  const chineseRegex = /[\u4E00-\u9FFF]/g;
  const cyrillicRegex = /[\u0400-\u04FF]/g;
  const devanagariRegex = /[\u0900-\u097F]/g;

  const arabicMatches = (text.match(arabicRegex) || []).length;
  const chineseMatches = (text.match(chineseRegex) || []).length;
  const cyrillicMatches = (text.match(cyrillicRegex) || []).length;
  const devanagariMatches = (text.match(devanagariRegex) || []).length;

  const totalMatches = arabicMatches + chineseMatches + cyrillicMatches + devanagariMatches;

  if (totalMatches === 0) {
    // Default to English for Latin text
    return {
      language: 'en',
      confidence: 0.9,
      alternatives: [
        { language: 'es', confidence: 0.05 },
        { language: 'fr', confidence: 0.05 },
      ],
    };
  }

  const candidates = [
    { language: 'ar', count: arabicMatches },
    { language: 'zh', count: chineseMatches },
    { language: 'ru', count: cyrillicMatches },
    { language: 'hi', count: devanagariMatches },
  ].sort((a, b) => b.count - a.count);

  const topCandidate = candidates[0];
  const confidence = topCandidate.count / (text.length * 0.1); // Rough confidence estimate

  return {
    language: topCandidate.language,
    confidence: Math.min(confidence, 0.99),
    alternatives: candidates.slice(1).map(c => ({
      language: c.language,
      confidence: (c.count / text.length) * 0.1,
    })),
  };
}

/**
 * Translate text from source to target language
 */
export async function translateText(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<TranslationResult> {
  if (sourceLanguage === targetLanguage) {
    return {
      original: text,
      translated: text,
      sourceLanguage,
      targetLanguage,
      confidence: 1.0,
      cached: false,
    };
  }

  // This would integrate with actual translation APIs
  // For now, return structured placeholder
  const translatedText = `[Translation to ${targetLanguage}: ${text.substring(0, 50)}...]`;

  return {
    original: text,
    translated: translatedText,
    sourceLanguage,
    targetLanguage,
    confidence: 0.85,
    cached: false,
  };
}

/**
 * Get translation of a phrase key in a specific language
 */
export function getPhrase(phraseKey: string, languageCode: string): string {
  return (
    LANGUAGE_PHRASES[languageCode]?.[phraseKey] ||
    LANGUAGE_PHRASES['en']?.[phraseKey] ||
    phraseKey
  );
}

/**
 * Get language configuration by code
 */
export function getLanguageConfig(code: string): LanguageConfig | undefined {
  return SUPPORTED_LANGUAGES.find(lang => lang.code === code);
}

/**
 * Format text based on language direction (RTL support)
 */
export function formatTextByLanguage(
  text: string,
  languageCode: string
): { text: string; direction: 'ltr' | 'rtl' } {
  const config = getLanguageConfig(languageCode);
  return {
    text,
    direction: config?.direction || 'ltr',
  };
}

/**
 * Convert language preferences to HTML lang attribute
 */
export function getHtmlLangAttribute(languageCode: string): string {
  const parts = languageCode.split('-');
  return parts[0].toLowerCase();
}

/**
 * Cache translation results for performance
 */
export interface TranslationCache {
  key: string; // source_language:target_language:hash(text)
  result: TranslationResult;
  timestamp: Date;
}

/**
 * Generate cache key for translation
 */
export function generateTranslationCacheKey(
  sourceLanguage: string,
  targetLanguage: string,
  text: string
): string {
  const hash = text.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
  return `${sourceLanguage}:${targetLanguage}:${hash}`;
}

/**
 * Validate language code
 */
export function isValidLanguageCode(code: string): boolean {
  return SUPPORTED_LANGUAGES.some(lang => lang.code === code);
}

/**
 * Get list of active languages
 */
export function getActiveLanguages(): LanguageConfig[] {
  return SUPPORTED_LANGUAGES.filter(lang => lang.isActive);
}
