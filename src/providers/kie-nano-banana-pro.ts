// AI Singer Studio - Kie.ai Nano Banana Pro (Gemini 3.0 Pro Image) Adapter
// For generating scene starting frames from character images + prompts

import type {
  ProviderAdapter,
  ImageGenerationRequest,
  GenerationResponse,
  GenerationResult,
  ProviderConfig,
} from './types';
import { ProviderError, RateLimitError, InvalidRequestError, QuotaExceededError } from './types';
import { KieClient, type ImageGenerationRequest as KieImageRequest } from '../lib/kie-client';

export class KieNanoBananaProAdapter implements ProviderAdapter {
  readonly provider = 'kie-nano-banana-pro' as const;
  readonly contentType = 'image' as const;

  private readonly client: KieClient;
  private readonly maxRetries: number;

  constructor(config: ProviderConfig) {
    this.client = new KieClient({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
    });
    this.maxRetries = config.retries || 2;
  }

  /**
   * Generate scene starting frame using Nano Banana Pro
   * Combines character image with scene prompt for identity-preserving generation
   */
  async generate(request: ImageGenerationRequest): Promise<GenerationResponse> {
    console.log('[NanoBananaPro] Generating scene image:', {
      hasReference: !!request.referenceImageUrls?.length,
      prompt: request.prompt.substring(0, 100),
    });

    const kieRequest: KieImageRequest = {
      model: 'flux-kontext-pro', // Kie.ai's Flux Kontext Pro model for context-aware image generation
      prompt: request.prompt,
      negative_prompt: request.negativePrompt,
      num_outputs: 1,
    };

    // Add character reference image for identity preservation
    if (request.referenceImageUrls && request.referenceImageUrls.length > 0) {
      kieRequest.image_url = request.referenceImageUrls[0]; // Use first reference image
    }

    // Set dimensions based on aspect ratio
    const dimensions = this.getImageDimensions(request.aspectRatio || '1:1');
    kieRequest.width = dimensions.width;
    kieRequest.height = dimensions.height;

    // Retry logic for reliability
    let lastError: Error | null = null;

    for (let retry = 0; retry <= this.maxRetries; retry++) {
      if (retry > 0) {
        console.log(`[NanoBananaPro] Retry attempt ${retry}/${this.maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, 3000 * retry)); // Exponential backoff
      }

      try {
        const response = await this.client.generateImage(kieRequest);

        return {
          operationId: response.id,
          status: response.status,
          progress: response.progress || 0,
          estimatedCompletionMs: (response.estimated_time || 20) * 1000, // Convert to ms
          metadata: {
            model: 'gemini-3-pro-image-preview',
            aspectRatio: request.aspectRatio,
          },
        };
      } catch (error) {
        lastError = error as Error;

        // FIX #40: Check for credits exhausted - fail immediately, don't waste retries
        if (error instanceof Error && error.message.includes('CREDITS_EXHAUSTED')) {
          throw new QuotaExceededError(this.provider, error.message.replace('CREDITS_EXHAUSTED: ', ''));
        }

        // Check if error is retryable
        if (error instanceof Error && error.message.includes('rate limit')) {
          if (retry < this.maxRetries) {
            continue; // Retry
          }
          // FIX #18: Include retry context in rate limit error
          const rateLimitError = new RateLimitError(this.provider, 60000);
          (rateLimitError as any).retryAttempt = retry + 1;
          (rateLimitError as any).maxRetries = this.maxRetries + 1;
          throw rateLimitError;
        }

        if (error instanceof Error && error.message.includes('invalid')) {
          throw new InvalidRequestError(this.provider, error.message);
        }

        // Other errors - retry if we have attempts left
        if (retry < this.maxRetries) {
          continue;
        }
      }
    }

    // All retries failed
    // FIX #18: Include retry attempt tracking in final error
    throw new ProviderError(
      lastError?.message || 'Scene generation failed after retries',
      this.provider,
      'GENERATION_FAILED',
      500,
      false,
      this.maxRetries + 1, // Final attempt number
      this.maxRetries + 1  // Total attempts
    );
  }

  /**
   * Check generation status
   * FIX #37: Propagate error field for consistency with KieWan25Adapter
   */
  async getStatus(operationId: string): Promise<GenerationResponse> {
    console.log('[NanoBananaPro] Checking status:', operationId);

    try {
      const response = await this.client.getStatus(operationId);

      return {
        operationId,
        status: response.status,
        progress: response.progress || (response.status === 'completed' ? 100 : 50),
        error: response.error, // FIX #37: Include error message
        metadata: {
          model: 'gemini-3-pro-image-preview',
        },
      };
    } catch (error) {
      console.error('[NanoBananaPro] Status check failed:', error);
      throw new ProviderError(
        error instanceof Error ? error.message : 'Status check failed',
        this.provider,
        'STATUS_CHECK_FAILED',
        500,
        true
      );
    }
  }

  /**
   * Get completed generation result
   */
  async getResult(operationId: string): Promise<GenerationResult> {
    console.log('[NanoBananaPro] Getting result:', operationId);

    const status = await this.client.getStatus(operationId);

    if (status.status !== 'completed') {
      throw new ProviderError(
        `Generation not completed: ${status.status}`,
        this.provider,
        'NOT_COMPLETED',
        400,
        false
      );
    }

    if (!status.output) {
      throw new ProviderError(
        'No output URL in completed generation',
        this.provider,
        'NO_OUTPUT',
        500,
        false
      );
    }

    // Extract URL from output (could be string or array)
    const contentUrl = Array.isArray(status.output) ? status.output[0] : status.output;

    return {
      operationId,
      status: 'completed',
      contentUrl,
      contentType: 'image',
      metadata: {
        provider: this.provider,
        model: 'gemini-3-pro-image-preview',
        width: 1024, // Nano Banana Pro native 2K
        height: 1024,
        mimeType: 'image/png',
      },
    };
  }

  /**
   * Cancel generation (if supported)
   */
  async cancel(operationId: string): Promise<void> {
    console.log('[NanoBananaPro] Cancelling:', operationId);
    await this.client.cancel(operationId);
  }

  /**
   * Get image dimensions based on aspect ratio
   */
  private getImageDimensions(aspectRatio: string): { width: number; height: number } {
    const dimensions: Record<string, { width: number; height: number }> = {
      '1:1': { width: 1024, height: 1024 },
      '16:9': { width: 1920, height: 1080 },
      '9:16': { width: 1080, height: 1920 },
      '4:3': { width: 1024, height: 768 },
      '3:4': { width: 768, height: 1024 },
    };

    return dimensions[aspectRatio] || dimensions['1:1'];
  }
}
