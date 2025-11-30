-- Add version field to jobs table for optimistic locking
-- Prevents race conditions when multiple workers update same job

ALTER TABLE jobs ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
