/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/**
 * Voice Emotion Detection Module
 * Analyzes voice/audio for emotional content and characteristics
 */

export type VoiceEmotion =
  | 'happiness'
  | 'sadness'
  | 'anger'
  | 'fear'
  | 'disgust'
  | 'surprise'
  | 'neutral'
  | 'confusion'
  | 'excitement'
  | 'frustration';

export interface AudioFeatures {
  pitch: number; // Hz
  pitchVariance: number; // Standard deviation
  energy: number; // RMS energy
  energyVariance: number;
  speechRate: number; // Words per minute
  pauseDuration: number; // Average pause duration in ms
  voiceQuality: 'clear' | 'breathy' | 'creaky' | 'tense';
  intensity: number; // 0-100
}

export interface VoiceEmotionScore {
  id: string;
  conversationId: string;
  userId: string;
  audioId: string;
  dominantEmotion: VoiceEmotion;
  emotionScores: Record<VoiceEmotion, number>; // 0-100 for each
  confidence: number; // 0-100
  audioFeatures: AudioFeatures;
  duration: number; // milliseconds
  language: string;
  detectedAt: string;
  metadata?: Record<string, any>;
}

export interface VoicePattern {
  userId: string;
  patternType:
    | 'baseline'
    | 'excited'
    | 'sad'
    | 'stressed'
    | 'relaxed'
    | 'confused';
  audioFeatures: AudioFeatures;
  prevalence: number; // 0-100 (how often this pattern occurs)
  associatedContext: string[];
  createdAt: string;
}

export interface VoiceHealthMetrics {
  userId: string;
  voiceStrain: number; // 0-100
  fatigueLevel: number; // 0-100
  emotionalStability: number; // 0-100
  averageEnergy: number;
  stressIndicators: string[];
  recommendations: string[];
  lastAssessedAt: string;
}

// Emotion-to-audio feature mapping
const EMOTION_CHARACTERISTICS: Record<
  VoiceEmotion,
  Partial<AudioFeatures>
> = {
  happiness: {
    pitch: 150,
    pitchVariance: 60,
    energy: 0.7,
    speechRate: 150,
    voiceQuality: 'clear',
  },
  sadness: {
    pitch: 80,
    pitchVariance: 20,
    energy: 0.3,
    speechRate: 100,
    voiceQuality: 'breathy',
  },
  anger: {
    pitch: 120,
    pitchVariance: 80,
    energy: 0.9,
    speechRate: 180,
    voiceQuality: 'tense',
  },
  fear: {
    pitch: 140,
    pitchVariance: 100,
    energy: 0.6,
    speechRate: 130,
    voiceQuality: 'tense',
  },
  disgust: {
    pitch: 110,
    pitchVariance: 40,
    energy: 0.5,
    speechRate: 110,
    voiceQuality: 'creaky',
  },
  surprise: {
    pitch: 160,
    pitchVariance: 120,
    energy: 0.8,
    speechRate: 160,
    voiceQuality: 'clear',
  },
  neutral: {
    pitch: 100,
    pitchVariance: 30,
    energy: 0.5,
    speechRate: 120,
    voiceQuality: 'clear',
  },
  confusion: {
    pitch: 115,
    pitchVariance: 70,
    energy: 0.4,
    speechRate: 100,
    voiceQuality: 'breathy',
  },
  excitement: {
    pitch: 155,
    pitchVariance: 90,
    energy: 0.85,
    speechRate: 170,
    voiceQuality: 'clear',
  },
  frustration: {
    pitch: 125,
    pitchVariance: 75,
    energy: 0.75,
    speechRate: 155,
    voiceQuality: 'tense',
  },
};

export function analyzeAudioFeatures(
  pitch: number,
  pitchVariance: number,
  energy: number,
  energyVariance: number,
  speechRate: number,
  pauseDuration: number
): AudioFeatures {
  // Determine voice quality based on features
  let voiceQuality: 'clear' | 'breathy' | 'creaky' | 'tense' = 'clear';
  if (energy < 0.3) voiceQuality = 'breathy';
  else if (energy > 0.8 && pitchVariance > 80) voiceQuality = 'tense';
  else if (pitchVariance < 20) voiceQuality = 'creaky';

  const intensity = Math.min(100, (energy * 100 + (speechRate - 60) / 2) / 2);

  return {
    pitch,
    pitchVariance,
    energy,
    energyVariance,
    speechRate,
    pauseDuration,
    voiceQuality,
    intensity,
  };
}

