/**
 * Fine-tuned Models Management
 * Handles model registration, switching, and configuration for fine-tuned Groq models
 */

export interface FinetuneConfig {
  id: string;
  name: string;
  baseModel: string;
  description: string;
  trainingDataSize: number;
  accuracy: number;
  latency: number;
  costPerToken: number;
  lastUpdated: Date;
  isActive: boolean;
  hyperparameters: {
    temperature: number;
    topP: number;
    maxTokens: number;
    frequencyPenalty: number;
    presencePenalty: number;
  };
  trainingMetrics: {
    loss: number;
    validationAccuracy: number;
    epochsCompleted: number;
  };
}

export interface ModelRegistry {
  models: FinetuneConfig[];
  activeModelId: string;
  defaultModel: string;
}

export interface ModelUsageStats {
  modelId: string;
  totalRequests: number;
  totalTokens: number;
  averageLatency: number;
  costGenerated: number;
  successRate: number;
  lastUsed: Date;
}

// Default Groq models
export const DEFAULT_MODELS: FinetuneConfig[] = [
  {
    id: 'mixtral-8x7b',
    name: 'Mixtral 8x7B',
    baseModel: 'mixtral-8x7b-32768',
    description: 'High-performance general-purpose model (32K context)',
    trainingDataSize: 0,
    accuracy: 0.92,
    latency: 180,
    costPerToken: 0.00027,
    lastUpdated: new Date(),
    isActive: true,
    hyperparameters: {
      temperature: 0.7,
      topP: 1.0,
      maxTokens: 8192,
      frequencyPenalty: 0,
      presencePenalty: 0,
    },
    trainingMetrics: {
      loss: 0,
      validationAccuracy: 0,
      epochsCompleted: 0,
    },
  },
  {
    id: 'llama2-70b',
    name: 'Llama 2 70B',
    baseModel: 'llama2-70b-4096',
    description: 'Open-source model with 70B parameters (4K context)',
    trainingDataSize: 0,
    accuracy: 0.89,
    latency: 250,
    costPerToken: 0.0007,
    lastUpdated: new Date(),
    isActive: true,
    hyperparameters: {
      temperature: 0.7,
      topP: 1.0,
      maxTokens: 4096,
      frequencyPenalty: 0,
      presencePenalty: 0,
    },
    trainingMetrics: {
      loss: 0,
      validationAccuracy: 0,
      epochsCompleted: 0,
    },
  },
  {
    id: 'gemma-7b',
    name: 'Gemma 7B',
    baseModel: 'gemma-7b-it',
    description: 'Lightweight instruction-tuned model (6K context)',
    trainingDataSize: 0,
    accuracy: 0.85,
    latency: 120,
    costPerToken: 0.00007,
    lastUpdated: new Date(),
    isActive: true,
    hyperparameters: {
      temperature: 0.6,
      topP: 0.95,
      maxTokens: 6000,
      frequencyPenalty: 0.1,
      presencePenalty: 0,
    },
    trainingMetrics: {
      loss: 0,
      validationAccuracy: 0,
      epochsCompleted: 0,
    },
  },
];

/**
 * Create a new fine-tuned model configuration
 */
export function createFinetuneConfig(
  baseModel: string,
  name: string,
  description: string,
  hyperparameters?: Partial<FinetuneConfig['hyperparameters']>
): FinetuneConfig {
  const id = `finetune-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return {
    id,
    name,
    baseModel,
    description,
    trainingDataSize: 0,
    accuracy: 0,
    latency: 200,
    costPerToken: 0.0005,
    lastUpdated: new Date(),
    isActive: false,
    hyperparameters: {
      temperature: hyperparameters?.temperature ?? 0.7,
      topP: hyperparameters?.topP ?? 1.0,
      maxTokens: hyperparameters?.maxTokens ?? 8192,
      frequencyPenalty: hyperparameters?.frequencyPenalty ?? 0,
      presencePenalty: hyperparameters?.presencePenalty ?? 0,
    },
    trainingMetrics: {
      loss: 0,
      validationAccuracy: 0,
      epochsCompleted: 0,
    },
  };
}

/**
 * Validate fine-tune configuration
 */
export function validateFinetuneConfig(config: FinetuneConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.name || config.name.trim().length === 0) {
    errors.push('Model name is required');
  }

  if (!config.baseModel || config.baseModel.trim().length === 0) {
    errors.push('Base model is required');
  }

  if (config.hyperparameters.temperature < 0 || config.hyperparameters.temperature > 2) {
    errors.push('Temperature must be between 0 and 2');
  }

  if (config.hyperparameters.topP < 0 || config.hyperparameters.topP > 1) {
    errors.push('Top P must be between 0 and 1');
  }

  if (config.hyperparameters.maxTokens < 128 || config.hyperparameters.maxTokens > 32768) {
    errors.push('Max tokens must be between 128 and 32768');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Compare two models by performance metrics
 */
export function compareModels(
  model1: FinetuneConfig,
  model2: FinetuneConfig
): {
  faster: string;
  moreAccurate: string;
  cheaper: string;
  overall: string;
} {
  return {
    faster: model1.latency < model2.latency ? model1.name : model2.name,
    moreAccurate: model1.accuracy > model2.accuracy ? model1.name : model2.name,
    cheaper: model1.costPerToken < model2.costPerToken ? model1.name : model2.name,
    overall:
      model1.accuracy / model1.latency > model2.accuracy / model2.latency
        ? model1.name
        : model2.name,
  };
}

/**
 * Calculate model cost for a conversation
 */
export function calculateModelCost(model: FinetuneConfig, totalTokens: number): number {
  return totalTokens * model.costPerToken;
}

/**
 * Estimate model performance based on training metrics
 */
export function estimateModelPerformance(config: FinetuneConfig): {
  performanceScore: number;
  recommendation: string;
  estimatedImprovements: string[];
} {
  const performanceScore = config.accuracy * 100;
  const recommendations: string[] = [];

  if (config.trainingMetrics.loss > 0.5) {
    recommendations.push('High loss detected - consider more training epochs');
  }

  if (config.trainingMetrics.validationAccuracy < 0.8) {
    recommendations.push('Low validation accuracy - increase training data');
  }

  if (config.trainingMetrics.epochsCompleted < 10) {
    recommendations.push('Increase training epochs for better convergence');
  }

  return {
    performanceScore,
    recommendation:
      recommendations.length > 0
        ? recommendations[0]
        : 'Model is performing well',
    estimatedImprovements: recommendations,
  };
}
