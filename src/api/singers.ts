// AI Singer Studio - Singers API

import { Hono } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getAuth } from '../middleware/auth';
import { getDb } from '../middleware/db';
import * as schema from '../db/schema';
import type { AppContext } from './types';
import { validateImageUrl } from '../lib/image-validation';

const app = new Hono<AppContext>();

// Validation schemas
const createSingerSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  genre: z.string().optional(),
  voiceSettings: z.any().optional(),
  stylePreferences: z.any().optional(),
  referenceImageUrl: z.string().url().optional(),
  profileImageUrl: z.string().url().optional(), // Frontend-provided profile image
  profileImagePrompt: z.string().max(1000).optional(), // Description used for generation
});

const updateSingerSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  genre: z.string().optional(),
  voiceSettings: z.any().optional(),
  stylePreferences: z.any().optional(),
  referenceImageUrl: z.string().url().optional(),
  profileImageUrl: z.string().url().optional(), // Update profile image
  profileImagePrompt: z.string().max(1000).optional(), // Update prompt
});

/**
 * GET /singers - Get all singers for current user
 */
app.get('/', async (c) => {
  try {
    const auth = getAuth(c);

    const singersList = await getDb(c)
      .select()
      .from(schema.singers)
      .where(eq(schema.singers.userId, auth.userId))
      .orderBy(desc(schema.singers.createdAt));

    return c.json({ singers: singersList });
  } catch (error) {
    console.error('[SINGERS API] Error fetching singers:', error);
    return c.json(
      {
        error: 'Failed to fetch singers',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /singers/:id - Get a specific singer
 */
app.get('/:id', async (c) => {
  try {
    const auth = getAuth(c);
    const id = c.req.param('id');

    const [singer] = await getDb(c)
      .select()
      .from(schema.singers)
      .where(
        and(
          eq(schema.singers.id, id),
          eq(schema.singers.userId, auth.userId)
        )
      )
      .limit(1);

    if (!singer) {
      return c.json({ error: 'Singer not found' }, 404);
    }

    return c.json(singer);
  } catch (error) {
    console.error('[SINGERS API] Error fetching singer:', error);
    return c.json(
      {
        error: 'Failed to fetch singer',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * POST /singers - Create a new singer
 */
app.post('/', zValidator('json', createSingerSchema), async (c) => {
  try {
    const auth = getAuth(c);
    const input = c.req.valid('json');

    // Validate image URLs for security
    const refImageValidation = validateImageUrl(input.referenceImageUrl);
    if (!refImageValidation.valid) {
      return c.json(
        {
          error: 'Invalid reference image URL',
          message: refImageValidation.error,
        },
        400
      );
    }

    const profileImageValidation = validateImageUrl(input.profileImageUrl);
    if (!profileImageValidation.valid) {
      return c.json(
        {
          error: 'Invalid profile image URL',
          message: profileImageValidation.error,
        },
        400
      );
    }

    const now = Date.now();
    const singerId = `singer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Generate profile image prompt based on singer details (fallback if not provided)
    const profilePrompt = input.profileImagePrompt || generateProfileImagePrompt(input);

    const newSinger: schema.NewSinger = {
      id: singerId,
      userId: auth.userId,
      name: input.name,
      description: input.description || null,
      genre: input.genre || null,
      referenceImageIds: null,
      referenceImageUrl: input.referenceImageUrl || null,
      profileImageUrl: input.profileImageUrl || null, // Use frontend-provided image URL if available
      profileImagePrompt: profilePrompt,
      characterSheetId: null,
      voiceSettings: input.voiceSettings ? JSON.stringify(input.voiceSettings) : null,
      stylePreferences: input.stylePreferences ? JSON.stringify(input.stylePreferences) : null,
      createdAt: now,
      updatedAt: now,
    };

    await getDb(c).insert(schema.singers).values(newSinger);

    // Only trigger async profile image generation if frontend didn't provide one
    if (!input.profileImageUrl) {
      try {
        await createProfileImageJob(c, auth.userId, singerId, profilePrompt);
      } catch (err) {
        console.warn('[SINGERS API] Profile image job creation failed (non-critical):', err);
      }
    }

    return c.json(newSinger, 201);
  } catch (error) {
    console.error('[SINGERS API] Error creating singer:', error);
    return c.json(
      {
        error: 'Failed to create singer',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * Generate a profile image prompt based on singer details
 */
function generateProfileImagePrompt(singerInput: {
  name: string;
  description?: string;
  genre?: string;
}): string {
  const parts = [
    `Professional portrait of ${singerInput.name}, an AI singer`,
  ];

  if (singerInput.genre) {
    parts.push(`in the ${singerInput.genre} genre`);
  }

  if (singerInput.description) {
    parts.push(`- ${singerInput.description}`);
  }

  parts.push('Studio lighting, high quality, photorealistic, professional headshot');

  return parts.join(', ');
}

/**
 * Create a background job to generate the profile image
 */
async function createProfileImageJob(
  c: any,
  userId: string,
  singerId: string,
  prompt: string
): Promise<void> {
  const now = Date.now();
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  await getDb(c).insert(schema.jobs).values({
    id: jobId,
    userId,
    singerId,
    type: 'image',
    provider: 'gemini',
    status: 'pending',
    operationId: null,
    progress: 0,
    resultAssetId: null,
    error: null,
    createdAt: now,
    updatedAt: now,
  });

  // Store the prompt
  await getDb(c).insert(schema.prompts).values({
    id: `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    singerId,
    jobId,
    text: prompt,
    referenceAssetIds: null,
    createdAt: now,
  });

  console.log(`[SINGERS API] Created profile image job ${jobId} for singer ${singerId}`);
}

/**
 * PUT /singers/:id - Update a singer
 */
app.put('/:id', zValidator('json', updateSingerSchema), async (c) => {
  try {
    const auth = getAuth(c);
    const id = c.req.param('id');
    const input = c.req.valid('json');

    // Validate image URLs for security
    if (input.referenceImageUrl !== undefined) {
      const refImageValidation = validateImageUrl(input.referenceImageUrl);
      if (!refImageValidation.valid) {
        return c.json(
          {
            error: 'Invalid reference image URL',
            message: refImageValidation.error,
          },
          400
        );
      }
    }

    if (input.profileImageUrl !== undefined) {
      const profileImageValidation = validateImageUrl(input.profileImageUrl);
      if (!profileImageValidation.valid) {
        return c.json(
          {
            error: 'Invalid profile image URL',
            message: profileImageValidation.error,
          },
          400
        );
      }
    }

    // Check if singer exists and belongs to user
    const [singer] = await getDb(c)
      .select()
      .from(schema.singers)
      .where(
        and(
          eq(schema.singers.id, id),
          eq(schema.singers.userId, auth.userId)
        )
      )
      .limit(1);

    if (!singer) {
      return c.json({ error: 'Singer not found' }, 404);
    }

    // Update singer
    await getDb(c)
      .update(schema.singers)
      .set({
        name: input.name !== undefined ? input.name : singer.name,
        description: input.description !== undefined ? input.description : singer.description,
        genre: input.genre !== undefined ? input.genre : singer.genre,
        referenceImageUrl: input.referenceImageUrl !== undefined ? input.referenceImageUrl : singer.referenceImageUrl,
        profileImageUrl: input.profileImageUrl !== undefined ? input.profileImageUrl : singer.profileImageUrl,
        profileImagePrompt: input.profileImagePrompt !== undefined ? input.profileImagePrompt : singer.profileImagePrompt,
        voiceSettings: input.voiceSettings !== undefined ? JSON.stringify(input.voiceSettings) : singer.voiceSettings,
        stylePreferences: input.stylePreferences !== undefined ? JSON.stringify(input.stylePreferences) : singer.stylePreferences,
        updatedAt: Date.now(),
      })
      .where(eq(schema.singers.id, id));

    // Fetch updated singer
    const [updatedSinger] = await getDb(c)
      .select()
      .from(schema.singers)
      .where(eq(schema.singers.id, id))
      .limit(1);

    return c.json(updatedSinger);
  } catch (error) {
    console.error('[SINGERS API] Error updating singer:', error);
    return c.json(
      {
        error: 'Failed to update singer',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * DELETE /singers/:id - Delete a singer
 */
app.delete('/:id', async (c) => {
  try {
    const auth = getAuth(c);
    const id = c.req.param('id');

    // Check if singer exists and belongs to user
    const [singer] = await getDb(c)
      .select()
      .from(schema.singers)
      .where(
        and(
          eq(schema.singers.id, id),
          eq(schema.singers.userId, auth.userId)
        )
      )
      .limit(1);

    if (!singer) {
      return c.json({ error: 'Singer not found' }, 404);
    }

    // Delete singer
    await getDb(c)
      .delete(schema.singers)
      .where(eq(schema.singers.id, id));

    return c.json({ success: true, message: 'Singer deleted successfully' });
  } catch (error) {
    console.error('[SINGERS API] Error deleting singer:', error);
    return c.json(
      {
        error: 'Failed to delete singer',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

export default app;
