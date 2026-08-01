-- YouTube Tracker Database Schema
-- Run this in your Supabase SQL Editor

-- Settings table (stores channel name)
CREATE TABLE IF NOT EXISTS youtube_tracker_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  channel_name TEXT DEFAULT 'My Channel',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings
INSERT INTO youtube_tracker_settings (id, channel_name) 
VALUES (1, 'My Channel') 
ON CONFLICT (id) DO NOTHING;

-- Daily stats table
CREATE TABLE IF NOT EXISTS youtube_daily_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  views INTEGER DEFAULT 0,
  new_subscribers INTEGER DEFAULT 0,
  total_subscribers INTEGER DEFAULT 0,
  shorts_views BIGINT DEFAULT 0,
  watch_hours DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Top videos table
CREATE TABLE IF NOT EXISTS youtube_top_videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id TEXT,
  title TEXT NOT NULL,
  views INTEGER DEFAULT 0,
  thumbnail TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_youtube_daily_stats_date ON youtube_daily_stats(date DESC);
CREATE INDEX IF NOT EXISTS idx_youtube_top_videos_views ON youtube_top_videos(views DESC);

-- Enable Row Level Security
ALTER TABLE youtube_tracker_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_top_videos ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for anon key - adjust as needed for production)
CREATE POLICY "Allow all for anon" ON youtube_tracker_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON youtube_daily_stats FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON youtube_top_videos FOR ALL USING (true) WITH CHECK (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_youtube_tracker_settings_updated_at
    BEFORE UPDATE ON youtube_tracker_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_youtube_daily_stats_updated_at
    BEFORE UPDATE ON youtube_daily_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_youtube_top_videos_updated_at
    BEFORE UPDATE ON youtube_top_videos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
