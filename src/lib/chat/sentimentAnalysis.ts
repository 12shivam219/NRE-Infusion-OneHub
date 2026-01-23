/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Sentiment Analysis Module
 * Analyzes text sentiment and emotional content
 */

export type SentimentPolarity = 'positive' | 'negative' | 'neutral' | 'mixed';
export type EmotionalCategory =
  | 'joy'
  | 'sadness'
  | 'anger'
  | 'fear'
  | 'surprise'
  | 'disgust'
  | 'neutral';

export interface SentimentScore {
  id: string;
  text: string;
  polarity: SentimentPolarity;
  confidence: number; // 0-100
  score: number; // -1 to 1 (-1 very negative, 1 very positive)
  subjectivity: number; // 0-1 (0 objective, 1 subjective)
  emotionalDimensions: {
    valence: number; // -1 to 1 (negative to positive)
    arousal: number; // 0 to 1 (calm to excited)
    dominance: number; // 0 to 1 (submissive to dominant)
  };
  emotions: Record<EmotionalCategory, number>; // 0-100 for each
  analyzedAt: string;
}

export interface SentimentTrend {
  conversationId: string;
  userId: string;
  sentimentHistory: SentimentScore[];
  averageSentiment: number;
  trend: 'improving' | 'declining' | 'stable';
  trendConfidence: number;
  emotionalArc: EmotionalCategory[];
}

