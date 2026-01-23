/**
 * Phase 3 API Layer
 * Complete API functions for fine-tuning, multilingual, branching, training, and external services
 */

import { supabase } from '../supabase';
import type { FinetuneConfig } from '../chat/finetuning';
import type { ConversationBranch, BranchMessage, BranchMergeResult } from '../chat/conversationBranching';
import type { UserFeedback, TrainingDataPoint, TrainingDataset } from '../chat/aiTraining';
import type { ServiceConfig, ServiceIntegrationResult } from '../chat/externalServices';

// ============ FINE-TUNING API ============

export async function saveModel(userId: string, model: FinetuneConfig) {
  try {
    const { data, error } = await supabase
      .from('finetune_models')
      .insert({
        id: model.id,
        user_id: userId,
        name: model.name,
        base_model: model.baseModel,
        description: model.description,
        accuracy: model.accuracy,
        latency: model.latency,
        cost_per_token: model.costPerToken,
        hyperparameters: model.hyperparameters,
        training_metrics: model.trainingMetrics,
        is_active: model.isActive,
      })
      .select();

    return { success: !error, data, error: error?.message };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to save model' };
  }
}

export async function updateModel(userId: string, model: FinetuneConfig) {
  try {
    const { data, error } = await supabase
      .from('finetune_models')
      .update({
        name: model.name,
        accuracy: model.accuracy,
        latency: model.latency,
        hyperparameters: model.hyperparameters,
        training_metrics: model.trainingMetrics,
        is_active: model.isActive,
      })
      .eq('id', model.id)
      .eq('user_id', userId)
      .select();

    return { success: !error, data, error: error?.message };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to update model' };
  }
}

export async function getModels(userId: string) {
  try {
    const { data, error } = await supabase
      .from('finetune_models')
      .select('*')
      .eq('user_id', userId);

    return { success: !error, data, error: error?.message };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch models' };
  }
}

export async function deleteModel(userId: string, modelId: string) {
  try {
    const { error } = await supabase
      .from('finetune_models')
      .delete()
      .eq('id', modelId)
      .eq('user_id', userId);

    return { success: !error, error: error?.message };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to delete model' };
  }
}

export async function getModelUsageStats(userId: string, modelId: string) {
  try {
    const { data, error } = await supabase
      .from('model_usage_stats')
      .select('*')
      .eq('user_id', userId)
      .eq('model_id', modelId)
      .single();

    return { success: !error, data, error: error?.message };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch usage stats' };
  }
}

// ============ MULTILINGUAL API ============

export async function saveLanguagePreference(userId: string, languageCode: string) {
  try {
    const { data, error } = await supabase
      .from('user_language_preferences')
      .upsert({
        user_id: userId,
        preferred_language: languageCode,
        updated_at: new Date(),
      })
      .select();

    return { success: !error, data, error: error?.message };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to save language preference' };
  }
}

export async function getLanguagePreference(userId: string) {
  try {
    const { data, error } = await supabase
      .from('user_language_preferences')
      .select('preferred_language')
      .eq('user_id', userId)
      .single();

    return { success: !error, data: data?.preferred_language, error: error?.message };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch language preference' };
  }
}

export async function cacheTranslation(
  userId: string,
  sourceLanguage: string,
  targetLanguage: string,
  originalText: string,
  translatedText: string
) {
  try {
    const { data, error } = await supabase
      .from('translation_cache')
      .insert({
        user_id: userId,
        source_language: sourceLanguage,
        target_language: targetLanguage,
        original_text: originalText,
        translated_text: translatedText,
        created_at: new Date(),
      })
      .select();

    return { success: !error, data, error: error?.message };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to cache translation' };
  }
}

export async function getTranslationFromCache(
  sourceLanguage: string,
  targetLanguage: string,
  text: string
) {
  try {
    const { data, error } = await supabase
      .from('translation_cache')
      .select('translated_text')
      .eq('source_language', sourceLanguage)
      .eq('target_language', targetLanguage)
      .eq('original_text', text)
      .limit(1)
      .single();

    return { success: !error, data: data?.translated_text, error: error?.message };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to get translation from cache' };
  }
}

// ============ CONVERSATION BRANCHING API ============

export async function createBranch(userId: string, branch: ConversationBranch) {
  try {
    const { data, error } = await supabase
      .from('conversation_branches')
      .insert({
        id: branch.id,
        user_id: userId,
        conversation_id: branch.conversationId,
        parent_branch_id: branch.parentBranchId,
        branch_name: branch.branchName,
        description: branch.description,
        created_from_message_id: branch.createdFromMessageId,
        is_active: branch.isActive,
        tags: branch.tags,
      })
      .select();

    return { success: !error, data, error: error?.message };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to create branch' };
  }
}

export async function getBranches(userId: string, conversationId: string) {
  try {
    const { data, error } = await supabase
      .from('conversation_branches')
      .select('*')
      .eq('user_id', userId)
      .eq('conversation_id', conversationId);

    return { success: !error, data, error: error?.message };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch branches' };
  }
}

export async function getBranchMessages(userId: string, branchId: string) {
  try {
    const { data, error } = await supabase
      .from('branch_messages')
      .select('*')
      .eq('user_id', userId)
      .eq('branch_id', branchId)
      .order('message_index', { ascending: true });

    return { success: !error, data, error: error?.message };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch branch messages' };
  }
}

