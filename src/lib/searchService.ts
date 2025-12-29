/**
 * Real Search Service
 * Fetches actual data from Supabase for global search
 */

import { supabase } from './supabase';
import type { SearchResult, SearchCategory } from './searchTypes';

/**
 * Fetch requirements from Supabase with full-text search
 */
export const fetchRequirements = async (
  searchQuery: string,
  userId: string
): Promise<SearchResult[]> => {
  try {
    // Escape special characters for ILIKE
    const escapedQuery = searchQuery.replace(/%/g, '\\%').replace(/_/g, '\\_');
    
    const { data, error } = await supabase
      .from('requirements')
      .select('id, title, description, location, status, company, end_client, rate, primary_tech_stack, duration, created_at, updated_at')
      .eq('user_id', userId)
      .or(`title.ilike.%${escapedQuery}%,description.ilike.%${escapedQuery}%,location.ilike.%${escapedQuery}%,company.ilike.%${escapedQuery}%,end_client.ilike.%${escapedQuery}%,rate.ilike.%${escapedQuery}%,primary_tech_stack.ilike.%${escapedQuery}%,status.ilike.%${escapedQuery}%`)
      .limit(20);

    if (error) throw error;

    return (data || []).map((req) => ({
      id: req.id,
      title: req.title,
      category: 'requirements' as SearchCategory,
      description: `${req.company || 'N/A'} | Status: ${req.status} | Budget: ${req.rate || 'N/A'}`,
      preview: `${req.end_client || 'N/A'} | Skills: ${req.primary_tech_stack || 'N/A'} | Location: ${req.location || 'Remote'}`,
      href: `/crm?view=requirements&id=${req.id}`,
      metadata: {
        company: req.company,
        endClient: req.end_client,
        status: req.status,
        rate: req.rate,
        location: req.location,
        skills: req.primary_tech_stack?.split(',').map((s: string) => s.trim()) || [],
        duration: req.duration,
      },
    }));
  } catch (error) {
    console.error('Error fetching requirements:', error);
    return [];
  }
};

/**
 * Fetch interviews from Supabase with full-text search
 */
export const fetchInterviews = async (
  searchQuery: string,
  userId: string
): Promise<SearchResult[]> => {
  try {
    // Escape special characters for ILIKE
    const escapedQuery = searchQuery.replace(/%/g, '\\%').replace(/_/g, '\\_');
    
    const { data, error } = await supabase
      .from('interviews')
      .select('id, interview_with, status, scheduled_date, round, result, type, feedback_notes, notes, created_at, updated_at')
      .eq('user_id', userId)
      .or(`interview_with.ilike.%${escapedQuery}%,status.ilike.%${escapedQuery}%,round.ilike.%${escapedQuery}%,result.ilike.%${escapedQuery}%,type.ilike.%${escapedQuery}%,feedback_notes.ilike.%${escapedQuery}%,notes.ilike.%${escapedQuery}%`)
      .limit(20);

    if (error) throw error;

    return (data || []).map((interview) => ({
      id: interview.id,
      title: interview.interview_with || 'Interview',
      category: 'interviews' as SearchCategory,
      description: `Status: ${interview.status} | Round: ${interview.round || 'N/A'} | Date: ${interview.scheduled_date}`,
      preview: `Result: ${interview.result || 'Pending'} | Type: ${interview.type || 'N/A'}${interview.feedback_notes ? ' | Feedback: ' + interview.feedback_notes.substring(0, 50) : ''}`,
      href: `/crm?view=interviews&id=${interview.id}`,
      metadata: {
        candidate: interview.interview_with,
        status: interview.status,
        date: interview.scheduled_date,
        round: interview.round,
        result: interview.result,
        type: interview.type,
        feedback: interview.feedback_notes,
      },
    }));
  } catch (error) {
    console.error('Error fetching interviews:', error);
    return [];
  }
};

/**
 * Fetch consultants from Supabase with full-text search
 */
