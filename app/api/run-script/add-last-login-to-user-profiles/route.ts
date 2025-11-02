import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const supabase = createClient()

    // Add last_login_at column to user_profiles table
    const { error: alterError } = await supabase.rpc("exec_sql", {
      sql: `
        ALTER TABLE user_profiles 
        ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
        
        CREATE INDEX IF NOT EXISTS idx_user_profiles_last_login_at 
        ON user_profiles(last_login_at);
      `,
    })

    if (alterError) {
      // Try alternative approach using direct SQL
      const { error: directError } = await supabase.from("user_profiles").select("last_login_at").limit(1)

      if (directError && directError.message.includes('column "last_login_at" does not exist')) {
        // Column doesn't exist, we need to add it manually
        console.error("Column doesn't exist and couldn't be added automatically:", alterError)
        return NextResponse.json(
          {
            success: false,
            message:
              "Please add the last_login_at column manually in your database:\n\nALTER TABLE user_profiles ADD COLUMN last_login_at TIMESTAMP WITH TIME ZONE;",
          },
          { status: 500 },
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: "Successfully added last_login_at column to user_profiles table",
    })
  } catch (error: any) {
    console.error("Script execution error:", error)
    return NextResponse.json(
      {
        success: false,
        message: `Error: ${error.message}`,
      },
      { status: 500 },
    )
  }
}
