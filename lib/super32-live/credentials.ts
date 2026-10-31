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
 * - Fargo 2025-26 top-8 (16U and Junior, freestyle, Greco, women's), read from the placement
 *   matches in other_tournament_bouts, which carry each wrestler's state. (`fargo_results` has no
 *   state column, so it is still not used: name-only matching credits namesakes.)
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import { gunzipSync, gzipSync } from "node:zlib"
import { list, put } from "@vercel/blob"
import type { Credential, Gender } from "./engine"
import { nhscaDivision } from "@/lib/nhsca-division"

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
    const rows = await pageAll<{ wrestler_name: string; state: string | null; place: number; event_key?: string; division?: string | null }>((from) =>
      supabase.from("national_event_placers").select("*").eq("event_key", key).order("id").range(from, from + 999),
    )
    for (const r of rows) {
      if (!r.place || r.place > 8) continue
      // NHSCA's grade division in the words (lib/nhsca-division.ts): "2026 NHSCA freshman champion".
      const div = /^nhsca/.test(key) ? nhscaDivision(key, r.division) : null
      const named = div ? `${label} ${div.toLowerCase()}` : label
      out.push({
        name: r.wrestler_name, state: r.state, gender,
        kind: r.place === 1 ? "event_champion" : "event_all_american",
        label: r.place === 1 ? `${named} champion` : `${named} ${ORD(r.place)}`,
      })
    }
  }
  return out
}

/**
 * State placers 1-8 from every state (NC too, for NC-vs-NC bouts), 2026 and 2025: context on a win ("2026 VA 6A
 * state runner-up"). One line per wrestler: the best place across both seasons, the newer season on a tie. Never a tier.
 */
async function statePlacers(supabase: SupabaseClient): Promise<Credential[]> {
  const rows = await pageAll<{ wrestler_name: string; state: string; gender: string | null; season: number; place: number; classification: string | null }>((from) =>
    supabase.from("state_tournament_placers").select("wrestler_name, state, gender, season, place, classification")
      .in("season", [2025, 2026]).gte("place", 1).lte("place", 8).order("id").range(from, from + 999),
  )
  // North Carolina's own results live in wrestling_nchsaa_results (NCHSAA and NCISAA), for NC-vs-NC bouts.
  const nc = await pageAll<{ wrestler_name: string; year: number; place: number | null; classification: string | null }>((from) =>
    supabase.from("wrestling_nchsaa_results").select("wrestler_name, year, place, classification")
      .in("year", [2025, 2026]).gte("place", 1).lte("place", 8).order("id").range(from, from + 999),
  )
  for (const r of nc) if (r.wrestler_name && r.place) rows.push({ wrestler_name: r.wrestler_name, state: "NC", gender: null, season: r.year, place: r.place, classification: r.classification })
  const best = new Map<string, (typeof rows)[number]>()
  for (const r of rows) {
    const k = `${r.wrestler_name.toLowerCase()}|${r.state}|${r.gender ?? ""}`
    const cur = best.get(k)
    if (!cur || r.place < cur.place || (r.place === cur.place && r.season > cur.season)) best.set(k, r)
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

async function fargoPlacers(supabase: SupabaseClient): Promise<Credential[]> {
  const PLACE: Record<string, [number, number]> = { "1st Place Match": [1, 2], "3rd Place Match": [3, 4], "5th Place Match": [5, 6], "7th Place Match": [7, 8] }
  const rows = await pageAll<{ event_name: string; year: number; round: string; athlete_name: string; athlete_club: string | null; win: boolean }>((from) =>
    supabase.from("other_tournament_bouts").select("event_name, year, round, athlete_name, athlete_club, win")
      .like("event_key", "fargo-%").in("year", [2025, 2026]).in("round", Object.keys(PLACE)).order("id").range(from, from + 999),
  )
  const best = new Map<string, Credential & { place: number }>()
  for (const r of rows) {
    const pl = PLACE[r.round]
    if (!pl || !r.athlete_name) continue
    const place = r.win ? pl[0] : pl[1]
    const girls = /women/i.test(r.event_name)
    const style = girls ? "women's freestyle" : /greco/i.test(r.event_name) ? "Greco" : "freestyle"
    const age = /16u/i.test(r.event_name) ? "16U" : "Junior"
    const label = `${r.year} Fargo ${age} ${style} ${place === 1 ? "champion" : place === 2 ? "runner-up" : ORD(place)}`
    const k = `${r.athlete_name.toLowerCase()}|${r.athlete_club ?? ""}|${r.event_name}`
    const cur = best.get(k)
    if (!cur || place < cur.place) best.set(k, { name: r.athlete_name, state: r.athlete_club, gender: girls ? "girls" : "boys", kind: place === 1 ? "event_champion" : "event_all_american", label, place })
  }
  return [...best.values()].map(({ place: _p, ...c }) => c)
}

async function computeCredentials(supabase: SupabaseClient): Promise<Credential[]> {
  const [a, b, c, d] = await Promise.all([nationalRankings(supabase), eventPlacers(supabase), statePlacers(supabase), fargoPlacers(supabase)])
  return [...a, ...b, ...c, ...d]
}

/**
 * Credentials do not change during the event, and reading them is tens of thousands of rows: doing
 * that on every 2-minute rebuild took the Nano database down on 24 Oct. They are built once and
 * kept in Blob for 12 hours; every rebuild reads that one file.
 */
const CACHE_PATH = "snapshots/super32-credentials.json.gz"
const CACHE_HOURS = 12

export async function loadCredentials(supabase: SupabaseClient, opts: { refresh?: boolean } = {}): Promise<Credential[]> {
  if (!opts.refresh) {
    try {
      const { blobs } = await list({ prefix: CACHE_PATH, limit: 1 })
      const url = blobs[0]?.url
      if (url) {
        const r = await fetch(`${url}?v=${Date.now()}`, { cache: "no-store" })
        if (r.ok) {
          const parsed = JSON.parse(gunzipSync(Buffer.from(await r.arrayBuffer())).toString("utf8")) as { builtAt: string; credentials: Credential[] }
          const fresh = Date.now() - new Date(parsed.builtAt).getTime() < CACHE_HOURS * 3_600_000
          if (fresh && parsed.credentials?.length) return parsed.credentials
        }
      }
    } catch (e) {
      console.error("[super32] credentials cache read failed", e)
    }
  }
  const credentials = await computeCredentials(supabase)
  if (credentials.length) {
    await put(CACHE_PATH, gzipSync(JSON.stringify({ builtAt: new Date().toISOString(), credentials })), {
      access: "public", addRandomSuffix: false, allowOverwrite: true, contentType: "application/gzip", cacheControlMaxAge: 60,
    }).catch((e) => console.error("[super32] credentials cache write failed", e))
  }
  return credentials
}
