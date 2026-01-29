/**
 * Chat Library Index
 * Re-exports for backward compatibility after reorganization
 */

// AI-related modules
export * from './ai/aiTraining';
export * from './ai/customDomainKnowledge';
export * from './ai/sentimentAnalysis';

// Feature modules
export * from './features/conversationBranching';
export * from './features/customCommands';
export * from './features/realtimeCollaboration';

// Integration modules
export * from './integrations/externalServices';

// Utility modules
export * from './utils/streaming';
export * from './utils/multilingual';
export * from './utils/exportUtils';
export * from './utils/advancedContextAwareness';
export * from './utils/actionExecutor';

// Legacy imports - if they exist in root
export * from './types';
