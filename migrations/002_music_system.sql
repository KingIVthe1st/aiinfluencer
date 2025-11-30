-- Migration: Music System Tables and Singer Enhancements
-- Date: 2025-01-21
-- Description: Adds comprehensive music generation system with songs, lyrics, albums, stems, and enhanced singer profiles

-- ============================================================================
-- PART 1: Enhance Singers Table
-- ============================================================================

ALTER TABLE singers ADD COLUMN profile_image_prompt TEXT;
ALTER TABLE singers ADD COLUMN appearance TEXT;
ALTER TABLE singers ADD COLUMN personality_traits TEXT;
ALTER TABLE singers ADD COLUMN default_bpm INTEGER DEFAULT 120;
ALTER TABLE singers ADD COLUMN default_key TEXT DEFAULT 'C major';
ALTER TABLE singers ADD COLUMN preferred_genres TEXT;
ALTER TABLE singers ADD COLUMN vocal_range TEXT;
ALTER TABLE singers ADD COLUMN default_vocal_settings TEXT;
ALTER TABLE singers ADD COLUMN style_description TEXT;
ALTER TABLE singers ADD COLUMN total_songs INTEGER DEFAULT 0;
ALTER TABLE singers ADD COLUMN total_albums INTEGER DEFAULT 0;
ALTER TABLE singers ADD COLUMN total_plays INTEGER DEFAULT 0;
ALTER TABLE singers ADD COLUMN total_likes INTEGER DEFAULT 0;
ALTER TABLE singers ADD COLUMN career_started_at INTEGER;
ALTER TABLE singers ADD COLUMN current_era TEXT;
ALTER TABLE singers ADD COLUMN era_started_at INTEGER;

-- ============================================================================
-- PART 2: Music System Tables
-- ============================================================================

-- Songs table (main song entity)
CREATE TABLE IF NOT EXISTS songs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  singer_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  -- Musical metadata
  bpm INTEGER,
  key TEXT,
  genre TEXT,
  mood TEXT,
  -- Structure
  duration INTEGER,
  structure TEXT,
  -- Assets
  cover_image_asset_id TEXT,
  active_version_id TEXT,
  -- Organization
  album_id TEXT,
  visibility TEXT DEFAULT 'private',
  -- Stats
  play_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  published_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (singer_id) REFERENCES singers(id) ON DELETE CASCADE,
  FOREIGN KEY (cover_image_asset_id) REFERENCES assets(id) ON DELETE SET NULL,
  FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE SET NULL
);

CREATE INDEX idx_songs_user_id ON songs(user_id);
CREATE INDEX idx_songs_singer_id ON songs(singer_id);
CREATE INDEX idx_songs_status ON songs(status);
CREATE INDEX idx_songs_album_id ON songs(album_id);
CREATE INDEX idx_songs_created_at ON songs(created_at);

-- Song versions table (iteration history)
CREATE TABLE IF NOT EXISTS song_versions (
  id TEXT PRIMARY KEY,
  song_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  -- Generation params
  prompt TEXT,
  lyric_version_id TEXT,
  -- Musical settings
  structure TEXT,
  arrangement TEXT,
  vocal_settings TEXT,
  mix_settings TEXT,
  -- ElevenLabs specifics
  voice_settings TEXT,
  style_preset TEXT,
  -- Results
  job_id TEXT,
  master_asset_id TEXT,
  -- Quality metrics
  loudness TEXT,
  peak_level TEXT,
  duration INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
  FOREIGN KEY (lyric_version_id) REFERENCES lyric_versions(id) ON DELETE SET NULL,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL,
  FOREIGN KEY (master_asset_id) REFERENCES assets(id) ON DELETE SET NULL
);

CREATE INDEX idx_song_versions_song_id ON song_versions(song_id);
CREATE INDEX idx_song_versions_status ON song_versions(status);
CREATE INDEX idx_song_versions_created_at ON song_versions(created_at);

-- Stems table (separate audio tracks)
CREATE TABLE IF NOT EXISTS stems (
  id TEXT PRIMARY KEY,
  song_version_id TEXT NOT NULL,
  type TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  -- Technical specs
  format TEXT,
  sample_rate INTEGER,
  bit_depth INTEGER,
  channels INTEGER,
  loudness TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (song_version_id) REFERENCES song_versions(id) ON DELETE CASCADE,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
);

CREATE INDEX idx_stems_song_version_id ON stems(song_version_id);
CREATE INDEX idx_stems_type ON stems(type);

-- Lyrics table (main lyrics entity)
CREATE TABLE IF NOT EXISTS lyrics (
  id TEXT PRIMARY KEY,
  song_id TEXT NOT NULL,
  active_version_id TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
);

CREATE INDEX idx_lyrics_song_id ON lyrics(song_id);

