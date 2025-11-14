import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const supabase = createClient()

    // Read and execute the SQL script
    const sqlScript = `
      -- Update user_profiles table to include all required fields
      ALTER TABLE user_profiles 
      ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS full_name VARCHAR(200),
      ADD COLUMN IF NOT EXISTS cell_phone VARCHAR(20),
      ADD COLUMN IF NOT EXISTS role VARCHAR(50);

      -- Update existing records to split name if they exist
      UPDATE user_profiles 
      SET 
        first_name = COALESCE(first_name, SPLIT_PART(COALESCE(name, ''), ' ', 1)),
        last_name = COALESCE(last_name, CASE 
          WHEN ARRAY_LENGTH(STRING_TO_ARRAY(COALESCE(name, ''), ' '), 1) > 1 
          THEN ARRAY_TO_STRING(ARRAY_REMOVE(STRING_TO_ARRAY(COALESCE(name, ''), ' ')[2:], ''), ' ')
          ELSE ''
        END),
        full_name = COALESCE(full_name, name, CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))),
        role = COALESCE(role, 'fan')
      WHERE first_name IS NULL OR last_name IS NULL OR full_name IS NULL OR role IS NULL;

      -- Create indexes for performance
      CREATE INDEX IF NOT EXISTS idx_user_profiles_names ON user_profiles(first_name, last_name);
      CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
      CREATE INDEX IF NOT EXISTS idx_user_profiles_cell_phone ON user_profiles(cell_phone);
    `

    const { error } = await supabase.rpc("exec", { sql: sqlScript })

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to update user_profiles table" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "User profiles table updated successfully with new fields",
    })
  } catch (error) {
    console.error("Script execution error:", error)
    return NextResponse.json({ error: "Failed to execute script" }, { status: 500 })
  }
}
