-- Migration: Enhance Intelligence Reports Table
-- Adds new columns for executive summary, persona suggestions, raw data,
-- platform insights, and content recommendations

-- Add executive_summary column for high-level strategic insights
ALTER TABLE intelligence_reports
ADD COLUMN IF NOT EXISTS executive_summary TEXT;

-- Add persona_suggestions column for AI-generated persona recommendations
ALTER TABLE intelligence_reports
ADD COLUMN IF NOT EXISTS persona_suggestions JSONB DEFAULT '[]';

-- Add raw_data column to store the original scraped/search data
ALTER TABLE intelligence_reports
ADD COLUMN IF NOT EXISTS raw_data JSONB DEFAULT '{}';

-- Add platform_insights column for platform-specific analysis
ALTER TABLE intelligence_reports
ADD COLUMN IF NOT EXISTS platform_insights JSONB DEFAULT '[]';

-- Add content_recommendations column for suggested content strategies
ALTER TABLE intelligence_reports
ADD COLUMN IF NOT EXISTS content_recommendations JSONB DEFAULT '[]';

-- Add synthesized_trends column for AI-analyzed trends
ALTER TABLE intelligence_reports
ADD COLUMN IF NOT EXISTS synthesized_trends JSONB DEFAULT '[]';

-- Add synthesized_audience column for AI-analyzed audience segments
ALTER TABLE intelligence_reports
ADD COLUMN IF NOT EXISTS synthesized_audience JSONB DEFAULT '[]';

-- Add synthesized_competitors column for AI-analyzed competitor data
ALTER TABLE intelligence_reports
ADD COLUMN IF NOT EXISTS synthesized_competitors JSONB DEFAULT '[]';

-- Add index for faster queries on persona_suggestions (for persona creation flow)
CREATE INDEX IF NOT EXISTS idx_intelligence_reports_persona_suggestions
ON intelligence_reports USING gin (persona_suggestions);

-- Add comment for documentation
COMMENT ON COLUMN intelligence_reports.executive_summary IS 'AI-generated executive summary with key findings, opportunities, and recommendations';
COMMENT ON COLUMN intelligence_reports.persona_suggestions IS 'Array of AI-suggested personas based on audience analysis';
COMMENT ON COLUMN intelligence_reports.raw_data IS 'Original search results and scraped content before AI synthesis';
COMMENT ON COLUMN intelligence_reports.platform_insights IS 'Platform-specific analysis and recommendations';
COMMENT ON COLUMN intelligence_reports.content_recommendations IS 'AI-generated content strategy recommendations';
COMMENT ON COLUMN intelligence_reports.synthesized_trends IS 'AI-synthesized market trends from raw data';
COMMENT ON COLUMN intelligence_reports.synthesized_audience IS 'AI-synthesized audience segments from raw data';
COMMENT ON COLUMN intelligence_reports.synthesized_competitors IS 'AI-synthesized competitor analysis from raw data';
