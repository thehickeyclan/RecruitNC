/**
 * Opponent credentials that tier a Super 32 win, from tables we already hold.
 *
 * - National rankings: the newest SI, Flo and MatScouts edition per gender and list type. Weight
 *   lists count to 30; a Big Board or P4P rank counts to 50.
 * - Super 32 2025 placers (boys; the national girls' bracket is not held) and NHSCA 2026 placers:
 *   the champion is a HUGE credential, places 2-8 a BIG one.
 * - 2026 state champions from every state but North Carolina: BIG.
 *
 * Fargo is left out on purpose: `fargo_results` has no state column, so a Fargo name could only
 * be matched on the name alone, which is how namesakes get credited.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Credential, Gender } from "./engine"

const SOURCE_LABEL: Record<string, string> = { sports_illustrated: "SI", flowrestling: "Flo", matscouts: "MatScouts" }
const ORD = (n: number) => (n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`)

async function pageAll<T>(q: (from: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await q(from)
    if (error || !data?.length) break
    out.push(...data)
    if (data.length < 1000) break
  }
  return out
}

async function nationalRankings(supabase: SupabaseClient): Promise<Credential[]> {
  const out: Credential[] = []
  for (const source of Object.keys(SOURCE_LABEL)) {
    for (const g of ["M", "F"] as const) {
      for (const scope of ["weight", "p4p", "big_board"]) {
        const { data: head } = await supabase
          .from("national_rankings").select("ranking_month")
          .eq("source", source).eq("gender", g).eq("scope", scope)
          .order("ranking_month", { ascending: false }).limit(1)
        const month = head?.[0]?.ranking_month
        if (!month) continue
        const max = scope === "weight" ? 30 : 50
        const rows = await pageAll<{ athlete_name: string; rank: number; state: string | null; edition_class_year: number | null }>((from) =>
          supabase.from("national_rankings").select("athlete_name, rank, state, edition_class_year")
            .eq("source", source).eq("gender", g).eq("scope", scope).eq("ranking_month", month)
            .lte("rank", max).order("id").range(from, from + 999),
        )
        const gender: Gender = g === "M" ? "boys" : "girls"
        const list = scope === "weight" ? "nationally" : scope === "p4p" ? "P4P" : "Big Board"
        for (const r of rows) {
          out.push({
            name: r.athlete_name, state: r.state, gender,
            kind: scope === "weight" ? "national_rank" : "board_rank",
            rank: Number(r.rank),
            label: `#${r.rank} ${scope === "big_board" && r.edition_class_year ? `${r.edition_class_year} ` : ""}${list} (${SOURCE_LABEL[source]})`,
          })
        }
      }
    }
  }
  return out
}

async function eventPlacers(supabase: SupabaseClient): Promise<Credential[]> {
  const events: Array<[string, string, Gender | null]> = [
    ["super32-2025", "2025 Super 32", "boys"],
    ["nhsca-nationals-2026", "2026 NHSCA", null],
  ]
  const out: Credential[] = []
  for (const [key, label, gender] of events) {
    const rows = await pageAll<{ wrestler_name: string; state: string | null; place: number }>((from) =>
      supabase.from("national_event_placers").select("wrestler_name, state, place").eq("event_key", key).order("id").range(from, from + 999),
    )
    for (const r of rows) {
      if (!r.place || r.place > 8) continue
      out.push({
        name: r.wrestler_name, state: r.state, gender,
        kind: r.place === 1 ? "event_champion" : "event_all_american",
        label: r.place === 1 ? `${label} champion` : `${label} ${ORD(r.place)}`,
      })
    }
  }
  return out
}

async function stateChampions(supabase: SupabaseClient): Promise<Credential[]> {
  const rows = await pageAll<{ wrestler_name: string; state: string; gender: string | null }>((from) =>
    supabase.from("state_tournament_placers").select("wrestler_name, state, gender")
      .eq("season", 2026).eq("place", 1).neq("state", "NC").order("id").range(from, from + 999),
  )
  return rows.map((r) => ({
    name: r.wrestler_name, state: r.state,
    gender: /^g/i.test(r.gender ?? "") ? "girls" : /^b/i.test(r.gender ?? "") ? "boys" : null,
    kind: "state_champion",
    label: `2026 ${r.state} state champion`,
  }))
}

export async function loadCredentials(supabase: SupabaseClient): Promise<Credential[]> {
  const [a, b, c] = await Promise.all([nationalRankings(supabase), eventPlacers(supabase), stateChampions(supabase)])
  return [...a, ...b, ...c]
}
