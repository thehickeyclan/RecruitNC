import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const supabase = createClient()

    // SQL to add missing columns if they don't exist
    const addColumnsSQL = `
      DO $$ 
      BEGIN
        -- Add filename column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'media_items' AND column_name = 'filename') THEN
          ALTER TABLE media_items ADD COLUMN filename TEXT;
        END IF;
        
        -- Add original_name column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'media_items' AND column_name = 'original_name') THEN
          ALTER TABLE media_items ADD COLUMN original_name TEXT;
        END IF;
        
        -- Add other missing columns
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'media_items' AND column_name = 'category') THEN
          ALTER TABLE media_items ADD COLUMN category TEXT DEFAULT 'general';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'media_items' AND column_name = 'entity_type') THEN
          ALTER TABLE media_items ADD COLUMN entity_type TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'media_items' AND column_name = 'entity_name') THEN
          ALTER TABLE media_items ADD COLUMN entity_name TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'media_items' AND column_name = 'alt_text') THEN
          ALTER TABLE media_items ADD COLUMN alt_text TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'media_items' AND column_name = 'caption') THEN
          ALTER TABLE media_items ADD COLUMN caption TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'media_items' AND column_name = 'tags') THEN
          ALTER TABLE media_items ADD COLUMN tags JSONB DEFAULT '[]';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'media_items' AND column_name = 'mime_type') THEN
          ALTER TABLE media_items ADD COLUMN mime_type TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'media_items' AND column_name = 'size_bytes') THEN
          ALTER TABLE media_items ADD COLUMN size_bytes INTEGER;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'media_items' AND column_name = 'metadata') THEN
          ALTER TABLE media_items ADD COLUMN metadata JSONB DEFAULT '{}';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'media_items' AND column_name = 'is_active') THEN
          ALTER TABLE media_items ADD COLUMN is_active BOOLEAN DEFAULT true;
        END IF;
      END $$;
    `

    const { error } = await supabase.rpc("exec_sql", { sql: addColumnsSQL })

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        sql: addColumnsSQL,
      })
    }

    return NextResponse.json({
      success: true,
      message: "Missing columns added successfully",
      sql: addColumnsSQL,
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
