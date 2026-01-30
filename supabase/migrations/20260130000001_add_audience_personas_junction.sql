-- Migration: Add audience_personas junction table for multi-persona audiences
-- This allows audiences to be created from one or multiple personas

-- 1. Make persona_id nullable on audiences table
ALTER TABLE audiences ALTER COLUMN persona_id DROP NOT NULL;

-- 2. Create junction table
CREATE TABLE IF NOT EXISTS audience_personas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audience_id UUID NOT NULL REFERENCES audiences(id) ON DELETE CASCADE,
    persona_id UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(audience_id, persona_id)
);

-- 3. Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_audience_personas_audience_id ON audience_personas(audience_id);
CREATE INDEX IF NOT EXISTS idx_audience_personas_persona_id ON audience_personas(persona_id);

-- 4. Enable RLS
ALTER TABLE audience_personas ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies - check brand ownership through audiences -> brands -> auth.uid()
CREATE POLICY "Users can view audience_personas of their own brands"
    ON audience_personas
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM audiences
            JOIN brands ON brands.id = audiences.brand_id
            WHERE audiences.id = audience_personas.audience_id
            AND brands.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert audience_personas for their own brands"
    ON audience_personas
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM audiences
            JOIN brands ON brands.id = audiences.brand_id
            WHERE audiences.id = audience_personas.audience_id
            AND brands.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete audience_personas of their own brands"
    ON audience_personas
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM audiences
            JOIN brands ON brands.id = audiences.brand_id
            WHERE audiences.id = audience_personas.audience_id
            AND brands.user_id = auth.uid()
        )
    );

-- 6. Backfill: insert existing persona_id values into junction table
INSERT INTO audience_personas (audience_id, persona_id)
SELECT id, persona_id FROM audiences
WHERE persona_id IS NOT NULL
ON CONFLICT (audience_id, persona_id) DO NOTHING;
