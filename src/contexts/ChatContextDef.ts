/**
 * Chat Context - Manages conversation state and history
 */

import { createContext } from 'react';
import type { Message, ChatResponse } from '../lib/chat/types';

export interface ChatContextType {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  conversationId: string;
  
  // Actions
  addMessage: (message: Message) => void;
  sendMessage: (text: string) => Promise<ChatResponse | null>;
  clearHistory: () => Promise<void>;
  setError: (error: string | null) => void;
}

export const ChatContext = createContext<ChatContextType | undefined>(undefined);
