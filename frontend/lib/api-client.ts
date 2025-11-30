// API Client for AI Influencer Frontend
// NOTE: This is a NEW project, completely separate from ai-singer-studio

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export class APIClientError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: any
  ) {
    super(message);
    this.name = 'APIClientError';
  }
}

/**
 * Extract a human-readable error message from various error formats
 */
function extractErrorMessage(errorData: any, visited = new Set()): string {
  // If it's already a string, return it
  if (typeof errorData === 'string') {
    return errorData;
  }

  // If it's null or undefined
  if (!errorData) {
    return 'Request failed';
  }

  // Prevent circular reference issues
  if (typeof errorData === 'object' && visited.has(errorData)) {
    return 'Request failed (circular reference)';
  }

  if (typeof errorData === 'object') {
    visited.add(errorData);
  }

  // Try common error message fields
  if (typeof errorData.message === 'string') {
    return errorData.message;
  }

  if (typeof errorData.error === 'string') {
    return errorData.error;
  }

  // OAuth-style errors
  if (typeof errorData.error_description === 'string') {
    return errorData.error_description;
  }

  // RFC7807 Problem Details
  if (typeof errorData.detail === 'string') {
    return errorData.detail;
  }

  // Handle GraphQL-style errors
  if (Array.isArray(errorData.errors)) {
    const messages = errorData.errors
      .map((err: any) => err.message || err.error || 'Unknown error')
      .filter((msg: string) => typeof msg === 'string');
    if (messages.length > 0) {
      return messages.join(', ');
    }
  }

  // Handle Zod validation errors (array of issues)
  if (Array.isArray(errorData.issues)) {
    const messages = errorData.issues.map((issue: any) => {
      if (issue.message) return issue.message;
      if (Array.isArray(issue.path) && issue.path.length) {
        return `${issue.path.join('.')}: ${issue.message || 'Invalid value'}`;
      }
      return 'Validation error';
    });
    return messages.join(', ');
  }

  // Handle array of string messages
  if (Array.isArray(errorData)) {
    const messages = errorData
      .map(item => typeof item === 'string' ? item : extractErrorMessage(item, visited))
      .filter(msg => msg && msg !== 'Request failed');
    if (messages.length > 0) {
      return messages.join(', ');
    }
  }

  // Handle nested error object
  if (typeof errorData.error === 'object' && errorData.error !== null) {
    return extractErrorMessage(errorData.error, visited);
  }

  if (typeof errorData.message === 'object' && errorData.message !== null) {
    return extractErrorMessage(errorData.message, visited);
  }

  // If we have a details field (common in API errors)
  if (errorData.details) {
    if (typeof errorData.details === 'string') {
      return errorData.details;
    }
    return JSON.stringify(errorData.details);
  }

  // Last resort: stringify the entire object but limit length
  try {
    const str = JSON.stringify(errorData);
    return str.length > 200 ? str.substring(0, 200) + '...' : str;
  } catch {
    return 'Request failed';
  }
}

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;

  // Try multiple token storage locations, with fallback to demo user token
  const token = localStorage.getItem('token') ||
                localStorage.getItem('authToken') ||
                sessionStorage.getItem('token') ||
                'test-token-demo-user'; // Default fallback for demo

  console.log('[API Client] Token found:', !!token);
  return token;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;
  console.log('[API Client] Request:', options.method || 'GET', url);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    // Handle response body - may be JSON, text, or empty
    let data: any;
    const contentType = response.headers.get('content-type');
    const text = await response.text();

    // Try to parse as JSON if content-type suggests it or if text looks like JSON
    if (text) {
      if (contentType?.includes('application/json') ||
          (text.trim().startsWith('{') || text.trim().startsWith('['))) {
        try {
          data = JSON.parse(text);
        } catch {
          // If JSON parse fails, use text as-is
          data = { message: text };
        }
      } else {
        // Non-JSON response (HTML error page, plain text, etc.)
        data = { message: text };
      }
    } else {
      // Empty response body
      data = null;
    }

    if (!response.ok) {
      console.error('[API Client] Error response:', {
        status: response.status,
        contentType,
        data,
      });
      throw new APIClientError(
        data ? extractErrorMessage(data) : `Request failed with status ${response.status}`,
        response.status,
        data
      );
    }

    console.log('[API Client] Success:', data);
    return data;
  } catch (error) {
    if (error instanceof APIClientError) {
      throw error;
    }
    console.error('[API Client] Network error:', error);
    throw new APIClientError(
      error instanceof Error ? error.message : 'Network error occurred'
    );
  }
}

