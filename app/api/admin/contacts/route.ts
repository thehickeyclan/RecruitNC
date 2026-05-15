import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getCachedAdminCheck } from "@/lib/cached-auth-check"

export async function GET(request: Request) {
  try {
    const authCheck = await getCachedAdminCheck()
    if (authCheck.response) return authCheck.response
    if (!authCheck.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")?.trim().toLowerCase() || ""
    const type = searchParams.get("type") || "all"
    const limit = 100

    const supabase = await createClient()
    const contacts: any[] = []

    // Fetch athletes if type is all or athlete
    if (type === "all" || type === "athlete") {
      let athleteQuery = supabase
        .from("athletes")
        .select("id, name, photourl, weightclass, graduationyear, highschool, contactEmail, phone, recruiting_status, claimed_at")
        .order("name", { ascending: true })
        .limit(limit)

      if (search) {
        athleteQuery = athleteQuery.or(`name.ilike.%${search}%,contactEmail.ilike.%${search}%`)
      }

      const { data: athletes } = await athleteQuery
      for (const a of athletes || []) {
        contacts.push({
          id: a.id,
          type: "athlete",
          name: a.name,
          email: a.contactEmail,
          phone: a.phone,
          photoUrl: a.photourl,
          graduationYear: a.graduationyear,
          weightClass: a.weightclass,
          highSchool: a.highschool,
          recruitingStatus: a.recruiting_status,
          createdAt: a.claimed_at,
        })
      }
    }

    // Fetch parents (user_profiles with profile_type = 'parent' or with parent_athlete_links)
    if (type === "all" || type === "parent") {
      let parentQuery = supabase
        .from("user_profiles")
        .select("user_id, first_name, last_name, full_name, email, cell_phone, profile_image_url, headshot_url, last_login_at, created_at")
        .or("profile_type.eq.parent,profile_type.eq.fan")
        .order("last_login_at", { ascending: false, nullsFirst: false })
        .limit(limit)

      if (search) {
        parentQuery = parentQuery.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
      }

      const { data: parents } = await parentQuery

      // Get linked athletes for these parents
      const parentIds = (parents || []).map((p) => p.user_id).filter(Boolean)
      let linkedAthletesMap: Record<string, { id: string; name: string }[]> = {}

      if (parentIds.length > 0) {
        const { data: links } = await supabase
          .from("parent_athlete_links")
          .select("user_id, athlete_id, athletes(id, name)")
          .in("user_id", parentIds)

        for (const link of links || []) {
          const uid = link.user_id
          if (!linkedAthletesMap[uid]) linkedAthletesMap[uid] = []
          const athlete = link.athletes as any
          if (athlete?.id) {
            linkedAthletesMap[uid].push({ id: athlete.id, name: athlete.name || "Unknown" })
          }
        }
      }

      for (const p of parents || []) {
        const name = p.full_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || "Unknown"
        contacts.push({
          id: p.user_id,
          type: "parent",
          name,
          email: p.email,
          phone: p.cell_phone,
          photoUrl: p.profile_image_url || p.headshot_url,
          lastLogin: p.last_login_at,
          createdAt: p.created_at,
          linkedAthletes: linkedAthletesMap[p.user_id] || [],
        })
      }
    }

    // Fetch coaches (user_profiles with profile_type = 'college_coach' or verified_coach = true)
    if (type === "all" || type === "coach") {
      let coachQuery = supabase
        .from("user_profiles")
        .select("user_id, first_name, last_name, full_name, email, cell_phone, profile_image_url, headshot_url, institution, coaching_position, verified_coach, last_login_at, created_at")
        .or("profile_type.eq.college_coach,verified_coach.eq.true")
        .order("last_login_at", { ascending: false, nullsFirst: false })
        .limit(limit)

      if (search) {
        coachQuery = coachQuery.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,institution.ilike.%${search}%`)
      }

      const { data: coaches } = await coachQuery

      for (const c of coaches || []) {
        const name = c.full_name || [c.first_name, c.last_name].filter(Boolean).join(" ") || "Unknown"
        contacts.push({
          id: c.user_id,
          type: "coach",
          name,
          email: c.email,
          phone: c.cell_phone,
          photoUrl: c.profile_image_url || c.headshot_url,
          institution: c.institution,
          coachingPosition: c.coaching_position,
          verified: c.verified_coach,
          lastLogin: c.last_login_at,
          createdAt: c.created_at,
        })
      }
    }

    // Calculate stats
    const athleteCount = type === "athlete" ? contacts.length : (type === "all" ? contacts.filter((c) => c.type === "athlete").length : 0)
    const parentCount = type === "parent" ? contacts.length : (type === "all" ? contacts.filter((c) => c.type === "parent").length : 0)
    const coachCount = type === "coach" ? contacts.length : (type === "all" ? contacts.filter((c) => c.type === "coach").length : 0)

    // For accurate counts when filtering, we need separate count queries
    let stats = { athletes: 0, parents: 0, coaches: 0, total: 0 }

    if (!search) {
      // Get quick counts
      const [athleteRes, parentRes, coachRes] = await Promise.all([
        supabase.from("athletes").select("id", { count: "exact", head: true }),
        supabase.from("user_profiles").select("user_id", { count: "exact", head: true }).or("profile_type.eq.parent,profile_type.eq.fan"),
        supabase.from("user_profiles").select("user_id", { count: "exact", head: true }).or("profile_type.eq.college_coach,verified_coach.eq.true"),
      ])

      stats.athletes = athleteRes.count || 0
      stats.parents = parentRes.count || 0
      stats.coaches = coachRes.count || 0
      stats.total = stats.athletes + stats.parents + stats.coaches
    } else {
      stats.athletes = contacts.filter((c) => c.type === "athlete").length
      stats.parents = contacts.filter((c) => c.type === "parent").length
      stats.coaches = contacts.filter((c) => c.type === "coach").length
      stats.total = contacts.length
    }

    // Sort by last login (most recent first), with nulls at end
    contacts.sort((a, b) => {
      if (!a.lastLogin && !b.lastLogin) return 0
      if (!a.lastLogin) return 1
      if (!b.lastLogin) return -1
      return new Date(b.lastLogin).getTime() - new Date(a.lastLogin).getTime()
    })

    return NextResponse.json({ contacts: contacts.slice(0, limit), stats })
  } catch (error: any) {
    console.error("[admin/contacts] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
