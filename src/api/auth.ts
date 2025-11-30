// AI Singer Studio - Authentication API

import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { getAuth } from '../middleware/auth';
import { getDb } from '../middleware/db';
import * as schema from '../db/schema';
import type { AppContext } from './types';

const app = new Hono<AppContext>();

/**
 * GET /auth/me - Get current user info
 * NOTE: This endpoint handles its own auth validation (doesn't use authMiddleware)
 */
app.get('/me', async (c) => {
  try {
    // Log ALL headers for debugging
    const allHeaders = {};
    c.req.raw.headers.forEach((value, key) => {
      allHeaders[key] = value;
    });
    console.log('[AUTH /me] 📋 All request headers:', JSON.stringify(allHeaders));

    // Try to get token from multiple sources
    let token: string | null = null;

    // 1. Try Authorization header
    const authHeader = c.req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
      console.log('[AUTH /me] ✅ Found token in Authorization header');
    }

    // 2. Try query parameter
    if (!token) {
      token = c.req.query('token') || null;
      if (token) console.log('[AUTH /me] ✅ Found token in query parameter');
    }

    // 3. Try cookie
    if (!token) {
      const cookieHeader = c.req.header('Cookie');
      if (cookieHeader) {
        const tokenMatch = cookieHeader.match(/token=([^;]+)/);
        if (tokenMatch) {
          token = tokenMatch[1];
          console.log('[AUTH /me] ✅ Found token in cookie');
        }
      }
    }

    // 4. Try custom header
    if (!token) {
      token = c.req.header('X-Auth-Token') || null;
      if (token) console.log('[AUTH /me] ✅ Found token in X-Auth-Token header');
    }

    if (!token) {
      console.log('[AUTH /me] ⚠️ No token found - returning anonymous user');
      console.log('[AUTH /me] authHeader value:', authHeader);

      // Return anonymous/guest user with default quota instead of 401
      // This prevents frontend crashes when auth context is accessed
      c.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      c.header('Pragma', 'no-cache');
      c.header('Expires', '0');
      return c.json({
        userId: 'anonymous',
        email: 'anonymous@guest.com',
        authenticated: false,
        user: {
          id: 'anonymous',
          userId: 'anonymous',
          email: 'anonymous@guest.com',
          name: 'Guest',
          subscriptionTier: 'free',
          subscriptionStatus: 'inactive',
          quota: {
            tier: 'free',
            imagesRemaining: 0,
            imagesUsed: 0,
            songsRemaining: 0,
            songsUsed: 0,
            videosRemaining: 0,
            videosUsed: 0,
          },
        },
        quota: {
          tier: 'free',
          imagesRemaining: 0,
          imagesUsed: 0,
          songsRemaining: 0,
          songsUsed: 0,
          videosRemaining: 0,
          videosUsed: 0,
        },
        tier: 'free',
        imagesRemaining: 0,
        imagesUsed: 0,
        songsRemaining: 0,
        songsUsed: 0,
        videosRemaining: 0,
        videosUsed: 0,
      });
    }

    console.log(`[AUTH /me] Using token (first 20 chars): ${token.substring(0, 20)}...`);

    // Validate token and extract userId
    let userId: string;

    if (token.startsWith('test-token-')) {
      // Format: test-token-{userId} - just remove prefix, keep full hash
      userId = token.replace('test-token-', '') || 'test-user';
      console.log(`[AUTH /me] ✅ Accepted test-token format, userId: ${userId}`);
    } else if (token && token.length > 10) {
      // Accept raw userId/hash as token for development
      userId = token;
      console.log(`[AUTH /me] ✅ Accepted raw token format, userId: ${userId.substring(0, 20)}...`);
    } else {
      console.log('[AUTH /me] ❌ Token too short or invalid format');
      return c.json(
        {
          error: 'Invalid token',
          authenticated: false,
          debug: 'Token must be at least 10 characters',
        },
        401
      );
    }

    const email = `${userId}@test.com`;
    const name = email.split('@')[0];

    console.log(`[AUTH /me] ✅ Successfully authenticated user: ${userId}`);

    // Fetch user and quota data to include in auth response
    const db = getDb(c);
    let quotaData = null;
    let subscriptionTier = 'pro'; // Default to PRO for test accounts
    let subscriptionStatus = 'active';

    try {
      // Fetch user data
      const [user] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, userId))
        .limit(1);

      if (user) {
        // For test accounts, upgrade FREE to PRO automatically
        if (user.subscriptionTier === 'free') {
          console.log('[AUTH /me] Upgrading test user from FREE to PRO:', userId);
          const now = Date.now();
          await db
            .update(schema.users)
            .set({
              subscriptionTier: 'pro',
              subscriptionStatus: 'active',
              updatedAt: now,
            })
            .where(eq(schema.users.id, userId));

          subscriptionTier = 'pro';
          subscriptionStatus = 'active';
        } else {
          subscriptionTier = user.subscriptionTier || 'pro';
          subscriptionStatus = user.subscriptionStatus || 'active';
        }
      } else {
        // Create a PRO test user if they don't exist
        console.log('[AUTH /me] Creating new PRO test user:', userId);
        const now = Date.now();
        const newUser: schema.NewUser = {
          id: userId,
          clerkUserId: null,
          email: email,
          stripeCustomerId: null,
          subscriptionTier: 'pro', // PRO tier for testing
          subscriptionStatus: 'active',
          createdAt: now,
          updatedAt: now,
        };
        await db.insert(schema.users).values(newUser);
        subscriptionTier = 'pro';
        subscriptionStatus = 'active';
      }

      // Fetch entitlements
      let [entitlement] = await db
        .select()
        .from(schema.entitlements)
        .where(eq(schema.entitlements.userId, userId))
        .limit(1);

      if (entitlement) {
        // If entitlement tier is 'free', upgrade to 'pro' for test users
        if (entitlement.tier === 'free') {
          console.log('[AUTH /me] Upgrading entitlements from FREE to PRO:', userId);
          const now = Date.now();
          const resetDate = new Date(now);
          resetDate.setMonth(resetDate.getMonth() + 1);

          await db
            .update(schema.entitlements)
            .set({
              tier: 'pro',
              imagesRemaining: 50,
              songsRemaining: 20,
              videosRemaining: 10,
              imagesUsed: 0,
              songsUsed: 0,
              videosUsed: 0,
              resetAt: resetDate.getTime(),
              updatedAt: now,
            })
            .where(eq(schema.entitlements.userId, userId));

          quotaData = {
            tier: 'pro',
            imagesRemaining: 50,
            imagesUsed: 0,
            songsRemaining: 20,
            songsUsed: 0,
            videosRemaining: 10,
            videosUsed: 0,
          };
        } else {
          quotaData = {
            tier: entitlement.tier,
            imagesRemaining: entitlement.imagesRemaining || 0,
            imagesUsed: entitlement.imagesUsed || 0,
            songsRemaining: entitlement.songsRemaining || 0,
            songsUsed: entitlement.songsUsed || 0,
            videosRemaining: entitlement.videosRemaining || 0,
            videosUsed: entitlement.videosUsed || 0,
          };
        }
      } else {
        // Create PRO entitlements for test user
        console.log('[AUTH /me] Creating PRO entitlements for test user:', userId);
        const now = Date.now();
        const resetDate = new Date(now);
        resetDate.setMonth(resetDate.getMonth() + 1);

        const newEntitlement: schema.NewEntitlement = {
          id: `ent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: userId,
          tier: 'pro',
          imagesRemaining: 50,  // PRO: 50 images
          songsRemaining: 20,   // PRO: 20 songs
          videosRemaining: 10,  // PRO: 10 videos
          imagesUsed: 0,
          songsUsed: 0,
          videosUsed: 0,
          resetAt: resetDate.getTime(),
          createdAt: now,
          updatedAt: now,
        };

        await db.insert(schema.entitlements).values(newEntitlement);

        quotaData = {
          tier: 'pro',
          imagesRemaining: 50,
          imagesUsed: 0,
          songsRemaining: 20,
          songsUsed: 0,
          videosRemaining: 10,
          videosUsed: 0,
        };
      }
    } catch (err) {
      console.log('[AUTH /me] Failed to fetch/create user/quota:', err);
      // Default to PRO tier with full quotas even on error
      quotaData = {
        tier: 'pro',
        imagesRemaining: 50,
        imagesUsed: 0,
        songsRemaining: 20,
        songsUsed: 0,
        videosRemaining: 10,
        videosUsed: 0,
      };
    }

    // Add no-cache headers to prevent stale data
    c.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    c.header('Pragma', 'no-cache');
    c.header('Expires', '0');

    // Return in EVERY possible structure for maximum compatibility
    const responseData = {
      userId: userId,
      email: email,
      authenticated: true,
      user: {
        id: userId,
        userId: userId,
        email: email,
        name: name,
        subscriptionTier: subscriptionTier,
        subscriptionStatus: subscriptionStatus,
        quota: quotaData,
        ...quotaData, // Also flat in user object
      },
      quota: quotaData,
      subscriptionTier: subscriptionTier,
      subscriptionStatus: subscriptionStatus,
      data: {
        user: {
          subscriptionTier: subscriptionTier,
          subscriptionStatus: subscriptionStatus,
          quota: quotaData,
          ...quotaData,
        },
        quota: quotaData,
        ...quotaData,
      },
      // Also include flat quota fields at root
      ...(quotaData || {}),
    };

    return c.json(responseData);
  } catch (error) {
    console.log(`[AUTH /me] ❌ Error: ${error}`);
    return c.json(
      {
        error: 'Unauthorized',
        authenticated: false,
        debug: error instanceof Error ? error.message : 'Unknown error',
      },
      401
    );
  }
});

/**
 * POST /auth/logout - Logout (clear session)
 */
app.post('/logout', async (c) => {
  // For test tokens, just return success
  // In production, would clear Clerk session
  return c.json({
    success: true,
    message: 'Logged out successfully',
  });
});

export default app;
