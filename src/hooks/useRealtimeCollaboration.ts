import { useState, useCallback, useEffect } from 'react';
import { useAuth } from './useAuth';
import {
  createCollaborationSession,
  addSessionParticipant,
  recordCollaborationEvent,
} from '../lib/api/phase4';
import {
  updatePresenceStatus,
} from '../lib/chat/features/realtimeCollaboration';
import type { CollaborationSession, UserPresence } from '../lib/chat/features/realtimeCollaboration';

interface UseRealtimeCollaborationReturn {
  session: CollaborationSession | null;
  presences: UserPresence[];
  isLoading: boolean;
  error: string | null;
  initializeSession: (conversationId: string, maxParticipants?: number) => Promise<void>;
  joinSession: (sessionId: string) => Promise<void>;
  updatePresence: (status: 'online' | 'typing' | 'idle' | 'away') => Promise<void>;
  leaveSession: () => Promise<void>;
}

export function useRealtimeCollaboration(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _conversationId: string
): UseRealtimeCollaborationReturn {
  const { user } = useAuth();
  const [session, setSession] = useState<CollaborationSession | null>(null);
  const [presences, setPresences] = useState<UserPresence[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeSession = useCallback(
    async (convId: string, maxParticipants: number = 10) => {
      if (!user?.id) return;

      try {
        setIsLoading(true);
        const newSession = await createCollaborationSession(
          convId,
          user.id,
          maxParticipants
        );
        setSession(newSession);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create session');
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id]
  );

  const joinSession = useCallback(
    async (sessionId: string) => {
      if (!user?.id) return;

      try {
        setIsLoading(true);
        const updated = await addSessionParticipant(sessionId, user.id);
        setSession(updated);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to join session');
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id]
  );

  const updatePresence = useCallback(
    async (status: 'online' | 'typing' | 'idle' | 'away') => {
      if (!session) return;

      try {
        setPresences((prev) =>
          prev.map((p) =>
            p.userId === user?.id
              ? updatePresenceStatus(p, status)
              : p
          )
        );

        await recordCollaborationEvent(
          session.id,
          user?.id || '',
          'cursor',
          { status },
          presences.length
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update presence');
      }
    },
    [session, user?.id, presences.length]
  );

  const leaveSession = useCallback(async () => {
    if (!session || !user?.id) return;

    try {
      await recordCollaborationEvent(
        session.id,
        user.id,
        'leave',
        {},
        presences.length
      );
      setSession(null);
      setPresences([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave session');
    }
  }, [session, user?.id, presences.length]);

  // Load presences periodically
  useEffect(() => {
    if (!session) return;

    const interval = setInterval(async () => {
      try {
        // In real implementation, would call getSessionPresences
        // and update presences state
      } catch (err) {
        console.error('Failed to load presences:', err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [session]);

  return {
    session,
    presences,
    isLoading,
    error,
    initializeSession,
    joinSession,
    updatePresence,
    leaveSession,
  };
}
