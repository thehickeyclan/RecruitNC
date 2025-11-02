import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const supabase = createClient()

    // First check if the table exists
    const { error: checkError } = await supabase.from("media_items").select("id").limit(1)

    if (checkError && checkError.message.includes("does not exist")) {
      // Table doesn't exist, create it
      const { error: createError } = await supabase.rpc("execute_sql", {
        sql: `
          CREATE TABLE IF NOT EXISTS media_items (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            file_name TEXT,
            college_name TEXT,
            alt_text TEXT,
            division TEXT,
            entity_type TEXT DEFAULT 'college',
            url TEXT,
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
        `,
      })

      if (createError) {
        return NextResponse.json({
          success: false,
          error: "Failed to create table: " + createError.message,
        })
      }

      return NextResponse.json({
        success: true,
        message: "Table created successfully",
      })
    }

    // Table exists, add missing columns
    const requiredColumns = [
      { name: "college_name", type: "TEXT" },
      { name: "alt_text", type: "TEXT" },
      { name: "division", type: "TEXT" },
      { name: "entity_type", type: "TEXT DEFAULT 'college'" },
      { name: "blob_url", type: "TEXT" },
      { name: "file_size", type: "INTEGER" },
      { name: "mime_type", type: "TEXT" },
      { name: "width", type: "INTEGER" },
      { name: "height", type: "INTEGER" },
      { name: "tags", type: "TEXT[]" },
      { name: "description", type: "TEXT" },
      { name: "is_active", type: "BOOLEAN DEFAULT true" },
      { name: "created_at", type: "TIMESTAMP WITH TIME ZONE DEFAULT NOW()" },
      { name: "updated_at", type: "TIMESTAMP WITH TIME ZONE DEFAULT NOW()" },
    ]

    const alterResults = []

    for (const column of requiredColumns) {
      const sql = `ALTER TABLE media_items ADD COLUMN IF NOT EXISTS ${column.name} ${column.type};`
      const { error } = await supabase.rpc("execute_sql", { sql })

      alterResults.push({
        command: sql,
        success: !error,
        error: error ? error.message : null,
      })
    }

    return NextResponse.json({
      success: true,
      method: "alter_columns",
      results: alterResults,
    })
  } catch (error) {
    console.error("Error fixing media table structure:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      originalError: error,
    })
  }
}
