-- Fix storage buckets to be public for image access

-- Update brand-assets bucket to be public
UPDATE storage.buckets SET public = true WHERE id = 'brand-assets';

-- Update product-images bucket to be public
UPDATE storage.buckets SET public = true WHERE id = 'product-images';

-- Update persona-photos bucket to be public
UPDATE storage.buckets SET public = true WHERE id = 'persona-photos';

-- Update creatives bucket to be public
UPDATE storage.buckets SET public = true WHERE id = 'creatives';

-- Update exports bucket to be public
UPDATE storage.buckets SET public = true WHERE id = 'exports';

-- If buckets don't exist, create them
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'brand-assets',
    'brand-assets',
    true,
    5242880,
    ARRAY['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'product-images',
    'product-images',
    true,
    10485760,
    ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'persona-photos',
    'persona-photos',
    true,
    10485760,
    ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'creatives',
    'creatives',
    true,
    104857600,
    ARRAY['image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'exports',
    'exports',
    true,
    52428800,
    ARRAY['application/json', 'text/csv', 'application/pdf', 'application/zip']
)
ON CONFLICT (id) DO UPDATE SET public = true;
