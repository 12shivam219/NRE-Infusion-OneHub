import { supabase } from '../supabase';
import type { Database } from '../database.types';

type Document = Database['public']['Tables']['documents']['Row'];

export const uploadDocument = async (
  file: File,
  userId: string,
  source: 'local' | 'google_drive' = 'local',
  googleDriveId?: string
): Promise<{ success: boolean; document?: Document; error?: string }> => {
  try {
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    // Use the userId from your app's users table for the storage path
    const storagePath = `${userId}/${Date.now()}_${sanitizedFilename}`;

    console.log('[UPLOAD] Starting document upload', { 
      fileName: file.name, 
      fileSize: file.size, 
      mimeType: file.type,
      userId,
      storagePath
    });

    const { error: uploadError, data } = await supabase.storage
      .from('documents')
      .upload(storagePath, file);

    console.log('[UPLOAD] Upload response:', { uploadError, data });

    if (uploadError) {
      console.error('[UPLOAD] Upload error:', uploadError);
      return { success: false, error: uploadError.message };
    }

    const { data: document, error: dbError } = await supabase
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
      .single();

    if (dbError) {
      console.error('[UPLOAD] DB error:', dbError);
      return { success: false, error: dbError.message };
    }

    console.log('[UPLOAD] Upload successful:', document);
    return { success: true, document };
  } catch (error) {
    console.error('[UPLOAD] Exception:', error);
    return { success: false, error: 'Upload failed' };
  }
};

export const getDocuments = async (
  userId: string
): Promise<{ success: boolean; documents?: Document[]; error?: string }> => {
  try {
    console.log('[FETCH] Getting documents for user:', userId);
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[FETCH] Error:', error);
      return { success: false, error: error.message };
    }

    console.log('[FETCH] Successfully fetched', data?.length || 0, 'documents');
    return { success: true, documents: data || [] };
  } catch (error) {
    console.error('[FETCH] Exception:', error);
    return { success: false, error: 'Failed to fetch documents' };
  }
};

export const getDocument = async (
  documentId: string
): Promise<{ success: boolean; document?: Document; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, document: data };
  } catch {
    return { success: false, error: 'Failed to fetch document' };
  }
};

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
      await supabase.storage.from('documents').remove([document.storage_path]);
    }

    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to delete document' };
  }
};

export const downloadDocument = async (
  storagePath: string
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(storagePath, 60);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, url: data.signedUrl };
  } catch {
    return { success: false, error: 'Failed to download document' };
  }
};
