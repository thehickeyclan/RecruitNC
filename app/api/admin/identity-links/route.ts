import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

/** What each results table calls its fields, so a review row reads like the result it is. */
const SOURCES: Record<string, { event: (r: any) => string; select: string; detail: (r: any) => string }> = {
  wrestling_nchsaa_results: {
    select: "id,wrestler_name,school,year,weight_class,classification,place",
    event: () => "NCHSAA States",
    detail: (r) => [r.classification, r.weight_class, r.place ? `place ${r.place}` : "qualifier"].filter(Boolean).join(" · "),
  },
  nhsca_placements: {
    select: "id,athlete_name,high_school,year,weight_class,division,placement,record,state",
    event: () => "NHSCA Nationals",
    detail: (r) => [r.division, r.weight_class, r.placement ? `place ${r.placement}` : null, r.record].filter(Boolean).join(" · "),
  },
  wrestling_nhsca_results: {
    select: "id,athlete_name,high_school,year,weight,division,placement,state",
    event: () => "NHSCA Nationals",
    detail: (r) => [r.division, r.weight, r.placement ? `place ${r.placement}` : null].filter(Boolean).join(" · "),
  },
  super32_results: {
    select: "id,athlete_name,high_school,school,year,weight_class,placement,record,state",
    event: () => "Super 32",
    detail: (r) => [r.weight_class, r.placement ? `place ${r.placement}` : null, r.record].filter(Boolean).join(" · "),
  },
  fargo_results: {
    select: "id,athlete_name,high_school,year,division,weight_class,placement,record,state",
    event: () => "Fargo",
    detail: (r) => [r.division, r.weight_class, r.placement ? `place ${r.placement}` : null, r.record].filter(Boolean).join(" · "),
  },
  other_tournament_results: {
    select: "id,athlete_name,high_school,year,event_name,weight_class,placement,record,state",
    event: (r) => r.event_name ?? "Tournament",
    detail: (r) => [r.weight_class, r.placement ? `place ${r.placement}` : null, r.record].filter(Boolean).join(" · "),
  },
  national_rankings: {
    select: "id,athlete_name,high_school,ranking_month,class_year,rank,source,state",
    event: (r) => `${r.source} national ranking`,
    detail: (r) => [`#${r.rank}`, r.class_year ? `class of ${r.class_year}` : null].filter(Boolean).join(" · "),
  },
}

/** The rows waiting for a person, with the result and each candidate profile laid out side by side. */
export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const admin = createAdminClient()

  const { data: links, error } = await admin
    .from("result_athlete_links")
    .select("id,source_table,source_id,reason,candidates")
    .eq("status", "review")
    .order("source_table")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const counts: Record<string, number> = {}
  for (const status of ["linked", "review", "rejected"]) {
    const { count } = await admin.from("result_athlete_links").select("id", { count: "exact", head: true }).eq("status", status)
    counts[status] = count ?? 0
  }

  const byTable = new Map<string, string[]>()
  for (const l of links ?? []) byTable.set(l.source_table, [...(byTable.get(l.source_table) ?? []), l.source_id])
  const sourceRows = new Map<string, any>()
  for (const [table, ids] of byTable) {
    const cfg = SOURCES[table]
    if (!cfg) continue
    const { data } = await admin.from(table).select(cfg.select).in("id", ids)
    for (const r of data ?? []) sourceRows.set(`${table}|${(r as any).id}`, r)
  }

  const athleteIds = [...new Set((links ?? []).flatMap((l) => (l.candidates ?? []).map((c: any) => c.athleteId)))]
  const { data: athletes } = athleteIds.length
    ? await admin.from("athletes").select("id,name,highschool,graduationyear,photourl,wrestlingClub").in("id", athleteIds)
    : { data: [] as any[] }
  const athleteById = new Map((athletes ?? []).map((a: any) => [a.id, a]))

  const rows = (links ?? []).map((l) => {
    const cfg = SOURCES[l.source_table]
    const r = sourceRows.get(`${l.source_table}|${l.source_id}`) ?? {}
    return {
      id: l.id,
      reason: l.reason,
      result: {
        name: r.wrestler_name ?? r.athlete_name ?? "",
        event: cfg ? cfg.event(r) : l.source_table,
        year: r.year ?? (r.ranking_month ? Number(String(r.ranking_month).slice(0, 4)) : null),
        detail: cfg ? cfg.detail(r) : "",
        school: r.school ?? r.high_school ?? null,
        state: r.state ?? null,
      },
      candidates: (l.candidates ?? []).map((c: any) => {
        const a: any = athleteById.get(c.athleteId) ?? {}
        return {
          athleteId: c.athleteId,
          name: a.name ?? c.name,
          school: a.highschool ?? c.highSchool,
          club: a.wrestlingClub ?? null,
          graduationYear: a.graduationyear ?? c.graduationYear,
          photoUrl: a.photourl ?? null,
          signals: c.signals ?? [],
        }
      }),
    }
  })
  return NextResponse.json({ rows, counts })
}
