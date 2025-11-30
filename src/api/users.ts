// AI Singer Studio - Users API

import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { getAuth } from '../middleware/auth';
import { getDb } from '../middleware/db';
import * as schema from '../db/schema';
import type { AppContext } from './types';

const app = new Hono<AppContext>();

/**
 * Helper function to get and format quota data
 */
async function getQuotaData(c: any) {
  const auth = getAuth(c);
  const db = getDb(c);

    // Get or create user
    let [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, auth.userId))
      .limit(1);

    // If user doesn't exist, create them with PRO tier for testing
    if (!user) {
      const now = Date.now();
      const newUser: schema.NewUser = {
        id: auth.userId,
        clerkUserId: null,
        email: auth.email || `${auth.userId}@test.com`,
        stripeCustomerId: null,
        subscriptionTier: 'pro', // PRO tier for test users
        subscriptionStatus: 'active',
        createdAt: now,
        updatedAt: now,
      };
      await db.insert(schema.users).values(newUser);
      user = newUser as schema.User;
    }

    const tier = user?.subscriptionTier || 'pro'; // Default to PRO for testing

    // Get or create entitlements
    let [entitlement] = await db
      .select()
      .from(schema.entitlements)
      .where(eq(schema.entitlements.userId, auth.userId))
      .limit(1);

    // If no entitlement exists, create one with PRO tier for testing
    if (!entitlement) {
      const now = Date.now();
      const resetDate = new Date(now);
      resetDate.setMonth(resetDate.getMonth() + 1); // Reset in 30 days

      const newEntitlement: schema.NewEntitlement = {
        id: `ent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: auth.userId,
        tier: tier,
        imagesRemaining: tier === 'free' ? 5 : tier === 'pro' ? 50 : 999999, // PRO gets 50
        songsRemaining: tier === 'free' ? 2 : tier === 'pro' ? 20 : 999999,  // PRO gets 20
        videosRemaining: tier === 'free' ? 1 : tier === 'pro' ? 10 : 999999, // PRO gets 10
        imagesUsed: 0,
        songsUsed: 0,
        videosUsed: 0,
        resetAt: resetDate.getTime(),
        createdAt: now,
        updatedAt: now,
      };

      await db.insert(schema.entitlements).values(newEntitlement);
      entitlement = newEntitlement as schema.Entitlement;
    }

    // Check if quota needs to be reset
    const now = Date.now();
    if (entitlement.resetAt < now) {
      // Reset quota with PRO tier amounts
      const resetDate = new Date(now);
      resetDate.setMonth(resetDate.getMonth() + 1);

      await db
        .update(schema.entitlements)
        .set({
          imagesRemaining: tier === 'free' ? 5 : tier === 'pro' ? 50 : 999999, // PRO: 50
          songsRemaining: tier === 'free' ? 2 : tier === 'pro' ? 20 : 999999,  // PRO: 20
          videosRemaining: tier === 'free' ? 1 : tier === 'pro' ? 10 : 999999, // PRO: 10
          imagesUsed: 0,
          songsUsed: 0,
          videosUsed: 0,
          resetAt: resetDate.getTime(),
          updatedAt: now,
        })
        .where(eq(schema.entitlements.userId, auth.userId));

      // Fetch updated entitlement
      [entitlement] = await db
        .select()
        .from(schema.entitlements)
        .where(eq(schema.entitlements.userId, auth.userId))
        .limit(1);
    }

    // Convert resetAt to number if it's a Date object
    const resetAtTimestamp = typeof entitlement.resetAt === 'number'
      ? entitlement.resetAt
      : (entitlement.resetAt as any).getTime?.() || entitlement.resetAt;

    // Return data in multiple formats for frontend compatibility
    const quotaData = {
      tier: entitlement.tier,
      imagesRemaining: entitlement.imagesRemaining || 0,
      imagesUsed: entitlement.imagesUsed || 0,
      songsRemaining: entitlement.songsRemaining || 0,
      songsUsed: entitlement.songsUsed || 0,
      videosRemaining: entitlement.videosRemaining || 0,
      videosUsed: entitlement.videosUsed || 0,
      resetAt: resetAtTimestamp,
    };

    // Add no-cache headers
    c.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    c.header('Pragma', 'no-cache');
    c.header('Expires', '0');

    // Return quota data in the structure the frontend expects
    return c.json({
      // PRIMARY FORMAT - What the frontend actually uses
      entitlements: quotaData,

      // Also provide data at root for backward compatibility
      ...quotaData,

      // Nested in data
      data: {
        ...quotaData,
        quota: quotaData,
        entitlements: quotaData,
      },
      // Nested in quota
      quota: {
        ...quotaData,
        data: quotaData,
        entitlements: quotaData,
      },
      // Nested in user
      user: {
        ...quotaData,
        quota: quotaData,
        data: quotaData,
        entitlements: quotaData,
      },
      // Singular form for compatibility
      entitlement: quotaData,
    });
}

/**
 * GET /users/me/quota - Get current user's quota
 */
app.get('/me/quota', async (c) => {
  try {
    console.log('[USERS API] /me/quota endpoint called');
    return await getQuotaData(c);
  } catch (error) {
    console.error('[USERS API] Error in /me/quota:', error);
    return c.json(
      {
        error: 'Failed to fetch quota',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /users/usage - Alias for /users/me/quota for frontend compatibility
 */
app.get('/usage', async (c) => {
  try {
    console.log('[USERS API] /usage endpoint called (alias for /me/quota)');
    return await getQuotaData(c);
  } catch (error) {
    console.error('[USERS API] Error in /usage:', error);
    return c.json(
      {
        error: 'Failed to fetch usage data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

export default app;
