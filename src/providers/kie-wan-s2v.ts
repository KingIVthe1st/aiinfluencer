// AI Singer Studio - Kie.ai Wan 2.2 S2V Adapter (Lip-Sync Video)
// FIX #50: This adapter uses the Wan S2V API which NATIVELY supports audio_url!
// Perfect for music videos where we want the singer to lip-sync with the music.
// Model: wan/2-2-a14b-speech-to-video-turbo
// Documentation: https://kie.ai/wan-speech-to-video-turbo

import type {
  ProviderAdapter,
  VideoGenerationRequest,
  GenerationResponse,
  GenerationResult,
  ProviderConfig,
} from './types';
import { ProviderError, RateLimitError, InvalidRequestError, QuotaExceededError } from './types';
import { KieClient, type SpeechToVideoRequest } from '../lib/kie-client';

export class KieWanS2VAdapter implements ProviderAdapter {
  readonly provider = 'kie-wan-s2v' as const;
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
   * Generate video segment using Wan 2.2 S2V (Lip-Sync)
   * This API NATIVELY supports audio_url - the audio drives lip-sync!
   * FIX #50: Updated to use correct Wan S2V model and endpoints
   */
  async generate(request: VideoGenerationRequest): Promise<GenerationResponse> {
    console.log('[WanS2V] 🎤 Generating Speech-to-Video:', {
      hasAudio: !!request.audioUrl,
      hasImage: !!(request.referenceImageUrls && request.referenceImageUrls.length > 0),
      duration: request.durationSeconds,
    });

    // Validate: Need reference image (singer's face)
    if (!request.referenceImageUrls || request.referenceImageUrls.length === 0) {
      throw new InvalidRequestError(
        this.provider,
        'Wan S2V requires a reference image (singer profile image)'
      );
    }

    // Validate: Need audio URL for S2V - this is the whole point!
    if (!request.audioUrl) {
      throw new InvalidRequestError(
        this.provider,
        'Wan S2V requires an audio URL - this is what drives the lip-sync!'
      );
    }

    // Calculate frames based on duration
    // Wan S2V: num_frames 40-120 (multiples of 4), fps 4-60 (default 16)
    // For a 5-second clip at 16fps = 80 frames
    // FIX #55: Increased FPS for smoother lip-sync animation
    const durationSeconds = request.durationSeconds || 5;
    const fps = 24; // Increased from 16 to 24 for smoother lip movements
    const numFrames = Math.min(120, Math.max(40, Math.round(durationSeconds * fps / 4) * 4));

    // FIX #55: Optimized prompt for singing lip-sync quality
    // Emphasize front-facing, clear lip articulation, and singing expression
    const basePrompt = request.prompt || 'Singer performing a song';
    const optimizedPrompt = `Close-up portrait of ${basePrompt}. The singer is passionately singing with clearly visible lip movements articulating lyrics, expressive mouth movements synchronized to music, emotional facial expressions, front-facing camera angle, professional music video quality, studio lighting on face.`;

    const s2vRequest: SpeechToVideoRequest = {
      prompt: optimizedPrompt,
      image_url: request.referenceImageUrls[0], // Singer's profile image
      audio_url: request.audioUrl, // THIS IS THE KEY - audio drives lip-sync!
      num_frames: numFrames,
      frames_per_second: fps,
      resolution: '720p', // S2V supports up to 720p
      // FIX #55: Quality optimization parameters
      num_inference_steps: 40, // Increased from default 27 for better quality
      guidance_scale: 5.0, // Increased from default 3.5 for stronger adherence to prompt
      shift: 7.0, // Increased from default 5.0 for more expressive movements
    };

    console.log('[WanS2V] S2V request config (OPTIMIZED):', {
      prompt: s2vRequest.prompt.substring(0, 80),
      numFrames,
      fps,
      expectedDuration: `${numFrames / fps}s`,
      resolution: s2vRequest.resolution,
      inference_steps: s2vRequest.num_inference_steps,
      guidance_scale: s2vRequest.guidance_scale,
      shift: s2vRequest.shift,
    });

    // Retry logic for reliability
    let lastError: Error | null = null;

    for (let retry = 0; retry <= this.maxRetries; retry++) {
      if (retry > 0) {
        console.log(`[WanS2V] Retry attempt ${retry}/${this.maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, 5000 * retry));
      }

      try {
        const response = await this.client.generateSpeechToVideo(s2vRequest);

        return {
          operationId: response.id,
          status: response.status,
          progress: response.progress || 0,
          estimatedCompletionMs: (response.estimated_time || 60) * 1000,
          metadata: {
            model: 'wan-2.2-s2v',
            duration: durationSeconds,
            hasAudio: true, // S2V always has audio!
            fps,
            numFrames,
          },
        };
      } catch (error) {
        lastError = error as Error;

        // Check for credits exhausted - fail immediately
        if (error instanceof Error && error.message.includes('CREDITS_EXHAUSTED')) {
          throw new QuotaExceededError(this.provider, error.message.replace('CREDITS_EXHAUSTED: ', ''));
        }

        // Check if error is retryable
        if (error instanceof Error && error.message.includes('rate limit')) {
          if (retry < this.maxRetries) {
            continue;
          }
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
    throw new ProviderError(
      lastError?.message || 'S2V video generation failed after retries',
      this.provider,
      'GENERATION_FAILED',
      500,
      false,
      this.maxRetries + 1,
      this.maxRetries + 1
    );
  }

  /**
   * Check generation status
   */
  async getStatus(operationId: string): Promise<GenerationResponse> {
    console.log('[WanS2V] Checking status:', operationId);

    try {
      const response = await this.client.getStatus(operationId);

      return {
        operationId,
        status: response.status,
        progress: response.progress || (response.status === 'completed' ? 100 : 50),
        error: response.error,
        metadata: {
          model: 'wan-2.2-s2v',
        },
      };
    } catch (error) {
      console.error('[WanS2V] Status check failed:', error);
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
    console.log('[WanS2V] Getting result:', operationId);

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

    const contentUrl = Array.isArray(status.output) ? status.output[0] : status.output;

    const videoMetadata: Record<string, any> = {
      provider: this.provider,
      model: 'wan-2.2-s2v',
      mimeType: 'video/mp4',
      width: 1280, // 720p width
      height: 720,
      hasAudio: true, // S2V videos have embedded audio!
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
    console.log('[WanS2V] Cancelling:', operationId);
    await this.client.cancel(operationId);
  }
}

// Factory function for creating the adapter
export function createKieWanS2VAdapter(apiKey: string, baseUrl?: string): KieWanS2VAdapter {
  return new KieWanS2VAdapter({
    apiKey,
    baseUrl,
    retries: 2,
  });
}
