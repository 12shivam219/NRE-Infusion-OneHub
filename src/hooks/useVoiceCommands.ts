import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import {
  createVoiceCommand,
  getUserVoiceCommands,
  updateVoiceCommand,
  logCommandExecution,
} from '../lib/api/phase4';
import {
  logCommandExecution as createLog,
} from '../lib/chat/voiceCommandsLibrary';
import type { VoiceCommand } from '../lib/chat/voiceCommandsLibrary';

interface UseVoiceCommandsReturn {
  commands: VoiceCommand[];
  isLoading: boolean;
  error: string | null;
  loadCommands: () => Promise<void>;
  createCommand: (
    name: string,
    description: string,
    phrases: string[],
    category: string,
    action: string
  ) => Promise<void>;
  executeCommand: (
    commandId: string,
    phraseUsed: string,
    confidence: number,
    success: boolean,
    executionTime: number
  ) => Promise<void>;
  deleteCommand: (commandId: string) => Promise<void>;
}

export function useVoiceCommands(): UseVoiceCommandsReturn {
  const { user } = useAuth();
  const [commands, setCommands] = useState<VoiceCommand[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCommands = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const data = await getUserVoiceCommands(user.id);
      setCommands(data as VoiceCommand[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load commands');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const createCommand = useCallback(
    async (
      name: string,
      description: string,
      phrases: string[],
      category: string,
      action: string
    ) => {
      if (!user?.id) return;

      try {
        setIsLoading(true);
        const newCommand = await createVoiceCommand(
          user.id,
          name,
          description,
          phrases,
          category,
          action
        );
        setCommands((prev) => [...prev, newCommand]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create command');
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id]
  );

  const executeCommand = useCallback(
    async (
      commandId: string,
      phraseUsed: string,
      confidence: number,
      success: boolean,
      executionTime: number
    ) => {
      if (!user?.id) return;

      try {
        createLog(
          commandId,
          user.id,
          phraseUsed,
          confidence,
          success,
          executionTime
        );

        await logCommandExecution(
          commandId,
          user.id,
          phraseUsed,
          confidence,
          success,
          executionTime
        );

        // Update command stats
        setCommands((prev) =>
          prev.map((cmd) => {
            if (cmd.id === commandId) {
              const newExecutionCount = cmd.executionCount + 1;
              const currentSuccesses = Math.round(
                (cmd.successRate / 100) * cmd.executionCount
              );
              const newSuccessRate = success
                ? ((currentSuccesses + 1) / newExecutionCount) * 100
                : (currentSuccesses / newExecutionCount) * 100;

              return {
                ...cmd,
                executionCount: newExecutionCount,
                successRate: newSuccessRate,
              };
            }
            return cmd;
          })
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to log execution');
      }
    },
    [user?.id]
  );

  const deleteCommand = useCallback(
    async (commandId: string) => {
      try {
        await updateVoiceCommand(commandId, { is_active: false });
        setCommands((prev) => prev.filter((cmd) => cmd.id !== commandId));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete command');
      }
    },
    []
  );

  return {
    commands,
    isLoading,
    error,
    loadCommands,
    createCommand,
    executeCommand,
    deleteCommand,
  };
}
