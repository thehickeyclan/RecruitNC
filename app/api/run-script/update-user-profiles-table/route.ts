import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // Read and execute the SQL script
    const sqlScript = `
      -- Add name, role, and email columns to user_profiles table
      ALTER TABLE user_profiles 
      ADD COLUMN IF NOT EXISTS name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS role VARCHAR(50),
      ADD COLUMN IF NOT EXISTS email VARCHAR(255);

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
      CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

      -- Update any existing records to have a default role if needed
      UPDATE user_profiles 
      SET role = 'other' 
      WHERE role IS NULL;
    `

    const { error } = await supabase.rpc("exec_sql", { sql: sqlScript })

    if (error) {
      console.error("Error updating user_profiles table:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: "User profiles table updated successfully with name, role, and email columns",
    })
  } catch (error) {
    console.error("Update user profiles table error:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
