// AI Singer Studio - API Validation Schemas

import { z } from 'zod';

/**
 * Singer Schemas
 */
export const createSingerSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  voiceSettings: z
    .object({
      provider: z.enum(['elevenlabs', 'custom']),
      voiceId: z.string().optional(),
      stability: z.number().min(0).max(1).optional(),
      similarity: z.number().min(0).max(1).optional(),
    })
    .optional(),
  stylePreferences: z
    .object({
      genres: z.array(z.string()).optional(),
      moods: z.array(z.string()).optional(),
      tempo: z.enum(['slow', 'medium', 'fast']).optional(),
    })
    .optional(),
});

export const updateSingerSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  voiceSettings: z
    .object({
      provider: z.enum(['elevenlabs', 'custom']).optional(),
      voiceId: z.string().optional(),
      stability: z.number().min(0).max(1).optional(),
      similarity: z.number().min(0).max(1).optional(),
    })
    .optional(),
  stylePreferences: z
    .object({
      genres: z.array(z.string()).optional(),
      moods: z.array(z.string()).optional(),
      tempo: z.enum(['slow', 'medium', 'fast']).optional(),
    })
    .optional(),
  isActive: z.boolean().optional(),
});

/**
 * Generation Schemas
 */
export const generateImageSchema = z.object({
  singerId: z.string().optional(), // Optional for preview mode before singer creation
  prompt: z.string().min(10).max(1000),
  stylePrompt: z.string().max(500).optional(),
  aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3']).default('1:1'),
  negativePrompt: z.string().max(500).optional(),
});

export const generateAudioSchema = z.object({
  singerId: z.string(),
  prompt: z.string().min(10).max(1000),
  durationSeconds: z.number().min(5).max(300).default(30),
  mode: z.enum(['song', 'speech', 'lyrics', 'instrumental']).default('song'),
  songName: z.string().max(100).optional(),
  lyrics: z.string().max(5000).optional(),
  genre: z.string().max(50).optional(),
  mood: z.string().max(50).optional(),
});

export const generateVideoSchema = z.object({
  singerId: z.string(),
  prompt: z.string().min(10).max(1000),
  mode: z.enum(['standard', 'music-video']).default('standard'), // music-video uses song audio
  provider: z.enum(['sora2', 'veo3', 'kie-wan25']).default('sora2'),
  aspectRatio: z.enum(['16:9', '9:16', '1:1', '4:3']).default('16:9'),
  durationSeconds: z.number().min(3).max(12).default(4),
  // FIX #41: Accept old values (5, 10) for backwards compatibility with frontend
  // Transform: 5->4, 10->8, others stay as-is if valid (4, 8, 12)
  chunkDurationSeconds: z.number().min(4).max(12).default(4).optional().transform(val => {
    if (val === undefined) return 4;
    if (val === 5) return 4;  // Old default -> new default
    if (val === 10) return 8; // Old max -> closest valid
    if (val <= 4) return 4;
    if (val <= 8) return 8;
    return 12;
  }),
  songId: z.string().optional(), // Required for music-video mode
  referenceImageUrls: z.array(z.string().url()).max(3).optional(),
  audioUrl: z.string().url().optional(), // For standard mode audio-to-video
});

/**
 * Query Schemas
 */
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const dateRangeSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const assetQuerySchema = z
  .object({
    singerId: z.string().optional(),
    type: z.enum(['image', 'audio', 'video']).optional(),
    provider: z.string().optional(),
  })
  .merge(paginationSchema)
  .merge(dateRangeSchema);

export const jobQuerySchema = z
  .object({
    singerId: z.string().optional(),
    type: z.enum(['image', 'audio', 'video']).optional(),
    status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
  })
  .merge(paginationSchema);

/**
 * Voice Schemas
 */
export const generateVoiceSchema = z.object({
  text: z.string().min(10).max(1000),
  voice_description: z.string().max(500).optional(),
});

export const voiceSearchSchema = z.object({
  query: z.string().max(100).optional(),
  category: z.enum(['premade', 'cloned', 'generated', 'all']).default('all'),
});

/**
 * Type Exports
 */
export type CreateSingerInput = z.infer<typeof createSingerSchema>;
export type UpdateSingerInput = z.infer<typeof updateSingerSchema>;
export type GenerateImageInput = z.infer<typeof generateImageSchema>;
export type GenerateAudioInput = z.infer<typeof generateAudioSchema>;
export type GenerateVideoInput = z.infer<typeof generateVideoSchema>;
export type GenerateVoiceInput = z.infer<typeof generateVoiceSchema>;
export type VoiceSearchInput = z.infer<typeof voiceSearchSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type AssetQueryInput = z.infer<typeof assetQuerySchema>;
export type JobQueryInput = z.infer<typeof jobQuerySchema>;
