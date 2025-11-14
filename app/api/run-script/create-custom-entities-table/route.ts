import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST() {
  try {
    const { error } = await supabase.rpc("exec_sql", {
      sql: `
        -- Create custom_entities table
        CREATE TABLE IF NOT EXISTS custom_entities (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create a unique constraint on name and entity_type
        CREATE UNIQUE INDEX IF NOT EXISTS custom_entities_name_type_idx ON custom_entities (name, entity_type);

        -- Add comment to table
        COMMENT ON TABLE custom_entities IS 'Stores custom entities like high schools, colleges, and clubs that users have manually entered';
      `,
    })

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: "Custom entities table created successfully",
    })
  } catch (error) {
    console.error("Error creating custom entities table:", error)
    return NextResponse.json({ error: "Failed to create custom entities table" }, { status: 500 })
  }
}
