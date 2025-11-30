// AI Singer Studio - Google Veo 3 Video Generation Adapter
import type {
  ProviderAdapter,
  VideoGenerationRequest,
  GenerationResponse,
  GenerationResult,
  ProviderConfig,
} from './types';
import { ProviderError, RateLimitError, InvalidRequestError, QuotaExceededError } from './types';

interface Veo3Request {
  prompt: string;
  aspect_ratio?: string;
  duration_seconds?: number;
  reference_images?: string[]; // For character consistency
}

interface Veo3Video {
  operation_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  video_url?: string;
  created_at: number;
  error?: {
    message: string;
  };
}

export class Veo3Adapter implements ProviderAdapter {
  readonly provider = 'veo3' as const;
  readonly contentType = 'video' as const;

  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;
  private readonly maxRetries: number;

  constructor(config: ProviderConfig) {
    this.baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com/v1';
    this.apiKey = config.apiKey;
    this.timeout = config.timeout || 600000; // 10 minutes default
    this.maxRetries = config.retries || 2;
  }

  /**
   * Generate video using Veo 3
   * Supports reference images for character consistency
   */
  async generate(request: VideoGenerationRequest): Promise<GenerationResponse> {
    const aspectRatios: Record<string, string> = {
      '16:9': '16:9',
      '9:16': '9:16',
      '1:1': '1:1',
      '4:3': '4:3',
    };

    const veo3Request: Veo3Request = {
      prompt: request.prompt,
      aspect_ratio: aspectRatios[request.aspectRatio || '16:9'] || '16:9',
      duration_seconds: request.durationSeconds || 5,
    };

    // Add reference images if provided
    if (request.referenceImageUrls && request.referenceImageUrls.length > 0) {
      veo3Request.reference_images = request.referenceImageUrls;
    }

    // Retry logic for reliability
    let lastError: Error | null = null;

    for (let retry = 0; retry <= this.maxRetries; retry++) {
      if (retry > 0) {
        console.log(`Veo 3 retry attempt ${retry}/${this.maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, 5000 * retry)); // Exponential backoff
      }

      try {
        return await this.initiateGeneration(veo3Request);
      } catch (error) {
        lastError = error as Error;

        // Retry on transient errors
        const shouldRetry =
          error instanceof Error &&
          (error.message.includes('timeout') ||
            error.message.includes('TIMEOUT') ||
            error.message.includes('Server error'));

        if (shouldRetry && retry < this.maxRetries) {
          console.log('Detected Veo 3 transient error, retrying...');
          continue;
        }

        throw error;
      }
    }

    throw new ProviderError(
      `Video generation failed after ${this.maxRetries + 1} attempts`,
      'veo3',
      'MAX_RETRIES_EXCEEDED',
      undefined,
      true
    );
  }

  /**
   * Initiate video generation
   */
  private async initiateGeneration(request: Veo3Request): Promise<GenerationResponse> {
    const response = await fetch(`${this.baseUrl}/videos:generate?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      await this.handleError(response);
    }

    const data = await response.json() as { operation_id: string; created_at: number };
    const operationId = data.operation_id;

    return {
      operationId,
      status: 'processing',
      progress: 0,
      estimatedCompletionMs: 240000, // ~4 minutes typical for Veo 3
      metadata: {
        createdAt: data.created_at,
      },
    };
  }

  /**
   * Check generation status
   */
  async getStatus(operationId: string): Promise<GenerationResponse> {
    const response = await fetch(`${this.baseUrl}/operations/${operationId}?key=${this.apiKey}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      await this.handleError(response);
    }

    const video: Veo3Video = await response.json();

    return {
      operationId,
      status: video.status,
      progress: video.status === 'completed' ? 100 : video.status === 'processing' ? 50 : 0,
      metadata: {
        videoUrl: video.video_url,
        error: video.error?.message,
      },
    };
  }

  /**
   * Get completed video
   */
  async getResult(operationId: string): Promise<GenerationResult> {
    const status = await this.getStatus(operationId);

    if (status.status !== 'completed') {
      throw new ProviderError(
        `Video not ready (status: ${status.status})`,
        'veo3',
        'NOT_READY'
      );
    }

    if (!status.metadata?.videoUrl) {
      throw new ProviderError('No video URL in response', 'veo3', 'NO_CONTENT');
    }

    // Download video content
    const videoResponse = await fetch(status.metadata.videoUrl);

    if (!videoResponse.ok) {
      throw new ProviderError(
        'Failed to download video',
        'veo3',
        'DOWNLOAD_FAILED'
      );
    }

    const videoBlob = await videoResponse.blob();

    return {
      operationId,
      status: 'completed',
      contentUrl: status.metadata.videoUrl,
      contentType: 'video',
      metadata: {
        provider: 'veo3',
        fileSize: videoBlob.size,
        mimeType: 'video/mp4',
      },
    };
  }

  /**
   * Cancel video generation
   */
  async cancel(operationId: string): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/operations/${operationId}:cancel?key=${this.apiKey}`, {
        method: 'POST',
      });
    } catch (error) {
      console.error(`Failed to cancel Veo 3 operation ${operationId}:`, error);
    }
  }

  /**
   * Handle API errors
   * FIX: Clone response before consuming body to avoid "Body already used" error
   */
  private async handleError(response: Response): Promise<never> {
    const statusCode = response.status;
    let errorData: any;

    // FIX: Read body as text first, then try to parse as JSON
    // This avoids the "Body already used" error when JSON parsing fails
    const responseText = await response.text();

    try {
      errorData = JSON.parse(responseText);
    } catch {
      errorData = { message: responseText || response.statusText };
    }

    const message = errorData?.error?.message || errorData?.message || response.statusText;

    if (statusCode === 429) {
      const retryAfter = response.headers.get('retry-after');
      const retryAfterMs = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
      throw new RateLimitError('veo3', retryAfterMs, message);
    }

    if (statusCode === 402 || message.toLowerCase().includes('quota')) {
      throw new QuotaExceededError('veo3', message);
    }

    if (statusCode >= 400 && statusCode < 500) {
      throw new InvalidRequestError('veo3', message, errorData);
    }

    if (statusCode >= 500) {
      throw new ProviderError(message, 'veo3', 'SERVER_ERROR', statusCode, true);
    }

    throw new ProviderError(message, 'veo3', 'UNKNOWN', statusCode);
  }
}

/**
 * Create Veo 3 adapter instance
 */
export function createVeo3Adapter(apiKey: string): Veo3Adapter {
  return new Veo3Adapter({
    apiKey,
    timeout: 600000, // 10 minutes
    retries: 2,
  });
}
