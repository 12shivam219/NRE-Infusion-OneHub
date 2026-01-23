/**
 * Wake word detection utilities
 * Detects wake words to automatically activate voice listening
 */

export interface WakeWordSettings {
  wakeWord: string;
  isEnabled: boolean;
  sensitivity: number; // 0.1 - 1.0
  autoListenDurationMs: number;
}

/**
 * Simple wake word detector using pattern matching
 * In production, consider using a proper library like Porcupine or Snowboy
 */
export class WakeWordDetector {
  private wakeWord: string;
  private sensitivity: number;
  private buffer: string[] = [];
  private readonly maxBufferLength = 5;

  constructor(wakeWord: string, sensitivity: number = 0.7) {
    this.wakeWord = wakeWord.toLowerCase().trim();
    this.sensitivity = Math.min(1.0, Math.max(0.1, sensitivity)); // Clamp 0.1-1.0
  }

  /**
   * Check if transcript contains wake word
   */
  detectWakeWord(transcript: string): boolean {
    const normalized = transcript.toLowerCase().trim();
    
    // Exact match
    if (normalized === this.wakeWord) {
      return true;
    }

    // Contains match
    if (normalized.includes(this.wakeWord)) {
      // Higher sensitivity = match more readily
      if (this.sensitivity > 0.7) {
        return true;
      }
    }

    // Fuzzy match (levenshtein distance)
    if (this.sensitivity > 0.5) {
      const distance = this.levenshteinDistance(normalized, this.wakeWord);
      const threshold = Math.ceil(this.wakeWord.length * (1 - this.sensitivity));
      if (distance <= threshold) {
        return true;
      }
    }

    return false;
  }

  /**
   * Add transcript to buffer for continuous monitoring
   */
  addTranscript(transcript: string): void {
    this.buffer.push(transcript.toLowerCase());
    if (this.buffer.length > this.maxBufferLength) {
      this.buffer.shift();
    }
  }

  /**
   * Check buffer for wake word (for interim results)
   */
  checkBuffer(): boolean {
    const combined = this.buffer.join(' ');
    return this.detectWakeWord(combined);
  }

  /**
   * Reset buffer
   */
  reset(): void {
    this.buffer = [];
  }

  /**
   * Calculate Levenshtein distance for fuzzy matching
   */
  private levenshteinDistance(s1: string, s2: string): number {
    const len1 = s1.length;
    const len2 = s2.length;
    const dp: number[][] = Array(len1 + 1)
      .fill(null)
      .map(() => Array(len2 + 1).fill(0));

    for (let i = 0; i <= len1; i++) dp[i][0] = i;
    for (let j = 0; j <= len2; j++) dp[0][j] = j;

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
      }
    }

    return dp[len1][len2];
  }

  /**
   * Update settings
   */
  updateSettings(wakeWord: string, sensitivity: number): void {
    this.wakeWord = wakeWord.toLowerCase().trim();
    this.sensitivity = Math.min(1.0, Math.max(0.1, sensitivity));
  }
}

/**
 * Wake word detection state machine
 */
export class WakeWordListener {
  private detector: WakeWordDetector;
  private isListening: boolean = false;
  private lastWakeWordTime: number = 0;
  private readonly cooldownMs: number = 500;
  private autoListenTimeoutId?: number;

  constructor(
    wakeWord: string,
    sensitivity: number,
    private autoListenDurationMs: number = 5000
  ) {
    this.detector = new WakeWordDetector(wakeWord, sensitivity);
  }

  /**
   * Process transcript chunk
   */
  processTranscript(transcript: string): {
    wakeWordDetected: boolean;
    shouldAutoStart: boolean;
  } {
    this.detector.addTranscript(transcript);

    const now = Date.now();
    const isWakeWordDetected =
      this.detector.checkBuffer() && now - this.lastWakeWordTime > this.cooldownMs;

    if (isWakeWordDetected) {
      this.lastWakeWordTime = now;
      this.startAutoListen();
      return { wakeWordDetected: true, shouldAutoStart: true };
    }

    return { wakeWordDetected: false, shouldAutoStart: this.isListening };
  }

  /**
   * Start auto-listen mode
   */
  private startAutoListen(): void {
    this.isListening = true;

    if (this.autoListenTimeoutId) {
      clearTimeout(this.autoListenTimeoutId);
    }

    this.autoListenTimeoutId = window.setTimeout(() => {
      this.isListening = false;
    }, this.autoListenDurationMs);
  }

  /**
   * Check if currently in auto-listen mode
   */
  isInAutoListenMode(): boolean {
    return this.isListening;
  }

  /**
   * Stop auto-listen mode
   */
  stopAutoListen(): void {
    this.isListening = false;
    if (this.autoListenTimeoutId) {
      clearTimeout(this.autoListenTimeoutId);
    }
  }

  /**
   * Reset detector
   */
  reset(): void {
    this.detector.reset();
    this.stopAutoListen();
  }

  /**
   * Update settings
   */
  updateSettings(
    wakeWord: string,
    sensitivity: number,
    autoListenDurationMs: number
  ): void {
    this.detector.updateSettings(wakeWord, sensitivity);
    this.autoListenDurationMs = autoListenDurationMs;
  }

  /**
   * Get current detector for testing/monitoring
   */
  getDetector(): WakeWordDetector {
    return this.detector;
  }
}

/**
 * Default wake words
 */
export const DEFAULT_WAKE_WORDS = [
  'hey assistant',
  'hey ai',
  'assistant',
  'wake up',
  'listen up',
];
