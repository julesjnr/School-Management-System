-- Migration: 0010_add_course_thumbnail.sql
-- Safely ensure courses.thumbnail exists to store image path/URL
ALTER TABLE IF EXISTS courses
  ADD COLUMN IF NOT EXISTS thumbnail TEXT;

-- No-op if column already exists. This migration is idempotent and safe to run multiple times.
