-- Create personas table for storing AI-generated consumer archetypes
CREATE TABLE IF NOT EXISTS personas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    intelligence_report_id UUID REFERENCES intelligence_reports(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    photo_prompt TEXT,
    photo_url VARCHAR(500),
    backstory TEXT,
    quote VARCHAR(500),
    day_in_life TEXT,
    demographics JSONB DEFAULT '{}',
    professional JSONB DEFAULT '{}',
    psychographics JSONB DEFAULT '{}',
    lifestyle JSONB DEFAULT '{}',
    media_tech JSONB DEFAULT '{}',
    buying_behavior JSONB DEFAULT '{}',
    beliefs_attitudes JSONB,
    generation_model VARCHAR(100) NOT NULL DEFAULT 'claude-haiku-4-5',
    generation_params JSONB DEFAULT '{}',
    validation_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    validation_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes on brand_id and product_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_personas_brand_id ON personas(brand_id);
CREATE INDEX IF NOT EXISTS idx_personas_product_id ON personas(product_id);

-- Enable Row Level Security
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can access personas of their own brands
-- We need to join through brands table to check ownership
CREATE POLICY "Users can view personas of their own brands"
    ON personas
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM brands
            WHERE brands.id = personas.brand_id
            AND brands.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert personas for their own brands"
    ON personas
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM brands
            WHERE brands.id = personas.brand_id
            AND brands.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update personas of their own brands"
    ON personas
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM brands
            WHERE brands.id = personas.brand_id
            AND brands.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM brands
            WHERE brands.id = personas.brand_id
            AND brands.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete personas of their own brands"
    ON personas
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM brands
            WHERE brands.id = personas.brand_id
            AND brands.user_id = auth.uid()
        )
    );

-- Add trigger to automatically update updated_at
CREATE TRIGGER update_personas_updated_at
    BEFORE UPDATE ON personas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
