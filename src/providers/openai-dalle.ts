// AI Singer Studio - OpenAI DALL-E 3 Image Generation Adapter
import type {
  ProviderAdapter,
  ImageGenerationRequest,
  GenerationResponse,
  GenerationResult,
  ProviderConfig,
} from './types';
import { ProviderError, RateLimitError, InvalidRequestError, QuotaExceededError } from './types';

interface DallERequest {
  model: string;
  prompt: string;
  n: number;
  size: string;
  quality: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
}

interface DallEResponse {
  created: number;
  data: Array<{
    url: string;
    revised_prompt?: string;
  }>;
}

export class OpenAIDalleAdapter implements ProviderAdapter {
  readonly provider = 'openai-dalle' as const;
  readonly contentType = 'image' as const;

  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;

  constructor(config: ProviderConfig) {
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    this.apiKey = config.apiKey;
    this.timeout = config.timeout || 60000; // 1 minute default
  }

  /**
   * Generate image using DALL-E 3
   * Supports high quality images with aspect ratio control
   */
  async generate(request: ImageGenerationRequest): Promise<GenerationResponse> {
    // Convert aspect ratio to DALL-E sizes
    const aspectRatios: Record<string, string> = {
      '1:1': '1024x1024',
      '16:9': '1792x1024',
      '9:16': '1024x1792',
      '4:3': '1024x1024', // Closest match
      '3:4': '1024x1792', // Closest match
    };

    const size = aspectRatios[request.aspectRatio || '1:1'] || '1024x1024';

    // Build DALL-E request
    const dalleRequest: DallERequest = {
      model: 'dall-e-3',
      prompt: this.enhancePrompt(request),
      n: 1, // DALL-E 3 only supports n=1
      size,
      quality: 'hd', // Use HD quality for best results
      style: 'vivid', // Vivid for more dramatic/creative images
    };

    console.log('[DALL-E] Generating image with prompt:', dalleRequest.prompt);

    try {
      const response = await fetch(`${this.baseUrl}/images/generations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dalleRequest),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        await this.handleError(response);
      }

      const data: DallEResponse = await response.json();

      if (!data.data || data.data.length === 0) {
        throw new ProviderError('No image generated', 'openai-dalle', 'NO_CONTENT');
      }

      const imageUrl = data.data[0].url;
      const revisedPrompt = data.data[0].revised_prompt;

      console.log('[DALL-E] Image generated successfully');
      if (revisedPrompt) {
        console.log('[DALL-E] Revised prompt:', revisedPrompt);
      }

      // DALL-E 3 returns synchronously, so we return completed immediately
      return {
        operationId: `dalle_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        status: 'completed',
        progress: 100,
        metadata: {
          imageUrl,
          revisedPrompt,
          provider: 'openai-dalle',
          model: 'dall-e-3',
          size,
          quality: 'hd',
        },
      };
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }

      console.error('[DALL-E] Generation error:', error);

      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new ProviderError(
          'Image generation timed out',
          'openai-dalle',
          'TIMEOUT',
          undefined,
          true
        );
      }

      throw new ProviderError(
        error instanceof Error ? error.message : 'Unknown error',
        'openai-dalle',
        'GENERATION_FAILED'
      );
    }
  }

  /**
   * DALL-E 3 is synchronous, so status check just returns the same result
   */
  async getStatus(operationId: string): Promise<GenerationResponse> {
    return {
      operationId,
      status: 'completed',
      progress: 100,
    };
  }

  /**
   * Get completed image
   */
  async getResult(operationId: string): Promise<GenerationResult> {
    throw new ProviderError(
      'DALL-E 3 returns results immediately - use metadata from generate() response',
      'openai-dalle',
      'NOT_APPLICABLE'
    );
  }

  /**
   * Cancel is not applicable for DALL-E 3 (synchronous)
   */
  async cancel(operationId: string): Promise<void> {
    console.log(`DALL-E 3 does not support cancellation (synchronous API): ${operationId}`);
  }

  /**
   * Enhance the prompt with style preferences and negative prompts
   */
  private enhancePrompt(request: ImageGenerationRequest): string {
    let prompt = request.prompt;

    // Add style if provided
    if (request.stylePrompt) {
      prompt = `${request.prompt}, ${request.stylePrompt}`;
    }

    // Add negative prompt as exclusions (DALL-E doesn't have native negative prompts)
    if (request.negativePrompt) {
      const exclusions = request.negativePrompt
        .split(',')
        .map(item => `avoid ${item.trim()}`)
        .join(', ');
      prompt = `${prompt}. ${exclusions}`;
    }

    // Ensure prompt is not too long (DALL-E has a 4000 char limit)
    if (prompt.length > 4000) {
      console.warn('[DALL-E] Prompt too long, truncating to 4000 chars');
      prompt = prompt.substring(0, 3997) + '...';
    }

    return prompt;
  }

  /**
   * Handle API errors
   */
  private async handleError(response: Response): Promise<never> {
    const statusCode = response.status;
    let errorData: any;

    try {
      errorData = await response.json();
    } catch {
      errorData = { message: await response.text() };
    }

    const message = errorData?.error?.message || errorData?.message || response.statusText;

    console.error('[DALL-E] API Error:', { statusCode, message, errorData });

    if (statusCode === 429) {
      const retryAfter = response.headers.get('retry-after');
      const retryAfterMs = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
      throw new RateLimitError('openai-dalle', retryAfterMs, message);
    }

    if (statusCode === 402 || message.toLowerCase().includes('quota') || message.toLowerCase().includes('insufficient')) {
      throw new QuotaExceededError('openai-dalle', message);
    }

    if (statusCode === 400) {
      // Content policy violation or invalid request
      if (message.toLowerCase().includes('content policy')) {
        throw new InvalidRequestError(
          'openai-dalle',
          'Your request was rejected due to OpenAI content policy. Please modify your prompt.',
          errorData
        );
      }
      throw new InvalidRequestError('openai-dalle', message, errorData);
    }

    if (statusCode >= 400 && statusCode < 500) {
      throw new InvalidRequestError('openai-dalle', message, errorData);
    }

    if (statusCode >= 500) {
      throw new ProviderError(message, 'openai-dalle', 'SERVER_ERROR', statusCode, true);
    }

    throw new ProviderError(message, 'openai-dalle', 'UNKNOWN', statusCode);
  }
}

/**
 * Create OpenAI DALL-E adapter instance
 */
export function createOpenAIDalleAdapter(apiKey: string): OpenAIDalleAdapter {
  return new OpenAIDalleAdapter({
    apiKey,
    timeout: 60000, // 1 minute
  });
}
