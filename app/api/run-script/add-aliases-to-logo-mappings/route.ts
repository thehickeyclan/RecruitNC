import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const supabase = createClient()

    // Add aliases column
    const { error: alterError } = await supabase.rpc("exec_sql", {
      sql: `
        ALTER TABLE logo_mappings 
        ADD COLUMN IF NOT EXISTS aliases TEXT;
        
        CREATE INDEX IF NOT EXISTS idx_logo_mappings_aliases 
        ON logo_mappings USING gin(to_tsvector('english', aliases));
      `,
    })

    if (alterError) {
      console.error("Error adding aliases column:", alterError)
      return NextResponse.json({ success: false, error: "Failed to add aliases column" }, { status: 500 })
    }

    // Update some common examples
    const updates = [
      {
        condition: "entity_name ILIKE '%darkhorse%'",
        aliases: "Dark Horse, DH Wrestling, Darkhorse WC",
      },
      {
        condition: "entity_name ILIKE '%cardinal gibbons%'",
        aliases: "Cardinal Gibbons, CG, Gibbons",
      },
      {
        condition: "entity_name ILIKE '%university of north carolina%'",
        aliases: "UNC, Chapel Hill, Tar Heels",
      },
    ]

    for (const update of updates) {
      const { error: updateError } = await supabase.rpc("exec_sql", {
        sql: `
          UPDATE logo_mappings 
          SET aliases = '${update.aliases}'
          WHERE ${update.condition} AND aliases IS NULL;
        `,
      })

      if (updateError) {
        console.error(`Error updating aliases for ${update.condition}:`, updateError)
      }
    }

    return NextResponse.json({
      success: true,
      message: "Successfully added aliases column and updated common examples",
    })
  } catch (error) {
    console.error("Script execution error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
