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

    // Check current profile types before migration
    const { data: currentTypes, error: typesError } = await supabase
      .from("user_profiles")
      .select("profile_type")
      .not("profile_type", "is", null)

    if (typesError) {
      console.error("Error fetching current profile types:", typesError)
      return NextResponse.json({ error: "Failed to fetch current profile types" }, { status: 500 })
    }

    const typesCounts = currentTypes?.reduce((acc: any, row: any) => {
      acc[row.profile_type] = (acc[row.profile_type] || 0) + 1
      return acc
    }, {})

    console.log("Current profile types distribution:", typesCounts)

    // Convert existing recruiter entries to college-coach
    const { error: recruiterError } = await supabase
      .from("user_profiles")
      .update({ profile_type: "college-coach" })
      .eq("profile_type", "recruiter")

    if (recruiterError) {
      console.error("Error converting recruiter entries:", recruiterError)
    }

    // Convert underscore format to hyphen format
    const { error: collegeError } = await supabase
      .from("user_profiles")
      .update({ profile_type: "college-coach" })
      .eq("profile_type", "college_coach")

    if (collegeError) {
      console.error("Error converting college_coach entries:", collegeError)
    }

    const { error: hsError } = await supabase
      .from("user_profiles")
      .update({ profile_type: "hs-club-coach" })
      .eq("profile_type", "high_school_coach")

    if (hsError) {
      console.error("Error converting high_school_coach entries:", hsError)
    }

    // Update any null values to 'fan'
    const { error: nullError } = await supabase
      .from("user_profiles")
      .update({ profile_type: "fan" })
      .is("profile_type", null)

    if (nullError) {
      console.error("Error updating null profile types:", nullError)
    }

    // Check final profile types after migration
    const { data: finalTypes, error: finalError } = await supabase
      .from("user_profiles")
      .select("profile_type")
      .not("profile_type", "is", null)

    const finalTypesCounts = finalTypes?.reduce((acc: any, row: any) => {
      acc[row.profile_type] = (acc[row.profile_type] || 0) + 1
      return acc
    }, {})

    return NextResponse.json({
      success: true,
      message: "Profile types consistency fixed successfully",
      before: typesCounts,
      after: finalTypesCounts,
      note: "You still need to run the database constraint update manually in Supabase dashboard",
      sql: `
-- Drop the old constraint
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS check_profile_type;

-- Add the new consistent constraint
ALTER TABLE user_profiles 
ADD CONSTRAINT check_profile_type 
CHECK (profile_type IN ('parent', 'athlete', 'college-coach', 'hs-club-coach', 'referee', 'fan', 'media', 'admin'));
      `,
    })
  } catch (error) {
    console.error("Script execution error:", error)
    return NextResponse.json({ error: "Internal server error: " + error }, { status: 500 })
  }
}
