import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { resolveSchoolFromSlug } from "@/lib/resolve-school-from-slug"

export const dynamic = "force-dynamic"

/** GET: Returns school info + recruits (athletes starred by coaches of this school). Slug e.g. "campbell" or "campbell-university". */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { data: profile } = await supabase.from("user_profiles").select("school_id, is_admin").eq("user_id", user.id).single()
    const isAdmin = profile?.is_admin === true

    const { slug } = await params
    const normalizedSlug = slug?.toLowerCase().trim()
    if (!normalizedSlug) {
      return NextResponse.json({ error: "Slug required" }, { status: 400 })
    }

    let resolved = await resolveSchoolFromSlug(normalizedSlug)
    if (!resolved && normalizedSlug === "campbell") {
      resolved = await resolveSchoolFromSlug("campbell-university")
    }
    if (!resolved) {
      return NextResponse.json({ error: "School not found" }, { status: 404 })
    }
    if (!isAdmin && profile?.school_id !== resolved.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const admin = createAdminClient()

    const { data: school, error: schoolErr } = await admin
      .from("schools")
      .select("id, name, school_name, logo_url, primary_color, secondary_color")
      .eq("id", resolved.id)
      .single()
    if (schoolErr || !school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 })
    }

    const { data: coaches } = await admin
      .from("user_profiles")
      .select("user_id")
      .eq("school_id", resolved.id)
      .in("role", ["coach", "college_coach", "admin"])
    const coachUserIds = (coaches ?? []).map((c: { user_id: string }) => c.user_id).filter(Boolean)
    if (coachUserIds.length === 0) {
      return NextResponse.json({
        school: {
          id: school.id,
          name: school.school_name ?? school.name,
          logo_url: school.logo_url,
          primary_color: school.primary_color,
          secondary_color: school.secondary_color,
        },
        recruits: [],
      })
    }

    const { data: stars } = await admin
      .from("college_coach_stars")
      .select("athlete_id")
      .in("coach_user_id", coachUserIds)
    const athleteIds = [...new Set((stars ?? []).map((s: { athlete_id: string }) => s.athlete_id))]
    if (athleteIds.length === 0) {
      return NextResponse.json({
        school: {
          id: school.id,
          name: school.school_name ?? school.name,
          logo_url: school.logo_url,
          primary_color: school.primary_color,
          secondary_color: school.secondary_color,
        },
        recruits: [],
      })
    }

    const { data: athletes, error: athletesErr } = await admin
      .from("athletes")
      .select("id, name, graduationyear, weightclass, highschool, photourl, recruiting_status, pipeline_stage")
      .in("id", athleteIds)
      .order("name")
    if (athletesErr) {
      return NextResponse.json({ error: athletesErr.message }, { status: 500 })
    }

    return NextResponse.json({
      school: {
        id: school.id,
        name: school.school_name ?? school.name,
        logo_url: school.logo_url,
        primary_color: school.primary_color,
        secondary_color: school.secondary_color,
      },
      recruits: athletes ?? [],
    })
  } catch (e) {
    console.error("[colleges recruits API]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
