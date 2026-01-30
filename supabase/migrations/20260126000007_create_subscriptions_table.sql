-- Migration: Create subscriptions table
-- Description: Stores Stripe subscription data for users

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_customer_id VARCHAR(255) NOT NULL,
    stripe_subscription_id VARCHAR(255),
    stripe_price_id VARCHAR(255),
    tier VARCHAR(50) DEFAULT 'free' NOT NULL,
    status VARCHAR(50) DEFAULT 'active' NOT NULL,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT false NOT NULL,
    brands_limit INTEGER DEFAULT 1 NOT NULL,
    personas_limit INTEGER DEFAULT 5 NOT NULL,
    images_limit INTEGER DEFAULT 20 NOT NULL,
    videos_limit INTEGER DEFAULT 5 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create unique index on user_id (one subscription per user)
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

-- Create index on stripe_customer_id for lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);

-- Create updated_at trigger (function already exists from US-001)
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own subscription

-- SELECT: Users can view their own subscription
CREATE POLICY subscriptions_select_policy ON subscriptions
    FOR SELECT
    USING (user_id = auth.uid());

-- INSERT: Users can create their own subscription
CREATE POLICY subscriptions_insert_policy ON subscriptions
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- UPDATE: Users can update their own subscription
CREATE POLICY subscriptions_update_policy ON subscriptions
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- DELETE: Users can delete their own subscription
CREATE POLICY subscriptions_delete_policy ON subscriptions
    FOR DELETE
    USING (user_id = auth.uid());

-- Add comment to table
COMMENT ON TABLE subscriptions IS 'Stores Stripe subscription data and usage limits per user';
