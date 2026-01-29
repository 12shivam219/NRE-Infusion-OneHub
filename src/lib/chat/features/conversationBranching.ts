/**
 * Conversation Branching
 * Manages conversation branches, creation, navigation, and merging
 */

export interface ConversationBranch {
  id: string;
  conversationId: string;
  parentBranchId?: string;
  branchName: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  createdFromMessageId?: string;
  createdFromMessageIndex?: number;
  isActive: boolean;
  tags: string[];
}

export interface BranchMessage {
  id: string;
  branchId: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  messageIndex: number;
  timestamp: Date;
  metadata: {
    model?: string;
    temperature?: number;
    tokensUsed?: number;
  };
}

export interface BranchDiff {
  fromBranch: string;
  toBranch: string;
  divergencePoint: number;
  addedMessages: BranchMessage[];
  removedMessages: BranchMessage[];
  commonAncestorIndex: number;
}

export interface BranchMergeResult {
  success: boolean;
  error?: string;
  mergedBranchId?: string;
  conflictCount?: number;
  conflictIndices?: number[];
}

/**
 * Create a new branch from the main conversation
 */
export function createBranch(
  conversationId: string,
  branchName: string,
  description: string,
  fromMessageIndex?: number,
  parentBranchId?: string
): ConversationBranch {
  const id = `branch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return {
    id,
    conversationId,
    parentBranchId,
    branchName,
    description,
    createdAt: new Date(),
    updatedAt: new Date(),
    messageCount: 0,
    createdFromMessageIndex: fromMessageIndex,
    isActive: true,
    tags: [],
  };
}

/**
 * Create a branch message
 */
export function createBranchMessage(
  branchId: string,
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
  messageIndex: number,
  metadata?: BranchMessage['metadata']
): BranchMessage {
  const id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return {
    id,
    branchId,
    conversationId,
    role,
    content,
    messageIndex,
    timestamp: new Date(),
    metadata: metadata || {},
  };
}

/**
 * Validate branch name
 */
export function validateBranchName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Branch name cannot be empty' };
  }

  if (name.length > 100) {
    return { valid: false, error: 'Branch name cannot exceed 100 characters' };
  }

  if (!/^[a-zA-Z0-9\s\-_]+$/.test(name)) {
    return { valid: false, error: 'Branch name can only contain alphanumeric characters, spaces, hyphens, and underscores' };
  }

  return { valid: true };
}

/**
 * Calculate branch divergence (difference in messages)
 */
export function calculateBranchDivergence(
  branch1Messages: BranchMessage[],
  branch2Messages: BranchMessage[]
): number {
  // Find common ancestor
  const minLength = Math.min(branch1Messages.length, branch2Messages.length);
  let divergencePoint = 0;

  for (let i = 0; i < minLength; i++) {
    if (branch1Messages[i].content === branch2Messages[i].content) {
      divergencePoint = i + 1;
    } else {
      break;
    }
  }

  const branch1Unique = branch1Messages.length - divergencePoint;
  const branch2Unique = branch2Messages.length - divergencePoint;

  return branch1Unique + branch2Unique;
}

/**
 * Find common ancestor message between two branches
 */
export function findCommonAncestor(
  branch1Messages: BranchMessage[],
  branch2Messages: BranchMessage[]
): { index: number; message: BranchMessage | null } {
  const minLength = Math.min(branch1Messages.length, branch2Messages.length);
  let commonIndex = -1;

  for (let i = 0; i < minLength; i++) {
    if (branch1Messages[i].content === branch2Messages[i].content &&
        branch1Messages[i].role === branch2Messages[i].role) {
      commonIndex = i;
    } else {
      break;
    }
  }

  return {
    index: commonIndex,
    message: commonIndex >= 0 ? branch1Messages[commonIndex] : null,
  };
}

/**
 * Calculate diff between two branches
 */
export function calculateBranchDiff(
  branch1Messages: BranchMessage[],
  branch2Messages: BranchMessage[],
  fromBranchId: string,
  toBranchId: string
): BranchDiff {
  const ancestor = findCommonAncestor(branch1Messages, branch2Messages);
  const divergencePoint = ancestor.index + 1;

  const addedMessages = branch2Messages.slice(divergencePoint);
  const removedMessages = branch1Messages.slice(divergencePoint);

  return {
    fromBranch: fromBranchId,
    toBranch: toBranchId,
    divergencePoint,
    addedMessages,
    removedMessages,
    commonAncestorIndex: ancestor.index,
  };
}

/**
 * Merge two branches
 */
export function mergeBranches(
  sourceBranchMessages: BranchMessage[],
  targetBranchMessages: BranchMessage[],
  sourceBranchId: string,
  targetBranchId: string
): BranchMergeResult {
  const diff = calculateBranchDiff(
    targetBranchMessages,
    sourceBranchMessages,
    targetBranchId,
    sourceBranchId
  );

  // Check for conflicts (messages with different role at same index)
  const conflicts: number[] = [];
  for (let i = diff.divergencePoint; i < Math.min(
    sourceBranchMessages.length,
    targetBranchMessages.length
  ); i++) {
    if (sourceBranchMessages[i]?.role !== targetBranchMessages[i]?.role) {
      conflicts.push(i);
    }
  }

  if (conflicts.length > 0) {
    return {
      success: false,
      error: `Merge conflict: ${conflicts.length} conflicting messages found`,
      conflictCount: conflicts.length,
      conflictIndices: conflicts,
    };
  }

  // Merge by taking all messages up to common ancestor + both branches
  const mergedId = `branch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return {
    success: true,
    mergedBranchId: mergedId,
    conflictCount: 0,
  };
}

/**
 * Get branch tree structure
 */
export function buildBranchTree(branches: ConversationBranch[]): {
  root: ConversationBranch[];
  children: Map<string, ConversationBranch[]>;
} {
  const childrenMap = new Map<string, ConversationBranch[]>();
  const rootBranches: ConversationBranch[] = [];

  branches.forEach(branch => {
    if (!branch.parentBranchId) {
      rootBranches.push(branch);
    } else {
      if (!childrenMap.has(branch.parentBranchId)) {
        childrenMap.set(branch.parentBranchId, []);
      }
      childrenMap.get(branch.parentBranchId)!.push(branch);
    }
  });

  return {
    root: rootBranches,
    children: childrenMap,
  };
}

/**
 * Get branch depth (how many levels deep)
 */
export function calculateBranchDepth(
  branch: ConversationBranch,
  allBranches: ConversationBranch[]
): number {
  let depth = 1;
  let currentBranch = branch;

  while (currentBranch.parentBranchId) {
    const parent = allBranches.find(b => b.id === currentBranch.parentBranchId);
    if (!parent) break;
    depth++;
    currentBranch = parent;
  }

  return depth;
}

/**
 * Get all descendants of a branch
 */
export function getBranchDescendants(
  branch: ConversationBranch,
  allBranches: ConversationBranch[]
): ConversationBranch[] {
  const descendants: ConversationBranch[] = [];
  const queue = [branch.id];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const children = allBranches.filter(b => b.parentBranchId === currentId);
    descendants.push(...children);
    children.forEach(child => queue.push(child.id));
  }

  return descendants;
}

/**
 * Export branch as JSON
 */
export function exportBranchAsJSON(
  branch: ConversationBranch,
  messages: BranchMessage[]
): string {
  return JSON.stringify(
    {
      branch,
      messages,
      exportedAt: new Date().toISOString(),
    },
    null,
    2
  );
}
