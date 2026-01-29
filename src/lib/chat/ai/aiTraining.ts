/**
 * AI Training from User Interactions
 * Collects feedback and training data from user interactions for model improvement
 */

export type FeedbackType = 'positive' | 'negative' | 'neutral' | 'unclear' | 'inaccurate' | 'helpful' | 'unhelpful';
export type FeedbackRating = 1 | 2 | 3 | 4 | 5;

export interface UserFeedback {
  id: string;
  conversationId: string;
  messageId: string;
  userId: string;
  feedbackType: FeedbackType;
  rating: FeedbackRating;
  comment: string;
  suggestedImprovement?: string;
  timestamp: Date;
  modelUsed?: string;
  tokensInMessage?: number;
}

export interface TrainingDataPoint {
  id: string;
  messageId: string;
  input: string;
  output: string;
  userId: string;
  feedback: UserFeedback;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  relevance: number; // 0-1 score
  timestamp: Date;
}

export interface TrainingDataset {
  id: string;
  name: string;
  description: string;
  dataPoints: TrainingDataPoint[];
  size: number;
  qualityScore: number;
  createdAt: Date;
  updatedAt: Date;
  isReady: boolean;
  status: 'collecting' | 'validating' | 'ready' | 'training';
}

export interface TrainingMetrics {
  totalFeedback: number;
  positiveFeedback: number;
  negativeFeedback: number;
  averageRating: number;
  improvementAreas: string[];
  strongAreas: string[];
  suggestedFocusTopics: string[];
}

/**
 * Create user feedback record
 */
export function createFeedback(
  conversationId: string,
  messageId: string,
  userId: string,
  feedbackType: FeedbackType,
  rating: FeedbackRating,
  comment: string,
  options?: {
    suggestedImprovement?: string;
    modelUsed?: string;
    tokensInMessage?: number;
  }
): UserFeedback {
  return {
    id: `feedback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    conversationId,
    messageId,
    userId,
    feedbackType,
    rating,
    comment,
    suggestedImprovement: options?.suggestedImprovement,
    timestamp: new Date(),
    modelUsed: options?.modelUsed,
    tokensInMessage: options?.tokensInMessage,
  };
}

/**
 * Validate feedback
 */
export function validateFeedback(feedback: UserFeedback): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!feedback.conversationId) {
    errors.push('Conversation ID is required');
  }

  if (!feedback.messageId) {
    errors.push('Message ID is required');
  }

  if (!feedback.userId) {
    errors.push('User ID is required');
  }

  if (!['positive', 'negative', 'neutral', 'unclear', 'inaccurate', 'helpful', 'unhelpful'].includes(feedback.feedbackType)) {
    errors.push('Invalid feedback type');
  }

  if (feedback.rating < 1 || feedback.rating > 5) {
    errors.push('Rating must be between 1 and 5');
  }

  if (!feedback.comment || feedback.comment.trim().length === 0) {
    errors.push('Comment is required');
  }

  if (feedback.comment.length > 1000) {
    errors.push('Comment cannot exceed 1000 characters');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create training data point from feedback
 */
export function createTrainingDataPoint(
  messageId: string,
  input: string,
  output: string,
  userId: string,
  feedback: UserFeedback,
  category: string,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): TrainingDataPoint {
  // Calculate relevance based on feedback rating (1-5 maps to 0.2-1.0)
  const relevance = (feedback.rating - 1) / 4;

  return {
    id: `training-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    messageId,
    input,
    output,
    userId,
    feedback,
    category,
    difficulty,
    relevance,
    timestamp: new Date(),
  };
}

/**
 * Create training dataset
 */
