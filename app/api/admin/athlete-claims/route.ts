import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // Fetch claimed athletes with only existing columns
    const { data: athletes, error: athletesError } = await supabase
      .from("athletes")
      .select(`
        id,
        name,
        highschool,
        college,
        division,
        weightclass,
        graduationyear,
        commitmentdate,
        photourl,
        achievements,
        bio,
        gender,
        claimed_by_user_id,
        created_at,
        updated_at
      `)
      .not("claimed_by_user_id", "is", null)
      .order("created_at", { ascending: false })

    if (athletesError) {
      console.error("Error fetching claimed athletes:", athletesError)
      return NextResponse.json({ error: `Database error: ${athletesError.message}` }, { status: 500 })
    }

    // Get user emails for claimed athletes
    const userIds = athletes?.map((athlete) => athlete.claimed_by_user_id).filter(Boolean) || []

    let userEmails: { [key: string]: string } = {}

    if (userIds.length > 0) {
      const { data: userProfiles, error: profilesError } = await supabase
        .from("user_profiles")
        .select("user_id, email")
        .in("user_id", userIds)

      if (!profilesError && userProfiles) {
        userEmails = userProfiles.reduce(
          (acc, profile) => {
            acc[profile.user_id] = profile.email
            return acc
          },
          {} as { [key: string]: string },
        )
      }
    }

    // Check for pending edit requests for each athlete
    const athleteIds = athletes?.map((a) => a.id) || []
    let pendingEdits: { [key: string]: boolean } = {}

    if (athleteIds.length > 0) {
      // Try to check edit requests table, but handle if it doesn't exist
      try {
        const { data: editRequests } = await supabase
          .from("edit_requests")
          .select("athlete_id")
          .in("athlete_id", athleteIds)
          .eq("status", "pending")

        if (editRequests) {
          pendingEdits = editRequests.reduce(
            (acc, req) => {
              if (req.athlete_id) {
                acc[req.athlete_id] = true
              }
              return acc
            },
            {} as { [key: string]: boolean },
          )
        }
      } catch (editError) {
        console.log("Edit requests table not available:", editError)
        // Continue without edit request data
      }
    }

    // Format the response with Phase 1 focus (commitment verification)
    const formattedClaims =
      athletes?.map((athlete) => {
        const nameParts = athlete.name ? athlete.name.split(" ") : ["", ""]
        const firstName = nameParts[0] || ""
        const lastName = nameParts.slice(1).join(" ") || ""

        return {
          id: athlete.id,
          name: athlete.name,
          first_name: firstName,
          last_name: lastName,
          high_school: athlete.highschool,
          college: athlete.college,
          division: athlete.division,
          weight_class: athlete.weightclass,
          graduation_year: athlete.graduationyear,
          commitment_date: athlete.commitmentdate,
          photo_url: athlete.photourl,
          achievements: athlete.achievements,
          bio: athlete.bio,
          gender: athlete.gender,
          claimed_by_user_id: athlete.claimed_by_user_id,
          claimed_at: athlete.created_at, // Use created_at as claimed_at for now
          updated_at: athlete.updated_at,
          user_email: userEmails[athlete.claimed_by_user_id] || "Unknown",
          is_verified: false, // Default to false until we add verification columns
          profile_confirmed_at: null,
          profile_confirmed_by: null,
          has_pending_edits: !!pendingEdits[athlete.id],
          // Phase 1 specific fields
          needs_photo:
            !athlete.photourl ||
            athlete.photourl.includes("placeholder") ||
            athlete.photourl.includes("wrestler-silhouette"),
          is_class_2025: athlete.graduationyear === 2025,
          commitment_ready: !!(
            athlete.college &&
            athlete.photourl &&
            !athlete.photourl.includes("placeholder") &&
            !athlete.photourl.includes("wrestler-silhouette")
          ),
        }
      }) || []

    // Sort by priority for Phase 1: Class 2025 first, then by claim date
    formattedClaims.sort((a, b) => {
      // Class 2025 gets priority
      if (a.is_class_2025 && !b.is_class_2025) return -1
      if (!a.is_class_2025 && b.is_class_2025) return 1

      // Then by verification status (unverified first)
      if (!a.is_verified && b.is_verified) return -1
      if (a.is_verified && !b.is_verified) return 1

      // Then by claim date (newest first)
      return new Date(b.claimed_at).getTime() - new Date(a.claimed_at).getTime()
    })

    return NextResponse.json({
      claims: formattedClaims,
      total: formattedClaims.length,
      stats: {
        total: formattedClaims.length,
        pending: formattedClaims.filter((c) => !c.is_verified).length,
        verified: formattedClaims.filter((c) => c.is_verified).length,
        class_2025: formattedClaims.filter((c) => c.is_class_2025).length,
        needs_photo: formattedClaims.filter((c) => c.needs_photo).length,
        commitment_ready: formattedClaims.filter((c) => c.commitment_ready).length,
      },
    })
  } catch (error) {
    console.error("Error in athlete claims API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
