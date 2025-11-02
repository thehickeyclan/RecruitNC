-- Create athlete_confirmations table to track profile confirmations
CREATE TABLE IF NOT EXISTS athlete_confirmations (
    id SERIAL PRIMARY KEY,
    athlete_id VARCHAR(50) NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_athlete_confirmations_athlete_id ON athlete_confirmations(athlete_id);
CREATE INDEX IF NOT EXISTS idx_athlete_confirmations_user_id ON athlete_confirmations(user_id);
CREATE INDEX IF NOT EXISTS idx_athlete_confirmations_confirmed_at ON athlete_confirmations(confirmed_at);

-- Create unique constraint to prevent duplicate confirmations
CREATE UNIQUE INDEX IF NOT EXISTS idx_athlete_confirmations_unique 
ON athlete_confirmations(athlete_id, user_id);

-- Add table comments
COMMENT ON TABLE athlete_confirmations IS 'Tracks which users have confirmed which athlete profiles';
COMMENT ON COLUMN athlete_confirmations.athlete_id IS 'ID of the athlete whose profile was confirmed';
COMMENT ON COLUMN athlete_confirmations.user_id IS 'ID of the user who confirmed the profile';
COMMENT ON COLUMN athlete_confirmations.confirmed_at IS 'When the profile was confirmed';

-- Enable RLS (Row Level Security)
ALTER TABLE athlete_confirmations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view all confirmations" ON athlete_confirmations
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own confirmations" ON athlete_confirmations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own confirmations" ON athlete_confirmations
    FOR UPDATE USING (auth.uid() = user_id);
