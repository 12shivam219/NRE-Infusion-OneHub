import { supabase } from './supabase';

/* =========================================================
   TYPES
========================================================= */

export type WorkLocationType = "Onsite" | "Hybrid" | "Remote" | null;

export interface JdExtractionResult {
  jobTitle: string | null;
  hiringCompany: string | null;
  endClient: string | null;
  keySkills: string[];
  rate: string | null;
  workLocationType: WorkLocationType;
  location: string | null;
  duration: string | null;
  vendor: string | null;
  vendorContact: string | null;
  vendorPhone: string | null;
  vendorEmail: string | null;
}

/* =========================================================
   UTILITIES
========================================================= */

async function generateHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function extractEmailRegex(text: string): string | null {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const match = text.match(emailRegex);
  return match ? match[0] : null;
}

/* =========================================================
   MAIN PARSER
========================================================= */

export async function parseJD(text: string): Promise<JdExtractionResult> {
  try {
    if (!text || text.trim().length === 0) {
      throw new Error("Empty text provided");
    }

    // --- STEP 1: Generate Content Hash ---
    const contentHash = await generateHash(text);

    // --- STEP 2: Check Database Cache ---
    // FIX: Use .maybeSingle() instead of .single() to avoid 406 error on cache miss
    const { data: cachedData, error: cacheError } = await supabase
      .from('jd_parsing_cache')
      .select('parsed_data')
      .eq('content_hash', contentHash)
      .maybeSingle(); 

    if (cachedData) {
      console.log('✓ JD Cache Hit: Returning stored data');
      return cachedData.parsed_data as JdExtractionResult;
    }

    // --- STEP 3: Cache Miss - Call Edge Function ---
    console.log('⟳ JD Cache Miss - Invoking AI Parser...');
    
    const { data: llmResult, error: fnError } = await supabase.functions.invoke('jd-parser', {
      body: { jdText: text }
    });

    if (fnError) {
      console.error('Edge Function Error Details:', fnError);
      // If 400, it's likely the API Key is missing on the server
      if (fnError.message.includes('non-2xx')) {
        throw new Error("AI Parser failed. Please ensure GROQ_API_KEY is set in Supabase Secrets.");
      }
      throw fnError;
    }
    
    if (!llmResult) {
      throw new Error("No data returned from parser function");
    }

    // --- STEP 4: Validate Result ---
    const result: JdExtractionResult = {
      jobTitle: llmResult.jobTitle ?? null,
      hiringCompany: llmResult.hiringCompany ?? null,
      endClient: llmResult.endClient ?? null,
      keySkills: Array.isArray(llmResult.keySkills) ? llmResult.keySkills : [],
      rate: llmResult.rate ?? null,
      workLocationType: llmResult.workLocationType ?? null,
      location: llmResult.location ?? null,
      duration: llmResult.duration ?? null,
      vendor: llmResult.vendor ?? null,
      vendorContact: llmResult.vendorContact ?? null,
      vendorPhone: llmResult.vendorPhone ?? null,
      vendorEmail: llmResult.vendorEmail ?? extractEmailRegex(text), 
    };

    // --- STEP 5: Store in Cache ---
    // Using upsert to prevent race conditions if two users parse same JD simultaneously
    supabase.from('jd_parsing_cache').upsert({
      content_hash: contentHash,
      parsed_data: result
    }, { onConflict: 'content_hash' }).then(({ error }) => {
      if (error) console.warn('Cache save warning:', error.message);
    });

    return result;

  } catch (error) {
    console.error('JD Parsing failed completely:', error);
    
    // --- STEP 6: Emergency Fallback ---
    return {
      jobTitle: null,
      hiringCompany: null,
      endClient: null,
      keySkills: [],
      rate: null,
      workLocationType: null,
      location: null,
      duration: null,
      vendor: null,
      vendorContact: null,
      vendorPhone: null,
      vendorEmail: extractEmailRegex(text)
    };
  }
}