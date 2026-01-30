-- Create storage buckets for AdForge assets

-- Create brand-assets bucket for logos and brand images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'brand-assets',
    'brand-assets',
    true,
    5242880, -- 5MB limit
    ARRAY['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create product-images bucket for product photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'product-images',
    'product-images',
    true,
    10485760, -- 10MB limit
    ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create persona-photos bucket for AI-generated persona images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'persona-photos',
    'persona-photos',
    true,
    10485760, -- 10MB limit
    ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create creatives bucket for generated images and videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'creatives',
    'creatives',
    true,
    104857600, -- 100MB limit for videos
    ARRAY['image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create exports bucket for audience and report exports
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'exports',
    'exports',
    true,
    52428800, -- 50MB limit
    ARRAY['application/json', 'text/csv', 'application/pdf', 'application/zip']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ============================================
-- RLS Policies for brand-assets bucket
-- ============================================

-- Policy: Users can view their own brand assets
CREATE POLICY "Users can view own brand assets"
    ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'brand-assets'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Policy: Users can upload to their own folder
CREATE POLICY "Users can upload own brand assets"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'brand-assets'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Policy: Users can update their own brand assets
CREATE POLICY "Users can update own brand assets"
    ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'brand-assets'
        AND auth.uid()::text = (storage.foldername(name))[1]
    )
    WITH CHECK (
        bucket_id = 'brand-assets'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Policy: Users can delete their own brand assets
CREATE POLICY "Users can delete own brand assets"
    ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'brand-assets'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- ============================================
-- RLS Policies for product-images bucket
-- ============================================

CREATE POLICY "Users can view own product images"
    ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'product-images'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can upload own product images"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'product-images'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update own product images"
    ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'product-images'
        AND auth.uid()::text = (storage.foldername(name))[1]
    )
    WITH CHECK (
        bucket_id = 'product-images'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own product images"
    ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'product-images'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- ============================================
-- RLS Policies for persona-photos bucket
-- ============================================

CREATE POLICY "Users can view own persona photos"
    ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'persona-photos'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can upload own persona photos"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'persona-photos'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update own persona photos"
    ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'persona-photos'
        AND auth.uid()::text = (storage.foldername(name))[1]
    )
    WITH CHECK (
        bucket_id = 'persona-photos'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own persona photos"
    ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'persona-photos'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- ============================================
-- RLS Policies for creatives bucket
-- ============================================

CREATE POLICY "Users can view own creatives"
    ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'creatives'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can upload own creatives"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'creatives'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update own creatives"
    ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'creatives'
        AND auth.uid()::text = (storage.foldername(name))[1]
    )
    WITH CHECK (
        bucket_id = 'creatives'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own creatives"
    ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'creatives'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- ============================================
-- RLS Policies for exports bucket
-- ============================================

CREATE POLICY "Users can view own exports"
    ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'exports'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can upload own exports"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'exports'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update own exports"
    ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'exports'
        AND auth.uid()::text = (storage.foldername(name))[1]
    )
    WITH CHECK (
        bucket_id = 'exports'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own exports"
    ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'exports'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );
