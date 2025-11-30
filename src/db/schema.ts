// AI Singer Studio - Drizzle ORM Schema
import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

// Users table
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  clerkUserId: text('clerk_user_id').unique(),
  email: text('email').notNull().unique(),
  stripeCustomerId: text('stripe_customer_id').unique(),
  subscriptionTier: text('subscription_tier').default('free'),
  subscriptionStatus: text('subscription_status').default('inactive'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => ({
  emailIdx: index('idx_users_email').on(table.email),
  clerkIdx: index('idx_users_clerk_id').on(table.clerkUserId),
  stripeIdx: index('idx_users_stripe_id').on(table.stripeCustomerId),
}));

// Singers table (persistent AI personas)
export const singers = sqliteTable('singers', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  genre: text('genre'),
  referenceImageIds: text('reference_image_ids'), // JSON array
  referenceImageUrl: text('reference_image_url'), // Single reference image URL
  profileImageUrl: text('profile_image_url'), // Generated profile image URL
  profileImagePrompt: text('profile_image_prompt'), // Description used for generation
  appearance: text('appearance'), // Physical appearance description
  characterSheetId: text('character_sheet_id'),
  voiceSettings: text('voice_settings'), // JSON string for ElevenLabs voice settings
  stylePreferences: text('style_preferences'), // JSON string for voice style preferences
  personalityTraits: text('personality_traits'), // JSON: {confident: 9, mysterious: 7}
  // Music-specific fields
  defaultBpm: integer('default_bpm').default(120),
  defaultKey: text('default_key').default('C major'),
  preferredGenres: text('preferred_genres'), // JSON array: ["Hip Hop", "R&B"]
  vocalRange: text('vocal_range'), // "alto", "tenor", "soprano"
  defaultVocalSettings: text('default_vocal_settings'), // JSON for ElevenLabs
  styleDescription: text('style_description'), // "Urban, confident, smooth delivery"
  // Career stats
  totalSongs: integer('total_songs').default(0),
  totalAlbums: integer('total_albums').default(0),
  totalPlays: integer('total_plays').default(0),
  totalLikes: integer('total_likes').default(0),
  careerStartedAt: integer('career_started_at'),
  // Era system
  currentEra: text('current_era'),
  eraStartedAt: integer('era_started_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => ({
  userIdx: index('idx_singers_user_id').on(table.userId),
  createdIdx: index('idx_singers_created_at').on(table.createdAt),
}));

// Assets table (images, audio, video)
export const assets = sqliteTable('assets', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  singerId: text('singer_id').references(() => singers.id, { onDelete: 'set null' }),
  type: text('type').notNull(), // image, audio, video
  provider: text('provider').notNull(), // gemini, elevenlabs, veo3, sora2
  cdnUrl: text('cdn_url'), // Public URL from R2/CDN
  storageKey: text('storage_key').notNull(), // R2 storage key
  metadata: text('metadata'), // JSON
  provenance: text('provenance'), // JSON
  createdAt: integer('created_at').notNull(),
}, (table) => ({
  userIdx: index('idx_assets_user_id').on(table.userId),
  singerIdx: index('idx_assets_singer_id').on(table.singerId),
  typeIdx: index('idx_assets_type').on(table.type),
  createdIdx: index('idx_assets_created_at').on(table.createdAt),
}));

