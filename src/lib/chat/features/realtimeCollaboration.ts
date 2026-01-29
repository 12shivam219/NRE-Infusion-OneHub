 
/**
 * Real-time Collaboration Module
 * Handles multi-user session management, presence tracking, and synchronized updates
 */

export interface CollaborationSession {
  id: string;
  conversationId: string;
  ownerId: string;
  participantIds: string[];
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  maxParticipants: number;
}

export interface UserPresence {
  userId: string;
  username: string;
  status: 'online' | 'typing' | 'idle' | 'away';
  cursorPosition?: number;
  lastActivity: string;
  color: string;
}

export interface CollaborationEvent {
  id: string;
  sessionId: string;
  type: 'message' | 'edit' | 'join' | 'leave' | 'cursor' | 'suggestion';
  userId: string;
  data: Record<string, any>;
  timestamp: string;
  sequenceNumber: number;
}

export interface SyncState {
  version: number;
  lastSyncTime: string;
  pendingChanges: CollaborationEvent[];
  conflictResolutions: Record<string, 'local' | 'remote'>;
}

// Presence tracking colors
const PRESENCE_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#FFA07A',
  '#98D8C8',
  '#F7DC6F',
  '#BB8FCE',
  '#85C1E2',
];

export function createCollaborationSession(
  conversationId: string,
  ownerId: string,
  maxParticipants: number = 10
): CollaborationSession {
  return {
    id: `session_${Date.now()}`,
    conversationId,
    ownerId,
    participantIds: [ownerId],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isActive: true,
    maxParticipants,
  };
}

export function addParticipant(
  session: CollaborationSession,
  userId: string
): CollaborationSession | null {
  if (session.participantIds.includes(userId)) {
    return session;
  }

  if (session.participantIds.length >= session.maxParticipants) {
    return null; // Session is full
  }

  return {
    ...session,
    participantIds: [...session.participantIds, userId],
    updatedAt: new Date().toISOString(),
  };
}

export function removeParticipant(
  session: CollaborationSession,
  userId: string
): CollaborationSession {
  return {
    ...session,
    participantIds: session.participantIds.filter((id) => id !== userId),
    isActive:
      session.participantIds.length > 1 && session.participantIds[0] !== userId,
    updatedAt: new Date().toISOString(),
  };
}

export function createPresenceEntry(
  userId: string,
  username: string,
  participantIndex: number
): UserPresence {
  return {
    userId,
    username,
    status: 'online',
    cursorPosition: 0,
    lastActivity: new Date().toISOString(),
    color: PRESENCE_COLORS[participantIndex % PRESENCE_COLORS.length],
  };
}

export function updatePresenceStatus(
  presence: UserPresence,
  status: 'online' | 'typing' | 'idle' | 'away'
): UserPresence {
  return {
    ...presence,
    status,
    lastActivity: new Date().toISOString(),
  };
}

export function updateCursorPosition(
  presence: UserPresence,
  cursorPosition: number
): UserPresence {
  return {
    ...presence,
    cursorPosition,
    lastActivity: new Date().toISOString(),
  };
}

export function createCollaborationEvent(
  sessionId: string,
  type: 'message' | 'edit' | 'join' | 'leave' | 'cursor' | 'suggestion',
  userId: string,
  data: Record<string, any>,
  sequenceNumber: number
): CollaborationEvent {
  return {
    id: `event_${Date.now()}_${Math.random()}`,
    sessionId,
    type,
    userId,
    data,
    timestamp: new Date().toISOString(),
    sequenceNumber,
  };
}

export function mergeCollaborationEvents(
  local: CollaborationEvent[],
  remote: CollaborationEvent[]
): CollaborationEvent[] {
  const merged = [...local, ...remote];
  return merged.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
}

export function resolveConflict(
  localEvent: CollaborationEvent,
  remoteEvent: CollaborationEvent,
  preference: 'local' | 'remote' = 'remote'
): CollaborationEvent {
  if (preference === 'local') {
    return {
      ...localEvent,
      sequenceNumber: Math.max(
        localEvent.sequenceNumber,
        remoteEvent.sequenceNumber
      ),
    };
  }

  return {
    ...remoteEvent,
    sequenceNumber: Math.max(
      localEvent.sequenceNumber,
      remoteEvent.sequenceNumber
    ),
  };
}

export function createSyncState(): SyncState {
  return {
    version: 1,
    lastSyncTime: new Date().toISOString(),
    pendingChanges: [],
    conflictResolutions: {},
  };
}

export function updateSyncState(
  state: SyncState,
  events: CollaborationEvent[]
): SyncState {
  return {
    ...state,
    version: state.version + 1,
    lastSyncTime: new Date().toISOString(),
    pendingChanges: [
      ...state.pendingChanges.filter(
        (e) => !events.find((ne) => ne.id === e.id)
      ),
      ...events,
    ],
  };
}

export function validateSessionAccess(
  session: CollaborationSession,
  userId: string
): boolean {
  return session.participantIds.includes(userId) && session.isActive;
}

export function getPresenceColor(participantIndex: number): string {
  return PRESENCE_COLORS[participantIndex % PRESENCE_COLORS.length];
}

export function formatPresenceStatus(presence: UserPresence): string {
  const timeAgo = Math.round(
    (Date.now() - new Date(presence.lastActivity).getTime()) / 1000
  );
  const minutes = Math.floor(timeAgo / 60);

  if (timeAgo < 5) {
    return `${presence.username} (${presence.status})`;
  }
  if (minutes < 1) {
    return `${presence.username} (idle - ${timeAgo}s)`;
  }
  return `${presence.username} (away - ${minutes}m)`;
}
