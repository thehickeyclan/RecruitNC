import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const supabase = createClient()

    // Create the media_items table if it doesn't exist
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS media_items (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        url TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        entity_type TEXT,
        entity_name TEXT,
        alias TEXT,
        alt_text TEXT,
        caption TEXT,
        tags JSONB DEFAULT '[]',
        mime_type TEXT,
        size_bytes INTEGER,
        metadata JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_media_items_category ON media_items(category);
      CREATE INDEX IF NOT EXISTS idx_media_items_entity ON media_items(entity_type, entity_name);
      CREATE INDEX IF NOT EXISTS idx_media_items_active ON media_items(is_active);
      CREATE INDEX IF NOT EXISTS idx_media_items_created ON media_items(created_at);
    `

    const { error } = await supabase.rpc("exec_sql", { sql: createTableSQL })

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
      })
    }

    return NextResponse.json({
      success: true,
      message: "Media items table created successfully",
    })
  } catch (error) {
    console.error("Setup error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Setup failed",
    })
  }
}
