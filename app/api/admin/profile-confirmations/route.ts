import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

type RawConfirmation = {
  id: string
  athlete_id?: string | null
  user_id?: string | null
  confirmed_by?: string | null // fallback for older schema
  confirmation_method?: string | null // may not exist in your DB
  is_confirmed?: boolean | null
  confirmed_at?: string | null
  created_at?: string | null
  // allow any other columns without failing
  [key: string]: any
}

export async function GET(req: Request) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(req.url)
    const athleteId = searchParams.get("athlete")
    const methodFilter = searchParams.get("method") || undefined

    // 1) Fetch everything with a safe query (no non-existent columns referenced)
    let confQuery = supabase.from("athlete_confirmations").select("*")
    if (athleteId) confQuery = confQuery.eq("athlete_id", athleteId)

    const { data: rows, error: confErr } = await confQuery
    if (confErr) {
      console.error("Error fetching confirmations:", confErr)
      return NextResponse.json({ error: `Error fetching confirmations: ${confErr.message}` }, { status: 500 })
    }

    const confirmationsRaw: RawConfirmation[] = Array.isArray(rows) ? rows : []

    // Early return when empty
    if (confirmationsRaw.length === 0) {
      return NextResponse.json({
        confirmations: [],
        total: 0,
        stats: { total: 0, last7: 0 },
      })
    }

    // 2) Optional method filter applied in JS only if the column exists
    const filtered = methodFilter
      ? confirmationsRaw.filter((c) => (c.confirmation_method || "").toLowerCase() === methodFilter.toLowerCase())
      : confirmationsRaw

    // 3) Collect related ids (support user_id or confirmed_by)
    const userIds = Array.from(
      new Set(
        filtered.map((c) => (c.user_id ?? c.confirmed_by) as string | null).filter((v): v is string => Boolean(v)),
      ),
    )
    const athleteIds = Array.from(new Set(filtered.map((c) => c.athlete_id).filter((v): v is string => Boolean(v))))

    // 4) Fetch related user profiles and athletes
    const [{ data: userProfiles, error: userErr }, { data: athletes, error: athErr }] = await Promise.all([
      userIds.length
        ? supabase.from("user_profiles").select("user_id, email, first_name, last_name").in("user_id", userIds)
        : Promise.resolve({ data: [], error: null }),
      athleteIds.length
        ? supabase.from("athletes").select("id, name, highschool, college").in("id", athleteIds)
        : Promise.resolve({ data: [], error: null }),
    ])

    if (userErr) {
      console.error("Error fetching user profiles:", userErr)
      // Continue without failing hard
    }
    if (athErr) {
      console.error("Error fetching athletes:", athErr)
      // Continue without failing hard
    }

    const userMap = new Map((userProfiles || []).map((u: any) => [u.user_id, u]))
    const athleteMap = new Map((athletes || []).map((a: any) => [a.id, a]))

    // 5) Build safe response objects with fallbacks
    const normalized = filtered.map((c) => {
      const userId = (c.user_id ?? c.confirmed_by) || null
      const a = c.athlete_id ? athleteMap.get(c.athlete_id) : undefined
      const u = userId ? userMap.get(userId) : undefined
      const timestamp = c.confirmed_at || c.created_at || null

      return {
        id: c.id,
        athlete_id: c.athlete_id || "",
        athlete_name: a?.name || "Unknown Athlete",
        athlete_high_school: a?.highschool || "",
        athlete_college: a?.college || "",
        user_id: userId,
        user_email: u?.email || "Unknown User",
        user_name: `${u?.first_name || ""} ${u?.last_name || ""}`.trim() || "Unknown",
        confirmation_method: c.confirmation_method || "self_confirmation",
        is_confirmed: typeof c.is_confirmed === "boolean" ? c.is_confirmed : Boolean(c.confirmed_at), // infer confirmed if we have a confirmed_at
        confirmed_at: c.confirmed_at || null,
        created_at: c.created_at || null,
        timestamp, // used for sorting/stats
      }
    })

    // 6) Sort newest first using whichever timestamp we have
    normalized.sort((a, b) => {
      const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0
      const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0
      return tb - ta
    })

    // 7) Stats
    const now = Date.now()
    const last7 = normalized.filter((f) => {
      const t = f.confirmed_at || f.created_at
      return t ? now - new Date(t).getTime() <= 7 * 24 * 60 * 60 * 1000 : false
    }).length

    // Strip helper timestamp from output
    const confirmations = normalized.map(({ timestamp: _t, ...rest }) => rest)

    return NextResponse.json({
      confirmations,
      total: confirmations.length,
      stats: { total: confirmations.length, last7 },
    })
  } catch (error) {
    console.error("GET /api/admin/profile-confirmations error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
