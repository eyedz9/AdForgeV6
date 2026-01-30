-- Create intelligence_reports table for storing market data with source attribution
CREATE TABLE IF NOT EXISTS intelligence_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    report_type VARCHAR(50),
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    competitors JSONB DEFAULT '[]',
    search_trends JSONB DEFAULT '[]',
    industry_news JSONB DEFAULT '[]',
    social_conversations JSONB DEFAULT '[]',
    audience_insights JSONB DEFAULT '{}',
    sources JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes on brand_id and product_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_intelligence_reports_brand_id ON intelligence_reports(brand_id);
CREATE INDEX IF NOT EXISTS idx_intelligence_reports_product_id ON intelligence_reports(product_id);

-- Enable Row Level Security
ALTER TABLE intelligence_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can access reports of their own brands
-- We need to join through brands table to check ownership
CREATE POLICY "Users can view intelligence reports of their own brands"
    ON intelligence_reports
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM brands
            WHERE brands.id = intelligence_reports.brand_id
            AND brands.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert intelligence reports for their own brands"
    ON intelligence_reports
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM brands
            WHERE brands.id = intelligence_reports.brand_id
            AND brands.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update intelligence reports of their own brands"
    ON intelligence_reports
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM brands
            WHERE brands.id = intelligence_reports.brand_id
            AND brands.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM brands
            WHERE brands.id = intelligence_reports.brand_id
            AND brands.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete intelligence reports of their own brands"
    ON intelligence_reports
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM brands
            WHERE brands.id = intelligence_reports.brand_id
            AND brands.user_id = auth.uid()
        )
    );

-- Add trigger to automatically update updated_at
CREATE TRIGGER update_intelligence_reports_updated_at
    BEFORE UPDATE ON intelligence_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
