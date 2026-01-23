/**
 * API functions for Phase 2 features
 * Handles analytics, exports, custom commands, and wake word settings
 */

import { supabase } from '../supabase';
import type { CustomVoiceCommand } from '../chat/customCommands';

// ========== ANALYTICS ==========

export interface ConversationAnalytics {
  conversationId: string;
  messageCount: number;
  totalTokens: number;
  totalDurationMs: number;
  sentiment?: 'positive' | 'neutral' | 'negative';
  topTopics?: string[];
  actionsExecuted?: string[];
}

export const saveAnalytics = async (
  userId: string,
  analytics: ConversationAnalytics
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.from('chat_analytics').insert({
      user_id: userId,
      conversation_id: analytics.conversationId,
      message_count: analytics.messageCount,
      total_tokens: analytics.totalTokens,
      total_duration_ms: analytics.totalDurationMs,
      sentiment: analytics.sentiment,
      top_topics: analytics.topTopics,
      actions_executed: analytics.actionsExecuted,
    });

    if (error) throw error;
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save analytics';
    return { success: false, error: message };
  }
};

export const getAnalytics = async (userId: string, limit: number = 30) => {
  try {
    const { data, error } = await supabase
      .from('chat_analytics')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch analytics';
    return { success: false, error: message };
  }
};

// ========== EXPORTS ==========

export interface ConversationExport {
  title: string;
  description?: string;
  format: 'json' | 'pdf' | 'markdown';
  conversationId: string;
}

export const saveExport = async (
  userId: string,
  export_data: ConversationExport & { file_path?: string }
): Promise<{ success: boolean; data?: { id: string }; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('conversation_exports')
      .insert({
        user_id: userId,
        conversation_id: export_data.conversationId,
        title: export_data.title,
        description: export_data.description,
        format: export_data.format,
        file_path: export_data.file_path,
      })
      .select();

    if (error) throw error;
    return { success: true, data: data?.[0] };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save export';
    return { success: false, error: message };
  }
};

export const getExports = async (userId: string, limit: number = 20) => {
  try {
    const { data, error } = await supabase
      .from('conversation_exports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch exports';
    return { success: false, error: message };
  }
};

export const shareExport = async (
  exportId: string,
  userId: string
): Promise<{ success: boolean; data?: { share_token: string }; error?: string }> => {
  try {
    const shareToken = `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const { data, error } = await supabase
      .from('conversation_exports')
      .update({
        is_shared: true,
        share_token: shareToken,
        share_expires_at: expiresAt.toISOString(),
      })
      .eq('id', exportId)
      .eq('user_id', userId)
      .select();

    if (error) throw error;
    return { success: true, data: data?.[0] };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to share export';
    return { success: false, error: message };
  }
};

// ========== CUSTOM VOICE COMMANDS ==========

export const saveCustomCommand = async (
  userId: string,
  command: Omit<CustomVoiceCommand, 'id' | 'userId' | 'usageCount' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; data?: CustomVoiceCommand; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('custom_voice_commands')
      .insert({
        user_id: userId,
        trigger_phrase: command.triggerPhrase,
        action_type: command.actionType,
        action_target: command.actionTarget,
        action_params: command.actionParams,
        is_active: command.isActive,
      })
      .select();

    if (error) throw error;
    return { success: true, data: data?.[0] };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save command';
    return { success: false, error: message };
  }
};

export const getCustomCommands = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('custom_voice_commands')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch commands';
    return { success: false, error: message };
  }
};

export const deleteCustomCommand = async (
  commandId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('custom_voice_commands')
      .delete()
      .eq('id', commandId)
      .eq('user_id', userId);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete command';
    return { success: false, error: message };
  }
};

export const incrementCommandUsage = async (commandId: string) => {
  try {
    const { data, error } = await supabase.rpc('increment_command_usage', {
      command_id: commandId,
    });

    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update usage';
    return { success: false, error: message };
  }
};

// ========== WAKE WORD SETTINGS ==========

export interface WakeWordConfig {
  wakeWord: string;
  isEnabled: boolean;
  sensitivity: number;
  autoListenDurationMs: number;
}

export const saveWakeWordSettings = async (
  userId: string,
  settings: WakeWordConfig
): Promise<{ success: boolean; data?: WakeWordConfig; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('wake_word_settings')
      .upsert({
        user_id: userId,
        wake_word: settings.wakeWord,
        is_enabled: settings.isEnabled,
        sensitivity: settings.sensitivity,
        auto_listen_duration_ms: settings.autoListenDurationMs,
      })
      .select();

    if (error) throw error;
    return { success: true, data: data?.[0] };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save settings';
    return { success: false, error: message };
  }
};

export const getWakeWordSettings = async (
  userId: string
): Promise<{ success: boolean; data?: WakeWordConfig; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('wake_word_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found

    return {
      success: true,
      data: data
        ? {
            wakeWord: data.wake_word,
            isEnabled: data.is_enabled,
            sensitivity: data.sensitivity,
            autoListenDurationMs: data.auto_listen_duration_ms,
          }
        : undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch settings';
    return { success: false, error: message };
  }
};

// ========== STREAMING SESSIONS ==========

export const createStreamingSession = async (
  userId: string,
  conversationId: string
): Promise<{ success: boolean; data?: { sessionToken: string }; error?: string }> => {
  try {
    const sessionToken = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const { data, error } = await supabase
      .from('streaming_sessions')
      .insert({
        user_id: userId,
        conversation_id: conversationId,
        session_token: sessionToken,
      })
      .select();

    if (error) throw error;
    return {
      success: true,
      data: data?.[0] ? { sessionToken: data[0].session_token } : undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create session';
    return { success: false, error: message };
  }
};

export const updateStreamingSession = async (
  sessionToken: string,
  updates: { totalChunks?: number; totalResponseTimeMs?: number; isCompleted?: boolean }
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('streaming_sessions')
      .update({
        total_chunks: updates.totalChunks,
        total_response_time_ms: updates.totalResponseTimeMs,
        is_completed: updates.isCompleted,
        end_time: updates.isCompleted ? new Date().toISOString() : undefined,
      })
      .eq('session_token', sessionToken);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update session';
    return { success: false, error: message };
  }
};