// Jobs table (generation tasks)
export const jobs = sqliteTable('jobs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  singerId: text('singer_id').references(() => singers.id, { onDelete: 'set null' }),
  songId: text('song_id').references(() => songs.id, { onDelete: 'set null' }), // For music video generation
  type: text('type').notNull(), // image, song, video
  provider: text('provider').notNull(),
  status: text('status').notNull(), // pending, processing, completed, failed, cancelled
  operationId: text('operation_id'),
  progress: integer('progress').default(0),
  resultAssetId: text('result_asset_id').references(() => assets.id, { onDelete: 'set null' }),
  params: text('params'), // JSON: prompt, aspectRatio, chunkDurationSeconds, mode, etc.
  version: integer('version').notNull().default(1), // Optimistic locking version
  error: text('error'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => ({
  userIdx: index('idx_jobs_user_id').on(table.userId),
  singerIdx: index('idx_jobs_singer_id').on(table.singerId),
  songIdx: index('idx_jobs_song_id').on(table.songId),
  statusIdx: index('idx_jobs_status').on(table.status),
  createdIdx: index('idx_jobs_created_at').on(table.createdAt),
  operationIdx: index('idx_jobs_operation_id').on(table.operationId),
}));

// Prompts table (prompt history)
export const prompts = sqliteTable('prompts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  singerId: text('singer_id').references(() => singers.id, { onDelete: 'set null' }),
  jobId: text('job_id').references(() => jobs.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  referenceAssetIds: text('reference_asset_ids'), // JSON array
  createdAt: integer('created_at').notNull(),
}, (table) => ({
  userIdx: index('idx_prompts_user_id').on(table.userId),
  singerIdx: index('idx_prompts_singer_id').on(table.singerId),
  jobIdx: index('idx_prompts_job_id').on(table.jobId),
  createdIdx: index('idx_prompts_created_at').on(table.createdAt),
}));

// Entitlements table (quotas and usage)
export const entitlements = sqliteTable('entitlements', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  tier: text('tier').notNull(),
  imagesRemaining: integer('images_remaining').notNull(),
  songsRemaining: integer('songs_remaining').notNull(),
  videosRemaining: integer('videos_remaining').notNull(),
  imagesUsed: integer('images_used').default(0),
  songsUsed: integer('songs_used').default(0),
  videosUsed: integer('videos_used').default(0),
  resetAt: integer('reset_at').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => ({
  userIdx: index('idx_entitlements_user_id').on(table.userId),
  resetIdx: index('idx_entitlements_reset_at').on(table.resetAt),
}));

// Provenance table (C2PA content credentials)
export const provenance = sqliteTable('provenance', {
  id: text('id').primaryKey(),
  assetId: text('asset_id').notNull().unique().references(() => assets.id, { onDelete: 'cascade' }),
  c2paManifest: text('c2pa_manifest').notNull(), // JSON
  createdAt: integer('created_at').notNull(),
}, (table) => ({
  assetIdx: index('idx_provenance_asset_id').on(table.assetId),
}));

// Usage events table (for billing and analytics)
export const usageEvents = sqliteTable('usage_events', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  eventType: text('event_type').notNull(),
  provider: text('provider').notNull(),
  costCredits: integer('cost_credits').notNull(),
  metadata: text('metadata'), // JSON
  createdAt: integer('created_at').notNull(),
}, (table) => ({
  userIdx: index('idx_usage_user_id').on(table.userId),
  eventIdx: index('idx_usage_event_type').on(table.eventType),
  createdIdx: index('idx_usage_created_at').on(table.createdAt),
}));

// ============================================================================
// MUSIC SYSTEM TABLES
// ============================================================================

// Songs table (main song entity)
export const songs = sqliteTable('songs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  singerId: text('singer_id').notNull().references(() => singers.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull().default('draft'), // draft | generating | completed | published | failed
  // Musical metadata
  bpm: integer('bpm'),
  key: text('key'), // "C major", "A minor"
  genre: text('genre'), // "Hip Hop", "Pop", "R&B"
  mood: text('mood'), // JSON array: ["melancholic", "uplifting"]
  // Structure
  duration: integer('duration'), // milliseconds
  structure: text('structure'), // JSON: section arrangement
  // Assets
  coverImageAssetId: text('cover_image_asset_id').references(() => assets.id, { onDelete: 'set null' }),
  activeVersionId: text('active_version_id'), // Current active version
  // Organization
  albumId: text('album_id').references(() => albums.id, { onDelete: 'set null' }),
  visibility: text('visibility').default('private'), // private | unlisted | public
  // Stats
  playCount: integer('play_count').default(0),
  likeCount: integer('like_count').default(0),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  publishedAt: integer('published_at'),
}, (table) => ({
  userIdx: index('idx_songs_user_id').on(table.userId),
  singerIdx: index('idx_songs_singer_id').on(table.singerId),
  statusIdx: index('idx_songs_status').on(table.status),
  albumIdx: index('idx_songs_album_id').on(table.albumId),
  createdIdx: index('idx_songs_created_at').on(table.createdAt),
}));

