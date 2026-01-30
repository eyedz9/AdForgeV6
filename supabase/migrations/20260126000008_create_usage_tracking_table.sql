-- Migration: Create usage_tracking table
-- Description: Tracks per-period usage counts for users

-- Create usage_tracking table
CREATE TABLE IF NOT EXISTS usage_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    personas_generated INTEGER DEFAULT 0 NOT NULL,
    images_generated INTEGER DEFAULT 0 NOT NULL,
    videos_generated INTEGER DEFAULT 0 NOT NULL,
    intelligence_reports INTEGER DEFAULT 0 NOT NULL,
    personas_limit INTEGER NOT NULL,
    images_limit INTEGER NOT NULL,
    videos_limit INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create unique constraint on (user_id, period_start)
CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_tracking_user_period ON usage_tracking(user_id, period_start);

-- Create index on user_id for lookups
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON usage_tracking(user_id);

-- Create index on period_start for lookups
CREATE INDEX IF NOT EXISTS idx_usage_tracking_period_start ON usage_tracking(period_start);

-- Create updated_at trigger (function already exists from US-001)
CREATE TRIGGER update_usage_tracking_updated_at
    BEFORE UPDATE ON usage_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own usage

-- SELECT: Users can view their own usage
CREATE POLICY usage_tracking_select_policy ON usage_tracking
    FOR SELECT
    USING (user_id = auth.uid());

-- INSERT: Users can create their own usage records
CREATE POLICY usage_tracking_insert_policy ON usage_tracking
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- UPDATE: Users can update their own usage records
CREATE POLICY usage_tracking_update_policy ON usage_tracking
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- DELETE: Users can delete their own usage records
CREATE POLICY usage_tracking_delete_policy ON usage_tracking
    FOR DELETE
    USING (user_id = auth.uid());

-- Add comment to table
COMMENT ON TABLE usage_tracking IS 'Tracks per-period usage counts (personas, images, videos, reports) per user';
