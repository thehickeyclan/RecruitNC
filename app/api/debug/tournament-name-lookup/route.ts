import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { escapeForIlike } from "@/lib/nchsaa-results"

/**
 * GET /api/debug/tournament-name-lookup?name=Jackson+D'Ettore
 *
 * Check how an athlete's name is stored in each tournament source. Use this first when
 * a profile shows no NCHSAA/NHSCA/Super32 — then add aliases (nchsaa-results.ts,
 * tournament-tables.ts) or standardize in DB.
 *
 * To list spellings in Supabase SQL (use only columns that exist; wrestling_nhsca_results
 * may have record_text not record):
 *   SELECT DISTINCT wrestler_name, year, place FROM wrestling_nchsaa_results WHERE wrestler_name ILIKE '%Dettore%' OR wrestler_name ILIKE '%D''Ettore%';
 *   SELECT DISTINCT athlete_name, year, placement FROM wrestling_nhsca_results WHERE athlete_name ILIKE '%Dettore%' OR athlete_name ILIKE '%D''Ettore%';
 *   SELECT DISTINCT athlete_name, year FROM super32_results WHERE athlete_name ILIKE '%Dettore%' OR athlete_name ILIKE '%D''Ettore%';
 *   SELECT DISTINCT athlete_name, year, placement FROM nhsca_placements WHERE athlete_name ILIKE '%Dettore%' OR athlete_name ILIKE '%D''Ettore%';
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const name = (searchParams.get("name") || "").trim()
    if (!name) {
      return NextResponse.json(
        { error: "Missing name. Use ?name=First+Last (e.g. name=Jackson+D'Ettore)" },
        { status: 400 },
      )
    }

    const parts = name.split(/\s+/).filter(Boolean)
    const lastPart = parts.length >= 2 ? parts[parts.length - 1]! : name
    const lastNoApostrophe = lastPart.replace(/'/g, "").trim()
    const patterns = [lastPart]
    if (lastNoApostrophe && lastNoApostrophe !== lastPart) patterns.push(lastNoApostrophe)

    const db = createAdminClient()

    async function queryNchsaa(): Promise<any[]> {
      const seen = new Set<string>()
      const out: any[] = []
      for (const p of patterns) {
        const { data } = await db
          .from("wrestling_nchsaa_results")
          .select("*")
          .ilike("wrestler_name", `%${escapeForIlike(p)}%`)
          .order("year", { ascending: false })
          .limit(50)
        for (const row of data ?? []) {
          const key = `${row.wrestler_name}-${row.year}-${row.classification}-${row.weight_class}`
          if (!seen.has(key)) {
            seen.add(key)
            out.push(row)
          }
        }
      }
      return out.sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
    }
    async function queryNhsca(): Promise<any[]> {
      const seen = new Set<string>()
      const out: any[] = []
      for (const p of patterns) {
        const { data } = await db
          .from("wrestling_nhsca_results")
          .select("*")
          .ilike("athlete_name", `%${escapeForIlike(p)}%`)
          .order("year", { ascending: false })
          .limit(50)
        for (const row of data ?? []) {
          const key = `${row.athlete_name}-${row.year}-${row.division ?? ""}-${row.weight ?? ""}`
          if (!seen.has(key)) {
            seen.add(key)
            out.push(row)
          }
        }
      }
      return out.sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
    }
    async function queryNhscaPlacements(): Promise<any[]> {
      const seen = new Set<string>()
      const out: any[] = []
      for (const p of patterns) {
        const { data } = await db
          .from("nhsca_placements")
          .select("*")
          .ilike("athlete_name", `%${escapeForIlike(p)}%`)
          .order("year", { ascending: false })
          .limit(50)
        for (const row of data ?? []) {
          const key = `${row.athlete_name}-${row.year}-${row.division ?? ""}-${row.weight_class ?? ""}`
          if (!seen.has(key)) {
            seen.add(key)
            out.push(row)
          }
        }
      }
      return out.sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
    }
    async function querySuper32(): Promise<any[]> {
      const seen = new Set<string>()
      const out: any[] = []
      for (const p of patterns) {
        const { data } = await db
          .from("super32_results")
          .select("athlete_name, year, record, placement, weight, high_school")
          .ilike("athlete_name", `%${escapeForIlike(p)}%`)
          .order("year", { ascending: false })
          .limit(50)
        for (const row of data ?? []) {
          const key = `${row.athlete_name}-${row.year}`
          if (!seen.has(key)) {
            seen.add(key)
            out.push(row)
          }
        }
      }
      return out.sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
    }

    const [nchsaaRows, nhscaRows, nhscaPlacementRows, super32Rows] = await Promise.all([
      queryNchsaa(),
      queryNhsca(),
      queryNhscaPlacements(),
      querySuper32(),
    ])

    const distinctNchsaaNames = [...new Set(nchsaaRows.map((r: any) => r.wrestler_name))]
    const distinctNhscaNames = [...new Set(nhscaRows.map((r: any) => r.athlete_name))]
    const distinctNhscaPlacementNames = [...new Set(nhscaPlacementRows.map((r: any) => r.athlete_name))]
    const distinctSuper32Names = [...new Set(super32Rows.map((r: any) => r.athlete_name))]

    return NextResponse.json({
      name_queried: name,
      search_tokens: patterns,
      wrestling_nchsaa_results: {
        count: nchsaaRows.length,
        distinct_wrestler_names: distinctNchsaaNames,
        rows: nchsaaRows,
      },
      wrestling_nhsca_results: {
        count: nhscaRows.length,
        distinct_athlete_names: distinctNhscaNames,
        rows: nhscaRows,
      },
      nhsca_placements: {
        count: nhscaPlacementRows.length,
        distinct_athlete_names: distinctNhscaPlacementNames,
        rows: nhscaPlacementRows,
      },
      super32_results: {
        count: super32Rows.length,
        distinct_athlete_names: distinctSuper32Names,
        rows: super32Rows,
      },
      hint:
        "If distinct_*_names show a different spelling than the profile (e.g. 'Jackson Dettore' vs 'Jackson D''Ettore'), add that spelling to SAME_PERSON_NAME_ALIASES (nchsaa-results.ts) and SAME_PERSON_ALIASES (tournament-tables.ts), or run scripts/standardize-tournament-names.sql to normalize DB.",
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[tournament-name-lookup]", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
