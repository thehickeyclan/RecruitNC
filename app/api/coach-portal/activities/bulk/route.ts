import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { ACTIVITY_TYPE_LABELS, applyActivityEffects, getDefaultActivityDescription } from "../activity-helpers"

const SUPPORTED_ACTIVITY_TYPES = new Set(
  Object.keys(ACTIVITY_TYPE_LABELS).concat([
    "visit",
    "prospect_camp",
    "watched_live",
    "letter",
    "social_media",
    "other",
  ]),
)

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      athleteIds,
      actionType,
      actionDate,
      followUpDate,
      description,
      outcome,
      isScheduled,
      viewAsCoachId,
    } = await request.json()

    if (!Array.isArray(athleteIds) || athleteIds.length === 0) {
      return NextResponse.json({ error: "Athlete IDs are required" }, { status: 400 })
    }

    if (!actionType) {
      return NextResponse.json({ error: "Activity type is required" }, { status: 400 })
    }

    if (!SUPPORTED_ACTIVITY_TYPES.has(actionType)) {
      return NextResponse.json({ error: `Unsupported activity type: ${actionType}` }, { status: 400 })
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: currentProfile, error: profileError } = await supabase
      .from("user_profiles")
      .select("user_id, full_name, school_id, is_admin")
      .eq("user_id", user.id)
      .single()

    if (profileError || !currentProfile) {
      return NextResponse.json(
        { error: "Coach profile not found. Please complete your profile setup." },
        { status: 400 },
      )
    }

    let targetCoachId = user.id
    let targetCoachName = currentProfile.full_name || "Unknown Coach"
    let targetCoachSchoolId = currentProfile.school_id

    if (viewAsCoachId && viewAsCoachId !== user.id) {
      if (!currentProfile.is_admin) {
        return NextResponse.json(
          { error: "Admin privileges required to log activity for another coach." },
          { status: 403 },
        )
      }

      const { data: impersonatedProfile, error: impersonatedError } = await supabase
        .from("user_profiles")
        .select("user_id, full_name, school_id")
        .eq("user_id", viewAsCoachId)
        .single()

      if (impersonatedError || !impersonatedProfile) {
        return NextResponse.json(
          { error: "Selected coach profile could not be found." },
          { status: 400 },
        )
      }

      targetCoachId = impersonatedProfile.user_id
      targetCoachName = impersonatedProfile.full_name || "Unknown Coach"
      targetCoachSchoolId = impersonatedProfile.school_id
    }

    if (!targetCoachSchoolId) {
      return NextResponse.json(
        { error: "You must be associated with a school to log activities." },
        { status: 400 },
      )
    }

    const actionTimestamp = actionDate
      ? actionDate.includes("T")
        ? actionDate
        : `${actionDate}T00:00:00Z`
      : new Date().toISOString()
    const followUpTimestamp =
      isScheduled && followUpDate
        ? followUpDate.includes("T")
          ? followUpDate
          : `${followUpDate}T00:00:00Z`
        : null

    const uniqueAthleteIds = Array.from(new Set<string>(athleteIds.filter(Boolean)))
    const results: Array<{
      athleteId: string
      success: boolean
      error?: string
      effects?: Record<string, unknown>
      coachName?: string
    }> = []

    for (const athleteId of uniqueAthleteIds) {
      if (!athleteId) continue

      try {
        const activityDescription =
          description && description.trim().length > 0
            ? description.trim()
            : getDefaultActivityDescription(actionType)

        const { data: insertedActivity, error: insertError } = await supabase
          .from("recruiting_actions")
          .insert({
            athlete_id: athleteId,
            coach_user_id: targetCoachId,
            action_type: actionType,
            action_date: actionTimestamp,
            follow_up_date: followUpTimestamp,
            description: activityDescription,
            outcome: outcome || null,
          })
          .select()
          .single()

        if (insertError || !insertedActivity) {
          throw insertError || new Error("Failed to insert activity record.")
        }

        const effects = await applyActivityEffects(
          supabase,
          targetCoachId,
          athleteId,
          actionType,
          actionTimestamp,
        )

        results.push({
          athleteId,
          success: true,
          effects,
          coachName: targetCoachName,
        })
      } catch (error) {
        console.error("[v0] Bulk activity error for athlete:", athleteId, error)
        results.push({
          athleteId,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    const successCount = results.filter((result) => result.success).length
    const failureCount = results.length - successCount

    return NextResponse.json({
      successCount,
      failureCount,
      results,
    })
  } catch (error) {
    console.error("[v0] Bulk activity API error:", error)
    return NextResponse.json(
      {
        error: "Failed to log activities",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

