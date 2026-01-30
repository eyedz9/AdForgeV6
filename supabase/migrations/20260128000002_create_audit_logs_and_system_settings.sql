-- Create audit_logs and system_settings tables
-- audit_logs: tracks all admin actions for accountability
-- system_settings: stores platform-wide configuration values

-- ============================================================
-- AUDIT LOGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL REFERENCES auth.users(id),
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on created_at DESC for efficient querying (most recent first)
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Index on actor_id for filtering by admin
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);

-- Index on target_type and target_id for filtering by target
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_type_id ON audit_logs(target_type, target_id);

-- Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS: only service role can INSERT and SELECT (no user access)
-- Service role bypasses RLS automatically, so no explicit policies needed.
-- By enabling RLS with no policies, regular users have zero access.

-- ============================================================
-- SYSTEM SETTINGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- RLS: users can SELECT system_settings
CREATE POLICY "Users can view system settings"
    ON system_settings FOR SELECT
    USING (true);

-- Only service role can INSERT/UPDATE (no explicit policy needed; service role bypasses RLS)

-- Apply updated_at trigger to system_settings
CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- INSERT DEFAULT SYSTEM SETTINGS
-- ============================================================

INSERT INTO system_settings (key, value) VALUES
    ('default_trial_days', '14'::jsonb),
    ('maintenance_mode', 'false'::jsonb),
    ('registration_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;
