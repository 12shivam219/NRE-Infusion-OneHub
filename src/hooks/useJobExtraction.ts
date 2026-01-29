/**
 * Job Extraction Hook
 * React hook for managing job extraction from emails
 */

import { useState, useCallback } from 'react';
import { getJobExtractionAgent } from '../lib/agents/jobExtractionAgent';
import type {
  ExtractedJobDetails,
  JobExtractionResult,
  RequirementFormData,
} from '../lib/agents/types';

interface UseJobExtractionReturn {
  isScanning: boolean;
  isExtracting: boolean;
  extractedJobs: ExtractedJobDetails[];
  errors: string[];
  scanForJobs: (emails?: Array<{ id: string; subject: string; from: string; content: string }>) => Promise<void>;
  extractJobDetails: (
    subject: string,
    from: string,
    content: string,
    emailId: string
  ) => Promise<JobExtractionResult | null>;
  convertToRequirementForm: (
    job: ExtractedJobDetails
  ) => RequirementFormData;
  clearJobs: () => void;
  clearErrors: () => void;
}

export function useJobExtraction(): UseJobExtractionReturn {
  const [isScanning, setIsScanning] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedJobs, setExtractedJobs] = useState<ExtractedJobDetails[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const agent = getJobExtractionAgent();

  const scanForJobs = useCallback(
    async (
      emails?: Array<{
        id: string;
        subject: string;
        from: string;
        content: string;
      }>
    ) => {
      if (!emails || emails.length === 0) {
        setErrors(['No emails provided for scanning']);
        return;
      }

      setIsScanning(true);
      setErrors([]);

      try {
        const results = await agent.processEmails(emails);

        const jobs = results
          .filter((r) => r.success && r.data)
          .map((r) => r.data!);

        const errors = results
          .filter((r) => !r.success && r.error)
          .map((r) => r.error!);

        setExtractedJobs((prev) => [...prev, ...jobs]);

        if (errors.length > 0) {
          setErrors((prev) => [...prev, ...errors]);
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : 'Unknown error';
        setErrors((prev) => [...prev, `Scan failed: ${errorMsg}`]);
      } finally {
        setIsScanning(false);
      }
    },
    [agent]
  );

  const extractJobDetailsCallback = useCallback(
    async (
      subject: string,
      from: string,
      content: string,
      emailId: string
    ): Promise<JobExtractionResult | null> => {
      setIsExtracting(true);
      setErrors([]);

      try {
        const result = await agent.extractJobDetails(
          subject,
          from,
          content,
          emailId
        );

        if (result.success && result.data) {
          setExtractedJobs((prev) => [...prev, result.data!]);
          return result;
        } else {
          const errorMsg = result.error || 'Failed to extract job details';
          setErrors((prev) => [...prev, errorMsg]);
          return null;
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : 'Unknown error';
        setErrors((prev) => [...prev, errorMsg]);
        return null;
      } finally {
        setIsExtracting(false);
      }
    },
    [agent]
  );

  /**
   * Convert extracted job details to requirement form data
   */
  const convertToRequirementForm = useCallback(
    (job: ExtractedJobDetails): RequirementFormData => {
      return {
        title: job.jobTitle,
        company: job.company,
        description: job.jobDescription,
        location: job.location,
        jobType: job.employmentType,
        requiredSkills: job.skills.join(', '),
        experience: job.experiences.join(', '),
        salary: job.salary
          ? `${job.salary.min || ''}-${job.salary.max || ''} ${job.salary.currency || 'USD'}`
          : undefined,
        deadline: job.applicationDeadline,
        contactEmail: job.contactEmail,
        status: 'NEW',
        source: 'email-import',
        sourceEmail: job.sourceEmail,
      };
    },
    []
  );

  const clearJobs = useCallback(() => {
    setExtractedJobs([]);
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  return {
    isScanning,
    isExtracting,
    extractedJobs,
    errors,
    scanForJobs,
    extractJobDetails: extractJobDetailsCallback,
    convertToRequirementForm,
    clearJobs,
    clearErrors,
  };
}