export function detectVoiceEmotion(
  audioFeatures: AudioFeatures
): { emotion: VoiceEmotion; confidence: number } {
  const scores: Record<VoiceEmotion, number> = {
    happiness: 0,
    sadness: 0,
    anger: 0,
    fear: 0,
    disgust: 0,
    surprise: 0,
    neutral: 0,
    confusion: 0,
    excitement: 0,
    frustration: 0,
  };

  // Compare features to emotion characteristics
  for (const [emotion, characteristics] of Object.entries(
    EMOTION_CHARACTERISTICS
  )) {
    let score = 0;
    let featureCount = 0;

    if (
      characteristics.pitch &&
      Math.abs(audioFeatures.pitch - characteristics.pitch) < 30
    ) {
      score += 20;
    }
    featureCount++;

    if (
      characteristics.energy &&
      Math.abs(audioFeatures.energy - characteristics.energy) < 0.15
    ) {
      score += 20;
    }
    featureCount++;

    if (
      characteristics.speechRate &&
      Math.abs(audioFeatures.speechRate - characteristics.speechRate) < 30
    ) {
      score += 20;
    }
    featureCount++;

    if (characteristics.voiceQuality === audioFeatures.voiceQuality) {
      score += 25;
    }
    featureCount++;

    scores[emotion as VoiceEmotion] = featureCount > 0 ? score / featureCount : 0;
  }

  // Find dominant emotion
  const dominantEmotion = Object.entries(scores).sort(
    ([, a], [, b]) => b - a
  )[0][0] as VoiceEmotion;

  const confidence = scores[dominantEmotion];

  return { emotion: dominantEmotion, confidence };
}

export function createVoiceEmotionScore(
  conversationId: string,
  userId: string,
  audioId: string,
  audioFeatures: AudioFeatures,
  duration: number,
  language: string = 'en'
): VoiceEmotionScore {
  const { emotion, confidence } = detectVoiceEmotion(audioFeatures);

  // Generate emotion scores
  const emotionScores: Record<VoiceEmotion, number> = {
    happiness: 0,
    sadness: 0,
    anger: 0,
    fear: 0,
    disgust: 0,
    surprise: 0,
    neutral: 0,
    confusion: 0,
    excitement: 0,
    frustration: 0,
  };

  // Distribute confidence across similar emotions
  emotionScores[emotion] = confidence;

  // Add secondary emotions
  if (emotion === 'happiness') {
    emotionScores.excitement = Math.max(0, confidence - 30);
  } else if (emotion === 'anger') {
    emotionScores.frustration = Math.max(0, confidence - 20);
  } else if (emotion === 'fear') {
    emotionScores.confusion = Math.max(0, confidence - 20);
  }

  return {
    id: `emo_${Date.now()}`,
    conversationId,
    userId,
    audioId,
    dominantEmotion: emotion,
    emotionScores,
    confidence,
    audioFeatures,
    duration,
    language,
    detectedAt: new Date().toISOString(),
  };
}

export function identifyVoicePattern(
  userId: string,
  audioFeatures: AudioFeatures,
  context: string[] = []
): VoicePattern {
  // Determine pattern type based on features
  let patternType: 'baseline' | 'excited' | 'sad' | 'stressed' | 'relaxed' =
    'baseline';

  if (audioFeatures.energy > 0.75 && audioFeatures.speechRate > 150) {
    patternType = 'excited';
  } else if (audioFeatures.energy < 0.4 && audioFeatures.speechRate < 110) {
    patternType = 'sad';
  } else if (audioFeatures.pitchVariance > 80 && audioFeatures.energy > 0.7) {
    patternType = 'stressed';
  } else if (audioFeatures.energy < 0.5 && audioFeatures.pauseDuration > 500) {
    patternType = 'relaxed';
  }

  return {
    userId,
    patternType: patternType as any,
    audioFeatures,
    prevalence: 50,
    associatedContext: context,
    createdAt: new Date().toISOString(),
  };
}