// Voice API
export const voicesAPI = {
  async listVoices(category?: string) {
    const query = category ? `?category=${encodeURIComponent(category)}` : '';
    return apiRequest<{ voices: any[] }>(`/api/voices/elevenlabs${query}`);
  },

  async getVoice(voiceId: string) {
    return apiRequest(`/api/voices/elevenlabs/${voiceId}`);
  },

  async generateVoice(params: {
    name: string;
    description?: string;
  }) {
    console.log('[API Client] Generating voice with params:', params);
    return apiRequest(`/api/voices/elevenlabs/generate`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async cloneVoice(formData: FormData) {
    const token = getAuthToken();
    const headers: Record<string, string> = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${API_BASE_URL}/api/voices/elevenlabs/clone`;
    console.log('[API Client] Cloning voice');

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new APIClientError(
        extractErrorMessage(data) || 'Voice cloning failed',
        response.status,
        data
      );
    }

    return data;
  },
};

// Singers API
export const singersAPI = {
  async list() {
    return apiRequest<{ singers: any[] }>('/api/singers');
  },

  async get(id: string) {
    return apiRequest(`/api/singers/${id}`);
  },

  async create(params: {
    name: string;
    description?: string;
    genre?: string;
    voiceSettings?: any;
    stylePreferences?: any;
    referenceImageUrl?: string;
    profileImageUrl?: string;
  }) {
    return apiRequest('/api/singers', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async update(id: string, params: Partial<{
    name: string;
    description?: string;
    genre?: string;
    voiceSettings?: any;
    stylePreferences?: any;
    referenceImageUrl?: string;
    profileImageUrl?: string;
  }>) {
    return apiRequest(`/api/singers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(params),
    });
  },

  async delete(id: string) {
    return apiRequest(`/api/singers/${id}`, {
      method: 'DELETE',
    });
  },
};

// Auth API
export const authAPI = {
  async me() {
    return apiRequest('/api/auth/me');
  },

  async logout() {
    return apiRequest('/api/auth/logout', {
      method: 'POST',
    });
  },
};

// Users API
export const usersAPI = {
  async getUsage() {
    return apiRequest<{
      tier: string;
      imagesRemaining: number;
      imagesUsed: number;
      songsRemaining: number;
      songsUsed: number;
      videosRemaining: number;
      videosUsed: number;
      resetAt: number;
    }>('/api/users/usage');
  },

  async getQuota() {
    return apiRequest<{
      tier: string;
      imagesRemaining: number;
      imagesUsed: number;
      songsRemaining: number;
      songsUsed: number;
      videosRemaining: number;
      videosUsed: number;
      resetAt: number;
    }>('/api/users/me/quota');
  },
};

// Images API (Generation)
export const imagesAPI = {
  async generateImage(params: {
    prompt: string;
    singerId?: string;
    name?: string;
    aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3';
    stylePrompt?: string;
    negativePrompt?: string;
  }) {
    console.log('[imagesAPI] Generating image with params:', params);
    return apiRequest<{
      url?: string;
      imageUrl?: string;
      image_url?: string;
      success: boolean;
      message?: string;
    }>('/api/generate/image', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },
};

// Assets API
export const assetsAPI = {
  async list(params?: {
    type?: 'image' | 'audio' | 'video';
    singerId?: string;
    limit?: number;
    offset?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.type) query.set('type', params.type);
    if (params?.singerId) query.set('singerId', params.singerId);
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());

    const queryString = query.toString();
    return apiRequest<{
      assets: Array<{
        id: string;
        type: 'image' | 'audio' | 'video';
        provider: string;
        url: string;
        metadata: any;
        createdAt: number;
        singerId: string | null;
        singerName: string | null;
      }>;
      pagination: {
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
      };
    }>(`/api/assets${queryString ? `?${queryString}` : ''}`);
  },

  async get(id: string) {
    return apiRequest(`/api/assets/${id}`);
  },

  async delete(id: string) {
    return apiRequest(`/api/assets/${id}`, {
      method: 'DELETE',
    });
  },

  async getStats() {
    return apiRequest<{
      stats: {
        total: number;
        images: number;
        videos: number;
        audio: number;
      };
    }>('/api/assets/stats');
  },
};