-- Lyric versions table (editable history)
CREATE TABLE IF NOT EXISTS lyric_versions (
  id TEXT PRIMARY KEY,
  lyrics_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  -- Content
  text TEXT NOT NULL,
  sections TEXT,
  language TEXT DEFAULT 'en',
  -- Metadata
  written_by TEXT,
  token_count INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (lyrics_id) REFERENCES lyrics(id) ON DELETE CASCADE
);

CREATE INDEX idx_lyric_versions_lyrics_id ON lyric_versions(lyrics_id);
CREATE INDEX idx_lyric_versions_created_at ON lyric_versions(created_at);

-- Sections table (song structure)
CREATE TABLE IF NOT EXISTS sections (
  id TEXT PRIMARY KEY,
  song_version_id TEXT NOT NULL,
  type TEXT NOT NULL,
  name TEXT,
  "order" INTEGER NOT NULL,
  start_ms INTEGER,
  end_ms INTEGER,
  duration INTEGER,
  lyric_section_id TEXT,
  notes TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (song_version_id) REFERENCES song_versions(id) ON DELETE CASCADE
);

CREATE INDEX idx_sections_song_version_id ON sections(song_version_id);
CREATE INDEX idx_sections_order ON sections("order");

-- Albums table (collections of songs)
CREATE TABLE IF NOT EXISTS albums (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  singer_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'album',
  cover_image_asset_id TEXT,
  status TEXT DEFAULT 'draft',
  release_date INTEGER,
  -- Metadata
  genre TEXT,
  mood TEXT,
  upc TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  published_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (singer_id) REFERENCES singers(id) ON DELETE SET NULL,
  FOREIGN KEY (cover_image_asset_id) REFERENCES assets(id) ON DELETE SET NULL
);

CREATE INDEX idx_albums_user_id ON albums(user_id);
CREATE INDEX idx_albums_singer_id ON albums(singer_id);
CREATE INDEX idx_albums_status ON albums(status);

-- Album tracks table (song order in album)
CREATE TABLE IF NOT EXISTS album_tracks (
  id TEXT PRIMARY KEY,
  album_id TEXT NOT NULL,
  song_id TEXT NOT NULL,
  track_number INTEGER NOT NULL,
  disk_number INTEGER DEFAULT 1,
  FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE,
  FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
);

CREATE INDEX idx_album_tracks_album_id ON album_tracks(album_id);
CREATE INDEX idx_album_tracks_song_id ON album_tracks(song_id);
CREATE INDEX idx_album_tracks_track_number ON album_tracks(track_number);

-- Playlists table (user-curated collections)
CREATE TABLE IF NOT EXISTS playlists (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_asset_id TEXT,
  visibility TEXT DEFAULT 'private',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (cover_image_asset_id) REFERENCES assets(id) ON DELETE SET NULL
);

CREATE INDEX idx_playlists_user_id ON playlists(user_id);

-- Playlist tracks table
CREATE TABLE IF NOT EXISTS playlist_tracks (
  id TEXT PRIMARY KEY,
  playlist_id TEXT NOT NULL,
  song_id TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  added_at INTEGER NOT NULL,
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
  FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
);

CREATE INDEX idx_playlist_tracks_playlist_id ON playlist_tracks(playlist_id);
CREATE INDEX idx_playlist_tracks_song_id ON playlist_tracks(song_id);

-- Collaborations table (duets, features)
CREATE TABLE IF NOT EXISTS collaborations (
  id TEXT PRIMARY KEY,
  song_id TEXT NOT NULL,
  primary_singer_id TEXT NOT NULL,
  feature_singer_id TEXT NOT NULL,
  owner_user_id TEXT NOT NULL,
  collaborator_user_id TEXT,
  status TEXT DEFAULT 'pending',
  type TEXT DEFAULT 'feature',
  created_at INTEGER NOT NULL,
  accepted_at INTEGER,
  FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
  FOREIGN KEY (primary_singer_id) REFERENCES singers(id) ON DELETE CASCADE,
  FOREIGN KEY (feature_singer_id) REFERENCES singers(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (collaborator_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_collaborations_song_id ON collaborations(song_id);
CREATE INDEX idx_collaborations_primary_singer_id ON collaborations(primary_singer_id);
CREATE INDEX idx_collaborations_feature_singer_id ON collaborations(feature_singer_id);

-- Singer eras table (evolution over time)
CREATE TABLE IF NOT EXISTS singer_eras (
  id TEXT PRIMARY KEY,
  singer_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  profile_image_asset_id TEXT,
  aesthetic_prompt TEXT,
  genre_focus TEXT,
  vocal_style TEXT,
  start_date INTEGER NOT NULL,
  end_date INTEGER,
  is_active INTEGER DEFAULT 0,
  FOREIGN KEY (singer_id) REFERENCES singers(id) ON DELETE CASCADE,
  FOREIGN KEY (profile_image_asset_id) REFERENCES assets(id) ON DELETE SET NULL
);

CREATE INDEX idx_singer_eras_singer_id ON singer_eras(singer_id);
CREATE INDEX idx_singer_eras_start_date ON singer_eras(start_date);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