export async function saveBranchMessage(userId: string, message: BranchMessage) {
  try {
    const { data, error } = await supabase
      .from('branch_messages')
      .insert({
        id: message.id,
        user_id: userId,
        branch_id: message.branchId,
        conversation_id: message.conversationId,
        role: message.role,
        content: message.content,
        message_index: message.messageIndex,
        metadata: message.metadata,
      })
      .select();

    return { success: !error, data, error: error?.message };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to save branch message' };
  }
}

export async function mergeBranches(
  userId: string,
  sourceBranchId: string,
  targetBranchId: string,
  mergeResult: BranchMergeResult
) {
  try {
    const { data, error } = await supabase
      .from('branch_merges')
      .insert({
        user_id: userId,
        source_branch_id: sourceBranchId,
        target_branch_id: targetBranchId,
        merged_branch_id: mergeResult.mergedBranchId,
        conflict_count: mergeResult.conflictCount,
        created_at: new Date(),
      })
      .select();

    return { success: !error, data, error: error?.message };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to merge branches' };
  }
}

// ============ AI TRAINING API ============

export async function submitFeedback(userId: string, feedback: UserFeedback) {
  try {
    const { data, error } = await supabase
      .from('user_feedback')
      .insert({
        id: feedback.id,
        user_id: userId,
        conversation_id: feedback.conversationId,
        message_id: feedback.messageId,
        feedback_type: feedback.feedbackType,
        rating: feedback.rating,
        comment: feedback.comment,
        suggested_improvement: feedback.suggestedImprovement,
        model_used: feedback.modelUsed,
        tokens_in_message: feedback.tokensInMessage,
      })
      .select();

    return { success: !error, data, error: error?.message };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to submit feedback' };
  }
}

export async function getFeedback(userId: string, conversationId?: string) {
  try {
    let query = supabase.from('user_feedback').select('*').eq('user_id', userId);

    if (conversationId) {
      query = query.eq('conversation_id', conversationId);
    }

    const { data, error } = await query;

    return { success: !error, data, error: error?.message };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch feedback' };
  }
}

export async function createTrainingDataset(userId: string, dataset: TrainingDataset) {
  try {
    const { data, error } = await supabase
      .from('training_datasets')
      .insert({
        id: dataset.id,
        user_id: userId,
        name: dataset.name,
        description: dataset.description,
        size: dataset.size,
        quality_score: dataset.qualityScore,
        status: dataset.status,
        is_ready: dataset.isReady,
      })
      .select();

    return { success: !error, data, error: error?.message };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to create training dataset' };
  }
}

export async function saveTrainingDataPoint(userId: string, dataPoint: TrainingDataPoint) {
  try {
    const { data, error } = await supabase
      .from('training_data_points')
      .insert({
        id: dataPoint.id,
        user_id: userId,
        dataset_id: dataPoint.id.split('-')[0], // Extract dataset ID
        message_id: dataPoint.messageId,
        input: dataPoint.input,
        output: dataPoint.output,
        category: dataPoint.category,
        difficulty: dataPoint.difficulty,
        relevance: dataPoint.relevance,
      })
      .select();

    return { success: !error, data, error: error?.message };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to save training data point' };
  }
}

export async function getTrainingDatasets(userId: string) {
  try {
    const { data, error } = await supabase
      .from('training_datasets')
      .select('*')
      .eq('user_id', userId);

    return { success: !error, data, error: error?.message };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch training datasets' };
  }
}

// ============ EXTERNAL SERVICES API ============

export async function registerService(userId: string, service: ServiceConfig) {
  try {
    const { data, error } = await supabase
      .from('external_services')
      .insert({
        id: service.id,
        user_id: userId,
        name: service.name,
        description: service.description,
        service_type: service.serviceType,
        endpoint: service.endpoint,
        authentication: service.authentication,
        triggers: service.triggers,
        retry_policy: service.retryPolicy,
        timeout: service.timeout,
        rate_limit: service.rateLimit,
        is_active: service.isActive,
      })
      .select();

    return { success: !error, data, error: error?.message };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to register service' };
  }
}

export async function getServices(userId: string) {
  try {
    const { data, error } = await supabase
      .from('external_services')
      .select('*')
      .eq('user_id', userId);

    return { success: !error, data, error: error?.message };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch services' };
  }
}

export async function updateService(userId: string, service: ServiceConfig) {
  try {
    const { data, error } = await supabase
      .from('external_services')
      .update({
        name: service.name,
        triggers: service.triggers,
        is_active: service.isActive,
        updated_at: new Date(),
      })
      .eq('id', service.id)
      .eq('user_id', userId)
      .select();

    return { success: !error, data, error: error?.message };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to update service' };
  }
}

export async function deleteService(userId: string, serviceId: string) {
  try {
    const { error } = await supabase
      .from('external_services')
      .delete()
      .eq('id', serviceId)
      .eq('user_id', userId);

    return { success: !error, error: error?.message };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to delete service' };
  }
}

export async function logIntegrationResult(
  userId: string,
  serviceId: string,
  result: ServiceIntegrationResult
) {
  try {
    const { error } = await supabase
      .from('service_integration_logs')
      .insert({
        user_id: userId,
        service_id: serviceId,
        event: result.event,
        success: result.success,
        response_status: result.responseStatus,
        response_time: result.responseTime,
        error: result.error,
        retry_count: result.retryCount,
        created_at: new Date(),
      });

    return { success: !error, error: error?.message };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to log integration result' };
  }
}
