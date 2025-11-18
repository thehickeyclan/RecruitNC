"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { mapAthleteToDb, mapDbToAthlete } from "./athlete-utils"

export async function getAthletesAction() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from("athletes").select("*").order("name")

    if (error) {
      console.error("Error fetching athletes:", error)
      return { success: false, error: error.message }
    }

    // Map database fields to frontend fields
    const athletes = await Promise.all(data.map((athlete: any) => mapDbToAthlete(athlete)))

    return { success: true, data: athletes }
  } catch (error) {
    console.error("Error in getAthletesAction:", error)
    return { success: false, error: "Failed to fetch athletes" }
  }
}

export async function getAthleteByIdAction(id: string) {
  try {
    console.log("[v0] getAthleteByIdAction - Fetching athlete with ID:", id)

    const supabase = await createClient()

    const { data, error } = await supabase.from("athletes").select("*").eq("id", id).single()

    if (error) {
      console.error("[v0] getAthleteByIdAction - Supabase error:", error)
      return { success: false, error: error.message }
    }

    if (!data) {
      console.error("[v0] getAthleteByIdAction - No data returned for ID:", id)
      return { success: false, error: "Athlete not found" }
    }

    console.log("[v0] getAthleteByIdAction - Raw data from database:", {
      id: data.id,
      name: data.name,
      hasPhotoUrl: !!data.photourl,
      hasCollege: !!data.college,
    })

    // Map database fields to frontend fields
    const athlete = await mapDbToAthlete(data)

    console.log("[v0] getAthleteByIdAction - Mapped athlete:", {
      id: athlete.id,
      name: athlete.name,
      hasPhotoUrl: !!athlete.photoUrl,
      hasCollege: !!athlete.college,
    })

    return { success: true, data: athlete }
  } catch (error) {
    console.error("[v0] getAthleteByIdAction - Unexpected error:", error)
    return {
      success: false,
      error: "Failed to fetch athlete: " + (error instanceof Error ? error.message : String(error)),
    }
  }
}

export async function updateAthleteAction(id: string, athleteData: any) {
  try {
    console.log("[v0] updateAthleteAction called with:", { id, phone: athleteData.phone })

    // Validate required fields
    if (!athleteData.firstName || !athleteData.lastName) {
      return {
        success: false,
        error: "First name and last name are required",
      }
    }

    // Ensure name is set correctly
    if (!athleteData.name) {
      athleteData.name = `${athleteData.firstName} ${athleteData.lastName}`.trim()
    }

    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    const { data: previousAthlete } = await adminSupabase
      .from("athletes")
      .select("id, name, college, recruiting_status")
      .eq("id", id)
      .single()

    // Map frontend fields to database fields (including phone)
    const dbData = await mapAthleteToDb(athleteData)
    console.log("[v0] Updating athlete with data:", dbData)

    // Perform the update with error handling
    const { data, error } = await supabase.from("athletes").update(dbData).eq("id", id).select().single()

    if (error) {
      console.error("Error updating athlete:", error)
      return { success: false, error: error.message }
    }

    if (!data) {
      return { success: false, error: "Failed to update athlete" }
    }

    console.log("[v0] Athlete updated successfully")

    try {
      await autoAlignCommittedAthleteToSchool({
        adminSupabase,
        athleteRecord: data,
        previousRecruitingStatus: previousAthlete?.recruiting_status || null,
      })
    } catch (syncError) {
      console.error("[auto-commit] Failed to auto-align committed athlete:", syncError)
    }

    // Map database fields back to frontend fields for the response
    const updatedAthlete = await mapDbToAthlete(data)

    // Revalidate the athletes list and the individual athlete page
    revalidatePath("/admin/athletes")
    revalidatePath(`/athletes/${id}`)
    revalidatePath("/")

    return { success: true, data: updatedAthlete }
  } catch (error) {
    console.error("Error in updateAthleteAction:", error)
    return {
      success: false,
      error: "Failed to update athlete: " + (error instanceof Error ? error.message : String(error)),
    }
  }
}

export async function createAthleteAction(athleteData: any) {
  try {
    // Validate required fields
    if (!athleteData.firstName || !athleteData.lastName) {
      return {
        success: false,
        error: "First name and last name are required",
      }
    }

    // Ensure name is set correctly
    if (!athleteData.name) {
      athleteData.name = `${athleteData.firstName} ${athleteData.lastName}`.trim()
    }

    // Map frontend fields to database fields
    const dbData = await mapAthleteToDb(athleteData)

    const supabase = await createClient()
    const { data, error } = await supabase.from("athletes").insert([dbData]).select().single()

    if (error) {
      console.error("Error creating athlete:", error)
      return { success: false, error: error.message }
    }

    if (!data) {
      return { success: false, error: "Failed to create athlete" }
    }

    // Map database fields back to frontend fields for the response
    const newAthlete = await mapDbToAthlete(data)

    // Revalidate the athletes list
    revalidatePath("/admin/athletes")
    revalidatePath("/")

    return { success: true, data: newAthlete }
  } catch (error) {
    console.error("Error in createAthleteAction:", error)
    return {
      success: false,
      error: "Failed to create athlete: " + (error instanceof Error ? error.message : String(error)),
    }
  }
}

