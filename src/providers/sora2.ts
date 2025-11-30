// AI Singer Studio - OpenAI Sora 2 Pro Video Generation Adapter
import type {
  ProviderAdapter,
  VideoGenerationRequest,
  GenerationResponse,
  GenerationResult,
  ProviderConfig,
} from './types';
import { ProviderError, RateLimitError, InvalidRequestError, QuotaExceededError } from './types';

interface Sora2Request {
  model: string;
  prompt: string;
  size: string;
  seconds: string;
  reference_images?: string[]; // For character consistency
}

interface Sora2Video {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  url?: string;
  created_at: number;
  error?: {
    message: string;
  };
}

export class Sora2Adapter implements ProviderAdapter {
  readonly provider = 'sora2' as const;
  readonly contentType = 'video' as const;

  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;
  private readonly maxRetries: number;

  constructor(config: ProviderConfig) {
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    this.apiKey = config.apiKey;
    this.timeout = config.timeout || 600000; // 10 minutes default
    this.maxRetries = config.retries || 2;
  }

  /**
   * Generate video using Sora 2 Pro
   * Supports reference images for character consistency
   */
  async generate(request: VideoGenerationRequest): Promise<GenerationResponse> {
    // Convert aspect ratio to Sora sizes
    const aspectRatios: Record<string, string> = {
      '16:9': '1280x720',
      '9:16': '720x1280',
      '1:1': '1024x1024',
      '4:3': '1024x768',
    };

    const size = aspectRatios[request.aspectRatio || '16:9'] || '1280x720';

    // Build request with reference images
    const soraRequest: Sora2Request = {
      model: 'sora-2-pro',
      prompt: request.prompt,
      size,
      seconds: String(request.durationSeconds || 5),
    };

    // Add reference images if provided
    if (request.referenceImageUrls && request.referenceImageUrls.length > 0) {
      soraRequest.reference_images = request.referenceImageUrls;
    }

    // Retry logic for Sora 2 API (known reliability issues)
    let lastError: Error | null = null;

    for (let retry = 0; retry <= this.maxRetries; retry++) {
      if (retry > 0) {
        console.log(`Sora retry attempt ${retry}/${this.maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, 5000 * retry)); // Exponential backoff
      }

      try {
        return await this.initiateGeneration(soraRequest);
      } catch (error) {
        lastError = error as Error;

        // Only retry for known Sora bugs (99% stuck, timeouts)
        const shouldRetry =
          error instanceof Error &&
          (error.message.includes('failed: {"id"') ||
            error.message.includes('Unknown error') ||
            error.message.includes('timed out') ||
            error.message.includes('TIMEOUT'));

        if (shouldRetry && retry < this.maxRetries) {
          console.log('Detected Sora API bug, retrying...');
          continue;
        }

        // Don't retry other errors
        throw error;
      }
    }

    throw new ProviderError(
      `Video generation failed after ${this.maxRetries + 1} attempts (known Sora 2 API issue)`,
      'sora2',
      'MAX_RETRIES_EXCEEDED',
      undefined,
      true
    );
  }

  /**
   * Initiate video generation
   */
  private async initiateGeneration(request: Sora2Request): Promise<GenerationResponse> {
    const response = await fetch(`${this.baseUrl}/videos`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      await this.handleError(response);
    }

    const data = await response.json() as { id: string; created_at: number };
    const operationId = data.id;

    return {
      operationId,
      status: 'processing',
      progress: 0,
      estimatedCompletionMs: 180000, // ~3 minutes typical
      metadata: {
        createdAt: data.created_at,
      },
    };
  }

  /**
   * Check generation status
   * Polls Sora 2 API for video completion
   */
  async getStatus(operationId: string): Promise<GenerationResponse> {
    const response = await fetch(`${this.baseUrl}/videos/${operationId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      await this.handleError(response);
    }

    const video: Sora2Video = await response.json();

    return {
      operationId,
      status: video.status,
      progress: video.status === 'completed' ? 100 : video.status === 'processing' ? 50 : 0,
      metadata: {
        videoUrl: video.url,
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
        'sora2',
        'NOT_READY'
      );
    }

    if (!status.metadata?.videoUrl) {
      throw new ProviderError('No video URL in response', 'sora2', 'NO_CONTENT');
    }

    // Download video content
    const videoResponse = await fetch(status.metadata.videoUrl);

    if (!videoResponse.ok) {
      throw new ProviderError(
        'Failed to download video',
        'sora2',
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
        provider: 'sora2',
        fileSize: videoBlob.size,
        mimeType: 'video/mp4',
      },
    };
  }

  /**
   * Cancel video generation
   */
  async cancel(operationId: string): Promise<void> {
    // Sora 2 doesn't support cancellation
    console.log(`Sora 2 does not support cancellation for operation: ${operationId}`);
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
      throw new RateLimitError('sora2', retryAfterMs, message);
    }

    if (statusCode === 402 || message.toLowerCase().includes('quota')) {
      throw new QuotaExceededError('sora2', message);
    }

    if (statusCode >= 400 && statusCode < 500) {
      throw new InvalidRequestError('sora2', message, errorData);
    }

    if (statusCode >= 500) {
      throw new ProviderError(message, 'sora2', 'SERVER_ERROR', statusCode, true);
    }

    throw new ProviderError(message, 'sora2', 'UNKNOWN', statusCode);
  }
}

/**
 * Create Sora 2 adapter instance
 */
export function createSora2Adapter(apiKey: string): Sora2Adapter {
  return new Sora2Adapter({
    apiKey,
    timeout: 600000, // 10 minutes
    retries: 2,
  });
}
