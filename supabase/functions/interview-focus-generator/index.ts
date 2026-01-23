import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InterviewFocusInput {
  techStack: string;
  jobDescription: string;
  jobTitle: string;
  company: string;
}

// Error type discriminator
interface APIError {
  status: number;
  isRetryable: boolean;
  message: string;
}

function createAPIError(
  status: number,
  message: string,
  isRetryable: boolean
): APIError {
  return { status, message, isRetryable };
}

async function generateHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    detectSessionInUrl: false,
  },
});

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

Deno.serve(
  async (req: {
    method: string;
    json: () => InterviewFocusInput | PromiseLike<InterviewFocusInput>;
  }) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    // Only accept POST
    if (req.method !== 'POST') {
      return jsonResponse(405, { error: 'Method not allowed' });
    }

    try {
      const input: InterviewFocusInput = await req.json();

      if (!input.techStack || !input.jobDescription) {
        return jsonResponse(400, {
          error: 'Tech stack and job description are required',
        });
      }

      // Generate a cache key based on tech stack + job description
      const cacheKey = `${input.techStack}|${input.jobDescription}`;
      const contentHash = await generateHash(cacheKey);

      // Check cache
      console.log('Checking interview focus cache...');
      const { data: cachedData } = await supabase
        .from('interview_focus_cache')
        .select('generated_focus')
        .eq('content_hash', contentHash)
        .maybeSingle();

      if (cachedData) {
        console.log('✓ Interview Focus Cache Hit');
        return jsonResponse(200, {
          success: true,
          interviewFocus: cachedData.generated_focus,
        } as Record<string, unknown>);
      }

      // Cache miss - call Groq API
      console.log('⟳ Cache Miss - Invoking Groq AI...');

      const groqApiKey = Deno.env.get('GROQ_API_KEY');
      if (!groqApiKey) {
        console.error('GROQ_API_KEY not configured');
        return jsonResponse(500, { error: 'AI service not configured' });
      }

      const prompt = `You are an expert technical recruiter and interview coach. Generate clear, focused interview talking points.

Job Title: ${input.jobTitle || 'N/A'}
Company: ${input.company || 'N/A'}
Tech Stack: ${input.techStack}
Job Description: ${input.jobDescription}

Generate 4-5 specific, actionable interview focus points that are:
1. Helpful for the developer to prepare what technical areas to study
2. Helpful for the interviewee to know what to expect
3. Based on the specific tech stack mentioned
4. Practical and specific (avoid generic advice)

Format as a bulleted list with clear, concise points. Start each point with an action verb or question.
Keep each point to 1-2 sentences maximum.`;

      const groqResponse = await fetch(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${groqApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              {
                role: 'user',
                content: prompt,
              },
            ],
            temperature: 0.7,
            max_tokens: 500,
          }),
        }
      );

      if (!groqResponse.ok) {
        const error = await groqResponse
          .json()
          .catch(() => ({ error: 'Unknown error' }));
        console.error('Groq API error:', error);

        // Distinguish between different error types
        const status = groqResponse.status;
        let apiError: APIError;

        // Rate limit or quota errors (429, 503) - should be retried
        if (status === 429) {
          apiError = createAPIError(
            429,
            'AI API rate limit exceeded. Please try again later.',
            true
          );
          return jsonResponse(429, {
            success: false,
            error: apiError.message,
            retryable: apiError.isRetryable,
          } as Record<string, unknown>);
        }

        // Server errors (5xx except 503 handled above) - may be retried
        if (status >= 500 && status !== 503) {
          apiError = createAPIError(
            503,
            'AI service temporarily unavailable. Please try again later.',
            true
          );
          return jsonResponse(503, {
            success: false,
            error: apiError.message,
            retryable: apiError.isRetryable,
          } as Record<string, unknown>);
        }

        // Service unavailable - retryable
        if (status === 503) {
          apiError = createAPIError(
            503,
            'AI service temporarily unavailable. Please try again later.',
            true
          );
          return jsonResponse(503, {
            success: false,
            error: apiError.message,
            retryable: apiError.isRetryable,
          } as Record<string, unknown>);
        }

        // Client errors (4xx) - should not be retried
        if (status >= 400 && status < 500) {
          apiError = createAPIError(
            400,
            'Invalid request to AI service. Please check your input.',
            false
          );
          return jsonResponse(400, {
            success: false,
            error: apiError.message,
            retryable: apiError.isRetryable,
          } as Record<string, unknown>);
        }

        // Unknown error
        apiError = createAPIError(500, 'Failed to generate interview focus', false);
        return jsonResponse(500, {
          success: false,
          error: apiError.message,
          retryable: apiError.isRetryable,
        } as Record<string, unknown>);
      }

      const groqData = await groqResponse.json();
      const interviewFocus = groqData.choices?.[0]?.message?.content || '';

      if (!interviewFocus) {
        throw new Error('No content returned from Groq API');
      }

      // Cache the result
      try {
        await supabase
          .from('interview_focus_cache')
          .upsert(
            {
              content_hash: contentHash,
              generated_focus: interviewFocus.trim(),
              tech_stack: input.techStack,
              job_title: input.jobTitle,
            },
            { onConflict: 'content_hash' }
          );
      } catch (cacheErr) {
        console.warn('Cache save warning:', cacheErr instanceof Error ? cacheErr.message : 'Unknown error');
      }

      return jsonResponse(200, {
        success: true,
        interviewFocus: interviewFocus.trim(),
      } as Record<string, unknown>);
    } catch (error) {
      console.error('Interview focus generation error:', error);

      // Distinguish between validation errors and other errors
      if (error instanceof SyntaxError) {
        // JSON parsing error - client error, not retryable
        return jsonResponse(400, {
          success: false,
          error: 'Invalid JSON input',
          retryable: false,
        } as Record<string, unknown>);
      }

      // Generic error - may be retryable
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to generate interview focus';
      
      return jsonResponse(500, {
        success: false,
        error: errorMessage,
        retryable: true,
      } as Record<string, unknown>);
    }
  }
);
