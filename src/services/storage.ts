// AI Singer Studio - Storage Service for R2 Operations

export interface UploadResult {
  key: string;
  url: string;
  size: number;
  contentType: string;
}

export interface SignedUrlOptions {
  expiresIn?: number; // Seconds (default 3600 = 1 hour)
}

/**
 * StorageService - Handles R2 bucket operations
 */
export class StorageService {
  constructor(
    private assetsBucket: R2Bucket,
    private publicUrl: string
  ) {}

  /**
   * Upload file to R2 bucket
   */
  async upload(
    key: string,
    content: ArrayBuffer | ReadableStream,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<UploadResult> {
    await this.assetsBucket.put(key, content, {
      httpMetadata: {
        contentType,
      },
      customMetadata: metadata,
    });

    // Get object info for size
    const object = await this.assetsBucket.head(key);
    if (!object) {
      throw new Error(`Failed to verify upload: ${key}`);
    }

    return {
      key,
      url: this.getPublicUrl(key),
      size: object.size,
      contentType,
    };
  }

  /**
   * Upload image (base64 or blob)
   */
  async uploadImage(
    userId: string,
    singerId: string,
    imageData: string | ArrayBuffer,
    metadata?: Record<string, string>
  ): Promise<UploadResult> {
    const timestamp = Date.now();
    const key = `images/${userId}/${singerId}/${timestamp}.png`;

    // Convert base64 to buffer if needed
    let content: ArrayBuffer;
    if (typeof imageData === 'string') {
      // Remove data URL prefix if present
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      content = bytes.buffer;
    } else {
      content = imageData;
    }

    return this.upload(key, content, 'image/png', {
      userId,
      singerId,
      type: 'image',
      ...metadata,
    });
  }

  /**
   * Upload audio file
   */
  async uploadAudio(
    userId: string,
    singerId: string,
    audioData: ArrayBuffer | ReadableStream,
    metadata?: Record<string, string>
  ): Promise<UploadResult> {
    const timestamp = Date.now();
    const key = `audio/${userId}/${singerId}/${timestamp}.mp3`;

    return this.upload(key, audioData, 'audio/mpeg', {
      userId,
      singerId,
      type: 'audio',
      ...metadata,
    });
  }

  /**
   * Upload video file
   */
  async uploadVideo(
    userId: string,
    singerId: string,
    videoData: ArrayBuffer | ReadableStream,
    metadata?: Record<string, string>
  ): Promise<UploadResult> {
    const timestamp = Date.now();
    const key = `videos/${userId}/${singerId}/${timestamp}.mp4`;

    return this.upload(key, videoData, 'video/mp4', {
      userId,
      singerId,
      type: 'video',
      ...metadata,
    });
  }

  /**
   * Get file from R2
   */
  async get(key: string): Promise<R2ObjectBody | null> {
    return this.assetsBucket.get(key);
  }

  /**
   * Delete file from R2
   */
  async delete(key: string): Promise<void> {
    await this.assetsBucket.delete(key);
  }

  /**
   * Check if file exists
   */
  async exists(key: string): Promise<boolean> {
    const object = await this.assetsBucket.head(key);
    return object !== null;
  }

  /**
   * Generate signed URL for private access
   * Note: R2 doesn't support signed URLs yet (as of Jan 2025)
   * This is a placeholder for when the feature is available
   */
  async getSignedUrl(
    key: string,
    options: SignedUrlOptions = {}
  ): Promise<string> {
    // For now, return public URL
    // TODO: Implement signed URLs when R2 supports them
    return this.getPublicUrl(key);
  }

  /**
   * Get public URL for object
   */
  getPublicUrl(key: string): string {
    return `${this.publicUrl}/${key}`;
  }

  /**
   * List objects with prefix
   */
  async list(
    prefix: string,
    limit: number = 100
  ): Promise<R2Objects> {
    return this.assetsBucket.list({
      prefix,
      limit,
    });
  }

  /**
   * Copy object to new key
   */
  async copy(sourceKey: string, destinationKey: string): Promise<void> {
    const object = await this.assetsBucket.get(sourceKey);
    if (!object) {
      throw new Error(`Source object not found: ${sourceKey}`);
    }

    // Read body once into ArrayBuffer to avoid "Body already used" error
    const bodyData = await object.arrayBuffer();

    await this.assetsBucket.put(destinationKey, bodyData, {
      httpMetadata: object.httpMetadata,
      customMetadata: object.customMetadata,
    });
  }

  /**
   * Get object metadata
   */
  async getMetadata(key: string): Promise<R2Object | null> {
    return this.assetsBucket.head(key);
  }

  /**
   * Update object metadata
   */
  async updateMetadata(
    key: string,
    metadata: Record<string, string>
  ): Promise<void> {
    // R2 doesn't support updating metadata without re-uploading
    // We need to copy the object with new metadata
    const object = await this.assetsBucket.get(key);
    if (!object) {
      throw new Error(`Object not found: ${key}`);
    }

    // Read body once into ArrayBuffer to avoid "Body already used" error
    const bodyData = await object.arrayBuffer();

    await this.assetsBucket.put(key, bodyData, {
      httpMetadata: object.httpMetadata,
      customMetadata: {
        ...object.customMetadata,
        ...metadata,
      },
    });
  }

  /**
   * Batch delete objects
   */
  async deleteMany(keys: string[]): Promise<void> {
    await Promise.all(keys.map(key => this.delete(key)));
  }

  /**
   * Get storage statistics for user
   */
  async getUserStats(userId: string): Promise<{
    totalSize: number;
    imageCount: number;
    audioCount: number;
    videoCount: number;
  }> {
    const [images, audio, videos] = await Promise.all([
      this.list(`images/${userId}/`),
      this.list(`audio/${userId}/`),
      this.list(`videos/${userId}/`),
    ]);

    const calculateSize = (objects: R2Objects) => {
      return objects.objects.reduce((sum, obj) => sum + obj.size, 0);
    };

    return {
      totalSize: calculateSize(images) + calculateSize(audio) + calculateSize(videos),
      imageCount: images.objects.length,
      audioCount: audio.objects.length,
      videoCount: videos.objects.length,
    };
  }

  /**
   * Clean up old temporary files (older than 24 hours)
   */
  async cleanupTemp(): Promise<number> {
    const tempObjects = await this.list('temp/');
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    let deleted = 0;

    for (const object of tempObjects.objects) {
      const age = now - object.uploaded.getTime();
      if (age > oneDayMs) {
        await this.delete(object.key);
        deleted++;
      }
    }

    return deleted;
  }
}

/**
 * Create StorageService instance
 */
export function createStorageService(
  assetsBucket: R2Bucket,
  publicUrl: string
): StorageService {
  return new StorageService(assetsBucket, publicUrl);
}
