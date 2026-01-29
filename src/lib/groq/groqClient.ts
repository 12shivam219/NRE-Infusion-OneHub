/**
 * Groq API Client
 * Wrapper for Groq API with error handling
 */

import type {
  GroqChatCompletionRequest,
  GroqChatCompletionResponse,
  GroqMessage,
} from './types';

const GROQ_API_BASE = 'https://api.groq.com/openai/v1/chat/completions';

export class GroqClient {
  private apiKey: string;
  private model: string = 'mixtral-8x7b-32768'; // Fast open-source model

  constructor(apiKey?: string) {
    this.apiKey =
      apiKey || import.meta.env.VITE_GROQ_API_KEY || '';

    if (!this.apiKey) {
      console.warn(
        'GroqClient: API key not found. Set VITE_GROQ_API_KEY in .env.local'
      );
    }
  }

  /**
   * Send a chat completion request to Groq
   */
  async chat(
    messages: GroqMessage[],
    options?: {
      temperature?: number;
      maxTokens?: number;
      model?: string;
    }
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Groq API key is not configured');
    }

    const request: GroqChatCompletionRequest = {
      model: options?.model || this.model,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2048,
      top_p: 0.95,
    };

    try {
      const response = await fetch(GROQ_API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          `Groq API error: ${error.error?.message || response.statusText}`
        );
      }

      const data = (await response.json()) as GroqChatCompletionResponse;

      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from Groq API');
      }

      return data.choices[0].message.content;
    } catch (error) {
      console.error('Groq API Error:', error);
      throw error;
    }
  }

  /**
   * Extract JSON from Groq response
   */
  extractJSON<T>(content: string): T {
    try {
      // Try to find JSON in the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      return JSON.parse(jsonMatch[0]) as T;
    } catch (error) {
      console.error('Failed to extract JSON:', error);
      throw new Error('Failed to parse Groq response as JSON');
    }
  }

  /**
   * Set custom model
   */
  setModel(model: string): void {
    this.model = model;
  }
}

// Singleton instance
let groqClient: GroqClient | null = null;

export function getGroqClient(): GroqClient {
  if (!groqClient) {
    groqClient = new GroqClient();
  }
  return groqClient;
}
