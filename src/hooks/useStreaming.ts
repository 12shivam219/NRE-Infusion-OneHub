/**
 * Hook for handling streaming chat responses
 * Manages incremental message updates and completion state
 */

import { useCallback, useState } from 'react';
import { sendChatMessageStream } from '../lib/api/chat';
import type { SendMessageInput } from '../lib/api/chat';
import type { StreamMessage } from '../lib/chat/streaming';

interface UseStreamingReturn {
  isStreaming: boolean;
  streamedText: string;
  streamError: string | null;
  sendStream: (input: SendMessageInput) => Promise<void>;
  resetStream: () => void;
}

export const useStreaming = (): UseStreamingReturn => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [streamError, setStreamError] = useState<string | null>(null);

  const sendStream = useCallback(async (input: SendMessageInput) => {
    setIsStreaming(true);
    setStreamedText('');
    setStreamError(null);

    try {
      await sendChatMessageStream(input, (chunk: StreamMessage) => {
        if (chunk.type === 'token') {
          setStreamedText(prev => prev + chunk.content);
        } else if (chunk.type === 'complete') {
          setIsStreaming(false);
        } else if (chunk.type === 'error') {
          setStreamError(chunk.content);
          setIsStreaming(false);
        }
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Stream failed';
      setStreamError(errorMsg);
      setIsStreaming(false);
    }
  }, []);

  const resetStream = useCallback(() => {
    setStreamedText('');
    setStreamError(null);
    setIsStreaming(false);
  }, []);

  return {
    isStreaming,
    streamedText,
    streamError,
    sendStream,
    resetStream,
  };
};
