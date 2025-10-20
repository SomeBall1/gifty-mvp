-- Gifty Database Schema
-- Run this in your Supabase SQL Editor

-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create events table
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TIME,
  location TEXT,
  scanner_pin TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create guests table
CREATE TABLE guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'Standard',
  status TEXT NOT NULL DEFAULT 'Not Claimed',
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_guests_event_id ON guests(event_id);
CREATE INDEX idx_events_user_id ON events(user_id);
CREATE INDEX idx_guests_status ON guests(status);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;

-- Profiles policies: Users can only see and update their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Events policies: Users can only manage their own events
CREATE POLICY "Users can view own events" ON events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own events" ON events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own events" ON events
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own events" ON events
  FOR DELETE USING (auth.uid() = user_id);

-- Guests policies: Users can manage guests for their own events
CREATE POLICY "Users can view guests for own events" ON guests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = guests.event_id 
      AND events.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert guests for own events" ON guests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = guests.event_id 
      AND events.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update guests for own events" ON guests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = guests.event_id 
      AND events.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete guests for own events" ON guests
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = guests.event_id 
      AND events.user_id = auth.uid()
    )
  );

-- Allow public read access for scanner to verify guests (for MVP)
CREATE POLICY "Public can read guests for verification" ON guests
  FOR SELECT USING (true);

CREATE POLICY "Public can update guest status for verification" ON guests
  FOR UPDATE USING (true)
  WITH CHECK (true);

-- Function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
