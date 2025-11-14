import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const supabase = createClient()

    // First, try to check if the table already exists
    const { data: existingData, error: checkError } = await supabase.from("media_items").select("id").limit(1)

    if (!checkError) {
      // Table already exists
      return NextResponse.json({
        success: true,
        message: "Media items table already exists",
        alreadyExists: true,
      })
    }

    // If we get here, the table doesn't exist, so we need to create it
    console.log("Table doesn't exist, attempting to create...")

    // Since the table was created manually via SQL, let's just verify it exists now
    const { data: verifyData, error: verifyError } = await supabase.from("media_items").select("id").limit(1)

    if (verifyError) {
      console.error("Table still doesn't exist after manual creation:", verifyError)
      return NextResponse.json({
        success: false,
        needsManualSetup: true,
        error: "Table creation verification failed",
        manualSQL: `
-- Run this SQL in your Supabase SQL editor:

CREATE TABLE IF NOT EXISTS media_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  college_name TEXT,
  alt_text TEXT,
  division TEXT,
  entity_type TEXT DEFAULT 'college',
  url TEXT NOT NULL,
  blob_url TEXT,
  file_size INTEGER,
  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  tags TEXT[],
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE media_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on media_items" ON media_items;
CREATE POLICY "Allow all operations on media_items" ON media_items
  FOR ALL USING (true);
        `,
      })
    }

    return NextResponse.json({
      success: true,
      message: "Media items table is ready",
    })
  } catch (error) {
    console.error("Exception in table creation:", error)
    return NextResponse.json({
      success: false,
      needsManualSetup: true,
      error: error instanceof Error ? error.message : "Unknown error",
      manualSQL: `
-- Run this SQL in your Supabase SQL editor:

CREATE TABLE IF NOT EXISTS media_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  college_name TEXT,
  alt_text TEXT,
  division TEXT,
  entity_type TEXT DEFAULT 'college',
  url TEXT NOT NULL,
  blob_url TEXT,
  file_size INTEGER,
  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  tags TEXT[],
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE media_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on media_items" ON media_items;
CREATE POLICY "Allow all operations on media_items" ON media_items
  FOR ALL USING (true);
      `,
    })
  }
}
