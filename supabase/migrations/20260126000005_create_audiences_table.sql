-- Create audiences table for storing platform-specific targeting translations
CREATE TABLE IF NOT EXISTS audiences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    persona_id UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    meta_targeting JSONB DEFAULT '{}',
    google_targeting JSONB DEFAULT '{}',
    linkedin_targeting JSONB DEFAULT '{}',
    tiktok_targeting JSONB DEFAULT '{}',
    pinterest_targeting JSONB DEFAULT '{}',
    snapchat_targeting JSONB DEFAULT '{}',
    size_estimates JSONB DEFAULT '{}',
    last_exported_at TIMESTAMPTZ,
    export_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes on persona_id and brand_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_audiences_persona_id ON audiences(persona_id);
CREATE INDEX IF NOT EXISTS idx_audiences_brand_id ON audiences(brand_id);

-- Enable Row Level Security
ALTER TABLE audiences ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can access audiences of their own brands
-- We need to join through brands table to check ownership
CREATE POLICY "Users can view audiences of their own brands"
    ON audiences
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM brands
            WHERE brands.id = audiences.brand_id
            AND brands.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert audiences for their own brands"
    ON audiences
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM brands
            WHERE brands.id = audiences.brand_id
            AND brands.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update audiences of their own brands"
    ON audiences
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM brands
            WHERE brands.id = audiences.brand_id
            AND brands.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM brands
            WHERE brands.id = audiences.brand_id
            AND brands.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete audiences of their own brands"
    ON audiences
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM brands
            WHERE brands.id = audiences.brand_id
            AND brands.user_id = auth.uid()
        )
    );

-- Add trigger to automatically update updated_at
CREATE TRIGGER update_audiences_updated_at
    BEFORE UPDATE ON audiences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
