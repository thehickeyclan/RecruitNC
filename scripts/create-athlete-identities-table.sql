-- Create athlete_identities table for identity resolution
CREATE TABLE IF NOT EXISTS athlete_identities (
    id SERIAL PRIMARY KEY,
    canonical_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_athlete_identities_canonical_name ON athlete_identities(canonical_name);
