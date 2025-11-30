// Voice Style System for Consistent AI Singing Voices
// Uses prompt engineering to create consistent vocal characteristics

export interface VoiceStyle {
  // Core vocal characteristics
  gender: 'male' | 'female' | 'non-binary' | 'androgynous';
  ageRange: 'child' | 'teen' | 'young-adult' | 'adult' | 'mature';

  // Vocal quality
  tone: 'warm' | 'bright' | 'dark' | 'raspy' | 'smooth' | 'powerful' | 'soft' | 'breathy';
  range: 'soprano' | 'mezzo-soprano' | 'alto' | 'tenor' | 'baritone' | 'bass';

  // Style and character
  accent: 'neutral' | 'american' | 'british' | 'southern' | 'urban' | 'international';
  vocalStyle: 'pop' | 'jazz' | 'rock' | 'rnb' | 'country' | 'soul' | 'indie' | 'classical';

  // Additional characteristics
  intensity?: 'subdued' | 'moderate' | 'dynamic' | 'energetic';
  vibrato?: 'minimal' | 'moderate' | 'rich';

  // Custom description
  customDescription?: string;
}

/**
 * Voice Style presets for quick singer creation
 */
export const VOICE_STYLE_PRESETS: Record<string, VoiceStyle> = {
  'pop-diva': {
    gender: 'female',
    ageRange: 'young-adult',
    tone: 'bright',
    range: 'soprano',
    accent: 'american',
    vocalStyle: 'pop',
    intensity: 'dynamic',
    vibrato: 'moderate',
  },
  'soul-singer': {
    gender: 'female',
    ageRange: 'adult',
    tone: 'warm',
    range: 'alto',
    accent: 'american',
    vocalStyle: 'soul',
    intensity: 'dynamic',
    vibrato: 'rich',
  },
  'rock-vocalist': {
    gender: 'male',
    ageRange: 'adult',
    tone: 'raspy',
    range: 'tenor',
    accent: 'american',
    vocalStyle: 'rock',
    intensity: 'energetic',
    vibrato: 'minimal',
  },
  'jazz-crooner': {
    gender: 'male',
    ageRange: 'mature',
    tone: 'smooth',
    range: 'baritone',
    accent: 'american',
    vocalStyle: 'jazz',
    intensity: 'moderate',
    vibrato: 'rich',
  },
  'indie-artist': {
    gender: 'non-binary',
    ageRange: 'young-adult',
    tone: 'soft',
    range: 'alto',
    accent: 'indie',
    vocalStyle: 'indie',
    intensity: 'subdued',
    vibrato: 'minimal',
  },
};

/**
 * Convert voice style attributes into a natural language description
 * This description is injected into the ElevenLabs Music API prompt
 */
export function buildVoiceDescription(style: VoiceStyle): string {
  const parts: string[] = [];

  // Gender and age
  const genderAge = [
    style.ageRange.replace('-', ' '),
    style.gender === 'non-binary' || style.gender === 'androgynous'
      ? 'androgynous voice'
      : `${style.gender} voice`
  ].join(' ');
  parts.push(genderAge);

  // Vocal range
  parts.push(`${style.range} range`);

  // Tone
  parts.push(`${style.tone} tone`);

  // Accent
  if (style.accent !== 'neutral') {
    parts.push(`${style.accent} accent`);
  }

  // Vocal style
  parts.push(`${style.vocalStyle} singing style`);

  // Intensity
  if (style.intensity) {
    parts.push(`${style.intensity} delivery`);
  }

  // Vibrato
  if (style.vibrato) {
    parts.push(`${style.vibrato} vibrato`);
  }

  // Custom description (if provided)
  if (style.customDescription) {
    parts.push(style.customDescription);
  }

  return parts.join(', ');
}

/**
 * Inject voice style into music generation prompt
 * Example: "A happy pop song about summer" → "A happy pop song about summer, sung by a young adult female voice, soprano range, bright tone, american accent, pop singing style, dynamic delivery, moderate vibrato"
 */
