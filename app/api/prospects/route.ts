import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { isVisibleState } from "@/lib/recruiting/brand"
import { HOME_STATE, normalizeStateCode } from "@/lib/recruiting/states"
import { fetchProspectDirectoryPage } from "@/lib/prospects-directory"
import { lastCompetedLabel, loadLastCompeted } from "@/lib/prospect-last-competed"
import { highestAchievement, loadAchievements } from "@/lib/prospect-achievements"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)

    const graduationYear = searchParams.get("graduationYear")
    const gender = searchParams.get("gender")
    const minYearParam = searchParams.get("minYear")
    const maxYearParam = searchParams.get("maxYear")
    const rawLimit = Number.parseInt(searchParams.get("limit") || "500", 10)
    const offset = Number.parseInt(searchParams.get("offset") || "0", 10)
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 500) : 500

    /*
     * One state per request; North Carolina when none is asked for, which is every request made
     * before a second state existed. A state not yet announced is admins' only.
     */
    const state = normalizeStateCode(searchParams.get("state")) ?? HOME_STATE
    let isAdmin = false
    if (state !== HOME_STATE) {
      const { data: auth } = await (await createClient()).auth.getUser()
      if (auth.user) {
        const { data: me } = await supabase.from("user_profiles").select("is_admin, role").eq("user_id", auth.user.id).maybeSingle()
        isAdmin = me?.is_admin === true || me?.role === "admin"
      }
      if (!isVisibleState(state, isAdmin)) return NextResponse.json({ error: "That state is not open yet." }, { status: 404 })
    }

    const minYear = minYearParam ? Number.parseInt(minYearParam, 10) : null
    const maxYear = maxYearParam ? Number.parseInt(maxYearParam, 10) : null

    const { prospects, hasMore } = await fetchProspectDirectoryPage(supabase, {
      graduationYear,
      gender,
      minYear: Number.isFinite(minYear!) ? minYear : null,
      maxYear: Number.isFinite(maxYear!) ? maxYear : null,
      limit,
      offset,
      state,
    })

    /*
     * The directory table has a "Last competed" column, and the client replaces the
     * server-rendered rows with this response the moment a filter changes - so without it here
     * the column fills in on load and then empties itself.
     */
    const lastCompeted = await loadLastCompeted(
      supabase,
      (prospects as Array<{ id: string }>).map((p) => String(p.id)),
      new Map((prospects as Array<{ id: string; graduationyear?: unknown }>).map((p) => [String(p.id), Number(p.graduationyear) || null])),
    )
    // The honours too, for the same reason: without them the Honors pills emptied the list the
    // first time a coach changed class.
    const facts = await loadAchievements(
      supabase,
      (prospects as Array<{ id: string; name?: string | null }>).map((p) => ({ id: p.id, name: p.name })),
    )
    const withLastCompeted = (prospects as Array<Record<string, unknown>>).map((p) => ({
      ...p,
      achievement_facts: facts.get(String(p.id)) ?? {},
      achievement_level: highestAchievement(facts.get(String(p.id)) ?? {}).level,
      last_competed: lastCompetedLabel(lastCompeted.get(String(p.id))),
      last_competed_weight: lastCompeted.get(String(p.id))?.weight ?? null,
    }))

    return NextResponse.json(
      {
        prospects: withLastCompeted,
        pagination: {
          limit,
          offset,
          hasMore,
        },
      },
      {
        headers: {
          // A state still being checked is answered per person, never from a shared cache.
          "Cache-Control": isVisibleState(state, false) ? "public, s-maxage=120, stale-while-revalidate=300" : "private, no-store",
          "Content-Type": "application/json",
        },
      },
    )
  } catch (error) {
    console.error("[prospects API]", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
