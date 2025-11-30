// Kie.ai API Client for Wan 2.5 and Nano Banana Pro
// Documentation: https://docs.kie.ai/

export interface KieClientConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface ImageGenerationRequest {
  model: string; // e.g., 'gemini-3-pro-image-preview'
  prompt: string;
  image_url?: string; // Reference image for character identity
  negative_prompt?: string;
  width?: number;
  height?: number;
  num_outputs?: number;
}

export interface VideoGenerationRequest {
  model: string; // e.g., 'alibaba/wan2.5-i2v-preview'
  image_url: string; // Starting frame (imageUrl in API)
  audio_url?: string; // Audio track for sync
  prompt: string;
  negative_prompt?: string;
  duration?: string; // '4', '8' or '12' seconds (FIX #41: API updated from 5/8/10)
  quality?: '720p' | '1080p'; // FIX #32: Kie.ai uses 'quality' not 'resolution' (required)
  resolution?: '720p' | '1080p'; // Legacy - maps to quality
  aspect_ratio?: '16:9' | '9:16' | '1:1' | '4:3' | '3:4';
  waterMark?: string; // Watermark text (empty = no watermark)
  callBackUrl?: string; // Webhook URL for completion callback
  seed?: number;
}

// FIX #48: Wan 2.2 S2V (Speech-to-Video) Request
// This API NATIVELY supports audio_url for lip-sync music videos!
// Documentation: https://kie.ai/wan-speech-to-video-turbo
export interface SpeechToVideoRequest {
  prompt: string; // e.g., "The singer is performing"
  image_url: string; // Singer's reference image (required)
  audio_url: string; // Audio/music file URL (required - this drives the lip-sync!)
  num_frames?: number; // 40-120, multiple of 4 (default: 80)
  frames_per_second?: number; // 4-60 FPS (default: 16)
  resolution?: '480p' | '580p' | '720p'; // default: 480p
  negative_prompt?: string; // max 500 chars
  seed?: number;
  num_inference_steps?: number; // 2-40 (default: 27)
  guidance_scale?: number; // 1-10 (default: 3.5)
  shift?: number; // 1.0-10.0 (default: 5)
  enable_safety_checker?: boolean; // default: true
}

export interface GenerationResponse {
  id: string; // Operation ID
  status: 'pending' | 'processing' | 'completed' | 'failed';
  output?: string | string[]; // URL(s) to generated asset(s)
  error?: string;
  progress?: number; // 0-100
  estimated_time?: number; // seconds
}

