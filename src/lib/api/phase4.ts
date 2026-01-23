/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Phase 4 API Functions
 * Supabase CRUD operations for advanced features
 */

import { supabase } from '../supabase';

// ==================== Real-time Collaboration ====================

export async function createCollaborationSession(
  conversationId: string,
  ownerId: string,
  maxParticipants: number = 10
) {
  const { data, error } = await supabase
    .from('collaboration_sessions')
    .insert([
      {
        conversation_id: conversationId,
        owner_id: ownerId,
        participant_ids: [ownerId],
        max_participants: maxParticipants,
        is_active: true,
      },
    ])
    .select();

  if (error) throw error;
  return data[0];
}

export async function getCollaborationSession(sessionId: string) {
  const { data, error } = await supabase
    .from('collaboration_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error) throw error;
  return data;
}

export async function addSessionParticipant(
  sessionId: string,
  userId: string
) {
  const session = await getCollaborationSession(sessionId);

  if (session.participant_ids.includes(userId)) {
    return session;
  }

  if (session.participant_ids.length >= session.max_participants) {
    throw new Error('Session is full');
  }

  const { data, error } = await supabase
    .from('collaboration_sessions')
    .update({
      participant_ids: [...session.participant_ids, userId],
    })
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function recordUserPresence(
  sessionId: string,
  userId: string,
  username: string,
  status: 'online' | 'typing' | 'idle' | 'away'
) {
  const { data, error } = await supabase
    .from('user_presence')
    .upsert(
      {
        session_id: sessionId,
        user_id: userId,
        username,
        status,
        cursor_position: 0,
        last_activity: new Date().toISOString(),
      },
      { onConflict: 'user_id,session_id' }
    )
    .select();

  if (error) throw error;
  return data[0];
}

export async function getSessionPresences(sessionId: string) {
  const { data, error } = await supabase
    .from('user_presence')
    .select('*')
    .eq('session_id', sessionId)
    .order('last_activity', { ascending: false });

  if (error) throw error;
  return data;
}

export async function recordCollaborationEvent(
  sessionId: string,
  userId: string,
  type: string,
  data: Record<string, any>,
  sequenceNumber: number
) {
  const { data: result, error } = await supabase
    .from('collaboration_events')
    .insert([
      {
        session_id: sessionId,
        user_id: userId,
        type,
        data,
        sequence_number: sequenceNumber,
      },
    ])
    .select();

  if (error) throw error;
  return result[0];
}

// ==================== Voice Commands Library ====================

export async function createVoiceCommand(
  userId: string,
  name: string,
  description: string,
  phrases: string[],
  category: string,
  action: string,
  parameters?: Record<string, any>
) {
  const { data, error } = await supabase
    .from('voice_commands')
    .insert([
      {
        user_id: userId,
        name,
        description,
        phrases,
        category,
        action,
        parameters,
        is_active: true,
        execution_count: 0,
        success_rate: 0,
      },
    ])
    .select();

  if (error) throw error;
  return data[0];
}

export async function getUserVoiceCommands(userId: string) {
  const { data, error } = await supabase
    .from('voice_commands')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('execution_count', { ascending: false });

  if (error) throw error;
  return data;
}

export async function updateVoiceCommand(
  commandId: string,
  updates: Record<string, any>
) {
  const { data, error } = await supabase
    .from('voice_commands')
    .update(updates)
    .eq('id', commandId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function logCommandExecution(
  commandId: string,
  userId: string,
  phraseUsed: string,
  confidence: number,
  success: boolean,
  executionTime: number,
  result?: any,
  error_msg?: string
) {
  const { data, error } = await supabase
    .from('command_execution_logs')
    .insert([
      {
        command_id: commandId,
        user_id: userId,
        phrase_used: phraseUsed,
        confidence,
        success,
        execution_time: executionTime,
        result,
        error: error_msg,
      },
    ])
    .select();

  if (error) throw error;
  return data[0];
}

// ==================== Domain Knowledge ====================

export async function createDomainKnowledgeBase(
  userId: string,
  name: string,
  domain: string,
  description: string = '',
  isPublic: boolean = false
) {
  const { data, error } = await supabase
    .from('domain_knowledge_bases')
    .insert([
      {
        user_id: userId,
        name,
        domain,
        description,
        is_public: isPublic,
      },
    ])
    .select();

  if (error) throw error;
  return data[0];
}

export async function addKnowledgeEntry(
  kbId: string,
  userId: string,
  title: string,
  content: string,
  type: string,
  tags: string[] = []
) {
  const { data, error } = await supabase
    .from('knowledge_entries')
    .insert([
      {
        kb_id: kbId,
        user_id: userId,
        title,
        content,
        type,
        tags,
        is_active: true,
        view_count: 0,
      },
    ])
    .select();

  if (error) throw error;
  return data[0];
}

export async function searchKnowledge(
  userId: string,
  query: string,
  domain?: string
) {
  let queryObj = supabase
    .from('knowledge_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (domain) {
    queryObj = queryObj.eq('domain', domain);
  }

  const { data, error } = await queryObj;

  if (error) throw error;

  // Client-side filtering
  return (data || []).filter(
    (entry: any) =>
      entry.title.toLowerCase().includes(query.toLowerCase()) ||
      entry.content.toLowerCase().includes(query.toLowerCase()) ||
      entry.tags.some((tag: string) => tag.toLowerCase().includes(query.toLowerCase()))
  );
}

// ==================== Advanced Context Awareness ====================

export async function createConversationMemory(
  conversationId: string,
  userId: string
) {
  const { data, error } = await supabase
    .from('conversation_memories')
    .insert([
      {
        conversation_id: conversationId,
        user_id: userId,
        short_term_memory: [],
        long_term_memory: [],
        working_memory: [],
        semantic_memory: {},
        episodic_memory: [],
      },
    ])
    .select();

  if (error) throw error;
  return data[0];
}

export async function updateConversationMemory(
  memoryId: string,
  updates: Record<string, any>
) {
  const { data, error } = await supabase
    .from('conversation_memories')
    .update(updates)
    .eq('id', memoryId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getUserContextProfile(userId: string) {
  const { data, error } = await supabase
    .from('user_context_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code === 'PGRST116') {
    // Not found, create one
    const { data: newProfile, error: createError } = await supabase
      .from('user_context_profiles')
      .insert([
        {
          user_id: userId,
          communication_style: 'casual',
          expertise: {},
          interaction_patterns: {},
          known_issues: [],
          goals: [],
        },
      ])
      .select()
      .single();

    if (createError) throw createError;
    return newProfile;
  }

  if (error) throw error;
  return data;
}

// ==================== Sentiment Analysis ====================

export async function recordSentimentScore(
  conversationId: string,
  userId: string,
  text: string,
  sentimentData: Record<string, any>
) {
  const { data, error } = await supabase
    .from('sentiment_scores')
    .insert([
      {
        conversation_id: conversationId,
        user_id: userId,
        text,
        ...sentimentData,
      },
    ])
    .select();

  if (error) throw error;
  return data[0];
}

export async function getSentimentTrend(
  conversationId: string,
  limit: number = 50
) {
  const { data, error } = await supabase
    .from('sentiment_scores')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function detectAndRecordSentimentIssues(
  conversationId: string,
  userId: string,
  issues: any[]
) {
  const { data, error } = await supabase
    .from('sentiment_issues')
    .insert(
      issues.map((issue) => ({
        conversation_id: conversationId,
        user_id: userId,
        ...issue,
      }))
    )
    .select();

  if (error) throw error;
  return data;
}

// ==================== Voice Emotion Detection ====================

export async function recordVoiceEmotionScore(
  conversationId: string,
  userId: string,
  audioId: string,
  emotionData: Record<string, any>
) {
  const { data, error } = await supabase
    .from('voice_emotion_scores')
    .insert([
      {
        conversation_id: conversationId,
        user_id: userId,
        audio_id: audioId,
        ...emotionData,
      },
    ])
    .select();

  if (error) throw error;
  return data[0];
}

export async function getVoiceEmotionHistory(
  userId: string,
  limit: number = 100
) {
  const { data, error } = await supabase
    .from('voice_emotion_scores')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function recordVoiceHealthMetrics(
  userId: string,
  metricsData: Record<string, any>
) {
  const { data, error } = await supabase
    .from('voice_health_metrics')
    .upsert(
      {
        user_id: userId,
        ...metricsData,
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getVoiceHealthMetrics(userId: string) {
  const { data, error } = await supabase
    .from('voice_health_metrics')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code === 'PGRST116') {
    return null; // Not found
  }

  if (error) throw error;
  return data;
}
