 
/**
 * Advanced Context Awareness Module
 * Provides sophisticated context understanding and multi-turn conversation management
 */

export type ContextType =
  | 'user'
  | 'conversation'
  | 'domain'
  | 'temporal'
  | 'emotional'
  | 'intent';

export interface ContextElement {
  id: string;
  type: ContextType;
  key: string;
  value: any;
  weight: number; // 0-1, importance weight
  expiresAt?: string;
  metadata?: Record<string, any>;
}

export interface ConversationMemory {
  id: string;
  conversationId: string;
  userId: string;
  shortTermMemory: ContextElement[]; // Current context (recent turns)
  longTermMemory: ContextElement[]; // Previous conversations/patterns
  workingMemory: ContextElement[]; // Currently focused items
  semanticMemory: Record<string, any>; // Knowledge/facts
  episodicMemory: Array<{ timestamp: string; summary: string }>; // Past events
  createdAt: string;
  updatedAt: string;
}

export interface ContextAnalysis {
  primaryContext: ContextElement;
  secondaryContexts: ContextElement[];
  relevantMemories: ContextElement[];
  suggestedResponses: string[];
  contextConfidence: number;
  disambiguations: string[];
}

export interface TemporalContext {
  timestamp: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: string;
  seasonality?: string;
  isBusinessHours: boolean;
}

export interface UserContextProfile {
  userId: string;
  preferences: Record<string, any>;
  communicationStyle: 'formal' | 'casual' | 'technical' | 'friendly';
  expertise: Record<string, number>; // domain -> expertise level (0-100)
  interactionPatterns: {
    averageResponseLength: number;
    preferredLanguage: string;
    averageSessionDuration: number;
  };
  knownIssues: string[];
  goals: string[];
}

export function createContextElement(
  type: ContextType,
  key: string,
  value: any,
  weight: number = 0.5,
  expiresAt?: string
): ContextElement {
  return {
    id: `ctx_${Date.now()}`,
    type,
    key,
    value,
    weight: Math.max(0, Math.min(1, weight)),
    expiresAt,
  };
}

