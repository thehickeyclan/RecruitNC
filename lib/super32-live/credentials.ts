/**
 * Opponent credentials that tier a Super 32 win, from tables we already hold.
 *
 * - National rankings: the newest SI, Flo and MatScouts edition per gender and list type. Weight
 *   lists count to 30; a Big Board or P4P rank counts to 50.
 * - Super 32 2025 placers (boys; the national girls' bracket is not held) and NHSCA 2026 placers:
 *   the champion is a HUGE credential, places 2-8 a BIG one.
 * - 2025-26 state placers from every state but North Carolina (newest season, best place).
 * All of these are context on a win; only seeds tier one.
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

/**
 * State placers 1-8 from every state but North Carolina, 2026 and 2025: context on a win ("2026 VA 6A
 * state runner-up"). One line per wrestler, the newest season, best place. Never a tier.
 */
async function statePlacers(supabase: SupabaseClient): Promise<Credential[]> {
  const rows = await pageAll<{ wrestler_name: string; state: string; gender: string | null; season: number; place: number; classification: string | null }>((from) =>
    supabase.from("state_tournament_placers").select("wrestler_name, state, gender, season, place, classification")
      .in("season", [2025, 2026]).gte("place", 1).lte("place", 8).neq("state", "NC").order("id").range(from, from + 999),
  )
  const best = new Map<string, (typeof rows)[number]>()
  for (const r of rows) {
    const k = `${r.wrestler_name.toLowerCase()}|${r.state}|${r.gender ?? ""}`
    const cur = best.get(k)
    if (!cur || r.season > cur.season || (r.season === cur.season && r.place < cur.place)) best.set(k, r)
  }
  // "Boys", "Girls" and "Open" are how some states name a single class; they add nothing to the line.
  const cls = (c: string | null) => (c ?? "").replace(/\b(boys|girls|open)\b/gi, "").replace(/\s+/g, " ").trim()
  return [...best.values()].map((r) => ({
    name: r.wrestler_name, state: r.state,
    gender: /^g/i.test(r.gender ?? "") ? "girls" : /^b/i.test(r.gender ?? "") ? "boys" : null,
    kind: r.place === 1 ? "state_champion" : "state_placer",
    rank: r.place,
    label: `${r.season} ${r.state}${cls(r.classification) ? ` ${cls(r.classification)}` : ""} state ${r.place === 1 ? "champion" : r.place === 2 ? "runner-up" : ORD(r.place)}`,
  }))
}

export async function loadCredentials(supabase: SupabaseClient): Promise<Credential[]> {
  const [a, b, c] = await Promise.all([nationalRankings(supabase), eventPlacers(supabase), statePlacers(supabase)])
  return [...a, ...b, ...c]
}