export async function deleteAthleteAction(id: string) {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from("athletes").delete().eq("id", id)

    if (error) {
      console.error("Error deleting athlete:", error)
      return { success: false, error: error.message }
    }

    // Revalidate the athletes list
    revalidatePath("/admin/athletes")
    revalidatePath("/")

    return { success: true }
  } catch (error) {
    console.error("Error in deleteAthleteAction:", error)
    return { success: false, error: "Failed to delete athlete" }
  }
}

const COMMITTED_STATUSES = ["committed", "signed"]

const SCHOOL_NAME_STRIP_REGEX = /(College|University|Institute|School)$/i

function isCommittedStatus(status?: string | null) {
  if (!status) return false
  const normalized = status.trim().toLowerCase()
  return COMMITTED_STATUSES.includes(normalized)
}

function buildSchoolNameVariations(collegeName: string) {
  const trimmed = collegeName.trim()
  const variations = new Set<string>()
  variations.add(trimmed)
  const stripped = trimmed.replace(SCHOOL_NAME_STRIP_REGEX, "").trim()
  if (stripped) variations.add(stripped)
  const firstWord = trimmed.split(" ")[0]
  if (firstWord && firstWord.length > 2) variations.add(firstWord)
  return Array.from(variations).filter((value) => value.length > 1)
}

async function findSchoolByCollegeName(adminSupabase: ReturnType<typeof createAdminClient>, collegeName: string) {
  const variations = buildSchoolNameVariations(collegeName)
  for (const variation of variations) {
    const { data, error } = await adminSupabase
      .from("schools")
      .select("id, name")
      .ilike("name", `%${variation}%`)
      .limit(1)
    if (error) {
      console.error("[auto-commit] Error searching schools:", error)
      continue
    }
    if (data && data.length > 0) {
      return data[0]
    }
  }
  return null
}

async function autoAlignCommittedAthleteToSchool({
  adminSupabase,
  athleteRecord,
  previousRecruitingStatus,
}: {
  adminSupabase: ReturnType<typeof createAdminClient>
  athleteRecord: any
  previousRecruitingStatus: string | null
}) {
  const newStatus = athleteRecord?.recruiting_status || athleteRecord?.recruitingStatus || ""
  const collegeName = athleteRecord?.college || ""

  if (!isCommittedStatus(newStatus) || !collegeName) {
    return
  }

  if (isCommittedStatus(previousRecruitingStatus) && previousRecruitingStatus === newStatus) {
    // Already committed before this update; still continue to ensure pipeline alignment
    console.log("[auto-commit] Athlete was already committed; verifying pipeline alignment.")
  }

  const school = await findSchoolByCollegeName(adminSupabase, collegeName)
  if (!school) {
    console.warn("[auto-commit] No school found matching college name:", collegeName)
    return
  }

  const { data: schoolCoaches, error: schoolCoachError } = await adminSupabase
    .from("user_profiles")
    .select("user_id")
    .eq("school_id", school.id)

  if (schoolCoachError) {
    console.error("[auto-commit] Error fetching coaches for school:", schoolCoachError)
    return
  }

  let coachIds =
    schoolCoaches
      ?.map((coach: { user_id: string | null }) => coach.user_id)
      .filter((id: string | null): id is string => !!id) || []
  if (coachIds.length === 0) {
    console.warn("[auto-commit] No coaches associated with school:", school.name, "- falling back to admin coach.")
    const { data: fallbackAdmin, error: fallbackError } = await adminSupabase
      .from("user_profiles")
      .select("user_id")
      .or("is_admin.eq.true,role.eq.admin")
      .limit(1)
      .single()
    if (fallbackError) {
      console.error("[auto-commit] Failed to fetch fallback admin coach:", fallbackError)
      return
    }
    if (!fallbackAdmin?.user_id) {
      console.warn("[auto-commit] No fallback admin coach available; aborting auto-align.")
      return
    }
    coachIds = [fallbackAdmin.user_id]
  }

  const { data: existingStars, error: existingStarsError } = await adminSupabase
    .from("college_coach_stars")
    .select("id, coach_user_id, pipeline_stage")
    .eq("athlete_id", athleteRecord.id)
    .in("coach_user_id", coachIds)

  if (existingStarsError) {
    console.error("[auto-commit] Error checking existing stars:", existingStarsError)
    return
  }

  const committedPayload = {
    pipeline_stage: "Committed",
    interest_level: "high",
    committed_date: new Date().toISOString(),
  }

  if (existingStars && existingStars.length > 0) {
    const ids = existingStars.map((star: { id: string }) => star.id)
    await adminSupabase.from("college_coach_stars").update(committedPayload).in("id", ids)
    console.log("[auto-commit] Updated existing star records to Committed for school:", school.name)
    return
  }

  const targetCoachId = coachIds[0]
  await adminSupabase.from("college_coach_stars").insert({
    coach_user_id: targetCoachId,
    athlete_id: athleteRecord.id,
    pipeline_stage: "Committed",
    interest_level: "high",
    notes: `Auto-added on ${new Date().toLocaleDateString()} – committed to ${collegeName}`,
    starred_at: new Date().toISOString(),
    committed_date: new Date().toISOString(),
  })
  console.log(
    "[auto-commit] Added athlete to school pipeline:",
    athleteRecord.name || athleteRecord.id,
    "->",
    school.name,
  )
}

export async function getAthletes() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from("athletes").select("*").order("name")

    if (error) {
      console.error("Error fetching athletes:", error)
      return { success: false, error: error.message }
    }

    return data
  } catch (error) {
    console.error("Error in getAthletes:", error)
    return null
  }
}
