/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Custom Domain Knowledge Module
 * Manages domain-specific knowledge bases and context
 */

export type KnowledgeType = 'document' | 'faq' | 'tutorial' | 'glossary' | 'rule';

export interface KnowledgeEntry {
  id: string;
  userId: string;
  domain: string;
  title: string;
  content: string;
  type: KnowledgeType;
  tags: string[];
  embedding?: number[]; // Vector embedding for semantic search
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  viewCount: number;
  relevanceScore?: number;
}

export interface DomainKnowledgeBase {
  id: string;
  userId: string;
  name: string;
  description: string;
  domain: string;
  entries: KnowledgeEntry[];
  isPublic: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ContextRelation {
  id: string;
  sourceId: string;
  targetId: string;
  relationshipType:
    | 'related'
    | 'prerequisite'
    | 'elaboration'
    | 'example'
    | 'definition';
  strength: number; // 0-100
}

export interface DomainContext {
  domain: string;
  currentTopic: string;
  relatedTopics: string[];
  contextChain: string[];
  relevantEntries: KnowledgeEntry[];
  lastUpdated: string;
}

export function createKnowledgeEntry(
  userId: string,
  domain: string,
  title: string,
  content: string,
  type: KnowledgeType,
  tags: string[] = []
): KnowledgeEntry {
  return {
    id: `entry_${Date.now()}`,
    userId,
    domain,
    title,
    content,
    type,
    tags,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isActive: true,
    viewCount: 0,
  };
}

export function createDomainKnowledgeBase(
  userId: string,
  name: string,
  domain: string,
  description: string = '',
  isPublic: boolean = false
): DomainKnowledgeBase {
  return {
    id: `kb_${Date.now()}`,
    userId,
    name,
    description,
    domain,
    entries: [],
    isPublic,
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function addEntryToKnowledgeBase(
  kb: DomainKnowledgeBase,
  entry: KnowledgeEntry
): DomainKnowledgeBase {
  return {
    ...kb,
    entries: [...kb.entries, entry],
    updatedAt: new Date().toISOString(),
  };
}

export function updateKnowledgeEntry(
  entry: KnowledgeEntry,
  updates: Partial<KnowledgeEntry>
): KnowledgeEntry {
  return {
    ...entry,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
}

export function createContextRelation(
  sourceId: string,
  targetId: string,
  relationshipType:
    | 'related'
    | 'prerequisite'
    | 'elaboration'
    | 'example'
    | 'definition',
  strength: number = 75
): ContextRelation {
  return {
    id: `rel_${Date.now()}`,
    sourceId,
    targetId,
    relationshipType,
    strength: Math.max(0, Math.min(100, strength)),
  };
}

export function initializeContext(
  domain: string,
  currentTopic: string
): DomainContext {
  return {
    domain,
    currentTopic,
    relatedTopics: [],
    contextChain: [currentTopic],
    relevantEntries: [],
    lastUpdated: new Date().toISOString(),
  };
}

export function expandContext(
  context: DomainContext,
  newTopic: string,
  relatedEntries: KnowledgeEntry[] = []
): DomainContext {
  return {
    ...context,
    currentTopic: newTopic,
    contextChain: [...context.contextChain, newTopic],
    relevantEntries: relatedEntries,
    lastUpdated: new Date().toISOString(),
  };
}

export function findRelatedEntries(
  entry: KnowledgeEntry,
  allEntries: KnowledgeEntry[],
  maxResults: number = 5
): KnowledgeEntry[] {
  // Simple tag-based similarity
  const tagMatches = allEntries
    .filter(
      (e) =>
        e.id !== entry.id &&
        e.domain === entry.domain &&
        e.isActive &&
        e.tags.some((tag) => entry.tags.includes(tag))
    )
    .sort((a, b) => {
      const aMatchCount = a.tags.filter((t) => entry.tags.includes(t)).length;
      const bMatchCount = b.tags.filter((t) => entry.tags.includes(t)).length;
      return bMatchCount - aMatchCount;
    })
    .slice(0, maxResults);

  return tagMatches;
}

export function searchKnowledgeBase(
  kb: DomainKnowledgeBase,
  query: string
): KnowledgeEntry[] {
  const normalizedQuery = query.toLowerCase();

  return kb.entries
    .filter(
      (entry) =>
        entry.isActive &&
        (entry.title.toLowerCase().includes(normalizedQuery) ||
          entry.content.toLowerCase().includes(normalizedQuery) ||
          entry.tags.some((tag) =>
            tag.toLowerCase().includes(normalizedQuery)
          ))
    )
    .sort(
      (a, b) =>
        (b.viewCount || 0) - (a.viewCount || 0) +
        ((b.relevanceScore || 0) - (a.relevanceScore || 0))
    );
}

export function buildContextChain(
  startTopic: string,
  relations: ContextRelation[],
  depth: number = 3
): string[] {
  const chain = [startTopic];
  let currentTopic = startTopic;

  for (let i = 0; i < depth - 1; i++) {
    const nextRelation = relations.find(
      (r) =>
        r.sourceId === currentTopic &&
        r.relationshipType === 'prerequisite'
    );

    if (nextRelation) {
      chain.push(nextRelation.targetId);
      currentTopic = nextRelation.targetId;
    } else {
      break;
    }
  }

  return chain;
}

export function calculateEntryRelevance(
  entry: KnowledgeEntry,
  context: DomainContext,
  tagWeighting: number = 0.5,
  viewWeighting: number = 0.3
): number {
  let relevance = 0;

  // Tag matching
  const tagMatches = entry.tags.filter((tag) =>
    [context.currentTopic, ...context.relatedTopics].some(
      (topic) => topic.toLowerCase().includes(tag.toLowerCase())
    )
  ).length;
  relevance += (tagMatches / Math.max(1, entry.tags.length)) * tagWeighting;

  // View count normalization
  const maxViewCount = 1000;
  relevance +=
    (Math.min(entry.viewCount, maxViewCount) / maxViewCount) * viewWeighting;

  // Type-based weighting
  const typeWeights: Record<string, number> = {
    definition: 0.3,
    glossary: 0.25,
    tutorial: 0.2,
    faq: 0.15,
    document: 0.1,
  };
  relevance += typeWeights[entry.type] || 0.1;

  return Math.min(100, relevance * 100);
}

export function mergeKnowledgeBases(
  kb1: DomainKnowledgeBase,
  kb2: DomainKnowledgeBase
): DomainKnowledgeBase {
  const mergedEntries = Array.from(
    new Map(
      [...kb1.entries, ...kb2.entries].map((entry) => [entry.id, entry])
    ).values()
  );

  const mergedTags = Array.from(new Set([...kb1.tags, ...kb2.tags]));

  return {
    ...kb1,
    entries: mergedEntries,
    tags: mergedTags,
    description: `${kb1.description} + ${kb2.description}`,
    updatedAt: new Date().toISOString(),
  };
}

export function validateEntry(entry: KnowledgeEntry): string[] {
  const errors: string[] = [];

  if (!entry.title || entry.title.trim().length === 0) {
    errors.push('Entry title is required');
  }

  if (!entry.content || entry.content.trim().length === 0) {
    errors.push('Entry content is required');
  }

  if (entry.content.length > 50000) {
    errors.push('Content exceeds maximum length (50000 characters)');
  }

  if (entry.tags.length > 20) {
    errors.push('Maximum 20 tags allowed');
  }

  return errors;
}

export function incrementViewCount(entry: KnowledgeEntry): KnowledgeEntry {
  return {
    ...entry,
    viewCount: entry.viewCount + 1,
  };
}
