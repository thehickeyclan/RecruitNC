import { NextResponse, type NextRequest } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"

/**
 * The athlete directory for the app: search, plus the filters a coach actually sorts by.
 *
 * Credentials are read through athlete_id rather than by name. That was only possible after the
 * result links were backfilled - 102 rows across three tables - and it matters: name matching at
 * scale is what put three Zaggout brothers' bouts on one record. Every result belonging to one of
 * our athletes is now linked, so a filter returns the full set rather than a sample of it.
 *
 * Public: the website's directory is public too, and these are the same profiles.
 */

export const dynamic = "force-dynamic"

const CRED = ["state_champ", "state_placer", "toc_champ", "toc_placer", "all_american"] as const
type Cred = (typeof CRED)[number]

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams
  const q = (p.get("q") ?? "").trim()
  const gender = (p.get("gender") ?? "").trim()
  const gradYear = Number(p.get("gradYear")) || null
  const creds = (p.get("cred") ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter((c): c is Cred => (CRED as readonly string[]).includes(c))

  const db = createAdminClient()

  /* Each credential narrows the set; they combine, so "state champ + All-American" means both. */
  let allowed: Set<string> | null = null
  const narrow = (ids: string[]) => {
    const next = new Set(ids)
    allowed = allowed === null ? next : new Set([...allowed].filter((id) => next.has(id)))
  }

  for (const cred of creds) {
    /* Written without reassigning the builder: the chained generics defeat the type checker. */
    if (cred === "state_champ") {
      const { data } = await db
        .from("wrestling_nchsaa_results")
        .select("athlete_id")
        .not("athlete_id", "is", null)
        .eq("place", 1)
      narrow((data ?? []).map((r) => String(r.athlete_id)))
    }
    if (cred === "state_placer") {
      const { data } = await db
        .from("wrestling_nchsaa_results")
        .select("athlete_id")
        .not("athlete_id", "is", null)
        .gte("place", 1)
        .lte("place", 6)
      narrow((data ?? []).map((r) => String(r.athlete_id)))
    }
    if (cred === "toc_champ") {
      const { data } = await db
        .from("other_tournament_results")
        .select("athlete_id")
        .eq("event_short_name", "Tournament of Champions")
        .not("athlete_id", "is", null)
        .eq("placement", 1)
      narrow((data ?? []).map((r) => String(r.athlete_id)))
    }
    if (cred === "toc_placer") {
      const { data } = await db
        .from("other_tournament_results")
        .select("athlete_id")
        .eq("event_short_name", "Tournament of Champions")
        .not("athlete_id", "is", null)
        .not("placement", "is", null)
      narrow((data ?? []).map((r) => String(r.athlete_id)))
    }
    if (cred === "all_american") {
      /*
       * All-American means a podium at a national event, so it is a union across the ones we
       * hold: NHSCA, Fargo, and Super 32 once its rows carry a link.
       *
       * Beast of the East and the Ironman are deliberately absent - there is no table and no row
       * for either, because North Carolina eligibility rules have kept our wrestlers out of
       * them. A filter for an event we hold nothing on returns nobody while looking like a fact.
       */
      const [nhsca, fargo, super32] = await Promise.all([
        db.from("nhsca_placements").select("athlete_id").not("athlete_id", "is", null).not("placement", "is", null),
        db.from("fargo_results").select("athlete_id").not("athlete_id", "is", null).not("placement", "is", null),
        db
          .from("super32_results")
          .select("athlete_id")
          .not("athlete_id", "is", null)
          .not("placement", "is", null),
      ])
      const ids = [
        ...(nhsca.data ?? []).map((r) => String(r.athlete_id)),
        ...(fargo.data ?? []).map((r) => String(r.athlete_id)),
        /* Tolerated: the column may not exist yet, and a missing one must not empty the filter. */
        ...(super32.error ? [] : (super32.data ?? []).map((r) => String(r.athlete_id))),
      ]
      narrow(ids)
    }
  }

  if (allowed !== null && (allowed as Set<string>).size === 0) {
    return NextResponse.json({ athletes: [], total: 0 })
  }

  let query = db
    .from("athletes")
    .select("id, name, graduationyear, highschool, wrestlingClub, weightclass, photourl, gender, claimed_by_user_id")
    .order("graduationyear", { ascending: true })
    .order("name", { ascending: true })
    .limit(60)

  if (q.length >= 2) query = query.ilike("name", `%${q.replace(/[%_]/g, "")}%`)
  if (gender === "Male" || gender === "Female") query = query.eq("gender", gender)
  if (gradYear) query = query.eq("graduationyear", gradYear)
  if (allowed !== null) query = query.in("id", [...(allowed as Set<string>)].slice(0, 400))

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    athletes: (data ?? []).map((a) => ({
      id: String(a.id),
      name: String(a.name ?? ""),
      graduationYear: a.graduationyear == null ? null : Number(a.graduationyear),
      highSchool: (a.highschool as string) || null,
      club: (a.wrestlingClub as string) || null,
      weightClass: a.weightclass == null ? null : String(a.weightclass),
      photoUrl: (a.photourl as string) || null,
      claimed: Boolean(a.claimed_by_user_id),
    })),
    total: data?.length ?? 0,
  })
}