export const fetchConsultants = async (
  searchQuery: string,
  userId: string
): Promise<SearchResult[]> => {
  try {
    // Escape special characters for ILIKE
    const escapedQuery = searchQuery.replace(/%/g, '\\%').replace(/_/g, '\\_');
    
    const { data, error } = await supabase
      .from('consultants')
      .select('id, name, email, location, primary_skills, secondary_skills, total_experience, availability, status, expected_rate, company, created_at, updated_at')
      .eq('user_id', userId)
      .or(`name.ilike.%${escapedQuery}%,email.ilike.%${escapedQuery}%,location.ilike.%${escapedQuery}%,primary_skills.ilike.%${escapedQuery}%,secondary_skills.ilike.%${escapedQuery}%,total_experience.ilike.%${escapedQuery}%,availability.ilike.%${escapedQuery}%,expected_rate.ilike.%${escapedQuery}%,company.ilike.%${escapedQuery}%`)
      .limit(20);

    if (error) throw error;

    return (data || []).map((consultant) => ({
      id: consultant.id,
      title: consultant.name,
      category: 'consultants' as SearchCategory,
      description: `${consultant.company || 'Independent'} | Status: ${consultant.status || 'N/A'} | Availability: ${consultant.availability || 'N/A'}`,
      preview: `Skills: ${consultant.primary_skills || 'N/A'} | Experience: ${consultant.total_experience || 'N/A'} | Rate: ${consultant.expected_rate || 'N/A'}`,
      href: `/crm?view=consultants&id=${consultant.id}`,
      metadata: {
        name: consultant.name,
        email: consultant.email,
        location: consultant.location,
        skills: [
          ...(consultant.primary_skills?.split(',').map((s: string) => s.trim()) || []),
          ...(consultant.secondary_skills?.split(',').map((s: string) => s.trim()) || []),
        ],
        experience: consultant.total_experience,
        availability: consultant.availability,
        rate: consultant.expected_rate,
        company: consultant.company,
      },
    }));
  } catch (error) {
    console.error('Error fetching consultants:', error);
    return [];
  }
};

/**
 * Fetch documents from Supabase with full-text search
 */
export const fetchDocuments = async (
  searchQuery: string,
  userId: string
): Promise<SearchResult[]> => {
  try {
    // Escape special characters for ILIKE
    const escapedQuery = searchQuery.replace(/%/g, '\\%').replace(/_/g, '\\_');
    
    const { data, error } = await supabase
      .from('documents')
      .select('id, original_filename, filename, mime_type, file_size, created_at, updated_at')
      .eq('user_id', userId)
      .or(`original_filename.ilike.%${escapedQuery}%,filename.ilike.%${escapedQuery}%`)
      .limit(20);

    if (error) throw error;

    return (data || []).map((doc) => ({
      id: doc.id,
      title: doc.original_filename,
      category: 'documents' as SearchCategory,
      description: `Type: ${doc.mime_type} | Size: ${(doc.file_size / 1024).toFixed(2)} KB`,
      preview: `Created: ${new Date(doc.created_at).toLocaleDateString()}`,
      href: `/documents?id=${doc.id}`,
      metadata: {
        filename: doc.original_filename,
        mimeType: doc.mime_type,
        fileSize: doc.file_size,
        createdAt: doc.created_at,
      },
    }));
  } catch (error) {
    console.error('Error fetching documents:', error);
    return [];
  }
};

/**
 * Perform global search across all categories
 */
export const performGlobalSearch = async (
  searchQuery: string,
  userId: string | null,
  categories?: SearchCategory[]
): Promise<SearchResult[]> => {
  if (!userId || !searchQuery.trim()) return [];

  try {
    const categoriesToSearch = categories || ['requirements', 'interviews', 'consultants', 'documents'];

    const searchPromises: Promise<SearchResult[]>[] = [];

    if (categoriesToSearch.includes('requirements')) {
      searchPromises.push(fetchRequirements(searchQuery, userId));
    }
    if (categoriesToSearch.includes('interviews')) {
      searchPromises.push(fetchInterviews(searchQuery, userId));
    }
    if (categoriesToSearch.includes('consultants')) {
      searchPromises.push(fetchConsultants(searchQuery, userId));
    }
    if (categoriesToSearch.includes('documents')) {
      searchPromises.push(fetchDocuments(searchQuery, userId));
    }

    const allResults = await Promise.all(searchPromises);
    return allResults.flat();
  } catch (error) {
    console.error('Error performing global search:', error);
    return [];
  }
};
