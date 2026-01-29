/**
 * Email Integration for Job Extraction
 * Simplified version for manual email pasting
 */

/**
 * Parse raw email content to extract basic fields
 */
export function parseRawEmail(content: string): {
  subject?: string;
  from?: string;
  body: string;
} {
  // Extract subject if present
  const subjectMatch = content.match(/Subject:\s*(.+?)(?:\n|$)/i);
  const fromMatch = content.match(/From:\s*(.+?)(?:\n|$)/i);

  return {
    subject: subjectMatch?.[1] || 'Job Posting',
    from: fromMatch?.[1] || 'unknown@company.com',
    body: content,
  };
}

/**
 * Keywords that indicate job postings
 */
export const JOB_KEYWORDS = [
  'hiring',
  'job opportunity',
  'position',
  'recruitment',
  'apply now',
  'role available',
  'we are recruiting',
  'career opportunity',
  'job opening',
  'looking for',
  'now recruiting',
];

/**
 * Check if content contains job-related keywords
 */
export function isLikelyJobPosting(content: string): boolean {
  const lowerContent = content.toLowerCase();
  return JOB_KEYWORDS.some(keyword => lowerContent.includes(keyword));
}