// Song versions table (iteration history)
export const songVersions = sqliteTable('song_versions', {
  id: text('id').primaryKey(),
  songId: text('song_id').notNull().references(() => songs.id, { onDelete: 'cascade' }),
  versionNumber: integer('version_number').notNull(),
  status: text('status').notNull().default('draft'), // draft | rendering | completed | failed
  // Generation params
  prompt: text('prompt'),
  lyricVersionId: text('lyric_version_id').references(() => lyricVersions.id, { onDelete: 'set null' }),
  // Musical settings
  structure: text('structure'), // JSON section arrangement
  arrangement: text('arrangement'), // JSON instrumentation details
  vocalSettings: text('vocal_settings'), // JSON emotion, delivery, effects
  mixSettings: text('mix_settings'), // JSON mix parameters
  // ElevenLabs specifics
  voiceSettings: text('voice_settings'), // JSON stability, clarity, emotion
  stylePreset: text('style_preset'),
  // Results
  jobId: text('job_id').references(() => jobs.id, { onDelete: 'set null' }),
  masterAssetId: text('master_asset_id').references(() => assets.id, { onDelete: 'set null' }),
  // Quality metrics
  loudness: text('loudness'), // LUFS as text (SQLite doesn't have real)
  peakLevel: text('peak_level'),
  duration: integer('duration'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => ({
  songIdx: index('idx_song_versions_song_id').on(table.songId),
  statusIdx: index('idx_song_versions_status').on(table.status),
  createdIdx: index('idx_song_versions_created_at').on(table.createdAt),
}));

// Stems table (separate audio tracks)
export const stems = sqliteTable('stems', {
  id: text('id').primaryKey(),
  songVersionId: text('song_version_id').notNull().references(() => songVersions.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // vocals | drums | bass | melody | synth | fx | master
  assetId: text('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),
  // Technical specs
  format: text('format'), // wav | mp3 | flac
  sampleRate: integer('sample_rate'), // 44100, 48000
  bitDepth: integer('bit_depth'), // 16, 24
  channels: integer('channels'), // 1 (mono), 2 (stereo)
  loudness: text('loudness'),
  createdAt: integer('created_at').notNull(),
}, (table) => ({
  versionIdx: index('idx_stems_song_version_id').on(table.songVersionId),
  typeIdx: index('idx_stems_type').on(table.type),
}));

// Lyrics table (main lyrics entity)
export const lyrics = sqliteTable('lyrics', {
  id: text('id').primaryKey(),
  songId: text('song_id').notNull().references(() => songs.id, { onDelete: 'cascade' }),
  activeVersionId: text('active_version_id'), // Current active version
  createdAt: integer('created_at').notNull(),
}, (table) => ({
  songIdx: index('idx_lyrics_song_id').on(table.songId),
}));

// Lyric versions table (editable history)
export const lyricVersions = sqliteTable('lyric_versions', {
  id: text('id').primaryKey(),
  lyricsId: text('lyrics_id').notNull().references(() => lyrics.id, { onDelete: 'cascade' }),
  versionNumber: integer('version_number').notNull(),
  // Content
  text: text('text').notNull(), // Full lyrics
  sections: text('sections'), // JSON: [{type: "verse", lines: ["line1", "line2"]}]
  language: text('language').default('en'),
  // Metadata
  writtenBy: text('written_by'), // userId or "AI"
  tokenCount: integer('token_count'),
  createdAt: integer('created_at').notNull(),
}, (table) => ({
  lyricsIdx: index('idx_lyric_versions_lyrics_id').on(table.lyricsId),
  createdIdx: index('idx_lyric_versions_created_at').on(table.createdAt),
}));

// Sections table (song structure)
export const sections = sqliteTable('sections', {
  id: text('id').primaryKey(),
  songVersionId: text('song_version_id').notNull().references(() => songVersions.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // intro | verse | pre_chorus | chorus | bridge | outro
  name: text('name'), // "Verse 1", "Chorus 2"
  order: integer('order').notNull(),
  startMs: integer('start_ms'),
  endMs: integer('end_ms'),
  duration: integer('duration'),
  lyricSectionId: text('lyric_section_id'),
  notes: text('notes'),
  createdAt: integer('created_at').notNull(),
}, (table) => ({
  versionIdx: index('idx_sections_song_version_id').on(table.songVersionId),
  orderIdx: index('idx_sections_order').on(table.order),
}));

// Albums table (collections of songs)
export const albums = sqliteTable('albums', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  singerId: text('singer_id').references(() => singers.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  description: text('description'),
  type: text('type').default('album'), // single | ep | album | mixtape
  coverImageAssetId: text('cover_image_asset_id').references(() => assets.id, { onDelete: 'set null' }),
  status: text('status').default('draft'), // draft | published
  releaseDate: integer('release_date'),
  // Metadata
  genre: text('genre'),
  mood: text('mood'), // JSON array
  upc: text('upc'), // Universal Product Code
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  publishedAt: integer('published_at'),
}, (table) => ({
  userIdx: index('idx_albums_user_id').on(table.userId),
  singerIdx: index('idx_albums_singer_id').on(table.singerId),
  statusIdx: index('idx_albums_status').on(table.status),
}));

// Album tracks table (song order in album)
export const albumTracks = sqliteTable('album_tracks', {
  id: text('id').primaryKey(),
  albumId: text('album_id').notNull().references(() => albums.id, { onDelete: 'cascade' }),
  songId: text('song_id').notNull().references(() => songs.id, { onDelete: 'cascade' }),
  trackNumber: integer('track_number').notNull(),
  diskNumber: integer('disk_number').default(1),
}, (table) => ({
  albumIdx: index('idx_album_tracks_album_id').on(table.albumId),
  songIdx: index('idx_album_tracks_song_id').on(table.songId),
  trackIdx: index('idx_album_tracks_track_number').on(table.trackNumber),
}));

// Playlists table (user-curated collections)
export const playlists = sqliteTable('playlists', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  coverImageAssetId: text('cover_image_asset_id').references(() => assets.id, { onDelete: 'set null' }),
  visibility: text('visibility').default('private'), // private | unlisted | public
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => ({
  userIdx: index('idx_playlists_user_id').on(table.userId),
}));

// Playlist tracks table
export const playlistTracks = sqliteTable('playlist_tracks', {
  id: text('id').primaryKey(),
  playlistId: text('playlist_id').notNull().references(() => playlists.id, { onDelete: 'cascade' }),
  songId: text('song_id').notNull().references(() => songs.id, { onDelete: 'cascade' }),
  order: integer('order').notNull(),
  addedAt: integer('added_at').notNull(),
}, (table) => ({
  playlistIdx: index('idx_playlist_tracks_playlist_id').on(table.playlistId),
  songIdx: index('idx_playlist_tracks_song_id').on(table.songId),
}));

// Collaborations table (duets, features)
export const collaborations = sqliteTable('collaborations', {
  id: text('id').primaryKey(),
  songId: text('song_id').notNull().references(() => songs.id, { onDelete: 'cascade' }),
  primarySingerId: text('primary_singer_id').notNull().references(() => singers.id, { onDelete: 'cascade' }),
  featureSingerId: text('feature_singer_id').notNull().references(() => singers.id, { onDelete: 'cascade' }),
  ownerUserId: text('owner_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  collaboratorUserId: text('collaborator_user_id').references(() => users.id, { onDelete: 'cascade' }),
  status: text('status').default('pending'), // pending | accepted | declined
  type: text('type').default('feature'), // duet | feature | remix
  createdAt: integer('created_at').notNull(),
  acceptedAt: integer('accepted_at'),
}, (table) => ({
  songIdx: index('idx_collaborations_song_id').on(table.songId),
  primaryIdx: index('idx_collaborations_primary_singer_id').on(table.primarySingerId),
  featureIdx: index('idx_collaborations_feature_singer_id').on(table.featureSingerId),
}));

// Singer eras table (evolution over time)
export const singerEras = sqliteTable('singer_eras', {
  id: text('id').primaryKey(),
  singerId: text('singer_id').notNull().references(() => singers.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  profileImageAssetId: text('profile_image_asset_id').references(() => assets.id, { onDelete: 'set null' }),
  aestheticPrompt: text('aesthetic_prompt'),
  genreFocus: text('genre_focus'),
  vocalStyle: text('vocal_style'),
  startDate: integer('start_date').notNull(),
  endDate: integer('end_date'),
  isActive: integer('is_active').default(0), // SQLite boolean
}, (table) => ({
  singerIdx: index('idx_singer_eras_singer_id').on(table.singerId),
  startIdx: index('idx_singer_eras_start_date').on(table.startDate),
}));

// Video chunks table (for music video generation with Wan 2.5)
export const videoChunks = sqliteTable('video_chunks', {
  id: text('id').primaryKey(),
  jobId: text('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  chunkIndex: integer('chunk_index').notNull(), // 0-based index
  startTimeMs: integer('start_time_ms').notNull(), // Start time in song (milliseconds)
  endTimeMs: integer('end_time_ms').notNull(), // End time in song (milliseconds)
  durationMs: integer('duration_ms').notNull(), // Chunk duration (milliseconds)
  audioChunkUrl: text('audio_chunk_url'), // R2 URL to audio chunk
  sceneImageUrl: text('scene_image_url'), // R2 URL to generated starting frame (Nano Banana Pro)
  videoSegmentUrl: text('video_segment_url'), // R2 URL to generated video segment (Wan 2.5)
  status: text('status').notNull().default('pending'), // pending, audio_ready, scene_generating, scene_ready, video_generating, video_ready, failed
  sceneOperationId: text('scene_operation_id'), // Kie.ai operation ID for scene generation
  videoOperationId: text('video_operation_id'), // Kie.ai operation ID for video generation
  error: text('error'), // Error message if failed
  metadata: text('metadata'), // JSON metadata (aspect_ratio, resolution, etc.)
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => ({
  jobIdx: index('idx_video_chunks_job_id').on(table.jobId),
  statusIdx: index('idx_video_chunks_status').on(table.status),
  chunkIdx: index('idx_video_chunks_job_chunk').on(table.jobId, table.chunkIndex),
}));

// Type exports for TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Singer = typeof singers.$inferSelect;
export type NewSinger = typeof singers.$inferInsert;

export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;

export type Prompt = typeof prompts.$inferSelect;
export type NewPrompt = typeof prompts.$inferInsert;

export type Entitlement = typeof entitlements.$inferSelect;
export type NewEntitlement = typeof entitlements.$inferInsert;

export type Provenance = typeof provenance.$inferSelect;
export type NewProvenance = typeof provenance.$inferInsert;

export type UsageEvent = typeof usageEvents.$inferSelect;
export type NewUsageEvent = typeof usageEvents.$inferInsert;

export type Song = typeof songs.$inferSelect;
export type NewSong = typeof songs.$inferInsert;

export type SongVersion = typeof songVersions.$inferSelect;
export type NewSongVersion = typeof songVersions.$inferInsert;

export type Stem = typeof stems.$inferSelect;
export type NewStem = typeof stems.$inferInsert;

export type Lyrics = typeof lyrics.$inferSelect;
export type NewLyrics = typeof lyrics.$inferInsert;

export type LyricVersion = typeof lyricVersions.$inferSelect;
export type NewLyricVersion = typeof lyricVersions.$inferInsert;

export type Section = typeof sections.$inferSelect;
export type NewSection = typeof sections.$inferInsert;

export type Album = typeof albums.$inferSelect;
export type NewAlbum = typeof albums.$inferInsert;

export type AlbumTrack = typeof albumTracks.$inferSelect;
export type NewAlbumTrack = typeof albumTracks.$inferInsert;

export type Playlist = typeof playlists.$inferSelect;
export type NewPlaylist = typeof playlists.$inferInsert;

export type PlaylistTrack = typeof playlistTracks.$inferSelect;
export type NewPlaylistTrack = typeof playlistTracks.$inferInsert;

export type Collaboration = typeof collaborations.$inferSelect;
export type NewCollaboration = typeof collaborations.$inferInsert;

export type SingerEra = typeof singerEras.$inferSelect;
export type NewSingerEra = typeof singerEras.$inferInsert;

export type VideoChunk = typeof videoChunks.$inferSelect;
export type NewVideoChunk = typeof videoChunks.$inferInsert;
