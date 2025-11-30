// AI Singer Studio - Voices API (ElevenLabs)

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getAuth } from '../middleware/auth';
import type { AppContext } from './types';

const app = new Hono<AppContext>();

// Validation schemas
const generateVoiceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  audioFiles: z.array(z.string()).optional(), // Array of audio file URLs
  labels: z.record(z.string()).optional(), // Voice labels/tags
});

/**
 * GET /voices/elevenlabs - Get available ElevenLabs voices
 */
app.get('/elevenlabs', async (c) => {
  try {
    const auth = getAuth(c);
    const category = c.req.query('category') || 'all';

    // Fetch voices from ElevenLabs API
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': c.env.ELEVENLABS_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const data = await response.json();

    // Filter by category if needed
    let voices = data.voices || [];
    if (category !== 'all') {
      voices = voices.filter((voice: any) =>
        voice.category === category ||
        (voice.labels && voice.labels[category])
      );
    }

    return c.json({
      voices: voices.map((voice: any) => ({
        voice_id: voice.voice_id,
        name: voice.name,
        category: voice.category,
        description: voice.description,
        labels: voice.labels,
        preview_url: voice.preview_url,
        settings: voice.settings,
      })),
    });
  } catch (error) {
    console.error('[VOICES API] Error fetching voices:', error);
    return c.json(
      {
        error: 'Failed to fetch voices',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /voices/elevenlabs/:voiceId - Get a specific voice
 */
app.get('/elevenlabs/:voiceId', async (c) => {
  try {
    const auth = getAuth(c);
    const voiceId = c.req.param('voiceId');

    // Fetch voice from ElevenLabs API
    const response = await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}`, {
      headers: {
        'xi-api-key': c.env.ELEVENLABS_API_KEY,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return c.json({ error: 'Voice not found' }, 404);
      }
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const voice = await response.json();

    return c.json({
      voice_id: voice.voice_id,
      name: voice.name,
      category: voice.category,
      description: voice.description,
      labels: voice.labels,
      preview_url: voice.preview_url,
      settings: voice.settings,
      samples: voice.samples,
    });
  } catch (error) {
    console.error('[VOICES API] Error fetching voice:', error);
    return c.json(
      {
        error: 'Failed to fetch voice',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * POST /voices/elevenlabs/generate - Generate a custom voice (Voice Design)
 */
app.post('/elevenlabs/generate', zValidator('json', generateVoiceSchema), async (c) => {
  try {
    const auth = getAuth(c);
    const input = c.req.valid('json');

    console.log('[VOICES API] Generating custom voice:', input.name);

    // Use ElevenLabs Voice Design API to generate preview voices from description
    // Note: text must be at least 100 characters
    const sampleText = 'Hello! This is a preview of your custom AI-generated voice. Thank you for using our voice generation service. We hope you enjoy the quality and characteristics of this unique voice that has been created based on your description.';

    const response = await fetch('https://api.elevenlabs.io/v1/text-to-voice/create-previews', {
      method: 'POST',
      headers: {
        'xi-api-key': c.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        voice_description: input.description || input.name,
        text: sampleText, // Must be at least 100 characters
        gender: 'neutral', // Can be made configurable
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[VOICES API] ElevenLabs API error:', response.status, errorText);

      // Return a more helpful error message
      return c.json(
        {
          error: 'Failed to generate voice',
          message: `ElevenLabs API returned ${response.status}. This feature requires a paid ElevenLabs plan.`,
          details: errorText,
        },
        response.status === 403 ? 403 : 500
      );
    }

    const result = await response.json();

    // ElevenLabs returns an array of preview voices
    // Return the first one or allow user to choose
    const firstPreview = result.previews && result.previews[0];

    if (!firstPreview) {
      return c.json(
        {
          error: 'No voice previews generated',
          message: 'ElevenLabs did not return any voice previews',
        },
        500
      );
    }

    return c.json({
      voice_id: firstPreview.generated_voice_id,
      name: input.name,
      description: input.description,
      preview_url: firstPreview.audio_base_64, // Base64 audio
      previews: result.previews, // Return all previews for user to choose
      status: 'generated',
    });
  } catch (error) {
    console.error('[VOICES API] Error generating voice:', error);
    return c.json(
      {
        error: 'Failed to generate voice',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * POST /voices/elevenlabs/clone - Clone a voice from audio samples
 */
app.post('/elevenlabs/clone', async (c) => {
  try {
    const auth = getAuth(c);
    const formData = await c.req.formData();

    const name = formData.get('name') as string;
    const description = formData.get('description') as string;

    console.log('[VOICES API] Cloning voice:', name);

    // Forward the form data to ElevenLabs
    const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: {
        'xi-api-key': c.env.ELEVENLABS_API_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[VOICES API] ElevenLabs API error:', errorText);
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const result = await response.json();

    return c.json({
      voice_id: result.voice_id,
      name: name,
      status: 'cloned',
    });
  } catch (error) {
    console.error('[VOICES API] Error cloning voice:', error);
    return c.json(
      {
        error: 'Failed to clone voice',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

export default app;
