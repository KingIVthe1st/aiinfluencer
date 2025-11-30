// AI Singer Studio - Gemini 2.5 Flash Image (Nano Banana) Generation Adapter
import type {
  ProviderAdapter,
  ImageGenerationRequest,
  GenerationResponse,
  GenerationResult,
  ProviderConfig,
} from './types';
import { ProviderError, RateLimitError, InvalidRequestError, QuotaExceededError } from './types';

export class GeminiAdapter implements ProviderAdapter {
  readonly provider = 'gemini' as const;
  readonly contentType = 'image' as const;

  private readonly apiKey: string;
  private readonly timeout: number;
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey;
    this.timeout = config.timeout || 60000; // 1 minute default
  }

  /**
   * Generate image using Gemini 2.5 Flash Image (Nano Banana)
   * Uses direct REST API for better compatibility
   */
  async generate(request: ImageGenerationRequest): Promise<GenerationResponse> {
    try {
      // Build prompt with style and negative prompts
      let fullPrompt = request.prompt;

      if (request.style) {
        fullPrompt += ` Style: ${request.style}`;
      }

      if (request.negativePrompt) {
        fullPrompt += ` Negative prompt: ${request.negativePrompt}`;
      }

      // Add reference image context if provided
      if (request.referenceImageUrls && request.referenceImageUrls.length > 0) {
        fullPrompt = `Generate an image matching the character appearance from the reference images. ${fullPrompt}`;
      }

      // Call Gemini API directly with REST
      const url = `${this.baseUrl}/models/gemini-2.5-flash-image:generateContent?key=${this.apiKey}`;

      const requestBody = {
        contents: [{
          parts: [{ text: fullPrompt }]
        }],
        generationConfig: {
          responseModalities: ['Image']
        }
      };

      // Generate image with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            `Gemini API error (${response.status}): ${JSON.stringify(errorData)}`
          );
        }

        const data = await response.json();
        const operationId = `gemini_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        // Extract image data from response
        const imageData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;

        if (!imageData) {
          throw new ProviderError(
            'No image generated in response',
            'gemini',
            'NO_CONTENT'
          );
        }

        return {
          operationId,
          status: 'completed',
          progress: 100,
          metadata: {
            imageData: imageData.data, // base64
            mimeType: imageData.mimeType,
            aspectRatio: request.aspectRatio,
          },
        };
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }

      // Handle Gemini-specific errors
      if (error instanceof Error) {
        const message = error.message.toLowerCase();

        // Rate limiting
        if (message.includes('rate limit') || message.includes('too many requests') || message.includes('429')) {
          throw new RateLimitError('gemini', 60000, error.message);
        }

        // Quota exceeded
        if (message.includes('quota') || message.includes('limit exceeded')) {
          throw new QuotaExceededError('gemini', error.message);
        }

        // Invalid request
        if (message.includes('invalid') || message.includes('bad request') || message.includes('400')) {
          throw new InvalidRequestError('gemini', error.message);
        }

        // Timeout
        if (message.includes('timeout') || message.includes('abort')) {
          throw new ProviderError('Request timeout', 'gemini', 'TIMEOUT', 408, true);
        }

        // Safety filters
        if (message.includes('safety') || message.includes('blocked')) {
          throw new InvalidRequestError(
            'gemini',
            'Content blocked by safety filters',
            { reason: 'SAFETY' }
          );
        }

        throw new ProviderError(error.message, 'gemini');
      }

      throw new ProviderError('Unknown error', 'gemini');
    }
  }

  /**
   * Get status of generation
   * Gemini is synchronous, so this always returns completed
   */
  async getStatus(operationId: string): Promise<GenerationResponse> {
    return {
      operationId,
      status: 'completed',
      progress: 100,
    };
  }

  /**
   * Get completed result
   * In real implementation, fetch from R2 using operationId
   */
  async getResult(operationId: string): Promise<GenerationResult> {
    throw new ProviderError(
      'Result retrieval not implemented - use metadata from generate() response',
      'gemini',
      'NOT_IMPLEMENTED'
    );
  }
}

/**
 * Create Gemini adapter instance
 */
export function createGeminiAdapter(apiKey: string): GeminiAdapter {
  return new GeminiAdapter({
    apiKey,
    timeout: 60000, // 1 minute
  });
}
