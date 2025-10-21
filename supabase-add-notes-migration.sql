-- Migration: Add notes column to guests table
-- Run this in your Supabase SQL Editor if you already have a database set up

ALTER TABLE guests ADD COLUMN IF NOT EXISTS notes TEXT;
