import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

const SCHOOL_NAME_STRIP_REGEX = /(?:College|University|Institute|School|of|the)\s*/gi

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
      console.error("[fix-committed] Error searching schools:", error)
      continue
    }
    if (data && data.length > 0) {
      return data[0]
    }
  }
  return null
}

function isCommittedStatus(status?: string | null) {
  if (!status) return false
  const COMMITTED_STATUSES = ["committed", "signed", "college athlete"]
  const normalized = status.trim().toLowerCase()
  return COMMITTED_STATUSES.includes(normalized)
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_admin, role")
      .eq("user_id", user.id)
      .single()

    if (!profile?.is_admin && profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { athleteId, athleteName, collegeName } = await request.json()

    const adminSupabase = createAdminClient()

    // If athleteId provided, fetch that athlete
    // Otherwise, if athleteName and collegeName provided, search for them
    let athlete: any = null

    if (athleteId) {
      const { data, error } = await adminSupabase
        .from("athletes")
        .select("id, name, college, recruiting_status")
        .eq("id", athleteId)
        .single()
      
      if (error || !data) {
        return NextResponse.json({ error: "Athlete not found" }, { status: 404 })
      }
      athlete = data
    } else if (athleteName && collegeName) {
      const { data, error } = await adminSupabase
        .from("athletes")
        .select("id, name, college, recruiting_status")
        .ilike("name", `%${athleteName}%`)
        .ilike("college", `%${collegeName}%`)
        .limit(1)
        .single()
      
      if (error || !data) {
        return NextResponse.json({ error: "Athlete not found" }, { status: 404 })
      }
      athlete = data
    } else {
      return NextResponse.json({ error: "Must provide athleteId or both athleteName and collegeName" }, { status: 400 })
    }

    // Check if athlete is committed
    if (!isCommittedStatus(athlete.recruiting_status) || !athlete.college) {
      return NextResponse.json({ 
        error: "Athlete is not committed or missing college name",
        athlete: { name: athlete.name, college: athlete.college, status: athlete.recruiting_status }
      }, { status: 400 })
    }

    // Find the school
    const school = await findSchoolByCollegeName(adminSupabase, athlete.college)
    if (!school) {
      return NextResponse.json({ 
        error: `No school found matching college name: ${athlete.college}`,
        athlete: { name: athlete.name, college: athlete.college }
      }, { status: 404 })
    }

    // Get coaches for this school
    const { data: schoolCoaches, error: schoolCoachError } = await adminSupabase
      .from("user_profiles")
      .select("user_id")
      .eq("school_id", school.id)

    if (schoolCoachError) {
      return NextResponse.json({ error: "Error fetching coaches for school" }, { status: 500 })
    }

    let coachIds = schoolCoaches?.map((coach: { user_id: string | null }) => coach.user_id).filter((id: string | null): id is string => !!id) || []
    
    if (coachIds.length === 0) {
      // Fallback to admin coach
      const { data: fallbackAdmin } = await adminSupabase
        .from("user_profiles")
        .select("user_id")
        .or("is_admin.eq.true,role.eq.admin")
        .limit(1)
        .single()
      
      if (!fallbackAdmin?.user_id) {
        return NextResponse.json({ error: "No coaches found for school and no admin fallback available" }, { status: 404 })
      }
      coachIds = [fallbackAdmin.user_id]
    }

    // Check for existing stars
    const { data: existingStars } = await adminSupabase
      .from("college_coach_stars")
      .select("id, coach_user_id, pipeline_stage")
      .eq("athlete_id", athlete.id)
      .in("coach_user_id", coachIds)

    const committedPayload = {
      pipeline_stage: "Committed",
      interest_level: "high",
      committed_date: new Date().toISOString(),
    }

    if (existingStars && existingStars.length > 0) {
      // Update existing stars
      const ids = existingStars.map((star: { id: string }) => star.id)
      const { error: updateError } = await adminSupabase
        .from("college_coach_stars")
        .update(committedPayload)
        .in("id", ids)
      
      if (updateError) {
        return NextResponse.json({ error: "Failed to update star records" }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        message: `Updated ${ids.length} existing star record(s) to Committed`,
        athlete: { name: athlete.name, college: athlete.college },
        school: { name: school.name, id: school.id }
      })
    } else {
      // Create new star entry
      const targetCoachId = coachIds[0]
      const { error: insertError } = await adminSupabase
        .from("college_coach_stars")
        .insert({
          coach_user_id: targetCoachId,
          athlete_id: athlete.id,
          school_id: school.id,
          pipeline_stage: "Committed",
          interest_level: "high",
          notes: `Auto-added on ${new Date().toLocaleDateString()} – committed to ${athlete.college}`,
          starred_at: new Date().toISOString(),
          committed_date: new Date().toISOString(),
        })
      
      if (insertError) {
        return NextResponse.json({ error: "Failed to create star record", details: insertError.message }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        message: "Created new star record and set to Committed",
        athlete: { name: athlete.name, college: athlete.college },
        school: { name: school.name, id: school.id }
      })
    }
  } catch (error: any) {
    console.error("[fix-committed] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

