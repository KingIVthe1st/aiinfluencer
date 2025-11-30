-- Initial Migration: Core Tables
-- Date: 2025-01-21
-- Description: Creates core tables for AI Singer Studio

-- ============================================================================
-- Users table
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  clerk_user_id TEXT UNIQUE,
  email TEXT,
  username TEXT,
  full_name TEXT,
  profile_image_url TEXT,
  subscription_tier TEXT DEFAULT 'free',
  subscription_status TEXT DEFAULT 'active',
  subscription_start_date INTEGER,
  subscription_end_date INTEGER,
  credits_remaining INTEGER DEFAULT 0,
  total_credits_purchased INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_login_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================================
-- Singers table
-- ============================================================================
CREATE TABLE IF NOT EXISTS singers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  genre TEXT,
  reference_image_ids TEXT,
  reference_image_url TEXT,
  profile_image_url TEXT,
  character_sheet_id TEXT,
  voice_settings TEXT,
  style_preferences TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_singers_user_id ON singers(user_id);

-- ============================================================================
-- Jobs table (for async operations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  singer_id TEXT,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  operation_id TEXT,
  progress INTEGER DEFAULT 0,
  result_asset_id TEXT,
  error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  completed_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (singer_id) REFERENCES singers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_singer_id ON jobs(singer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_operation_id ON jobs(operation_id);

-- ============================================================================
-- Prompts table
-- ============================================================================
CREATE TABLE IF NOT EXISTS prompts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  singer_id TEXT,
  job_id TEXT,
  text TEXT NOT NULL,
  reference_asset_ids TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (singer_id) REFERENCES singers(id) ON DELETE SET NULL,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_prompts_user_id ON prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_prompts_singer_id ON prompts(singer_id);
CREATE INDEX IF NOT EXISTS idx_prompts_job_id ON prompts(job_id);

-- ============================================================================
-- Assets table (for all generated content)
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  singer_id TEXT,
  type TEXT NOT NULL,
  format TEXT,
  provider TEXT NOT NULL,
  file_size INTEGER,
  duration INTEGER,
  width INTEGER,
  height INTEGER,
  metadata TEXT,
  tags TEXT,
  is_public INTEGER DEFAULT 0,
  job_id TEXT,
  prompt_id TEXT,
  storage_key TEXT NOT NULL,
  cdn_url TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (singer_id) REFERENCES singers(id) ON DELETE SET NULL,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL,
  FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_assets_user_id ON assets(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_singer_id ON assets(singer_id);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(type);
CREATE INDEX IF NOT EXISTS idx_assets_job_id ON assets(job_id);
