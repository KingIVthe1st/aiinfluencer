-- Add params field to jobs table
-- This stores generation parameters as JSON (prompt, aspectRatio, chunkDurationSeconds, mode, etc.)

ALTER TABLE jobs ADD COLUMN params TEXT;
