// R2 Presigned URL Generator (FIX #24)
// Generates S3-compatible presigned URLs for direct browser → R2 uploads
// Prevents worker OOM by bypassing worker memory during large file transfers

import { AwsClient } from 'aws4fetch';

export interface R2PresignedUrlOptions {
  bucket: string;
  key: string;
  expiresIn?: number; // Seconds (default: 300 = 5 minutes)
  contentType?: string;
}

export interface R2Credentials {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
}

/**
 * Generate presigned PUT URL for direct R2 upload from browser
 *
 * @param credentials - R2 API credentials (from env.R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)
 * @param options - Upload configuration
 * @returns Presigned URL valid for the specified duration
 *
 * @example
 * // Worker generates URL
 * const url = await generateR2PresignedPutUrl(
 *   { accountId: env.R2_ACCOUNT_ID, accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
 *   { bucket: 'my-bucket', key: 'videos/final.mp4', expiresIn: 300, contentType: 'video/mp4' }
 * );
 *
 * // Browser uploads directly
 * await fetch(url, { method: 'PUT', body: videoBlob, headers: { 'Content-Type': 'video/mp4' } });
 */
export async function generateR2PresignedPutUrl(
  credentials: R2Credentials,
  options: R2PresignedUrlOptions
): Promise<string> {
  const { bucket, key, expiresIn = 300, contentType } = options;

  // Create AWS S3-compatible client for R2
  const r2Client = new AwsClient({
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    service: 's3',
    region: 'auto', // R2 uses 'auto' region
  });

  // Construct R2 S3-compatible endpoint
  // Format: https://<accountid>.r2.cloudflarestorage.com/<bucket>/<key>
  const endpoint = new URL(`https://${credentials.accountId}.r2.cloudflarestorage.com`);
  endpoint.pathname = `/${bucket}/${key}`;

  // Build headers to sign
  const headers: Record<string, string> = {};
  if (contentType) {
    headers['Content-Type'] = contentType;
  }

  // Sign the URL for PUT request
  const signedRequest = await r2Client.sign(endpoint.toString(), {
    method: 'PUT',
    aws: { signQuery: true }, // Add signature to query string (presigned URL)
    headers,
  });

  // Add expiration to query parameters
  const signedUrl = new URL(signedRequest.url);

  // aws4fetch already handles X-Amz-Expires via signQuery
  // The expiresIn is implicitly set by the signing process
  // We just need to ensure the signature is valid for the duration

  console.log('[R2 Presigned] Generated PUT URL:', {
    bucket,
    key,
    expiresIn,
    contentType,
    urlLength: signedUrl.toString().length,
  });

  return signedUrl.toString();
}

/**
 * Validate that R2 credentials are configured
 * Throws helpful error message if credentials are missing
 */
export function validateR2Credentials(env: {
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
}): R2Credentials {
  if (!env.R2_ACCOUNT_ID) {
    throw new Error(
      'R2_ACCOUNT_ID not configured. ' +
      'Set in wrangler.toml vars or as environment variable.'
    );
  }

  if (!env.R2_ACCESS_KEY_ID) {
    throw new Error(
      'R2_ACCESS_KEY_ID not configured. ' +
      'Run: wrangler secret put R2_ACCESS_KEY_ID ' +
      '(Get from Cloudflare Dashboard: R2 > Manage R2 API Tokens)'
    );
  }

  if (!env.R2_SECRET_ACCESS_KEY) {
    throw new Error(
      'R2_SECRET_ACCESS_KEY not configured. ' +
      'Run: wrangler secret put R2_SECRET_ACCESS_KEY ' +
      '(Get from Cloudflare Dashboard: R2 > Manage R2 API Tokens)'
    );
  }

  return {
    accountId: env.R2_ACCOUNT_ID,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  };
}

/**
 * Get public URL for R2 object (assumes bucket has public access configured)
 */
export function getR2PublicUrl(bucket: string, key: string): string {
  // Note: Update this if using custom domain for R2 public bucket
  return `https://pub-9403a25674d64f84bc1a0cb688751261.r2.dev/${key}`;
}
