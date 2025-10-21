-- ============================================
-- ENABLE REAL-TIME UPDATES
-- ============================================
-- Run this in your Supabase SQL Editor to enable real-time updates
-- This will allow the dashboard to auto-update when guests are added or scanned

-- Enable real-time for guests table (for live updates during events)
ALTER PUBLICATION supabase_realtime ADD TABLE guests;

-- Enable real-time for events table (for live event detail updates)
ALTER PUBLICATION supabase_realtime ADD TABLE events;
