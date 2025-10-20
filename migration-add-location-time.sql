-- Migration: Add location and start_time to events table
-- Run this in your Supabase SQL Editor

-- Add new columns to events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS location TEXT;

-- The columns are nullable, so existing events will have NULL values
-- This is safe to run and won't affect existing data
