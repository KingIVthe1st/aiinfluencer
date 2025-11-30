// AI Singer Studio - Image URL Validation
// Security utility for validating image URLs before storing

const ALLOWED_DOMAINS = [
  // Google Cloud Storage (Gemini)
  'storage.googleapis.com',
  'googleusercontent.com',

  // Cloudflare R2 (all R2 public CDN domains)
  'r2.cloudflarestorage.com',
  'r2.dev', // Matches all *.r2.dev domains (public R2 CDN)

  // OpenAI (DALL-E, Sora)
  'oaidalleapiprodscus.blob.core.windows.net',
  'cdn.openai.com',

  // ElevenLabs
  'api.elevenlabs.io',
  'storage.elevenlabs.io',

  // Development/Testing
  'localhost',
  '127.0.0.1',
];

const MAX_URL_LENGTH = 2048;

export interface ImageUrlValidationResult {
  valid: boolean;
  error?: string;
  sanitizedUrl?: string;
}

/**
 * Validate an image URL for security and correctness
 */
export function validateImageUrl(url: string | null | undefined): ImageUrlValidationResult {
  // Allow null/undefined
  if (!url) {
    return { valid: true, sanitizedUrl: undefined };
  }

  // Check length
  if (url.length > MAX_URL_LENGTH) {
    return {
      valid: false,
      error: `URL exceeds maximum length of ${MAX_URL_LENGTH} characters`,
    };
  }

  // Parse URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch (err) {
    return {
      valid: false,
      error: 'Invalid URL format',
    };
  }

  // Only allow HTTPS (except localhost)
  if (parsedUrl.protocol !== 'https:' && !parsedUrl.hostname.includes('localhost')) {
    return {
      valid: false,
      error: 'Only HTTPS URLs are allowed',
    };
  }

  // Check domain allowlist
  const isAllowedDomain = ALLOWED_DOMAINS.some((domain) =>
    parsedUrl.hostname.endsWith(domain)
  );

  if (!isAllowedDomain) {
    return {
      valid: false,
      error: `Domain ${parsedUrl.hostname} is not allowed`,
    };
  }

  // Check for common injection patterns
  const dangerousPatterns = [
    /javascript:/i,
    /data:/i,
    /vbscript:/i,
    /<script/i,
    /on\w+=/i, // onclick=, onerror=, etc.
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(url)) {
      return {
        valid: false,
        error: 'URL contains potentially dangerous content',
      };
    }
  }

  // Return sanitized URL (remove fragments, normalize)
  const sanitizedUrl = `${parsedUrl.origin}${parsedUrl.pathname}${parsedUrl.search}`;

  return {
    valid: true,
    sanitizedUrl,
  };
}

/**
 * Validate multiple image URLs (for arrays)
 */
export function validateImageUrls(
  urls: (string | null | undefined)[]
): ImageUrlValidationResult {
  for (const url of urls) {
    const result = validateImageUrl(url);
    if (!result.valid) {
      return result;
    }
  }

  return {
    valid: true,
    sanitizedUrl: undefined,
  };
}

/**
 * Add a custom domain to the allowlist (for testing/development)
 */
export function addAllowedDomain(domain: string): void {
  if (!ALLOWED_DOMAINS.includes(domain)) {
    ALLOWED_DOMAINS.push(domain);
  }
}
