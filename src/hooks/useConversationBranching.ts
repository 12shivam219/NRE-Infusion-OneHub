import { useState, useCallback, useEffect } from 'react';
import { useAuth } from './useAuth';
import {
  createBranch as apiCreateBranch,
  getBranches,
  getBranchMessages,
  saveBranchMessage,
  mergeBranches as apiMergeBranches,
} from '../lib/api/phase3';
import {
  createBranch,
  createBranchMessage,
  buildBranchTree,
  calculateBranchDivergence,
  validateBranchName,
} from '../lib/chat/conversationBranching';
import type { ConversationBranch, BranchMessage } from '../lib/chat/conversationBranching';

export function useConversationBranching(conversationId: string) {
  const { user } = useAuth();
  const [branches, setBranches] = useState<ConversationBranch[]>([]);
  const [branchMessages, setBranchMessages] = useState<Map<string, BranchMessage[]>>(new Map());
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load branches on mount
  useEffect(() => {
    if (user?.id && conversationId) {
      loadBranches();
    }
  }, [user?.id, conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadBranches = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      setError(null);
      const result = await getBranches(user.id, conversationId);
      if (result.success && result.data) {
        setBranches(result.data);
        // Load messages for each branch
        result.data.forEach(async (branch) => {
          const messagesResult = await getBranchMessages(user.id, branch.id);
          if (messagesResult.success && messagesResult.data) {
            setBranchMessages(prev => new Map(prev).set(branch.id, messagesResult.data || []));
          }
        });
      } else {
        setError(result.error || 'Failed to load branches');
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, conversationId]);

  const createNewBranch = useCallback(
    async (name: string, description: string, fromMessageIndex?: number) => {
      if (!user?.id) return { success: false, error: 'User not authenticated' };

      const validation = validateBranchName(name);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      try {
        setIsLoading(true);
        setError(null);

        const newBranch = createBranch(conversationId, name, description, fromMessageIndex, activeBranchId || undefined);
        const result = await apiCreateBranch(user.id, newBranch);

        if (result.success) {
          setBranches(prev => [...prev, newBranch]);
          return { success: true, data: newBranch };
        } else {
          const errorMsg = result.error || 'Failed to create branch';
          setError(errorMsg);
          return { success: false, error: errorMsg };
        }
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id, conversationId, activeBranchId]
  );

  const addMessageToBranch = useCallback(
    async (branchId: string, role: 'user' | 'assistant', content: string) => {
      if (!user?.id) return { success: false, error: 'User not authenticated' };

      try {
        const messages = branchMessages.get(branchId) || [];
        const messageIndex = messages.length;

        const message = createBranchMessage(branchId, conversationId, role, content, messageIndex);
        const result = await saveBranchMessage(user.id, message);

        if (result.success) {
          setBranchMessages(prev => {
            const updated = new Map(prev);
            updated.set(branchId, [...(prev.get(branchId) || []), message]);
            return updated;
          });

          // Update branch message count
          setBranches(prev =>
            prev.map(b =>
              b.id === branchId ? { ...b, messageCount: b.messageCount + 1 } : b
            )
          );

          return { success: true, data: message };
        } else {
          return { success: false, error: result.error };
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to add message';
        return { success: false, error: errorMsg };
      }
    },
    [user?.id, conversationId, branchMessages]
  );

  const switchBranch = useCallback((branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    if (branch) {
      setActiveBranchId(branchId);
      return { success: true };
    }
    return { success: false, error: 'Branch not found' };
  }, [branches]);

  const mergeBranches = useCallback(
    async (sourceBranchId: string, targetBranchId: string) => {
      if (!user?.id) return { success: false, error: 'User not authenticated' };

      try {
        setIsLoading(true);

        const sourceMessages = branchMessages.get(sourceBranchId) || [];
        const targetMessages = branchMessages.get(targetBranchId) || [];

        const divergence = calculateBranchDivergence(sourceMessages, targetMessages);

        const result = await apiMergeBranches(user.id, sourceBranchId, targetBranchId, {
          success: true,
          mergedBranchId: `merged-${Date.now()}`,
          conflictCount: 0,
        });

        if (result.success) {
          return { success: true, divergence, data: result.data };
        } else {
          return { success: false, error: result.error };
        }
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id, branchMessages]
  );

  const getBranchTree = useCallback(() => {
    return buildBranchTree(branches);
  }, [branches]);

  const getActiveBranch = useCallback(() => {
    return branches.find(b => b.id === activeBranchId);
  }, [branches, activeBranchId]);

  const getActiveBranchMessages = useCallback(() => {
    return activeBranchId ? branchMessages.get(activeBranchId) || [] : [];
  }, [activeBranchId, branchMessages]);

  return {
    branches,
    activeBranchId,
    isLoading,
    error,
    createNewBranch,
    addMessageToBranch,
    switchBranch,
    mergeBranches,
    getBranchTree,
    getActiveBranch,
    getActiveBranchMessages,
    reloadBranches: loadBranches,
  };
}
