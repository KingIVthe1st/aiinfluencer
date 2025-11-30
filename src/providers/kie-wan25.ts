// AI Singer Studio - Kie.ai Wan 2.5 Image-to-Video Adapter
// For generating video segments from starting frames + audio chunks

import type {
  ProviderAdapter,
  VideoGenerationRequest,
  GenerationResponse,
  GenerationResult,
  ProviderConfig,
} from './types';
import { ProviderError, RateLimitError, InvalidRequestError, QuotaExceededError } from './types';
import { KieClient, type VideoGenerationRequest as KieVideoRequest } from '../lib/kie-client';

export class KieWan25Adapter implements ProviderAdapter {
  readonly provider = 'kie-wan25' as const;
  readonly contentType = 'video' as const;

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
   * Generate video segment using Wan 2.5 Image-to-Video
   * Synchronizes video motion with audio track
   */
  async generate(request: VideoGenerationRequest): Promise<GenerationResponse> {
    console.log('[Wan25] Generating video:', {
      hasAudio: !!request.audioUrl,
      duration: request.durationSeconds,
      aspectRatio: request.aspectRatio,
    });

    // Validate: Need reference image (starting frame) for I2V mode
    if (!request.referenceImageUrls || request.referenceImageUrls.length === 0) {
      throw new InvalidRequestError(
        this.provider,
        'Wan 2.5 I2V requires a reference image (starting frame)'
      );
    }

    // FIX #41: Kie.ai Runway API updated - now supports duration 4, 8, or 12 seconds
    // (Previously was 5, 8, or 10 - API changed in late 2025)
    // Clamp chunk duration to nearest valid value
    const rawDuration = request.durationSeconds || 5;
    let validDuration: number;
    if (rawDuration <= 4) {
      validDuration = 4;
    } else if (rawDuration <= 8) {
      validDuration = 8;
    } else {
      validDuration = 12;
    }

    // FIX #32 + #43: Use quality field (required), and respect 1080p/duration constraint
    // Kie.ai Runway API: 1080p only works with 4-second videos
    // For 8s or 12s duration, must use 720p
    const quality = validDuration === 4 ? '1080p' : '720p';

    const kieRequest: KieVideoRequest = {
      model: 'runway', // Kie.ai's Runway model for image-to-video
      image_url: request.referenceImageUrls[0], // Starting frame
      prompt: request.prompt,
      duration: String(validDuration), // '4', '8', or '12'
      quality, // Required field: '720p' or '1080p'
      aspect_ratio: request.aspectRatio || '16:9',
    };

    // Add audio URL if provided (for music video sync)
    if (request.audioUrl) {
      kieRequest.audio_url = request.audioUrl;
    }

    // Retry logic for reliability
    let lastError: Error | null = null;

    for (let retry = 0; retry <= this.maxRetries; retry++) {
      if (retry > 0) {
        console.log(`[Wan25] Retry attempt ${retry}/${this.maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, 5000 * retry)); // Exponential backoff
      }

      try {
        const response = await this.client.generateVideo(kieRequest);

        return {
          operationId: response.id,
          status: response.status,
          progress: response.progress || 0,
          estimatedCompletionMs: (response.estimated_time || 30) * 1000, // Convert to ms
          metadata: {
            model: 'alibaba/wan2.5-i2v-preview',
            duration: request.durationSeconds,
            aspectRatio: request.aspectRatio,
            hasAudio: !!request.audioUrl,
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
      lastError?.message || 'Video generation failed after retries',
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
   * FIX #37: Propagate error field for retry logic to detect transient 500 errors
   */
  async getStatus(operationId: string): Promise<GenerationResponse> {
    console.log('[Wan25] Checking status:', operationId);

    try {
      const response = await this.client.getStatus(operationId);

      return {
        operationId,
        status: response.status,
        progress: response.progress || (response.status === 'completed' ? 100 : 50),
        error: response.error, // FIX #37: Include error message for retry logic
        metadata: {
          model: 'alibaba/wan2.5-i2v-preview',
        },
      };
    } catch (error) {
      console.error('[Wan25] Status check failed:', error);
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
    console.log('[Wan25] Getting result:', operationId);

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

    // Parse video metadata from result if available
    const videoMetadata: Record<string, any> = {
      provider: this.provider,
      model: 'alibaba/wan2.5-i2v-preview',
      mimeType: 'video/mp4',
      width: 1920, // 1080p width (assuming 16:9)
      height: 1080,
    };

    return {
      operationId,
      status: 'completed',
      contentUrl,
      contentType: 'video',
      metadata: videoMetadata,
    };
  }

  /**
   * Cancel generation (if supported)
   */
  async cancel(operationId: string): Promise<void> {
    console.log('[Wan25] Cancelling:', operationId);
    await this.client.cancel(operationId);
  }
}
