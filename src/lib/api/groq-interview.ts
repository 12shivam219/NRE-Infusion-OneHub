/**
 * Groq AI API integration for generating intelligent interview focus points
 * Uses Supabase Edge Function with caching support
 */

import { supabase } from '../supabase';

export interface InterviewFocusInput {
  techStack: string;
  jobDescription: string;
  jobTitle: string;
  company: string;
}

export interface InterviewFocusResult {
  success: boolean;
  interviewFocus?: string;
  error?: string;
}

/**
 * Generate intelligent interview focus points using Groq AI
 * Based on tech stack and job description, tailored for both developer and interviewee
 * Calls Supabase Edge Function with built-in caching
 */
export const generateInterviewFocus = async (
  input: InterviewFocusInput
): Promise<InterviewFocusResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('interview-focus-generator', {
      body: {
        techStack: input.techStack || '',
        jobDescription: input.jobDescription || '',
        jobTitle: input.jobTitle || '',
        company: input.company || '',
      },
    });

    if (error) {
      console.error('Edge Function error:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate interview focus',
      };
    }

    if (!data?.success) {
      return {
        success: false,
        error: data?.error || 'Failed to generate interview focus',
      };
    }

    return {
      success: true,
      interviewFocus: data.interviewFocus,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error generating interview focus:', errorMsg);
    return {
      success: false,
      error: 'Failed to generate interview focus',
    };
  }
};
