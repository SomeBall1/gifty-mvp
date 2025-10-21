-- Migration: Add email invitation tracking to guests table
-- Run this in your Supabase SQL Editor to add the new columns

-- Add columns for tracking when invitations were sent
ALTER TABLE guests
ADD COLUMN IF NOT EXISTS rsvp_invitation_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS qr_invitation_sent_at TIMESTAMPTZ;

-- Add comment explaining the columns
COMMENT ON COLUMN guests.rsvp_invitation_sent_at IS 'Timestamp when RSVP invitation email was sent to this guest';
COMMENT ON COLUMN guests.qr_invitation_sent_at IS 'Timestamp when QR code invitation email was sent to this guest';