export function enhancePromptWithVoiceStyle(
  originalPrompt: string,
  voiceStyle: VoiceStyle | null
): string {
  if (!voiceStyle) {
    return originalPrompt;
  }

  const voiceDescription = buildVoiceDescription(voiceStyle);

  // Add voice description after the main prompt
  return `${originalPrompt}, sung by a ${voiceDescription}`;
}

/**
 * Validate voice style object
 */
export function isValidVoiceStyle(style: any): style is VoiceStyle {
  return (
    style &&
    typeof style === 'object' &&
    ['male', 'female', 'non-binary', 'androgynous'].includes(style.gender) &&
    ['child', 'teen', 'young-adult', 'adult', 'mature'].includes(style.ageRange) &&
    ['warm', 'bright', 'dark', 'raspy', 'smooth', 'powerful', 'soft', 'breathy'].includes(style.tone) &&
    ['soprano', 'mezzo-soprano', 'alto', 'tenor', 'baritone', 'bass'].includes(style.range) &&
    ['neutral', 'american', 'british', 'southern', 'urban', 'international'].includes(style.accent) &&
    ['pop', 'jazz', 'rock', 'rnb', 'country', 'soul', 'indie', 'classical'].includes(style.vocalStyle)
  );
}

/**
 * Get default voice style
 */
export function getDefaultVoiceStyle(): VoiceStyle {
  return {
    gender: 'female',
    ageRange: 'young-adult',
    tone: 'warm',
    range: 'alto',
    accent: 'neutral',
    vocalStyle: 'pop',
    intensity: 'moderate',
    vibrato: 'moderate',
  };
}

// Export dropdown options for UI
export const VOICE_STYLE_OPTIONS = {
  gender: [
    { value: 'female', label: 'Female' },
    { value: 'male', label: 'Male' },
    { value: 'non-binary', label: 'Non-Binary' },
    { value: 'androgynous', label: 'Androgynous' },
  ],
  ageRange: [
    { value: 'child', label: 'Child (8-12)' },
    { value: 'teen', label: 'Teen (13-17)' },
    { value: 'young-adult', label: 'Young Adult (18-30)' },
    { value: 'adult', label: 'Adult (30-50)' },
    { value: 'mature', label: 'Mature (50+)' },
  ],
  tone: [
    { value: 'warm', label: 'Warm' },
    { value: 'bright', label: 'Bright' },
    { value: 'dark', label: 'Dark' },
    { value: 'raspy', label: 'Raspy' },
    { value: 'smooth', label: 'Smooth' },
    { value: 'powerful', label: 'Powerful' },
    { value: 'soft', label: 'Soft' },
    { value: 'breathy', label: 'Breathy' },
  ],
  range: [
    { value: 'soprano', label: 'Soprano (High Female)' },
    { value: 'mezzo-soprano', label: 'Mezzo-Soprano (Mid Female)' },
    { value: 'alto', label: 'Alto (Low Female)' },
    { value: 'tenor', label: 'Tenor (High Male)' },
    { value: 'baritone', label: 'Baritone (Mid Male)' },
    { value: 'bass', label: 'Bass (Low Male)' },
  ],
  accent: [
    { value: 'neutral', label: 'Neutral' },
    { value: 'american', label: 'American' },
    { value: 'british', label: 'British' },
    { value: 'southern', label: 'Southern' },
    { value: 'urban', label: 'Urban' },
    { value: 'international', label: 'International' },
  ],
  vocalStyle: [
    { value: 'pop', label: 'Pop' },
    { value: 'jazz', label: 'Jazz' },
    { value: 'rock', label: 'Rock' },
    { value: 'rnb', label: 'R&B' },
    { value: 'country', label: 'Country' },
    { value: 'soul', label: 'Soul' },
    { value: 'indie', label: 'Indie' },
    { value: 'classical', label: 'Classical' },
  ],
  intensity: [
    { value: 'subdued', label: 'Subdued' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'dynamic', label: 'Dynamic' },
    { value: 'energetic', label: 'Energetic' },
  ],
  vibrato: [
    { value: 'minimal', label: 'Minimal' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'rich', label: 'Rich' },
  ],
};
