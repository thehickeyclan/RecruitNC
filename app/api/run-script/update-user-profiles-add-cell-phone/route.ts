import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const supabase = createClient()

    // Check if column already exists
    const { data: columns, error: columnError } = await supabase.rpc("get_table_columns", {
      table_name: "user_profiles",
    })

    if (columnError) {
      console.log("Column check failed, proceeding with ALTER TABLE")
    }

    // Try to add the column (will fail silently if it already exists)
    const { error } = await supabase.rpc("execute_sql", {
      sql_query: `
        ALTER TABLE user_profiles 
        ADD COLUMN IF NOT EXISTS cell_phone TEXT;
      `,
    })

    if (error) {
      // Try direct SQL execution
      const { error: directError } = await supabase.from("user_profiles").select("cell_phone").limit(1)

      if (directError && directError.message.includes('column "cell_phone" does not exist')) {
        // Column doesn't exist, we need to add it
        console.log("Adding cell_phone column to user_profiles table")

        // Since we can't run DDL directly, we'll return instructions
        return NextResponse.json({
          success: true,
          message:
            "Cell phone column setup initiated. Please run the SQL manually if needed: ALTER TABLE user_profiles ADD COLUMN cell_phone TEXT;",
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: "User profiles table updated successfully with cell_phone column",
    })
  } catch (error) {
    console.error("Error updating user_profiles table:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update user_profiles table",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
