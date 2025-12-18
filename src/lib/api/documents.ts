import { supabase } from '../supabase';
import type { Database } from '../database.types';
import { logger, handleApiError, retryAsync } from '../errorHandler';

type Document = Database['public']['Tables']['documents']['Row'];

/**
 * Upload a document with retry logic and comprehensive error handling
 */
export const uploadDocument = async (
  file: File,
  userId: string,
  source: 'local' | 'google_drive' = 'local',
  googleDriveId?: string
): Promise<{ success: boolean; document?: Document; error?: string }> => {
  try {
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${userId}/${Date.now()}_${sanitizedFilename}`;

    // Retry storage upload with exponential backoff
    const { error: uploadError } = await retryAsync(
      async () =>
        supabase.storage.from('documents').upload(storagePath, file),
      {
        maxAttempts: 3,
        initialDelayMs: 200,
        onRetry: (attempt) =>
          logger.warn(`Upload retry attempt ${attempt}`, {
            component: 'uploadDocument',
            resource: file.name,
          }),
      }
    );

    if (uploadError) {
      const appError = handleApiError(uploadError, {
        component: 'uploadDocument',
        action: 'storage_upload',
        resource: file.name,
      });
      return { success: false, error: appError.message };
    }

    // Insert into database with retry
    const { data: document, error: dbError } = await retryAsync(
      async () =>
        supabase
          .from('documents')
          .insert({
            user_id: userId,
            filename: sanitizedFilename,
            original_filename: file.name,
            file_size: file.size,
            mime_type: file.type,
            storage_path: storagePath,
            source,
            google_drive_id: googleDriveId,
          })
          .select()
          .single(),
      {
        maxAttempts: 2,
        initialDelayMs: 100,
      }
    );

    if (dbError) {
      const appError = handleApiError(dbError, {
        component: 'uploadDocument',
        action: 'db_insert',
        resource: file.name,
      });
      return { success: false, error: appError.message };
    }

    logger.info('Document uploaded successfully', {
      component: 'uploadDocument',
      resource: file.name,
    });
    return { success: true, document };
  } catch (error) {
    const appError = handleApiError(error, {
      component: 'uploadDocument',
      action: 'upload_failed',
    });
    return { success: false, error: appError.message };
  }
};

/**
 * Fetch all documents for a user with retry logic
 */
export const getDocuments = async (
  userId: string
): Promise<{ success: boolean; documents?: Document[]; error?: string }> => {
  try {
    const { data, error } = await retryAsync(
      async () =>
        supabase
          .from('documents')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
      {
        maxAttempts: 2,
        initialDelayMs: 100,
      }
    );

    if (error) {
      const appError = handleApiError(error, {
        component: 'getDocuments',
        action: 'fetch_all',
        userId,
      });
      return { success: false, error: appError.message };
    }

    return { success: true, documents: data || [] };
  } catch (error) {
    const appError = handleApiError(error, {
      component: 'getDocuments',
    });
    return { success: false, error: appError.message };
  }
};

export const getDocumentsPage = async (options: {
  userId: string;
  limit?: number;
  offset?: number;
  cursor?: { created_at: string; direction?: 'after' | 'before' };
  includeCount?: boolean;
  search?: string;
  orderBy?: 'created_at' | 'updated_at';
  orderDir?: 'asc' | 'desc';
}): Promise<{ success: boolean; documents?: Document[]; total?: number; error?: string }> => {
  const {
    userId,
    limit = 50,
    offset = 0,
    cursor,
    includeCount = false,
    search,
    orderBy = 'created_at',
    orderDir = 'desc',
  } = options;

  try {
    const countMode = includeCount ? 'exact' : undefined;

    const { data, count, error } = await retryAsync(
      async () => {
        let query = supabase
          .from('documents')
          .select('*', { count: countMode as 'exact' | undefined })
          .eq('user_id', userId)
          .order(orderBy, { ascending: orderDir === 'asc' });

        if (search && search.trim()) {
          const term = `%${search.trim()}%`;
          query = query.or(`original_filename.ilike.${term},filename.ilike.${term}`);
        }

        if (cursor?.created_at) {
          if (orderDir === 'desc') {
            if (cursor.direction === 'before') {
              query = query.gt(orderBy, cursor.created_at);
            } else {
              query = query.lt(orderBy, cursor.created_at);
            }
          } else {
            if (cursor.direction === 'before') {
              query = query.lt(orderBy, cursor.created_at);
            } else {
              query = query.gt(orderBy, cursor.created_at);
            }
          }
          query = query.limit(limit);
        } else {
          const start = offset;
          const end = offset + limit - 1;
          query = query.range(start, end);
        }

        return query;
      },
      {
        maxAttempts: 2,
        initialDelayMs: 100,
      }
    );

    if (error) {
      const appError = handleApiError(error, {
        component: 'getDocumentsPage',
        action: 'fetch_page',
        userId,
      });
      return { success: false, error: appError.message };
    }

    return { success: true, documents: data || [], total: count ?? 0 };
  } catch (err) {
    const appError = handleApiError(err, {
      component: 'getDocumentsPage',
      action: 'exception',
      userId,
    });
    return { success: false, error: appError.message };
  }
};

/**
 * Fetch a single document by ID
 */
export const getDocument = async (
  documentId: string
): Promise<{ success: boolean; document?: Document; error?: string }> => {
  try {
    const { data, error } = await retryAsync(
      async () =>
        supabase
          .from('documents')
          .select('*')
          .eq('id', documentId)
          .single(),
      {
        maxAttempts: 2,
        initialDelayMs: 100,
      }
    );

    if (error) {
      const appError = handleApiError(error, {
        component: 'getDocument',
        resource: documentId,
      });
      return { success: false, error: appError.message };
    }

    return { success: true, document: data };
  } catch (error) {
    const appError = handleApiError(error, {
      component: 'getDocument',
      resource: documentId,
    });
    return { success: false, error: appError.message };
  }
};

/**
 * Delete a document and its storage file
 */
export const deleteDocument = async (
  documentId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: document } = await supabase
      .from('documents')
      .select('storage_path')
      .eq('id', documentId)
      .single();

    if (document) {
      try {
        await supabase.storage
          .from('documents')
          .remove([document.storage_path]);
      } catch {
        logger.warn('Failed to delete storage file', {
          component: 'deleteDocument',
          resource: documentId,
        });
        // Continue with database deletion even if storage deletion fails
      }
    }

    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (error) {
      const appError = handleApiError(error, {
        component: 'deleteDocument',
        resource: documentId,
      });
      return { success: false, error: appError.message };
    }

    logger.info('Document deleted successfully', {
      component: 'deleteDocument',
      resource: documentId,
    });
    return { success: true };
  } catch (error) {
    const appError = handleApiError(error, {
      component: 'deleteDocument',
      resource: documentId,
    });
    return { success: false, error: appError.message };
  }
};

/**
 * Download a document with a signed URL and retry logic
 */
export const downloadDocument = async (
  storagePath: string
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    const { data, error } = await retryAsync(
      async () =>
        supabase.storage
          .from('documents')
          .createSignedUrl(storagePath, 60 * 60), // 1 hour expiry
      {
        maxAttempts: 2,
        initialDelayMs: 100,
      }
    );

    if (error) {
      const appError = handleApiError(error, {
        component: 'downloadDocument',
        action: 'create_signed_url',
        resource: storagePath,
      });
      return { success: false, error: appError.message };
    }

    logger.debug('Download URL created', {
      component: 'downloadDocument',
      resource: storagePath,
    });
    return { success: true, url: data.signedUrl };
  } catch (error) {
    const appError = handleApiError(error, {
      component: 'downloadDocument',
      resource: storagePath,
    });
    return { success: false, error: appError.message };
  }
};
