// AI Singer Studio - ElevenLabs Music API Adapter
import type {
  ProviderAdapter,
  AudioGenerationRequest,
  GenerationResponse,
  GenerationResult,
  ProviderConfig,
} from './types';
import { ProviderError, RateLimitError, InvalidRequestError, QuotaExceededError } from './types';

interface ElevenLabsMusicRequest {
  prompt?: string | null;
  music_length_ms?: number | null;
  model_id: string;
  force_instrumental?: boolean;
}

interface ElevenLabsMusicResponse {
  audio_url?: string; // Direct URL to audio file
  error?: {
    type: string;
    message: string;
  };
}

export class ElevenLabsAdapter implements ProviderAdapter {
  readonly provider = 'elevenlabs' as const;
  readonly contentType = 'audio' as const;

  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;

  constructor(config: ProviderConfig) {
    this.baseUrl = config.baseUrl || 'https://api.elevenlabs.io/v1';
    this.apiKey = config.apiKey;
    this.timeout = config.timeout || 120000; // 2 minutes default
  }

  /**
   * Generate music from text prompt
   * ElevenLabs Music API returns audio directly (synchronous)
   */
  async generate(request: AudioGenerationRequest): Promise<GenerationResponse> {
    try {
      // Build ElevenLabs request
      const elevenlabsRequest: ElevenLabsMusicRequest = {
        prompt: request.prompt,
        music_length_ms: request.durationMs,
        model_id: 'music_v1',
        force_instrumental: request.instrumental ?? false,
      };

      // Make request to ElevenLabs Music API
      const response = await fetch(`${this.baseUrl}/music`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey,
        },
        body: JSON.stringify(elevenlabsRequest),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        await this.handleError(response);
      }

      // ElevenLabs returns audio binary directly
      const audioArrayBuffer = await response.arrayBuffer();
      const operationId = `elevenlabs_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Convert ArrayBuffer to base64 for transmission to job processor
      // Job processor will decode this and upload to R2
      const audioBytes = new Uint8Array(audioArrayBuffer);
      let binaryString = '';
      for (let i = 0; i < audioBytes.length; i++) {
        binaryString += String.fromCharCode(audioBytes[i]);
      }
      const audioBase64 = btoa(binaryString);

      return {
        operationId,
        status: 'completed',
        progress: 100,
        metadata: {
          audioData: audioBase64, // Base64-encoded audio for job processor
          contentType: response.headers.get('content-type') || 'audio/mpeg',
          size: audioArrayBuffer.byteLength,
          duration: request.durationMs,
        },
      };
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
          throw new ProviderError(
            'ElevenLabs request timeout',
            'elevenlabs',
            'TIMEOUT',
            408,
            true
          );
        }
        throw new ProviderError(error.message, 'elevenlabs');
      }

      throw new ProviderError('Unknown error', 'elevenlabs');
    }
  }

  /**
   * Get status of generation
   * ElevenLabs is synchronous, so this always returns completed
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
    // This is a placeholder - in real implementation:
    // 1. Query database for result using operationId
    // 2. Return the stored R2 URL and metadata

    throw new ProviderError(
      'Result retrieval not implemented - use metadata from generate() response',
      'elevenlabs',
      'NOT_IMPLEMENTED'
    );
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

    // Rate limiting
    if (statusCode === 429) {
      const retryAfter = response.headers.get('retry-after');
      const retryAfterMs = retryAfter ? parseInt(retryAfter) * 1000 : 60000;

      throw new RateLimitError('elevenlabs', retryAfterMs, message);
    }

    // Quota exceeded
    if (statusCode === 402 || message.toLowerCase().includes('quota')) {
      throw new QuotaExceededError('elevenlabs', message);
    }

    // Invalid request
    if (statusCode >= 400 && statusCode < 500) {
      throw new InvalidRequestError('elevenlabs', message, errorData);
    }

    // Server error (retryable)
    if (statusCode >= 500) {
      throw new ProviderError(message, 'elevenlabs', 'SERVER_ERROR', statusCode, true);
    }

    throw new ProviderError(message, 'elevenlabs', 'UNKNOWN', statusCode);
  }
}

/**
 * Create ElevenLabs adapter instance
 */
export function createElevenLabsAdapter(apiKey: string): ElevenLabsAdapter {
  return new ElevenLabsAdapter({
    apiKey,
    timeout: 120000, // 2 minutes
  });
}
