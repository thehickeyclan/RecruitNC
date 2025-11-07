import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { ACTIVITY_TYPE_LABELS, applyActivityEffects, getDefaultActivityDescription } from "./activity-helpers"

export async function GET(request: Request) {
  try {
    console.log("[v0] GET /api/coach-portal/activities - Starting")
    const { searchParams } = new URL(request.url)
    const athleteId = searchParams.get("athleteId")
    const schoolId = searchParams.get("schoolId")

    console.log("[v0] Query params:", { athleteId, schoolId })

    if (!athleteId && !schoolId) {
      console.log("[v0] ERROR: No athleteId or schoolId provided")
      return NextResponse.json({ error: "Athlete ID or School ID required" }, { status: 400 })
    }

    const supabase = await createClient()

    if (schoolId) {
      console.log("[v0] Fetching activities for schoolId:", schoolId)

      const { data: coaches, error: coachError } = await supabase
        .from("user_profiles")
        .select("user_id")
        .eq("school_id", schoolId)

      if (coachError) {
        console.error("[v0] Error fetching coaches:", coachError)
        throw coachError
      }

      const coachUserIds = coaches?.map((c) => c.user_id) || []
      console.log("[v0] Found coaches for school:", coachUserIds.length)

      if (coachUserIds.length === 0) {
        console.log("[v0] No coaches found for school, returning empty array")
        return NextResponse.json({ activities: [] })
      }

      const { data: activities, error } = await supabase
        .from("recruiting_actions")
        .select(`
          *,
          athletes(
            id,
            firstName,
            lastName,
            photourl
          )
        `)
        .in("coach_user_id", coachUserIds)
        .order("action_date", { ascending: false })

      if (error) {
        console.error("[v0] Supabase query error:", error)
        throw error
      }

      const activityCoachIds =
        activities?.map((activity: any) => activity.coach_user_id).filter(Boolean) || []
      const uniqueCoachIds = Array.from(new Set(activityCoachIds))

      let coachNameMap: Record<string, string> = {}
      if (uniqueCoachIds.length > 0) {
        const { data: coachProfiles, error: coachProfilesError } = await supabase
          .from("user_profiles")
          .select("user_id, full_name")
          .in("user_id", uniqueCoachIds)

        if (coachProfilesError) {
          console.error("[v0] Error fetching coach names:", coachProfilesError)
        } else {
          coachNameMap = (coachProfiles || []).reduce<Record<string, string>>((acc, profile) => {
            acc[profile.user_id] = profile.full_name || "Unknown Coach"
            return acc
          }, {})
        }
      }

      console.log("[v0] Raw activities from database:", activities?.length || 0, "records")
      console.log("[v0] First activity sample:", activities?.[0])

      const transformedActivities =
        activities?.map((activity: any) => ({
          ...activity,
          athlete_name: `${activity.athletes?.firstName || ""} ${activity.athletes?.lastName || ""}`.trim(),
          athlete_photo: activity.athletes?.photourl || "",
          coach_name: coachNameMap[activity.coach_user_id] || "Unknown Coach",
        })) || []

      console.log("[v0] Transformed activities:", transformedActivities.length, "records")
      console.log("[v0] Sample transformed activity:", transformedActivities[0])

      return NextResponse.json({ activities: transformedActivities })
    }

    if (athleteId) {
      console.log("[v0] Filtering by athleteId:", athleteId)

      const { data: activities, error } = await supabase
        .from("recruiting_actions")
        .select(`
          *,
          athletes(
            id,
            firstName,
            lastName,
            photourl
          )
        `)
        .eq("athlete_id", athleteId)
        .order("action_date", { ascending: false })

      if (error) {
        console.error("[v0] Supabase query error:", error)
        throw error
      }

      const activityCoachIds =
        activities?.map((activity: any) => activity.coach_user_id).filter(Boolean) || []
      const uniqueCoachIds = Array.from(new Set(activityCoachIds))

      let coachNameMap: Record<string, string> = {}
      if (uniqueCoachIds.length > 0) {
        const { data: coachProfiles, error: coachProfilesError } = await supabase
          .from("user_profiles")
          .select("user_id, full_name")
          .in("user_id", uniqueCoachIds)

        if (coachProfilesError) {
          console.error("[v0] Error fetching coach names:", coachProfilesError)
        } else {
          coachNameMap = (coachProfiles || []).reduce<Record<string, string>>((acc, profile) => {
            acc[profile.user_id] = profile.full_name || "Unknown Coach"
            return acc
          }, {})
        }
      }

      console.log("[v0] Raw activities from database:", activities?.length || 0, "records")

      const transformedActivities =
        activities?.map((activity: any) => ({
          ...activity,
          athlete_name: `${activity.athletes?.firstName || ""} ${activity.athletes?.lastName || ""}`.trim(),
          athlete_photo: activity.athletes?.photourl || "",
          coach_name: coachNameMap[activity.coach_user_id] || "Unknown Coach",
        })) || []

      return NextResponse.json({ activities: transformedActivities })
    }

    return NextResponse.json({ activities: [] })
  } catch (error) {
    console.error("[v0] Error fetching activities:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch activities",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { athleteId, actionType, actionDate, followUpDate, description, outcome } = await request.json()

    console.log("[v0] POST /api/coach-portal/activities - Request body:", {
      athleteId,
      actionType,
      actionDate,
      followUpDate,
      description,
      outcome,
    })

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Current user:", user.id)

    const { data: coachProfile, error: profileError } = await supabase
      .from("user_profiles")
      .select("id, school_id, full_name")
      .eq("user_id", user.id)
      .single()

    if (profileError || !coachProfile) {
      console.error("[v0] Coach profile not found:", profileError)
      return NextResponse.json(
        { error: "Coach profile not found. Please complete your profile setup." },
        { status: 400 },
      )
    }

    if (!coachProfile.school_id) {
      console.error("[v0] Coach has no school_id")
      return NextResponse.json({ error: "You must be associated with a school to log activities." }, { status: 400 })
    }

    console.log("[v0] Coach profile:", coachProfile)

    if (!athleteId || !actionType) {
      return NextResponse.json({ error: "Athlete ID and action type are required" }, { status: 400 })
    }

    if (!ACTIVITY_TYPE_LABELS[actionType] && !["visit", "event", "letter", "other", "prospect_camp", "watched_live", "social_media"].includes(actionType)) {
      return NextResponse.json({ error: `Unsupported activity type: ${actionType}` }, { status: 400 })
    }

    const nowIso = new Date().toISOString()
    const timestamp = actionDate ? (actionDate.includes("T") ? actionDate : `${actionDate}T00:00:00Z`) : nowIso
    const followUpTimestamp = followUpDate
      ? followUpDate.includes("T")
        ? followUpDate
        : `${followUpDate}T00:00:00Z`
      : null

    const activityDescription = description && description.trim().length > 0 ? description.trim() : getDefaultActivityDescription(actionType)

    const insertData = {
      athlete_id: athleteId,
      coach_user_id: user.id,
      action_type: actionType,
      action_date: timestamp,
      follow_up_date: followUpTimestamp,
      description: activityDescription,
      outcome: outcome || null,
    }
    console.log("[v0] Attempting to insert:", insertData)

    const { data, error } = await supabase.from("recruiting_actions").insert(insertData).select().single()

    if (error) {
      console.error("[v0] Supabase insert error:", error)
      console.error("[v0] Error details:", JSON.stringify(error, null, 2))
      throw error
    }

    console.log("[v0] Activity created successfully:", data)

    const effects = await applyActivityEffects(supabase, user.id, athleteId, actionType, timestamp)

    const activityWithCoach = {
      ...data,
      coach_name: coachProfile.full_name || "Unknown Coach",
    }

    return NextResponse.json({ activity: activityWithCoach, effects })
  } catch (error) {
    console.error("[v0] Error adding activity:", error)
    return NextResponse.json(
      {
        error: "Failed to create activity",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { activityId, actionType, actionDate, followUpDate, description, outcome } = body

    if (!activityId) {
      return NextResponse.json({ error: "Activity ID required" }, { status: 400 })
    }

    const supabase = await createClient()

    const timestamp = actionDate.includes("T") ? actionDate : `${actionDate}T00:00:00Z`
    const followUpTimestamp = followUpDate
      ? followUpDate.includes("T")
        ? followUpDate
        : `${followUpDate}T00:00:00Z`
      : null

    const { data, error } = await supabase
      .from("recruiting_actions")
      .update({
        action_type: actionType,
        action_date: timestamp,
        follow_up_date: followUpTimestamp,
        description: description,
        outcome: outcome || null,
      })
      .eq("id", activityId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ activity: data })
  } catch (error) {
    console.error("Error updating activity:", error)
    return NextResponse.json({ error: "Failed to update activity" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const activityId = searchParams.get("activityId")

    if (!activityId) {
      return NextResponse.json({ error: "Activity ID required" }, { status: 400 })
    }

    const supabase = await createClient()

    const { error } = await supabase.from("recruiting_actions").delete().eq("id", activityId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting activity:", error)
    return NextResponse.json({ error: "Failed to delete activity" }, { status: 500 })
  }
}