export function assessVoiceHealth(
  voiceScores: VoiceEmotionScore[]
): VoiceHealthMetrics {
  if (voiceScores.length === 0) {
    return {
      userId: '',
      voiceStrain: 0,
      fatigueLevel: 0,
      emotionalStability: 100,
      averageEnergy: 0.5,
      stressIndicators: [],
      recommendations: [],
      lastAssessedAt: new Date().toISOString(),
    };
  }

  // Calculate metrics
  const averageEnergy =
    voiceScores.reduce((sum, s) => sum + s.audioFeatures.energy, 0) /
    voiceScores.length;

  const highPitchVariance = voiceScores.filter(
    (s) => s.audioFeatures.pitchVariance > 80
  ).length;
  const voiceStrain = (highPitchVariance / voiceScores.length) * 100;

  const lowEnergy = voiceScores.filter(
    (s) => s.audioFeatures.energy < 0.4
  ).length;
  const fatigueLevel = (lowEnergy / voiceScores.length) * 100;

  // Emotional stability (inverse of emotion variance)
  const emotionalVariance = voiceScores.reduce((sum, s) => {
    const dominantScore = s.emotionScores[s.dominantEmotion];
    return sum + (100 - dominantScore);
  }, 0) / voiceScores.length;
  const emotionalStability = 100 - emotionalVariance;

  const stressIndicators: string[] = [];
  if (voiceStrain > 50) stressIndicators.push('High voice tension detected');
  if (fatigueLevel > 50) stressIndicators.push('Vocal fatigue detected');
  if (emotionalStability < 50)
    stressIndicators.push('Emotional fluctuation detected');

  const recommendations: string[] = [];
  if (voiceStrain > 70) recommendations.push('Take a break for voice rest');
  if (fatigueLevel > 70)
    recommendations.push('Consider speaking more slowly and deliberately');
  if (emotionalStability < 40)
    recommendations.push('Try relaxation techniques or short breaks');

  return {
    userId: voiceScores[0].userId,
    voiceStrain: Math.min(100, voiceStrain),
    fatigueLevel: Math.min(100, fatigueLevel),
    emotionalStability: Math.max(0, emotionalStability),
    averageEnergy,
    stressIndicators,
    recommendations,
    lastAssessedAt: new Date().toISOString(),
  };
}

export function compareVoiceQuality(
  current: AudioFeatures,
  baseline: AudioFeatures
): {
  status: 'improved' | 'degraded' | 'stable';
  changes: Record<string, number>;
} {
  const changes: Record<string, number> = {
    pitch: current.pitch - baseline.pitch,
    energy: current.energy - baseline.energy,
    speechRate: current.speechRate - baseline.speechRate,
  };

  let totalChange = Math.abs(changes.pitch) / 50; // Normalize
  totalChange += Math.abs(changes.energy);
  totalChange += Math.abs(changes.speechRate) / 50;

  let status: 'improved' | 'degraded' | 'stable' = 'stable';
  if (totalChange > 0.3) {
    status = changes.energy > 0 ? 'improved' : 'degraded';
  }

  return { status, changes };
}

export function generateVoiceReport(
  metrics: VoiceHealthMetrics,
  _recentScores: VoiceEmotionScore[]
): string {
  const lines: string[] = [];

  lines.push(
    `Voice Health Report - Generated ${new Date().toLocaleDateString()}`
  );
  lines.push('');

  lines.push(
    `Voice Strain Level: ${metrics.voiceStrain.toFixed(0)}% ${metrics.voiceStrain > 60 ? '⚠️' : '✓'}`
  );
  lines.push(
    `Fatigue Level: ${metrics.fatigueLevel.toFixed(0)}% ${metrics.fatigueLevel > 60 ? '⚠️' : '✓'}`
  );
  lines.push(`Emotional Stability: ${metrics.emotionalStability.toFixed(0)}%`);
  lines.push(`Average Voice Energy: ${metrics.averageEnergy.toFixed(2)}`);

  if (metrics.stressIndicators.length > 0) {
    lines.push('');
    lines.push('Stress Indicators:');
    metrics.stressIndicators.forEach((indicator) => {
      lines.push(`- ${indicator}`);
    });
  }

  if (metrics.recommendations.length > 0) {
    lines.push('');
    lines.push('Recommendations:');
    metrics.recommendations.forEach((rec) => {
      lines.push(`- ${rec}`);
    });
  }

  return lines.join('\n');
}
