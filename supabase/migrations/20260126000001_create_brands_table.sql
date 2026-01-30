-- Create brands table for storing brand identity, visual guidelines, and voice/tone settings
CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    business_type VARCHAR(50),
    industry VARCHAR(100),
    sub_industry VARCHAR(100),
    website VARCHAR(500),
    social_profiles JSONB DEFAULT '{}',
    logo_url VARCHAR(500),
    logo_variants JSONB DEFAULT '{}',
    visual_guidelines JSONB DEFAULT '{}',
    voice_tone JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_brands_user_id ON brands(user_id);

-- Enable Row Level Security
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own brands
CREATE POLICY "Users can view their own brands"
    ON brands
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own brands"
    ON brands
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brands"
    ON brands
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own brands"
    ON brands
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to automatically update updated_at
CREATE TRIGGER update_brands_updated_at
    BEFORE UPDATE ON brands
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
