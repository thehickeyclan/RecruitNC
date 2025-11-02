-- Create comprehensive media_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS media_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  entity_type TEXT,
  entity_name TEXT,
  alias TEXT,
  alt_text TEXT,
  caption TEXT,
  tags TEXT[] DEFAULT '{}',
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create media usage tracking table
CREATE TABLE IF NOT EXISTS media_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  media_id UUID REFERENCES media_items(id) ON DELETE CASCADE,
  used_in_table TEXT NOT NULL,
  used_in_column TEXT NOT NULL,
  used_in_record_id TEXT NOT NULL,
  usage_context TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(media_id, used_in_table, used_in_column, used_in_record_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_media_items_category ON media_items(category);
CREATE INDEX IF NOT EXISTS idx_media_items_entity_type ON media_items(entity_type);
CREATE INDEX IF NOT EXISTS idx_media_items_active ON media_items(is_active);
CREATE INDEX IF NOT EXISTS idx_media_items_tags ON media_items USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_media_usage_media_id ON media_usage(media_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_media_items_updated_at ON media_items;
CREATE TRIGGER update_media_items_updated_at
   BEFORE UPDATE ON media_items
   FOR EACH ROW
   EXECUTE FUNCTION update_updated_at_column();