export interface SentimentIssue {
  id: string;
  conversationId: string;
  userId: string;
  detectedAt: string;
  type: 'frustration' | 'confusion' | 'dissatisfaction' | 'urgency';
  sentimentScore: SentimentScore;
  suggestedAction: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

// Sentiment analysis helper functions
const POSITIVE_WORDS = [
  'great',
  'excellent',
  'amazing',
  'wonderful',
  'good',
  'awesome',
  'fantastic',
  'love',
  'happy',
  'perfect',
];

const NEGATIVE_WORDS = [
  'terrible',
  'awful',
  'horrible',
  'bad',
  'hate',
  'frustrating',
  'disappointed',
  'angry',
  'sad',
  'poor',
];

const INTENSIFIERS = ['very', 'extremely', 'absolutely', 'incredibly', 'so'];

export function analyzeSentiment(text: string): SentimentScore {
  const normalized = text.toLowerCase();
  let score = 0;
  let wordCount = 0;
  let hasIntensifier = false;

  // Check for intensifiers
  if (INTENSIFIERS.some((int) => normalized.includes(int))) {
    hasIntensifier = true;
  }

  // Count positive and negative words
  const positiveCount = POSITIVE_WORDS.filter((word) =>
    normalized.includes(word)
  ).length;
  const negativeCount = NEGATIVE_WORDS.filter((word) =>
    normalized.includes(word)
  ).length;

  wordCount = positiveCount + negativeCount;

  if (wordCount > 0) {
    score = (positiveCount - negativeCount) / wordCount;
    if (hasIntensifier) {
      score *= 1.3;
    }
  }

  // Clamp score to -1 to 1
  score = Math.max(-1, Math.min(1, score));

  const polarity: SentimentPolarity =
    score > 0.2 ? 'positive' : score < -0.2 ? 'negative' : 'neutral';

  const confidence = Math.min(100, Math.abs(score) * 100 + wordCount * 10);
  const subjectivity = Math.min(1, wordCount * 0.1);

  // Calculate emotional dimensions
  const valence = score;
  const arousal = Math.min(
    1,
    (Math.abs(score) + (hasIntensifier ? 0.3 : 0)) / 1.3
  );
  const dominance = score > 0 ? 0.6 : 0.4;

  // Map to emotional categories
  const emotions = calculateEmotions(text, valence, arousal);

  return {
    id: `sent_${Date.now()}`,
    text,
    polarity,
    confidence,
    score,
    subjectivity,
    emotionalDimensions: {
      valence,
      arousal,
      dominance,
    },
    emotions,
    analyzedAt: new Date().toISOString(),
  };
}

function calculateEmotions(
  text: string,
  valence: number,
  arousal: number
): Record<EmotionalCategory, number> {
  const normalized = text.toLowerCase();

  const emotionWeights: Record<EmotionalCategory, number> = {
    joy: 0,
    sadness: 0,
    anger: 0,
    fear: 0,
    surprise: 0,
    disgust: 0,
    neutral: 0,
  };

  // Joy indicators
  if (normalized.match(/\bhappy\b|laugh|smile|joy|excited|wonderful/)) {
    emotionWeights.joy = 80;
  }

  // Sadness indicators
  if (normalized.match(/\bsad\b|unhappy|depressed|down|grief|sorr/)) {
    emotionWeights.sadness = 80;
  }

  // Anger indicators
  if (normalized.match(/angry|furious|rage|mad|irritated|annoyed/)) {
    emotionWeights.anger = 80;
  }

  // Fear indicators
  if (normalized.match(/afraid|scared|worried|anxious|fear|dread/)) {
    emotionWeights.fear = 80;
  }

  // Surprise indicators
  if (normalized.match(/surprised|shocked|amazed|astonished|unexpected/)) {
    emotionWeights.surprise = 80;
  }

  // Disgust indicators
  if (normalized.match(/disgusted|gross|yuck|nasty|disgusting/)) {
    emotionWeights.disgust = 80;
  }

  // If no strong emotion detected, distribute based on valence/arousal
  if (Object.values(emotionWeights).every((w) => w === 0)) {
    if (valence > 0.5) {
      emotionWeights.joy = 30 + arousal * 50;
      emotionWeights.surprise = 20;
    } else if (valence < -0.5) {
      emotionWeights.sadness = 30;
      emotionWeights.anger = 20 + arousal * 50;
    } else {
      emotionWeights.neutral = 100;
    }
  }

  // Normalize to 0-100 range
  const maxWeight = Math.max(...Object.values(emotionWeights));
  if (maxWeight > 0) {
    Object.keys(emotionWeights).forEach((key) => {
      emotionWeights[key as EmotionalCategory] =
        (emotionWeights[key as EmotionalCategory] / maxWeight) * 100;
    });
  }

  return emotionWeights;
}

export function createSentimentTrend(
  conversationId: string,
  userId: string
): SentimentTrend {
  return {
    conversationId,
    userId,
    sentimentHistory: [],
    averageSentiment: 0,
    trend: 'stable',
    trendConfidence: 0,
    emotionalArc: [],
  };
}

export function addToSentimentTrend(
  trend: SentimentTrend,
  sentiment: SentimentScore
): SentimentTrend {
  const updated = {
    ...trend,
    sentimentHistory: [...trend.sentimentHistory, sentiment],
  };

  // Calculate trend
  if (updated.sentimentHistory.length > 2) {
    const recent = updated.sentimentHistory.slice(-3);
    const scores = recent.map((s) => s.score);
    const average =
      scores.reduce((a, b) => a + b, 0) / scores.length;

    let increasing = 0;
    for (let i = 1; i < scores.length; i++) {
      if (scores[i] > scores[i - 1]) increasing++;
    }

    if (increasing >= 1) {
      updated.trend = 'improving';
    } else if (increasing === 0) {
      updated.trend = 'declining';
    } else {
      updated.trend = 'stable';
    }

    updated.averageSentiment = average;
    updated.trendConfidence = (Math.abs(increasing / (scores.length - 1))) * 100;
  }

  // Update emotional arc
  const topEmotion = Object.entries(sentiment.emotions).sort(
    ([, a], [, b]) => b - a
  )[0];
  if (topEmotion && topEmotion[1] > 20) {
    updated.emotionalArc = [
      ...updated.emotionalArc,
      topEmotion[0] as EmotionalCategory,
    ].slice(-10);
  }

  return updated;
}

export function detectSentimentIssues(
  conversationId: string,
  userId: string,
  trend: SentimentTrend
): SentimentIssue[] {
  const issues: SentimentIssue[] = [];
  const recent = trend.sentimentHistory.slice(-5);

  for (const sentiment of recent) {
    if (sentiment.polarity === 'negative' && sentiment.confidence > 70) {
      let type: 'frustration' | 'confusion' | 'dissatisfaction' | 'urgency' =
        'dissatisfaction';

      if (sentiment.emotions.anger > 50) type = 'frustration';
      if (sentiment.emotions.fear > 50) type = 'urgency';
      if (sentiment.text.toLowerCase().includes('understand')) {
        type = 'confusion';
      }

      let priority: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (sentiment.confidence > 90) priority = 'high';
      if (sentiment.score < -0.7) priority = 'critical';

      issues.push({
        id: `issue_${Date.now()}`,
        conversationId,
        userId,
        detectedAt: sentiment.analyzedAt,
        type,
        sentimentScore: sentiment,
        suggestedAction: getSuggestedAction(type, sentiment),
        priority,
      });
    }
  }

  return issues;
}

function getSuggestedAction(
  issueType: string,
  _sentiment: SentimentScore
): string {
  switch (issueType) {
    case 'frustration':
      return 'Offer immediate assistance and simplify next steps';
    case 'confusion':
      return 'Provide clearer explanation or examples';
    case 'dissatisfaction':
      return 'Ask for feedback and offer alternatives';
    case 'urgency':
      return 'Escalate to human support or provide emergency resources';
    default:
      return 'Check in with user';
  }
}

export function getEmotionalSummary(
  trend: SentimentTrend
): Record<EmotionalCategory, number> {
  const summary: Record<EmotionalCategory, number> = {
    joy: 0,
    sadness: 0,
    anger: 0,
    fear: 0,
    surprise: 0,
    disgust: 0,
    neutral: 0,
  };

  if (trend.sentimentHistory.length === 0) return summary;

  for (const sentiment of trend.sentimentHistory) {
    for (const [emotion, score] of Object.entries(sentiment.emotions)) {
      summary[emotion as EmotionalCategory] += score;
    }
  }

  // Normalize
  const count = trend.sentimentHistory.length;
  for (const emotion in summary) {
    summary[emotion as EmotionalCategory] /= count;
  }

  return summary;
}

export function recommendToneAdjustment(
  trend: SentimentTrend
): 'empathetic' | 'energetic' | 'calm' | 'direct' {
  if (trend.averageSentiment < -0.3) {
    return 'empathetic';
  }
  if (trend.averageSentiment > 0.5) {
    return 'energetic';
  }
  if (trend.emotionalArc.some((e) => e === 'fear' || e === 'anger')) {
    return 'calm';
  }
  return 'direct';
}
