import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const groqApiKey = Deno.env.get("GROQ_API_KEY");

interface JobExtractionRequest {
  emailContent: string;
  emailSubject?: string;
  emailFrom?: string;
}

interface ExtractedJobDetails {
  jobTitle: string;
  company: string;
  jobDescription: string;
  requirements: string[];
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  location: string;
  isRemote: boolean;
  employmentType?: "full-time" | "part-time" | "contract" | "temporary";
  applicationDeadline?: string;
  skills: string[];
  experiences: string[];
  benefits?: string[];
  contactEmail?: string;
  jobUrl?: string;
}

const JOB_DETECTION_PROMPT = `You are an expert at identifying job posting emails. 
Analyze the following email content and determine if it's a job posting.

Email Subject: {subject}
Email From: {from}
Content: {content}

Respond with ONLY a JSON object:
{
  "isJobPosting": boolean,
  "confidence": number (0-100),
  "reason": string
}`;

const JOB_EXTRACTION_PROMPT = `You are an expert recruiter and job analyst. 
Extract all relevant job information from this email.

Email Subject: {subject}
Email From: {from}
Content: {content}

Extract and return ONLY a JSON object with this exact structure:
{
  "jobTitle": "string",
  "company": "string",
  "jobDescription": "string (brief summary)",
  "requirements": ["array of key requirements"],
  "salary": {
    "min": number or null,
    "max": number or null,
    "currency": "string or null"
  },
  "location": "string",
  "isRemote": boolean,
  "employmentType": "full-time|part-time|contract|temporary",
  "applicationDeadline": "YYYY-MM-DD or null",
  "skills": ["required technical skills"],
  "experiences": ["required experience"],
  "benefits": ["benefits if mentioned"],
  "contactEmail": "string or null",
  "jobUrl": "string or null"
}

Be accurate and extract only information that is explicitly mentioned. Use null for missing fields.`;

async function callGroqAPI(messages: { role: string; content: string }[]) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${groqApiKey}`,
    },
    body: JSON.stringify({
      model: "mixtral-8x7b-32768",
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Groq API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "";
}

function extractJSON(content: string) {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No JSON found in response");
  }
  return JSON.parse(jsonMatch[0]);
}

async function detectJobPosting(
  subject: string,
  from: string,
  content: string
): Promise<{ isJobPosting: boolean; confidence: number }> {
  const prompt = JOB_DETECTION_PROMPT.replace("{subject}", subject)
    .replace("{from}", from)
    .replace("{content}", content.substring(0, 1000));

  const response = await callGroqAPI([
    {
      role: "system",
      content: "You are a job posting detection AI. Respond only with JSON.",
    },
    { role: "user", content: prompt },
  ]);

  const result = extractJSON(response);
  return {
    isJobPosting: result.isJobPosting || false,
    confidence: result.confidence || 0,
  };
}

async function extractJobDetails(
  subject: string,
  from: string,
  content: string
): Promise<ExtractedJobDetails> {
  const prompt = JOB_EXTRACTION_PROMPT.replace("{subject}", subject)
    .replace("{from}", from)
    .replace("{content}", content.substring(0, 2000));

  const response = await callGroqAPI([
    {
      role: "system",
      content: "You are a job information extraction AI. Respond only with valid JSON.",
    },
    { role: "user", content: prompt },
  ]);

  return extractJSON(response) as ExtractedJobDetails;
}

serve(async (req: Request) => {
    // Handle CORS
    if (req.method === "OPTIONS") {
        return new Response("ok", {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
            },
        });
    }

    try {
        const { emailContent, emailSubject = "Job Posting", emailFrom = "unknown@company.com" } = await req.json() as JobExtractionRequest;

        if (!emailContent) {
            return new Response(
                JSON.stringify({ error: "emailContent is required" }),
                {
                    status: 400,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                    },
                }
            );
        }

        // Step 1: Detect if it's a job posting
        const detection = await detectJobPosting(emailSubject, emailFrom, emailContent);

        if (!detection.isJobPosting || detection.confidence < 30) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Email is not a job posting",
                    confidence: detection.confidence,
                    isJobPosting: false,
                }),
                {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                    },
                }
            );
        }

        // Step 2: Extract job details
        const jobDetails = await extractJobDetails(emailSubject, emailFrom, emailContent);

        return new Response(
            JSON.stringify({
                success: true,
                data: jobDetails,
                confidence: detection.confidence,
                isJobPosting: true,
            }),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
            }
        );
    } catch (error) {
        console.error("Error:", error);
        return new Response(
            JSON.stringify({
                error: error instanceof Error ? error.message : "Unknown error",
            }),
            {
                status: 500,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
            }
        );
    }
});
