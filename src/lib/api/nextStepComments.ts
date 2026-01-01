import { supabase } from '../supabase';

/**
 * Get the latest next step comment for a requirement
 */
export async function getLatestNextStepComment(requirementId: string): Promise<{
  comment_text: string;
  created_at: string;
  user_email: string;
} | null> {
  try {
    const { data, error } = await supabase
      .from('next_step_comments')
      .select('*, user_id')
      .eq('requirement_id', requirementId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // PGRST116 means no rows found, which is not really an error
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching latest next step comment:', error);
      return null;
    }

    if (!data) return null;

    // Fetch user info
    const { data: userData } = await supabase
      .from('users')
      .select('email')
      .eq('id', data.user_id)
      .single();

    return {
      comment_text: data.comment_text,
      created_at: data.created_at,
      user_email: userData?.email || '',
    };
  } catch (err) {
    console.error('Error fetching latest next step comment:', err);
    return null;
  }
}

/**
 * Get all next step comments for a requirement
 */
export async function getNextStepComments(requirementId: string) {
  try {
    const { data, error } = await supabase
      .from('next_step_comments')
      .select('*, users!user_id(email, full_name)')
      .eq('requirement_id', requirementId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching next step comments:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error fetching next step comments:', err);
    return [];
  }
}

/**
 * Delete a next step comment
 */
export async function deleteNextStepComment(commentId: string) {
  try {
    const { error } = await supabase
      .from('next_step_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error('Error deleting next step comment:', error);
      throw error;
    }
  } catch (err) {
    console.error('Error deleting next step comment:', err);
    throw err;
  }
}
