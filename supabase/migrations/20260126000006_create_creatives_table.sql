-- Create creatives table for storing generated images and videos
CREATE TABLE IF NOT EXISTS creatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    persona_id UUID REFERENCES personas(id) ON DELETE SET NULL,
    audience_id UUID REFERENCES audiences(id) ON DELETE SET NULL,
    creative_type VARCHAR(20) NOT NULL,
    subtype VARCHAR(50),
    file_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500),
    file_size INTEGER,
    dimensions JSONB,
    duration_seconds INTEGER,
    generation_prompt TEXT NOT NULL,
    generation_params JSONB DEFAULT '{}',
    generation_model VARCHAR(100) NOT NULL,
    generation_cost DECIMAL(10, 4),
    headline VARCHAR(255),
    subheadline VARCHAR(255),
    cta VARCHAR(100),
    body_copy TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'generated',
    rating INTEGER,
    tags JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes on brand_id, persona_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_creatives_brand_id ON creatives(brand_id);
CREATE INDEX IF NOT EXISTS idx_creatives_persona_id ON creatives(persona_id);

-- Add composite index on (creative_type, subtype) for filtering
CREATE INDEX IF NOT EXISTS idx_creatives_type_subtype ON creatives(creative_type, subtype);

-- Enable Row Level Security
ALTER TABLE creatives ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can access creatives of their own brands
-- We need to join through brands table to check ownership
CREATE POLICY "Users can view creatives of their own brands"
    ON creatives
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM brands
            WHERE brands.id = creatives.brand_id
            AND brands.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert creatives for their own brands"
    ON creatives
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM brands
            WHERE brands.id = creatives.brand_id
            AND brands.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update creatives of their own brands"
    ON creatives
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM brands
            WHERE brands.id = creatives.brand_id
            AND brands.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM brands
            WHERE brands.id = creatives.brand_id
            AND brands.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete creatives of their own brands"
    ON creatives
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM brands
            WHERE brands.id = creatives.brand_id
            AND brands.user_id = auth.uid()
        )
    );

-- Add trigger to automatically update updated_at
CREATE TRIGGER update_creatives_updated_at
    BEFORE UPDATE ON creatives
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
