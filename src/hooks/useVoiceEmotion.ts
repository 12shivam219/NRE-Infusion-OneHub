import { useState, useCallback, useEffect } from 'react';
import { useAuth } from './useAuth';
import {
  recordVoiceEmotionScore,
  getVoiceEmotionHistory,
  recordVoiceHealthMetrics,
} from '../lib/api/phase4';
import {
  createVoiceEmotionScore,
  assessVoiceHealth,
} from '../lib/chat/voiceEmotionDetection';
import type {
  VoiceEmotionScore,
  VoiceHealthMetrics,
  AudioFeatures,
} from '../lib/chat/voiceEmotionDetection';

interface UseVoiceEmotionReturn {
  currentEmotion: VoiceEmotionScore | null;
  healthMetrics: VoiceHealthMetrics | null;
  isLoading: boolean;
  error: string | null;
  analyzeAudio: (
    conversationId: string,
    audioId: string,
    audioFeatures: AudioFeatures,
    duration: number
  ) => Promise<VoiceEmotionScore | null>;
  loadHistory: () => Promise<void>;
  assessHealth: () => Promise<void>;
}

export function useVoiceEmotion(): UseVoiceEmotionReturn {
  const { user } = useAuth();
  const [currentEmotion, setCurrentEmotion] = useState<VoiceEmotionScore | null>(null);
  const [healthMetrics, setHealthMetrics] = useState<VoiceHealthMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<VoiceEmotionScore[]>([]);

  const analyzeAudio = useCallback(
    async (
      conversationId: string,
      audioId: string,
      audioFeatures: AudioFeatures,
      duration: number
    ): Promise<VoiceEmotionScore | null> => {
      if (!user?.id) return null;

      try {
        setIsLoading(true);

        // Create emotion score
        const emotionScore = createVoiceEmotionScore(
          conversationId,
          user.id,
          audioId,
          audioFeatures,
          duration
        );

        // Record to database
        await recordVoiceEmotionScore(conversationId, user.id, audioId, {
          dominant_emotion: emotionScore.dominantEmotion,
          emotion_scores: emotionScore.emotionScores,
          confidence: emotionScore.confidence,
          audio_features: emotionScore.audioFeatures,
          duration: emotionScore.duration,
          language: emotionScore.language,
        });

        setCurrentEmotion(emotionScore);
        setHistory((prev) => [emotionScore, ...prev].slice(0, 100));

        return emotionScore;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to analyze audio');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id]
  );

  const loadHistory = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);

      const data = await getVoiceEmotionHistory(user.id, 100);
      setHistory(data as VoiceEmotionScore[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const assessHealth = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);

      // Assess health based on history
      const metrics = assessVoiceHealth(history);

      // Record metrics
      await recordVoiceHealthMetrics(user.id, {
        voice_strain: metrics.voiceStrain,
        fatigue_level: metrics.fatigueLevel,
        emotional_stability: metrics.emotionalStability,
        average_energy: metrics.averageEnergy,
        stress_indicators: metrics.stressIndicators,
        recommendations: metrics.recommendations,
      });

      setHealthMetrics(metrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assess health');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, history]);

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return {
    currentEmotion,
    healthMetrics,
    isLoading,
    error,
    analyzeAudio,
    loadHistory,
    assessHealth,
  };
}
