-- Migration 003: Video Chunks for Music Video Generation
-- Adds support for multi-stage video generation with Wan 2.5 and Nano Banana Pro

-- Video chunks table for tracking multi-stage music video generation
CREATE TABLE IF NOT EXISTS video_chunks (
  id TEXT PRIMARY KEY NOT NULL,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  start_time_ms INTEGER NOT NULL,
  end_time_ms INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  audio_chunk_url TEXT,
  scene_image_url TEXT,
  video_segment_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  scene_operation_id TEXT,
  video_operation_id TEXT,
  error TEXT,
  metadata TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Indexes for video_chunks
CREATE INDEX IF NOT EXISTS idx_video_chunks_job_id ON video_chunks(job_id);
CREATE INDEX IF NOT EXISTS idx_video_chunks_status ON video_chunks(status);
CREATE INDEX IF NOT EXISTS idx_video_chunks_job_chunk ON video_chunks(job_id, chunk_index);

-- Add songId column to jobs table for music video association
ALTER TABLE jobs ADD COLUMN song_id TEXT REFERENCES songs(id) ON DELETE SET NULL;

-- Create index for song_id in jobs
CREATE INDEX IF NOT EXISTS idx_jobs_song_id ON jobs(song_id);