export class KieClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: KieClientConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.kie.ai';
  }

  /**
   * Generate an image using Flux Kontext (context-aware image generation)
   */
  async generateImage(request: ImageGenerationRequest): Promise<GenerationResponse> {
    console.log('[KieClient] Generating image:', { model: request.model, prompt: request.prompt?.substring(0, 50) });
    console.log('[KieClient] Full image request:', JSON.stringify(request));

    const response = await fetch(`${this.baseUrl}/api/v1/flux/kontext/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    console.log('[KieClient] Image response status:', response.status, response.statusText);

    if (!response.ok) {
      const error = await response.text();
      console.error('[KieClient] Image generation failed:', {
        status: response.status,
        statusText: response.statusText,
        error: error,
      });
      throw new Error(`Kie.ai image generation failed (${response.status}): ${error}`);
    }

    const data = await response.json();
    console.log('[KieClient] Image generation response (FULL):', JSON.stringify(data));

    // FIX #40: Check for insufficient credits error (code 402) - fail fast, don't retry
    if (data.code === 402 || (data.msg && data.msg.toLowerCase().includes('insufficient'))) {
      throw new Error(`CREDITS_EXHAUSTED: ${data.msg || 'Insufficient Kie.ai credits. Please top up at kie.ai'}`);
    }

    // FIX #28: Handle nested response structure from Kie.ai
    // API returns: {"code":200,"msg":"success","data":{"taskId":"..."}}
    // Extract operation ID with detailed logging
    const operationId = data.data?.taskId || data.id || data.request_id || data.task_id || data.operation_id;
    console.log('[KieClient] Extracted operation ID:', operationId, 'from fields:', {
      nested_taskId: data.data?.taskId,
      id: data.id,
      request_id: data.request_id,
      task_id: data.task_id,
      operation_id: data.operation_id,
    });

    if (!operationId || operationId === 'unknown') {
      console.error('[KieClient] NO OPERATION ID IN RESPONSE! Full response:', data);
      throw new Error(`Kie.ai image generation didn't return an operation ID. Response: ${JSON.stringify(data)}`);
    }

    return {
      id: operationId,
      status: this.mapStatus(data.status),
      output: data.output || data.image_url || data.images?.[0],
      progress: data.progress || 0,
      estimated_time: data.estimated_time,
    };
  }

  /**
   * Generate a video using Runway (image-to-video)
   * FIX #32: Map our interface to Kie.ai's expected API format
   */
  async generateVideo(request: VideoGenerationRequest): Promise<GenerationResponse> {
    console.log('[KieClient] Generating video:', {
      model: request.model,
      hasAudio: !!request.audio_url,
      duration: request.duration,
      prompt: request.prompt?.substring(0, 50),
    });

    // FIX #32 + #51: Transform request to Kie.ai API format
    // API expects: imageUrl (not image_url), quality (not resolution), duration as number
    // FIX #51: Valid durations are 5, 8, or 10 (API changed from 4/8/12)
    const requestedDuration = parseInt(request.duration || '5', 10);
    // Clamp to nearest valid value: 5, 8, or 10
    let validDuration: number;
    if (requestedDuration <= 5) {
      validDuration = 5;
    } else if (requestedDuration <= 8) {
      validDuration = 8;
    } else {
      validDuration = 10;
    }

    const apiRequest: Record<string, any> = {
      prompt: request.prompt,
      imageUrl: request.image_url, // Map image_url -> imageUrl
      duration: validDuration, // Valid values: 4, 8, or 12
      quality: request.quality || request.resolution || '720p', // Required field
    };

    // Add optional fields
    if (request.aspect_ratio) {
      apiRequest.aspectRatio = request.aspect_ratio;
    }
    if (request.waterMark !== undefined) {
      apiRequest.waterMark = request.waterMark;
    }
    // FIX #47: Add audio_url for music video sync
    // Kie.ai Runway API may support audio sync - trying common parameter names
    if (request.audio_url) {
      apiRequest.audioUrl = request.audio_url; // Try camelCase (matching their other params)
      console.log('[KieClient] Adding audio URL for music sync:', request.audio_url.substring(0, 80));
    }

    console.log('[KieClient] Full video request (transformed):', JSON.stringify(apiRequest));

    const response = await fetch(`${this.baseUrl}/api/v1/runway/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiRequest),
    });

    console.log('[KieClient] Video response status:', response.status, response.statusText);

    if (!response.ok) {
      const error = await response.text();
      console.error('[KieClient] Video generation failed:', {
        status: response.status,
        statusText: response.statusText,
        error: error,
      });
      throw new Error(`Kie.ai video generation failed (${response.status}): ${error}`);
    }

    const data = await response.json();
    console.log('[KieClient] Video generation response (FULL):', JSON.stringify(data));

    // FIX #40: Check for insufficient credits error (code 402) - fail fast, don't retry
    if (data.code === 402 || (data.msg && data.msg.toLowerCase().includes('insufficient'))) {
      throw new Error(`CREDITS_EXHAUSTED: ${data.msg || 'Insufficient Kie.ai credits. Please top up at kie.ai'}`);
    }

    // FIX #28: Handle nested response structure from Kie.ai (same as image generation)
    // API returns: {"code":200,"msg":"success","data":{"taskId":"..."}}
    // Extract operation ID with detailed logging
    const operationId = data.data?.taskId || data.id || data.request_id || data.task_id || data.operation_id;
    console.log('[KieClient] Extracted operation ID:', operationId, 'from fields:', {
      nested_taskId: data.data?.taskId,
      id: data.id,
      request_id: data.request_id,
      task_id: data.task_id,
      operation_id: data.operation_id,
    });

    if (!operationId || operationId === 'unknown') {
      console.error('[KieClient] NO OPERATION ID IN RESPONSE! Full response:', data);
      throw new Error(`Kie.ai video generation didn't return an operation ID. Response: ${JSON.stringify(data)}`);
    }

    return {
      id: operationId,
      status: this.mapStatus(data.status),
      output: data.output || data.video_url || data.videos?.[0],
      progress: data.progress || 0,
      estimated_time: data.estimated_time || 30, // Default 30s estimate
    };
  }

  /**
   * FIX #50: Generate video with native audio sync using Wan 2.2 S2V API
   * This API NATIVELY supports audio_url - the audio drives lip-sync!
   * Perfect for music videos where we want the singer to move/lip-sync with the music.
   *
   * Model: wan/2-2-a14b-speech-to-video-turbo
   * Documentation: https://kie.ai/wan-speech-to-video-turbo
   *
   * Note: The endpoint is not publicly documented, so we try multiple patterns
   */
  async generateSpeechToVideo(request: SpeechToVideoRequest): Promise<GenerationResponse> {
    console.log('[KieClient] 🎤 Generating Lip-Sync Video (Wan S2V):', {
      hasAudio: !!request.audio_url,
      hasImage: !!request.image_url,
      resolution: request.resolution || '720p',
      prompt: request.prompt?.substring(0, 50),
    });

    // Wan S2V API request format (based on playground parameters)
    // Model: wan/2-2-a14b-speech-to-video-turbo
    const apiRequest: Record<string, any> = {
      model: 'wan/2-2-a14b-speech-to-video-turbo',
      prompt: request.prompt || 'A singer performing a song with expressive movements',
      image_url: request.image_url, // Singer's profile image (required)
      audio_url: request.audio_url, // Audio drives the lip-sync! (required)
      resolution: request.resolution || '720p', // 480p, 580p, or 720p
    };

    // Add optional parameters
    if (request.num_frames !== undefined) {
      apiRequest.num_frames = request.num_frames; // 40-120, multiple of 4
    }
    if (request.frames_per_second !== undefined) {
      apiRequest.frames_per_second = request.frames_per_second; // 4-60 FPS
    }
    if (request.seed !== undefined) {
      apiRequest.seed = request.seed;
    }
    if (request.negative_prompt) {
      apiRequest.negative_prompt = request.negative_prompt;
    }
    // FIX #55: Quality optimization parameters for better lip-sync
    if (request.num_inference_steps !== undefined) {
      apiRequest.num_inference_steps = request.num_inference_steps; // 2-40, default 27
    }
    if (request.guidance_scale !== undefined) {
      apiRequest.guidance_scale = request.guidance_scale; // 1-10, default 3.5
    }
    if (request.shift !== undefined) {
      apiRequest.shift = request.shift; // 1.0-10.0, default 5.0
    }

    console.log('[KieClient] Wan S2V request:', JSON.stringify(apiRequest));

    // Try multiple endpoint patterns since S2V isn't publicly documented
    // Based on Kie.ai naming patterns: /api/v1/{model-type}/generate
    const endpointsToTry = [
      '/api/v1/wan/s2v/generate',      // Most likely based on model name
      '/api/v1/wan/generate',           // Generic wan endpoint
      '/api/v1/video/generate',         // Generic video with model param
      '/api/v1/speech-to-video/generate', // Descriptive name
    ];

    let lastError: string = '';

    for (const endpoint of endpointsToTry) {
      try {
        console.log(`[KieClient] Trying Wan S2V endpoint: ${endpoint}`);

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(apiRequest),
        });

        console.log(`[KieClient] ${endpoint} response:`, response.status, response.statusText);

        // 404 = wrong endpoint, try next
        if (response.status === 404) {
          lastError = `404 Not Found: ${endpoint}`;
          console.log(`[KieClient] Endpoint not found: ${endpoint}, trying next...`);
          continue;
        }

        // Other errors - get response body
        const responseText = await response.text();
        let data: any;
        try {
          data = JSON.parse(responseText);
        } catch {
          data = { error: responseText };
        }

        // Check for API-level errors
        if (!response.ok) {
          // 401 permission error might be plan-specific, not endpoint issue
          if (response.status === 401) {
            throw new Error(`Kie.ai access denied (401): ${data.error || responseText}. You may need to upgrade your plan.`);
          }
          lastError = `${response.status}: ${data.error || data.msg || responseText}`;
          console.log(`[KieClient] API error on ${endpoint}:`, lastError);
          continue; // Try next endpoint
        }

        console.log('[KieClient] Wan S2V response (FULL):', JSON.stringify(data));

        // Check for credits error
        if (data.code === 402 || (data.msg && data.msg.toLowerCase().includes('insufficient'))) {
          throw new Error(`CREDITS_EXHAUSTED: ${data.msg || 'Insufficient Kie.ai credits. Please top up at kie.ai'}`);
        }

        // Check for API success code
        if (data.code && data.code !== 200) {
          lastError = `API code ${data.code}: ${data.msg}`;
          console.log(`[KieClient] API error code on ${endpoint}:`, lastError);
          continue; // Try next endpoint
        }

        // Extract operation ID
        const operationId = data.data?.taskId || data.id || data.request_id || data.task_id || data.operation_id;
        console.log(`[KieClient] ✅ Wan S2V success on ${endpoint}! Operation ID:`, operationId);

        if (!operationId || operationId === 'unknown') {
          console.error('[KieClient] NO OPERATION ID IN WAN S2V RESPONSE! Full response:', data);
          throw new Error(`Kie.ai Wan S2V didn't return an operation ID. Response: ${JSON.stringify(data)}`);
        }

        return {
          id: operationId,
          status: this.mapStatus(data.status),
          output: data.output || data.video_url,
          progress: data.progress || 0,
          estimated_time: data.estimated_time || 120, // S2V takes ~2 min
        };
      } catch (error) {
        if (error instanceof Error && (
          error.message.includes('CREDITS_EXHAUSTED') ||
          error.message.includes('access denied')
        )) {
          throw error; // Re-throw critical errors
        }
        lastError = error instanceof Error ? error.message : String(error);
        console.log(`[KieClient] Exception on ${endpoint}:`, lastError);
      }
    }

    // All endpoints failed - throw error with details
    throw new Error(`Kie.ai Wan S2V generation failed: All endpoints returned errors. Last error: ${lastError}`);
  }

  /**
   * Check the status of a generation operation
   * NOTE: Kie.ai uses different status endpoints for different services:
   * - Flux Kontext (images): /api/v1/flux/kontext/record-info
   * - Runway (videos): /api/v1/runway/record-detail
   * - Wan S2V (speech-to-video): /api/v1/wan/s2v/record-detail (FIX #48)
   * We'll try all endpoints since we don't track operation type
   *
   * FIX #29: Kie.ai returns nested response structure:
   * {"code":200,"msg":"success","data":{"status":"...", "output":"..."}}
   */
  async getStatus(operationId: string): Promise<GenerationResponse> {
    console.log('[KieClient] Checking status for operation:', operationId);

    if (!operationId || operationId === 'unknown') {
      throw new Error(`Cannot check status: invalid operation ID "${operationId}"`);
    }

    // FIX #33 + #50: Try all possible endpoints
    // Kie.ai returns HTTP 200 with {"code":422,"msg":"The record does not exist"} for wrong endpoint
    // Try Runway first (most common), then Wan S2V (lip-sync), then Flux
    const endpoints = [
      `/api/v1/runway/record-detail?taskId=${operationId}`,
      `/api/v1/wan/s2v/record-info?taskId=${operationId}`, // FIX #50: Wan S2V lip-sync status
      `/api/v1/wan/record-info?taskId=${operationId}`,     // FIX #50: Generic Wan status
      `/api/v1/flux/kontext/record-info?taskId=${operationId}`,
    ];

    let lastError: any = null;

    for (const endpoint of endpoints) {
      try {
        console.log('[KieClient] Trying status endpoint:', endpoint);
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        });

        console.log('[KieClient] Status response:', response.status, response.statusText);

        if (response.ok) {
          const data = await response.json();
          console.log('[KieClient] Status response (FULL):', JSON.stringify(data));

          // FIX #33 + #35: Check API response code and data - skip to next endpoint if record doesn't exist
          // Kie.ai returns {"code":422,"msg":"The record does not exist"} for wrong endpoint
          // Also returns {"code":200,"msg":"success","data":null} when task doesn't exist in that endpoint
          if (data.code && data.code !== 200) {
            console.log(`[KieClient] API returned code ${data.code}: ${data.msg}, trying next endpoint`);
            lastError = data.msg || `API code ${data.code}`;
            continue; // Try next endpoint
          }

          // FIX #35: If data is null, task doesn't exist in this endpoint - try next one
          if (data.data === null) {
            console.log(`[KieClient] API returned null data, task not found in this endpoint, trying next`);
            lastError = 'Task not found in endpoint';
            continue; // Try next endpoint
          }

          // FIX #29 + #31 + #34: Handle nested response structure from Kie.ai
          // Flux Kontext returns: {"code":200,"msg":"success","data":{
          //   "taskId":"...",
          //   "response":{"originImageUrl":null,"resultImageUrl":"https://..."},
          //   "successFlag":1,
          //   "errorCode":null,"errorMessage":null
          // }}
          // Runway returns: {"code":200,"msg":"success","data":{
          //   "taskId":"...",
          //   "state":"success" (or "fail", "pending"),
          //   "videoInfo":{"videoUrl":"https://...","imageUrl":"https://..."},
          //   "failCode":"","failMsg":""
          // }}
          const nestedData = data.data || {};
          const responseObj = nestedData.response || {};
          const videoInfo = nestedData.videoInfo || {};

          // FIX #34: Runway uses "state" field: "success", "fail", "pending"
          // Flux uses "successFlag": 1 = success
          const runwayState = nestedData.state; // "success", "fail", "pending", or undefined
          const hasCompletedRunway = runwayState === 'success';
          const hasFailedRunway = runwayState === 'fail' || (nestedData.failCode && nestedData.failCode !== '');

          // FIX #31: Status is determined by successFlag field (1 = success) for Flux
          const hasCompletedFlux = nestedData.completeTime || nestedData.successFlag === 1;
          const hasFailedFlux = nestedData.errorCode || nestedData.errorMessage;

          // Combine both detection methods
          const hasCompleted = hasCompletedRunway || hasCompletedFlux;
          const hasFailed = hasFailedRunway || hasFailedFlux;
          const status = hasFailed ? 'failed' : (hasCompleted ? 'completed' : (runwayState || nestedData.status || data.status || 'pending'));

          // FIX #34: Output URL - Runway uses videoInfo.videoUrl, Flux uses response.resultImageUrl
          const output = videoInfo.videoUrl || responseObj.resultImageUrl || responseObj.video_url || responseObj.url ||
                        nestedData.output || nestedData.result || nestedData.video_url ||
                        nestedData.image_url || nestedData.url ||
                        data.output || data.result || data.video_url || data.image_url;
          // FIX #34: Error message - Runway uses failMsg, Flux uses errorMessage
          const error = nestedData.failMsg || nestedData.errorMessage || nestedData.error || data.error;
          const progress = nestedData.progress || data.progress;

          console.log('[KieClient] Parsed status fields:', {
            status,
            hasOutput: !!output,
            outputUrl: output?.substring?.(0, 50),
            error,
            progress,
            usedNestedData: !!data.data,
            hasCompleted,
            hasFailed,
          });

          return {
            id: operationId,
            status: this.mapStatus(status),
            output,
            error,
            progress: progress || (status === 'completed' || status === 'success' ? 100 : status === 'processing' ? 50 : 0),
          };
        }

        lastError = await response.text();
        console.log('[KieClient] Endpoint failed:', endpoint, 'Error:', lastError);
      } catch (err) {
        lastError = err;
        console.log('[KieClient] Endpoint error:', endpoint, err);
      }
    }

    // All endpoints failed
    console.error('[KieClient] All status endpoints failed for:', operationId);
    throw new Error(`Kie.ai status check failed: ${lastError}`);
  }

  /**
   * Cancel a generation operation
   */
  async cancel(operationId: string): Promise<void> {
    console.log('[KieClient] Cancelling operation:', operationId);

    const response = await fetch(`${this.baseUrl}/operations/${operationId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.warn('[KieClient] Cancellation failed (may not be supported):', error);
      // Don't throw - cancellation may not be supported
    }
  }

  /**
   * Map Kie.ai status to our standard status
   */
  private mapStatus(status: string): 'pending' | 'processing' | 'completed' | 'failed' {
    const normalized = status?.toLowerCase() || 'pending';

    if (normalized.includes('complete') || normalized.includes('success')) {
      return 'completed';
    }
    if (normalized.includes('fail') || normalized.includes('error')) {
      return 'failed';
    }
    if (normalized.includes('process') || normalized.includes('running')) {
      return 'processing';
    }
    return 'pending';
  }
}
