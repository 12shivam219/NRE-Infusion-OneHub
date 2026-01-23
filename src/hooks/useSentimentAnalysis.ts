import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { recordSentimentScore, getSentimentTrend } from '../lib/api/phase4';
import {
  analyzeSentiment,
  createSentimentTrend,
  addToSentimentTrend,
  detectSentimentIssues,
} from '../lib/chat/sentimentAnalysis';
import type { SentimentScore, SentimentTrend } from '../lib/chat/sentimentAnalysis';

interface UseSentimentAnalysisReturn {
  trend: SentimentTrend | null;
  isLoading: boolean;
  error: string | null;
  analyzeTurn: (text: string, conversationId: string) => Promise<SentimentScore | null>;
  loadTrend: (conversationId: string) => Promise<void>;
  getIssues: (conversationId: string) => void;
}

export function useSentimentAnalysis(): UseSentimentAnalysisReturn {
  const { user } = useAuth();
  const [trend, setTrend] = useState<SentimentTrend | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeTurn = useCallback(
    async (text: string, conversationId: string): Promise<SentimentScore | null> => {
      if (!user?.id) return null;

      try {
        setIsLoading(true);

        // Analyze sentiment
        const sentiment = analyzeSentiment(text);

        // Record to database
        await recordSentimentScore(conversationId, user.id, text, {
          polarity: sentiment.polarity,
          confidence: sentiment.confidence,
          score: sentiment.score,
          subjectivity: sentiment.subjectivity,
          emotional_dimensions: sentiment.emotionalDimensions,
          emotions: sentiment.emotions,
        });

        // Update trend
        if (trend) {
          const updated = addToSentimentTrend(trend, sentiment);
          setTrend(updated);
        }

        return sentiment;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to analyze sentiment');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id, trend]
  );

  const loadTrend = useCallback(
    async (conversationId: string) => {
      if (!user?.id) return;

      try {
        setIsLoading(true);

        const scores = await getSentimentTrend(conversationId, 50);

        if (scores && scores.length > 0) {
          let newTrend = createSentimentTrend(conversationId, user.id);
          for (const score of scores) {
            newTrend = addToSentimentTrend(newTrend, score as SentimentScore);
          }
          setTrend(newTrend);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load sentiment trend');
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id]
  );

  const getIssues = useCallback(
    (conversationId: string) => {
      if (!trend || !user?.id) return;

      try {
        const issues = detectSentimentIssues(conversationId, user.id, trend);
        // In real implementation, would dispatch these to be displayed
        console.log('Detected sentiment issues:', issues);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to detect issues');
      }
    },
    [trend, user?.id]
  );

  return {
    trend,
    isLoading,
    error,
    analyzeTurn,
    loadTrend,
    getIssues,
  };
}
