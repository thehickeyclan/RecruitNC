# Add Lynchburg College

## Step 1: Upload the Logo

You can upload the logo using one of these methods:

### Option A: Using the Admin Media Manager
1. Go to `/admin/media-manager` (if available)
2. Upload the Lynchburg College logo
3. Copy the resulting URL

### Option B: Using the API directly
You can upload via the API endpoint `/api/media-manager/upload` or `/api/upload-entity-logo`

### Option C: Manual Blob Upload
If you have access to Vercel Blob Storage, upload the logo manually and note the URL.

## Step 2: Run the SQL Script

After you have the logo URL, update `scripts/add-lynchburg-college.sql` with the actual logo URL, then run it in Supabase SQL Editor.

The colors from the logo are:
- **Primary Color**: #DC143C (Crimson red - vibrant red from the hornet body and letters)
- **Secondary Color**: #808080 (Medium grey - from the hornet head and stripes)

