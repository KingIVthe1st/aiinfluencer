// AI Singer Studio - Provider Types
// Common types and interfaces for all provider adapters

export type ProviderType = 'gemini' | 'elevenlabs' | 'veo3' | 'sora2' | 'kie-nano-banana-pro' | 'kie-wan25' | 'kie-wan-s2v';
export type ContentType = 'image' | 'audio' | 'video';

// Base generation request
export interface GenerationRequest {
  prompt: string;
  referenceImageUrls?: string[]; // For character consistency
  metadata?: Record<string, any>;
}

// Image generation request
export interface ImageGenerationRequest extends GenerationRequest {
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  style?: string;
  negativePrompt?: string;
}

// Audio/Music generation request
export interface AudioGenerationRequest extends GenerationRequest {
  durationMs?: number;
  genre?: string;
  mood?: string;
  instrumental?: boolean;
  lyrics?: string;
}

// Video generation request
export interface VideoGenerationRequest extends GenerationRequest {
  durationSeconds?: number;
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3';
  audioUrl?: string; // For audio-to-video
  fps?: number;
}

// Generation response (async operation)
export interface GenerationResponse {
  operationId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number; // 0-100
  estimatedCompletionMs?: number;
  metadata?: Record<string, any>;
  error?: string; // FIX #37: Error message for failed status (needed for retry logic)
}

// Completed generation result
export interface GenerationResult {
  operationId: string;
  status: 'completed' | 'failed';
  contentUrl?: string; // Direct download URL
  contentType: ContentType;
  metadata: {
    provider: ProviderType;
    duration?: number; // For audio/video
    width?: number; // For images/video
    height?: number; // For images/video
    fileSize?: number;
    mimeType?: string;
    [key: string]: any;
  };
  error?: string;
}

// Provider adapter interface
export interface ProviderAdapter {
  readonly provider: ProviderType;
  readonly contentType: ContentType;

  /**
   * Initiate generation
   * Returns operation ID for polling
   */
  generate(request: GenerationRequest): Promise<GenerationResponse>;

  /**
   * Check generation status
   */
  getStatus(operationId: string): Promise<GenerationResponse>;

  /**
   * Get completed generation result
   * Throws if not completed
   */
  getResult(operationId: string): Promise<GenerationResult>;

  /**
   * Cancel ongoing generation
   */
  cancel?(operationId: string): Promise<void>;
}

// Provider configuration
export interface ProviderConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

// Error types
// FIX #18: Enhanced with retry attempt tracking for detailed error messages
export class ProviderError extends Error {
  constructor(
    message: string,
    public provider: ProviderType,
    public code?: string,
    public statusCode?: number,
    public retryable: boolean = false,
    public retryAttempt?: number, // FIX #18: Track which retry attempt failed
    public maxRetries?: number     // FIX #18: Include max retries for context
  ) {
    super(message);
    this.name = 'ProviderError';
  }

  // FIX #18: Generate detailed error message with retry information
  toDetailedMessage(): string {
    const parts = [this.message];

    if (this.retryAttempt !== undefined && this.maxRetries !== undefined) {
      parts.push(`(attempt ${this.retryAttempt}/${this.maxRetries})`);
    }

    if (this.code) {
      parts.push(`[${this.code}]`);
    }

    if (this.statusCode) {
      parts.push(`HTTP ${this.statusCode}`);
    }

    return parts.join(' ');
  }
}

export class QuotaExceededError extends ProviderError {
  constructor(provider: ProviderType, message: string = 'Quota exceeded') {
    super(message, provider, 'QUOTA_EXCEEDED', 429, false);
    this.name = 'QuotaExceededError';
  }
}

export class RateLimitError extends ProviderError {
  constructor(
    provider: ProviderType,
    public retryAfterMs?: number,
    message: string = 'Rate limit exceeded'
  ) {
    super(message, provider, 'RATE_LIMIT', 429, true);
    this.name = 'RateLimitError';
  }
}

export class InvalidRequestError extends ProviderError {
  constructor(provider: ProviderType, message: string, public validationErrors?: any) {
    super(message, provider, 'INVALID_REQUEST', 400, false);
    this.name = 'InvalidRequestError';
  }
}
