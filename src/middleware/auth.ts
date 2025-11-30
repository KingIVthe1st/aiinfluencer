// AI Singer Studio - Authentication Middleware

import { Context } from 'hono';
import type { Env } from '../index';

export interface AuthContext {
  userId: string;
  email?: string;
}

/**
 * Auth middleware - validates bearer tokens
 * For development: uses simple test tokens
 * For production: should integrate with Clerk or similar
 */
export async function authMiddleware(c: Context<{ Bindings: Env }>, next: () => Promise<void>) {
  const authHeader = c.req.header('Authorization');
  const path = c.req.path;

  console.log(`[AUTH MIDDLEWARE] Path: ${path}, Auth Header: ${authHeader ? 'Present' : 'Missing'}`);

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log(`[AUTH MIDDLEWARE] ❌ Rejected - No valid Bearer token`);
    return c.json({ error: 'Unauthorized', details: 'No Authorization header or invalid format' }, 401);
  }

  const token = authHeader.substring(7);
  console.log(`[AUTH MIDDLEWARE] Token (first 20 chars): ${token.substring(0, 20)}...`);

  // Development/test tokens - support multiple formats
  if (token.startsWith('test-token-')) {
    // Format: test-token-{userId} - just remove prefix, keep full hash
    const userId = token.replace('test-token-', '') || 'test-user';
    console.log(`[AUTH MIDDLEWARE] ✅ Accepted test-token format, userId: ${userId}`);
    c.set('auth', { userId, email: `${userId}@test.com` });
    await next();
    return;
  }

  // Accept raw userId/hash as token for development
  if (token && token.length > 10) {
    // Treat the token itself as the userId
    const userId = token;
    console.log(`[AUTH MIDDLEWARE] ✅ Accepted raw token format, userId: ${userId.substring(0, 20)}...`);
    c.set('auth', { userId, email: `${userId}@test.com` });
    await next();
    return;
  }

  // TODO: Add production authentication with Clerk
  // For now, reject unknown tokens
  console.log(`[AUTH MIDDLEWARE] ❌ Rejected - Token too short or invalid format`);
  return c.json({ error: 'Invalid token', details: 'Token must be at least 10 characters' }, 401);
}

/**
 * Get auth context from request
 */
export function getAuth(c: Context): AuthContext {
  const auth = c.get('auth');
  if (!auth) {
    throw new Error('No auth context found');
  }
  return auth as AuthContext;
}
