-- Create products table for storing product catalog with variants and marketing attributes
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    product_type VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    short_description VARCHAR(160),
    full_description TEXT,
    sku VARCHAR(100),
    price DECIMAL(10, 2),
    price_range VARCHAR(50),
    images JSONB DEFAULT '[]',
    videos JSONB DEFAULT '[]',
    variants JSONB DEFAULT '[]',
    marketing_attributes JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index on brand_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);

-- Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can access products of their own brands
-- We need to join through brands table to check ownership
CREATE POLICY "Users can view products of their own brands"
    ON products
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM brands
            WHERE brands.id = products.brand_id
            AND brands.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert products for their own brands"
    ON products
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM brands
            WHERE brands.id = products.brand_id
            AND brands.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update products of their own brands"
    ON products
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM brands
            WHERE brands.id = products.brand_id
            AND brands.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM brands
            WHERE brands.id = products.brand_id
            AND brands.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete products of their own brands"
    ON products
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM brands
            WHERE brands.id = products.brand_id
            AND brands.user_id = auth.uid()
        )
    );

-- Add trigger to automatically update updated_at
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
