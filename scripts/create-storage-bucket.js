/**
 * Script to create the brand-assets storage bucket
 * Run with: node scripts/create-storage-bucket.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local file manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = envVars.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createBuckets() {
  const buckets = [
    {
      id: 'brand-assets',
      name: 'brand-assets',
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp']
    },
    {
      id: 'product-images',
      name: 'product-images',
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
    },
    {
      id: 'persona-photos',
      name: 'persona-photos',
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp']
    },
    {
      id: 'creatives',
      name: 'creatives',
      public: true,
      fileSizeLimit: 104857600, // 100MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
    }
  ];

  for (const bucket of buckets) {
    console.log(`Creating bucket: ${bucket.id}...`);

    // First try to get the bucket
    const { data: existingBucket } = await supabase.storage.getBucket(bucket.id);

    if (existingBucket) {
      console.log(`  Bucket ${bucket.id} already exists, updating...`);
      const { error } = await supabase.storage.updateBucket(bucket.id, {
        public: bucket.public,
        fileSizeLimit: bucket.fileSizeLimit,
        allowedMimeTypes: bucket.allowedMimeTypes
      });
      if (error) {
        console.error(`  Error updating ${bucket.id}:`, error.message);
      } else {
        console.log(`  ✓ Updated ${bucket.id}`);
      }
    } else {
      const { error } = await supabase.storage.createBucket(bucket.id, {
        public: bucket.public,
        fileSizeLimit: bucket.fileSizeLimit,
        allowedMimeTypes: bucket.allowedMimeTypes
      });
      if (error) {
        console.error(`  Error creating ${bucket.id}:`, error.message);
      } else {
        console.log(`  ✓ Created ${bucket.id}`);
      }
    }
  }

  console.log('\nDone!');
}

createBuckets().catch(console.error);