export function createConversationMemory(
  conversationId: string,
  userId: string
): ConversationMemory {
  return {
    id: `mem_${Date.now()}`,
    conversationId,
    userId,
    shortTermMemory: [],
    longTermMemory: [],
    workingMemory: [],
    semanticMemory: {},
    episodicMemory: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function addToShortTermMemory(
  memory: ConversationMemory,
  element: ContextElement,
  maxSize: number = 50
): ConversationMemory {
  const updated = {
    ...memory,
    shortTermMemory: [element, ...memory.shortTermMemory].slice(0, maxSize),
    updatedAt: new Date().toISOString(),
  };

  // Promote important items to working memory
  if (element.weight > 0.75) {
    return {
      ...updated,
      workingMemory: [element, ...updated.workingMemory].slice(0, 10),
    };
  }

  return updated;
}

export function addToLongTermMemory(
  memory: ConversationMemory,
  element: ContextElement
): ConversationMemory {
  return {
    ...memory,
    longTermMemory: [...memory.longTermMemory, element],
    updatedAt: new Date().toISOString(),
  };
}

export function archiveMemory(memory: ConversationMemory): ConversationMemory {
  // Move old short-term to long-term
  const now = new Date();
  const cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours

  const expiredItems = memory.shortTermMemory.filter(
    (e) => e.expiresAt && new Date(e.expiresAt) < cutoffTime
  );

  return {
    ...memory,
    shortTermMemory: memory.shortTermMemory.filter(
      (e) => !e.expiresAt || new Date(e.expiresAt) > cutoffTime
    ),
    longTermMemory: [...memory.longTermMemory, ...expiredItems],
    updatedAt: new Date().toISOString(),
  };
}

export function getTemporalContext(): TemporalContext {
  const now = new Date();
  const hour = now.getHours();
  const day = now.toLocaleString('en-US', { weekday: 'long' });

  let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  if (hour >= 5 && hour < 12) timeOfDay = 'morning';
  else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
  else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
  else timeOfDay = 'night';

  const isBusinessHours = hour >= 9 && hour < 17;

  return {
    timestamp: now.toISOString(),
    timeOfDay,
    dayOfWeek: day,
    isBusinessHours,
  };
}

export function createUserContextProfile(
  userId: string,
  communicationStyle: 'formal' | 'casual' | 'technical' | 'friendly' = 'casual'
): UserContextProfile {
  return {
    userId,
    preferences: {},
    communicationStyle,
    expertise: {},
    interactionPatterns: {
      averageResponseLength: 150,
      preferredLanguage: 'en',
      averageSessionDuration: 0,
    },
    knownIssues: [],
    goals: [],
  };
}

export function analyzeContext(
  memory: ConversationMemory,
  _userProfile: UserContextProfile,
  currentTurn: string
): ContextAnalysis {
  const allContext = [
    ...memory.shortTermMemory,
    ...memory.workingMemory,
  ].sort((a, b) => b.weight - a.weight);

  const primaryContext = allContext[0];
  const secondaryContexts = allContext.slice(1, 5);

  // Find relevant memories based on current turn keywords
  const keywords = currentTurn.toLowerCase().split(/\s+/);
  const relevantMemories = allContext.filter((ctx) =>
    keywords.some((kw) =>
      (typeof ctx.value === 'string'
        ? ctx.value.toLowerCase()
        : JSON.stringify(ctx.value).toLowerCase()
      ).includes(kw)
    )
  );

  const contextConfidence =
    (allContext.reduce((sum, ctx) => sum + ctx.weight, 0) /
      Math.max(1, allContext.length)) *
    100;

  return {
    primaryContext: primaryContext || createContextElement('conversation', 'default', null, 0),
    secondaryContexts,
    relevantMemories: relevantMemories.slice(0, 5),
    suggestedResponses: [],
    contextConfidence: Math.round(contextConfidence),
    disambiguations: [],
  };
}

export function updateExpertise(
  profile: UserContextProfile,
  domain: string,
  improvement: number
): UserContextProfile {
  const currentExpertise = profile.expertise[domain] || 0;
  const newExpertise = Math.max(0, Math.min(100, currentExpertise + improvement));

  return {
    ...profile,
    expertise: {
      ...profile.expertise,
      [domain]: newExpertise,
    },
  };
}

export function getExpertiseLevel(
  profile: UserContextProfile,
  domain: string
): 'novice' | 'intermediate' | 'advanced' | 'expert' {
  const level = profile.expertise[domain] || 0;

  if (level < 25) return 'novice';
  if (level < 50) return 'intermediate';
  if (level < 75) return 'advanced';
  return 'expert';
}

export function resolveAmbiguity(
  memory: ConversationMemory,
  _ambiguousRef: string,
  candidates: ContextElement[]
): ContextElement | null {
  // Find best match using context proximity
  const bestMatch = candidates.reduce((best, current) => {
    // Check if mentioned recently (proximity)
    const recentScore = memory.shortTermMemory.includes(current) ? 2 : 1;
    // Weight score
    const weightScore = current.weight;

    const currentScore = recentScore * weightScore;
    const bestScore = (best ? (memory.shortTermMemory.includes(best) ? 2 : 1) * best.weight : 0);

    return currentScore > bestScore ? current : best;
  });

  return bestMatch || null;
}

export function createEpisodicMemory(
  memory: ConversationMemory,
  summary: string
): ConversationMemory {
  return {
    ...memory,
    episodicMemory: [
      ...memory.episodicMemory,
      {
        timestamp: new Date().toISOString(),
        summary,
      },
    ],
    updatedAt: new Date().toISOString(),
  };
}

export function getRecentEpisodes(
  memory: ConversationMemory,
  limit: number = 5
): Array<{ timestamp: string; summary: string }> {
  return memory.episodicMemory.slice(-limit).reverse();
}

export function pruneExpiredContext(
  memory: ConversationMemory
): ConversationMemory {
  const now = new Date();

  return {
    ...memory,
    shortTermMemory: memory.shortTermMemory.filter(
      (e) => !e.expiresAt || new Date(e.expiresAt) > now
    ),
    workingMemory: memory.workingMemory.filter(
      (e) => !e.expiresAt || new Date(e.expiresAt) > now
    ),
    updatedAt: new Date().toISOString(),
  };
}
