import type { SupabaseClient } from "@supabase/supabase-js"

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  call: "Phone Call",
  text: "Text Message",
  email: "Email",
  visit: "Campus Visit",
  event: "Event",
  letter: "Handwritten Letter",
  other: "Other",
  prospect_camp: "Prospect Camp",
  watched_live: "Watched Live",
  social_media: "Social Media",
}

const STAGE_ORDER = [
  "Prospect",
  "Contacted",
  "Recruiting",
  "Visited",
  "Offered",
  "Committed",
  "Signed",
  "Lost",
]

const COMMUNICATION_ACTIVITY_TYPES = new Set(["call", "text", "email", "letter", "social_media"])

export const getDefaultActivityDescription = (actionType: string): string => {
  const label = ACTIVITY_TYPE_LABELS[actionType] || "Activity"
  return `${label} logged from coach portal`
}

const getStageIndex = (stage: string | null | undefined) => {
  if (!stage) return -1
  return STAGE_ORDER.indexOf(stage)
}

interface ActivityEffectResult {
  pipeline_stage?: string
}

export async function applyActivityEffects(
  supabase: SupabaseClient,
  coachUserId: string,
  athleteId: string,
  actionType: string,
  timestampIso: string,
): Promise<ActivityEffectResult> {
  try {
    const { data: existingStar } = await supabase
      .from("college_coach_stars")
      .select(
        "pipeline_stage, first_contact_date, first_contact_method, campus_visit_date, campus_visit_type, official_visit_date, starred_at",
      )
      .eq("coach_user_id", coachUserId)
      .eq("athlete_id", athleteId)
      .single()

    const updatePayload: Record<string, any> = {}
    let desiredStage: string | null = null

    if (COMMUNICATION_ACTIVITY_TYPES.has(actionType)) {
      desiredStage = "Contacted"
      if (!existingStar?.first_contact_date) {
        updatePayload.first_contact_date = timestampIso
        updatePayload.first_contact_method = actionType
      }
    }

    if (actionType === "visit") {
      desiredStage = "Visited"
      updatePayload.campus_visit_date = timestampIso
      updatePayload.campus_visit_type = "official"
    }

    if (actionType === "prospect_camp") {
      desiredStage = "Visited"
      updatePayload.campus_visit_date = timestampIso
      updatePayload.campus_visit_type = "camp"
    }

    if (actionType === "watched_live") {
      desiredStage = "Recruiting"
    }

    if (desiredStage) {
      const currentIndex = getStageIndex(existingStar?.pipeline_stage)
      const desiredIndex = getStageIndex(desiredStage)
      if (desiredIndex > currentIndex) {
        updatePayload.pipeline_stage = desiredStage
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return { pipeline_stage: existingStar?.pipeline_stage || undefined }
    }

    const { data: upserted, error: upsertError } = await supabase
      .from("college_coach_stars")
      .upsert(
        {
          coach_user_id: coachUserId,
          athlete_id: athleteId,
          starred_at: existingStar?.starred_at || new Date().toISOString(),
          ...updatePayload,
        },
        {
          onConflict: "coach_user_id,athlete_id",
        },
      )
      .select("pipeline_stage")
      .single()

    if (upsertError) {
      console.error("[activity-effects] Failed to apply milestone updates", upsertError)
      return { pipeline_stage: existingStar?.pipeline_stage || undefined }
    }

    return { pipeline_stage: upserted?.pipeline_stage || updatePayload.pipeline_stage || existingStar?.pipeline_stage }
  } catch (error) {
    console.error("[activity-effects] Error applying activity effects", error)
    return { pipeline_stage: undefined }
  }
}