export function createTrainingDataset(
  name: string,
  description: string,
  dataPoints: TrainingDataPoint[] = []
): TrainingDataset {
  return {
    id: `dataset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    description,
    dataPoints,
    size: dataPoints.length,
    qualityScore: calculateDatasetQuality(dataPoints),
    createdAt: new Date(),
    updatedAt: new Date(),
    isReady: dataPoints.length >= 100,
    status: 'collecting',
  };
}

/**
 * Calculate training dataset quality score
 */
export function calculateDatasetQuality(dataPoints: TrainingDataPoint[]): number {
  if (dataPoints.length === 0) return 0;

  // Quality = average relevance + variety penalty
  const avgRelevance = dataPoints.reduce((sum, dp) => sum + dp.relevance, 0) / dataPoints.length;

  // Check for variety
  const categories = new Set(dataPoints.map(dp => dp.category));
  const categoryVariety = Math.min(categories.size / 10, 1); // Max score at 10+ categories

  // Check for difficulty balance
  const difficulties = { easy: 0, medium: 0, hard: 0 };
  dataPoints.forEach(dp => {
    difficulties[dp.difficulty]++;
  });
  const avgDifficulty = (difficulties.easy + difficulties.medium * 2 + difficulties.hard * 3) / (dataPoints.length * 3);

  // Weighted quality score
  return avgRelevance * 0.5 + categoryVariety * 0.3 + avgDifficulty * 0.2;
}

/**
 * Aggregate training metrics from feedback
 */
export function aggregateTrainingMetrics(feedbackList: UserFeedback[]): TrainingMetrics {
  if (feedbackList.length === 0) {
    return {
      totalFeedback: 0,
      positiveFeedback: 0,
      negativeFeedback: 0,
      averageRating: 0,
      improvementAreas: [],
      strongAreas: [],
      suggestedFocusTopics: [],
    };
  }

  const positiveFeedback = feedbackList.filter(
    f => f.feedbackType === 'positive' || f.feedbackType === 'helpful'
  ).length;
  const negativeFeedback = feedbackList.filter(
    f => f.feedbackType === 'negative' || f.feedbackType === 'unhelpful' || f.feedbackType === 'inaccurate'
  ).length;

  const avgRating = feedbackList.reduce((sum, f) => sum + f.rating, 0) / feedbackList.length;

  // Extract improvement areas from comments with negative feedback
  const improvementAreas = feedbackList
    .filter(f => f.feedbackType === 'negative' || f.feedbackType === 'inaccurate')
    .map(f => f.comment)
    .slice(0, 5);

  // Extract strong areas from positive feedback
  const strongAreas = feedbackList
    .filter(f => f.feedbackType === 'positive' || f.feedbackType === 'helpful')
    .map(f => f.comment)
    .slice(0, 5);

  // Focus topics from suggestions
  const suggestedFocusTopics = feedbackList
    .filter(f => f.suggestedImprovement)
    .map(f => f.suggestedImprovement!)
    .slice(0, 5);

  return {
    totalFeedback: feedbackList.length,
    positiveFeedback,
    negativeFeedback,
    averageRating: Math.round(avgRating * 100) / 100,
    improvementAreas,
    strongAreas,
    suggestedFocusTopics,
  };
}

/**
 * Determine if dataset is ready for training
 */
export function isDatasetReadyForTraining(dataset: TrainingDataset): {
  ready: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  if (dataset.size < 100) {
    reasons.push(`Dataset has only ${dataset.size} points, need at least 100`);
  }

  if (dataset.qualityScore < 0.6) {
    reasons.push(`Quality score ${dataset.qualityScore.toFixed(2)} is below threshold (0.6)`);
  }

  // Check for class balance
  const categories = new Map<string, number>();
  dataset.dataPoints.forEach(dp => {
    categories.set(dp.category, (categories.get(dp.category) || 0) + 1);
  });

  const sizes = Array.from(categories.values());
  const maxSize = Math.max(...sizes);
  const minSize = Math.min(...sizes);
  const balance = minSize / maxSize;

  if (balance < 0.3) {
    reasons.push('Dataset has poor class balance');
  }

  return {
    ready: reasons.length === 0,
    reasons,
  };
}

/**
 * Calculate data point usefulness
 */
export function calculateDataPointUsefulness(dataPoint: TrainingDataPoint): number {
  // Weighted score: relevance (50%) + frequency (30%) + recency (20%)
  const recencyDays = Math.max(0, (new Date().getTime() - dataPoint.timestamp.getTime()) / (1000 * 60 * 60 * 24));
  const recencyScore = Math.max(0, 1 - recencyDays / 365);

  return dataPoint.relevance * 0.5 + 0.3 + recencyScore * 0.2;
}

/**
 * Filter training data by criteria
 */
export function filterTrainingData(
  dataPoints: TrainingDataPoint[],
  criteria: {
    category?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    minRelevance?: number;
    afterDate?: Date;
  }
): TrainingDataPoint[] {
  return dataPoints.filter(dp => {
    if (criteria.category && dp.category !== criteria.category) return false;
    if (criteria.difficulty && dp.difficulty !== criteria.difficulty) return false;
    if (criteria.minRelevance && dp.relevance < criteria.minRelevance) return false;
    if (criteria.afterDate && dp.timestamp < criteria.afterDate) return false;
    return true;
  });
}
