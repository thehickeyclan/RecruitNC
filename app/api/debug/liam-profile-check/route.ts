import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = createClient()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Search for all Liam Hickey records
    const { data: liamRecords, error: athletesError } = await supabase
      .from("athletes")
      .select(
        `
        id,
        name,
        college,
        high_school,
        graduation_year,
        weight_class,
        gender,
        commitment_date,
        image_url,
        claimed_by_user_id,
        claimed_at,
        profile_verified,
        created_at,
        updated_at
      `,
      )
      .ilike("name", "%liam%hickey%")
      .order("created_at", { ascending: false })

    if (athletesError) {
      console.error("Error fetching Liam records:", athletesError)
      return NextResponse.json({ error: "Failed to fetch athlete records" }, { status: 500 })
    }

    // Get user profiles for claimed records
    const claimedUserIds = liamRecords
      ?.filter((record) => record.claimed_by_user_id)
      .map((record) => record.claimed_by_user_id)
      .filter((id, index, arr) => arr.indexOf(id) === index) // unique IDs

    let userProfiles: any[] = []
    if (claimedUserIds && claimedUserIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from("user_profiles")
        .select("user_id, email, full_name, is_admin")
        .in("user_id", claimedUserIds)

      if (!profilesError && profiles) {
        userProfiles = profiles
      }
    }

    // Enhance records with user info
    const enhancedRecords = liamRecords?.map((record) => {
      const userProfile = userProfiles.find((profile) => profile.user_id === record.claimed_by_user_id)

      return {
        id: record.id,
        name: record.name,
        college: record.college,
        highschool: record.high_school,
        graduationyear: record.graduation_year,
        weightclass: record.weight_class,
        gender: record.gender,
        commitmentdate: record.commitment_date,
        photourl: record.image_url,
        image_url: record.image_url,
        claimed_by_user_id: record.claimed_by_user_id,
        claimed_at: record.claimed_at,
        profile_verified: record.profile_verified,
        user_email: userProfile?.email,
        user_full_name: userProfile?.full_name,
        user_is_admin: userProfile?.is_admin,
        is_claimed_by_current_user: record.claimed_by_user_id === user.id,
        created_at: record.created_at,
        updated_at: record.updated_at,
      }
    })

    const claimedRecords = enhancedRecords?.filter((record) => record.claimed_by_user_id) || []

    return NextResponse.json({
      currentUser: {
        id: user.id,
        email: user.email,
      },
      liamRecords: enhancedRecords || [],
      totalRecords: enhancedRecords?.length || 0,
      claimedRecords: claimedRecords.length,
      userProfiles,
    })
  } catch (error) {
    console.error("Error in liam-profile-check:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
