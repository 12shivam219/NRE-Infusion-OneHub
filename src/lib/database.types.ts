export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'user' | 'marketing' | 'admin';
export type UserStatus = 'pending_verification' | 'pending_approval' | 'approved' | 'rejected';
export type ErrorStatus = 'new' | 'in_progress' | 'resolved' | 'closed';
export type DocumentSource = 'local' | 'google_drive';
export type RequirementStatus = 'NEW' | 'IN_PROGRESS' | 'SUBMITTED' | 'INTERVIEW' | 'OFFER' | 'REJECTED' | 'CLOSED';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: UserRole;
          status: UserStatus;
          email_verified: boolean;
          origin_ip: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          full_name: string;
          role?: UserRole;
          status?: UserStatus;
          email_verified?: boolean;
          origin_ip?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: UserRole;
          status?: UserStatus;
          email_verified?: boolean;
          origin_ip?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      login_history: {
        Row: {
          id: string;
          user_id: string | null;
          ip_address: string;
          user_agent: string;
          browser: string | null;
          os: string | null;
          device: string | null;
          location: string | null;
          country_code: string | null;
          success: boolean;
          failure_reason: string | null;
          suspicious: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          ip_address: string;
          user_agent: string;
          browser?: string | null;
          os?: string | null;
          device?: string | null;
          location?: string | null;
          country_code?: string | null;
          success: boolean;
          failure_reason?: string | null;
          suspicious?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          ip_address?: string;
          user_agent?: string;
          browser?: string | null;
          os?: string | null;
          device?: string | null;
          location?: string | null;
          country_code?: string | null;
          success?: boolean;
          failure_reason?: string | null;
          suspicious?: boolean;
          created_at?: string;
        };
      };
      activity_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          resource_type: string | null;
          resource_id: string | null;
          details: Json | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          resource_type?: string | null;
          resource_id?: string | null;
          details?: Json | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          action?: string;
          resource_type?: string | null;
          resource_id?: string | null;
          details?: Json | null;
          ip_address?: string | null;
          created_at?: string;
        };
      };
      documents: {
        Row: {
          id: string;
          user_id: string;
          filename: string;
          original_filename: string;
          file_size: number;
          mime_type: string;
          storage_path: string;
          version: number;
          parent_id: string | null;
          source: DocumentSource;
          google_drive_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          filename: string;
          original_filename: string;
          file_size: number;
          mime_type: string;
          storage_path: string;
          version?: number;
          parent_id?: string | null;
          source?: DocumentSource;
          google_drive_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          filename?: string;
          original_filename?: string;
          file_size?: number;
          mime_type?: string;
          storage_path?: string;
          version?: number;
          parent_id?: string | null;
          source?: DocumentSource;
          google_drive_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      document_versions: {
        Row: {
          id: string;
          document_id: string;
          version_number: number;
          storage_path: string;
          file_size: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          version_number: number;
          storage_path: string;
          file_size: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          version_number?: number;
          storage_path?: string;
          file_size?: number;
          created_at?: string;
        };
      };
      requirements: {
        Row: {
          id: string;
          user_id: string;
          requirement_number: number;
          title: string;
          company: string | null;
          description: string | null;
          location: string | null;
          status: RequirementStatus;
          consultant_id: string | null;
          applied_for: string | null;
          rate: string | null;
          primary_tech_stack: string | null;
          imp_name: string | null;
          client_website: string | null;
          imp_website: string | null;
          vendor_company: string | null;
          vendor_website: string | null;
          vendor_person_name: string | null;
          vendor_phone: string | null;
          vendor_email: string | null;
          next_step: string | null;
          remote: string | null;
          duration: string | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          requirement_number?: number;
          title: string;
          company?: string | null;
          description?: string | null;
          location?: string | null;
          status?: RequirementStatus;
          consultant_id?: string | null;
          applied_for?: string | null;
          rate?: string | null;
          primary_tech_stack?: string | null;
          imp_name?: string | null;
          client_website?: string | null;
          imp_website?: string | null;
          vendor_company?: string | null;
          vendor_website?: string | null;
          vendor_person_name?: string | null;
          vendor_phone?: string | null;
          vendor_email?: string | null;
          next_step?: string | null;
          remote?: string | null;
          duration?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          requirement_number?: number;
          title?: string;
          company?: string | null;
          description?: string | null;
          location?: string | null;
          status?: RequirementStatus;
          consultant_id?: string | null;
          applied_for?: string | null;
          rate?: string | null;
          primary_tech_stack?: string | null;
          imp_name?: string | null;
          client_website?: string | null;
          imp_website?: string | null;
          vendor_company?: string | null;
          vendor_website?: string | null;
          vendor_person_name?: string | null;
          vendor_phone?: string | null;
          vendor_email?: string | null;
          next_step?: string | null;
          remote?: string | null;
          duration?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      interviews: {
        Row: {
          id: string;
          requirement_id: string;
          user_id: string;
          scheduled_date: string;
          scheduled_time: string | null;
          timezone: string | null;
          duration_minutes: number;
          type: string | null;
          status: string;
          consultant_id: string | null;
          vendor_company: string | null;
          interview_with: string | null;
          result: string | null;
          round: string | null;
          mode: string | null;
          meeting_type: string | null;
          subject_line: string | null;
          interviewer: string | null;
          location: string | null;
          interview_focus: string | null;
          special_note: string | null;
          job_description_excerpt: string | null;
          feedback_notes: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          requirement_id: string;
          user_id: string;
          scheduled_date: string;
          scheduled_time?: string | null;
          timezone?: string | null;
          duration_minutes?: number;
          type?: string | null;
          status?: string;
          consultant_id?: string | null;
          vendor_company?: string | null;
          interview_with?: string | null;
          result?: string | null;
          round?: string | null;
          mode?: string | null;
          meeting_type?: string | null;
          subject_line?: string | null;
          interviewer?: string | null;
          location?: string | null;
          interview_focus?: string | null;
          special_note?: string | null;
          job_description_excerpt?: string | null;
          feedback_notes?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          requirement_id?: string;
          user_id?: string;
          scheduled_date?: string;
          scheduled_time?: string | null;
          timezone?: string | null;
          duration_minutes?: number;
          type?: string | null;
          status?: string;
          consultant_id?: string | null;
          vendor_company?: string | null;
          interview_with?: string | null;
          result?: string | null;
          round?: string | null;
          mode?: string | null;
          meeting_type?: string | null;
          subject_line?: string | null;
          interviewer?: string | null;
          location?: string | null;
          interview_focus?: string | null;
          special_note?: string | null;
          job_description_excerpt?: string | null;
          feedback_notes?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      email_threads: {
        Row: {
          id: string;
          user_id: string;
          requirement_id: string | null;
          subject: string;
          from_email: string;
          to_email: string;
          body: string | null;
          thread_id: string | null;
          parent_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          requirement_id?: string | null;
          subject: string;
          from_email: string;
          to_email: string;
          body?: string | null;
          thread_id?: string | null;
          parent_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          requirement_id?: string | null;
          subject?: string;
          from_email?: string;
          to_email?: string;
          body?: string | null;
          thread_id?: string | null;
          parent_id?: string | null;
          created_at?: string;
        };
      };
      consultants: {
        Row: {
          id: string;
          user_id: string;
          status: string;
          name: string;
          email: string | null;
          phone: string | null;
          location: string | null;
          primary_skills: string | null;
          secondary_skills: string | null;
          total_experience: string | null;
          linkedin_profile: string | null;
          portfolio_link: string | null;
          availability: string | null;
          visa_status: string | null;
          date_of_birth: string | null;
          address: string | null;
          timezone: string | null;
          degree_name: string | null;
          university: string | null;
          year_of_passing: string | null;
          ssn: string | null;
          how_got_visa: string | null;
          year_came_to_us: string | null;
          country_of_origin: string | null;
          why_looking_for_job: string | null;
          preferred_work_location: string | null;
          preferred_work_type: string | null;
          expected_rate: string | null;
          payroll_company: string | null;
          payroll_contact_info: string | null;
          projects: Json | null;
          company: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          status?: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          location?: string | null;
          primary_skills?: string | null;
          secondary_skills?: string | null;
          total_experience?: string | null;
          linkedin_profile?: string | null;
          portfolio_link?: string | null;
          availability?: string | null;
          visa_status?: string | null;
          date_of_birth?: string | null;
          address?: string | null;
          timezone?: string | null;
          degree_name?: string | null;
          university?: string | null;
          year_of_passing?: string | null;
          ssn?: string | null;
          how_got_visa?: string | null;
          year_came_to_us?: string | null;
          country_of_origin?: string | null;
          why_looking_for_job?: string | null;
          preferred_work_location?: string | null;
          preferred_work_type?: string | null;
          expected_rate?: string | null;
          payroll_company?: string | null;
          payroll_contact_info?: string | null;
          projects?: Json | null;
          company?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          status?: string;
          name?: string;
          email?: string | null;
          phone?: string | null;
          location?: string | null;
          primary_skills?: string | null;
          secondary_skills?: string | null;
          total_experience?: string | null;
          linkedin_profile?: string | null;
          portfolio_link?: string | null;
          availability?: string | null;
          visa_status?: string | null;
          date_of_birth?: string | null;
          address?: string | null;
          timezone?: string | null;
          degree_name?: string | null;
          university?: string | null;
          year_of_passing?: string | null;
          ssn?: string | null;
          how_got_visa?: string | null;
          year_came_to_us?: string | null;
          country_of_origin?: string | null;
          why_looking_for_job?: string | null;
          preferred_work_location?: string | null;
          preferred_work_type?: string | null;
          expected_rate?: string | null;
          payroll_company?: string | null;
          payroll_contact_info?: string | null;
          projects?: Json | null;
          company?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      attachments: {
        Row: {
          id: string;
          user_id: string;
          resource_type: string;
          resource_id: string;
          filename: string;
          file_size: number;
          mime_type: string;
          storage_path: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          resource_type: string;
          resource_id: string;
          filename: string;
          file_size: number;
          mime_type: string;
          storage_path: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          resource_type?: string;
          resource_id?: string;
          filename?: string;
          file_size?: number;
          mime_type?: string;
          storage_path?: string;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          type: string;
          read: boolean;
          link: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          type?: string;
          read?: boolean;
          link?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          message?: string;
          type?: string;
          read?: boolean;
          link?: string | null;
          created_at?: string;
        };
      };
      google_drive_tokens: {
        Row: {
          id: string;
          user_id: string;
          access_token: string;
          refresh_token: string;
          token_type: string;
          expires_at: string;
          scope: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          access_token: string;
          refresh_token: string;
          token_type?: string;
          expires_at: string;
          scope: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          access_token?: string;
          refresh_token?: string;
          token_type?: string;
          expires_at?: string;
          scope?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      error_reports: {
        Row: {
          id: string;
          user_id: string | null;
          error_message: string;
          error_stack: string | null;
          error_type: string | null;
          url: string | null;
          user_agent: string | null;
          status: ErrorStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          error_message: string;
          error_stack?: string | null;
          error_type?: string | null;
          url?: string | null;
          user_agent?: string | null;
          status?: ErrorStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          error_message?: string;
          error_stack?: string | null;
          error_type?: string | null;
          url?: string | null;
          user_agent?: string | null;
          status?: ErrorStatus;
          created_at?: string;
        };
      };
      rate_limits: {
        Row: {
          id: string;
          identifier: string;
          action: string;
          count: number;
          window_start: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          identifier: string;
          action: string;
          count?: number;
          window_start?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          identifier?: string;
          action?: string;
          count?: number;
          window_start?: string;
          created_at?: string;
        };
      };
    };
  };
}
