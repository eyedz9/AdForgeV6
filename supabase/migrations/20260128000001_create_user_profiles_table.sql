-- Create user_profiles table with admin role system
-- This table stores role information and account status for each user

CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    disabled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on role for filtering admin users
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- Index on disabled_at for finding disabled accounts
CREATE INDEX IF NOT EXISTS idx_user_profiles_disabled_at ON user_profiles(disabled_at);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users can SELECT their own profile row
CREATE POLICY "Users can view their own profile"
    ON user_profiles FOR SELECT
    USING (auth.uid() = id);

-- Service role bypasses all RLS automatically (no explicit policy needed)

-- Apply updated_at trigger (reuses the function from brands migration)
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-insert user_profiles row when a new auth.users entry is created
CREATE OR REPLACE FUNCTION handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_profile
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user_profile();

-- Insert admin profile row for jason.solomons@eyedz9.com
-- This uses an upsert to handle the case where the trigger already created a 'user' row
INSERT INTO public.user_profiles (id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'jason.solomons@eyedz9.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin', updated_at = NOW();

-- Also insert profile rows for any existing users that don't have one yet
INSERT INTO public.user_profiles (id, role)
SELECT id, 'user'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.user_profiles)
ON CONFLICT (id) DO NOTHING;