// Jobs API
export const jobsAPI = {
  async list(params?: {
    status?: 'pending' | 'processing' | 'completed' | 'failed';
    type?: 'image' | 'song' | 'video';
    singerId?: string;
    limit?: number;
    offset?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.type) query.set('type', params.type);
    if (params?.singerId) query.set('singerId', params.singerId);
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());

    const queryString = query.toString();
    return apiRequest<{
      jobs: Array<{
        id: string;
        type: 'image' | 'song' | 'video';
        provider: string;
        status: 'pending' | 'processing' | 'completed' | 'failed';
        progress: number;
        error: string | null;
        createdAt: number;
        updatedAt: number;
        singerId: string | null;
        singerName: string | null;
        resultAssetId: string | null;
        assetUrl: string | null;
      }>;
      pagination: {
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
      };
    }>(`/api/jobs${queryString ? `?${queryString}` : ''}`);
  },

  async get(id: string) {
    return apiRequest(`/api/jobs/${id}`);
  },

  async delete(id: string) {
    return apiRequest(`/api/jobs/${id}`, {
      method: 'DELETE',
    });
  },

  async retry(id: string) {
    return apiRequest(`/api/jobs/${id}/retry`, {
      method: 'POST',
    });
  },

  async getStats() {
    return apiRequest<{
      stats: {
        total: number;
        pending: number;
        processing: number;
        completed: number;
        failed: number;
        byType: {
          image: number;
          song: number;
          video: number;
        };
      };
    }>('/api/jobs/stats');
  },
};

// Music API (Studio Mode)
export const musicAPI = {
  async createSong(params: {
    singerId: string;
    title: string;
    description?: string;
    genre?: string;
    mood?: string[];
    bpm?: number;
    key?: string;
  }) {
    return apiRequest<{
      song: {
        id: string;
        userId: string;
        singerId: string;
        title: string;
        description: string | null;
        genre: string | null;
        mood: string | null;
        bpm: number;
        key: string;
        status: string;
        createdAt: number;
        updatedAt: number;
      };
    }>('/api/music/songs', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async listSongs(params?: {
    singerId?: string;
    status?: 'draft' | 'generating' | 'completed' | 'published' | 'failed';
    limit?: number;
    offset?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.singerId) query.set('singerId', params.singerId);
    if (params?.status) query.set('status', params.status);
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());

    const queryString = query.toString();
    return apiRequest<{
      songs: Array<{
        id: string;
        userId: string;
        singerId: string;
        title: string;
        description: string | null;
        genre: string | null;
        mood: string | null;
        bpm: number;
        key: string;
        status: string;
        activeVersionId: string | null;
        playCount: number;
        likeCount: number;
        createdAt: number;
        updatedAt: number;
      }>;
    }>(`/api/music/songs${queryString ? `?${queryString}` : ''}`);
  },

  async getSong(id: string) {
    return apiRequest<{
      song: any;
      versions: any[];
      lyrics: any | null;
      lyricVersions: any[];
      sections: any[];
    }>(`/api/music/songs/${id}`);
  },

  async updateLyrics(songId: string, params: {
    text: string;
    sections?: Array<{
      type: 'intro' | 'verse' | 'chorus' | 'bridge' | 'outro' | 'pre-chorus' | 'post-chorus';
      name?: string;
      text: string;
      order: number;
    }>;
    language?: string;
    writtenBy?: string;
  }) {
    return apiRequest<{
      lyricVersionId: string;
      versionNumber: number;
    }>(`/api/music/songs/${songId}/lyrics`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async updateStructure(songId: string, params: {
    structure: Array<{
      type: 'intro' | 'verse' | 'chorus' | 'bridge' | 'outro' | 'pre-chorus' | 'post-chorus';
      name?: string;
      order: number;
      durationMs?: number;
      notes?: string;
    }>;
  }) {
    return apiRequest<{
      success: boolean;
      sectionCount: number;
    }>(`/api/music/songs/${songId}/structure`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async generateVersion(songId: string, params: {
    prompt: string;
    lyricVersionId?: string;
    vocalSettings?: {
      emotion?: 'neutral' | 'happy' | 'sad' | 'angry' | 'fearful' | 'surprised';
      delivery?: 'natural' | 'expressive' | 'dramatic' | 'soft' | 'powerful';
      effects?: Array<'reverb' | 'delay' | 'chorus' | 'distortion'>;
    };
    mixSettings?: {
      instrumentalVolume?: number;
      vocalVolume?: number;
      masteringStyle?: 'clean' | 'warm' | 'bright' | 'punchy';
    };
    stylePreset?: string;
  }) {
    return apiRequest<{
      versionId: string;
      versionNumber: number;
      jobId: string;
      status: string;
      estimatedCompletionSeconds: number;
    }>(`/api/music/songs/${songId}/generate`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async activateVersion(songId: string, versionId: string) {
    return apiRequest<{
      success: boolean;
      activeVersionId: string;
    }>(`/api/music/songs/${songId}/versions/${versionId}/activate`, {
      method: 'POST',
    });
  },

  async deleteSong(id: string) {
    return apiRequest<{
      success: boolean;
    }>(`/api/music/songs/${id}`, {
      method: 'DELETE',
    });
  },
};
