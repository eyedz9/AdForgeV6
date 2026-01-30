-- Add moderation columns to brands, personas, and creatives tables
-- These columns enable admin content moderation across the platform

-- =============================================================
-- BRANDS: Add moderation_status and moderation_notes
-- =============================================================
ALTER TABLE brands
    ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'active'
        CHECK (moderation_status IN ('active', 'flagged', 'disabled', 'deleted')),
    ADD COLUMN IF NOT EXISTS moderation_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_brands_moderation_status ON brands(moderation_status);

-- =============================================================
-- PERSONAS: Add moderation_status and moderation_notes
-- =============================================================
ALTER TABLE personas
    ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'active'
        CHECK (moderation_status IN ('active', 'flagged', 'disabled', 'deleted')),
    ADD COLUMN IF NOT EXISTS moderation_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_personas_moderation_status ON personas(moderation_status);

-- =============================================================
-- CREATIVES: Add moderation_status and moderation_notes
-- =============================================================
ALTER TABLE creatives
    ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'active'
        CHECK (moderation_status IN ('active', 'flagged', 'disabled', 'deleted')),
    ADD COLUMN IF NOT EXISTS moderation_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_creatives_moderation_status ON creatives(moderation_status);
