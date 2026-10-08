import type { SupabaseClient } from "@supabase/supabase-js"
import { namesLikelySamePerson } from "@/lib/athlete-name-match"
import { rankingScopeLabel, sourceLabel } from "@/lib/national-rankings"
import type { NationallyRankedOpponent } from "@/lib/significant-wins"

/**
 * "Was this opponent nationally ranked on the day they wrestled?" (Matt, 8 October 2026)
 *
 * Today's lists answer a different question. A December win over a senior ranked that December
 * should count after he graduates and drops off, and a win over somebody who was unranked then
 * should not borrow a ranking he earned later. So each list is replayed through time: for a bout
 * date, every list's newest edition published on or before it - and no older than a year, so last
 * season's final does not stand in for this one.
 *
 * Editions come from national_rankings_archive (every edition, kept for good) and from
 * national_rankings (the current editions, so this fall's bouts work before their editions reach
 * the archive). Server-side only: history judges opponents and is never shown on a profile.
 */
type Entry = NationallyRankedOpponent & { nameKey: string }
type Edition = { publishedMs: number; entries: Entry[]; bySurname: Map<string, Entry[]> }

/** The last word of a name, lower case: the index a lookup starts from. */
const surname = (name: string) => name.toLowerCase().replace(/[^a-z\s-]/g, "").trim().split(/\s+/).pop() ?? ""

const YEAR_MS = 365 * 86_400_000

export type RankedOnLookup = (name: string, date: string) => NationallyRankedOpponent[]

export async function loadRankedOnLookup(
  supabase: SupabaseClient,
  gender: "M" | "F",
): Promise<RankedOnLookup> {
  const lists = new Map<string, Map<number, Entry[]>>()
  const add = (row: Record<string, unknown>, published: string, file: string) => {
    const rank = Number(row.rank)
    const name = String(row.athlete_name ?? "").trim()
    const at = Date.parse(`${published.slice(0, 10)}T12:00:00Z`)
    if (!name || !Number.isFinite(rank) || rank < 1 || !Number.isFinite(at)) return
    const list = `${row.source}|${row.scope}|${Number(row.edition_class_year ?? 0)}|${file}`
    const editions = lists.get(list) ?? new Map<number, Entry[]>()
    const scope = String(row.scope ?? "weight")
    const weightClass = (row.weight_class as string | null) ?? null
    const where =
      scope === "weight"
        ? weightClass
          ? ` (${weightClass})`
          : ""
        : rankingScopeLabel({
            scope,
            weightClass,
            editionClassYear: Number(row.edition_class_year ?? 0),
            rankBasis: String(row.rank_basis ?? "weight"),
          })
    const entries = editions.get(at) ?? []
    entries.push({
      name,
      nameKey: name.toLowerCase(),
      rank,
      source: `${sourceLabel(String(row.source))}${where}`,
      state: (row.state as string | null) ?? null,
      school: (row.high_school as string | null) ?? null,
      weight: Number.parseInt(String(weightClass ?? ""), 10) || null,
    })
    editions.set(at, entries)
    lists.set(list, editions)
  }

  const select = "source, scope, edition_class_year, rank_basis, rank, athlete_name, weight_class, high_school, state"
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("national_rankings_archive")
      .select(`${select}, published_on, source_file`)
      .eq("gender", gender)
      .order("id")
      .range(from, from + 999)
    if (error || !data) break
    // A live edition and its archived copy share a list key ("live"), so the copy simply repeats it.
    for (const r of data) add(r, String(r.published_on), String(r.source_file ?? "live"))
    if (data.length < 1000) break
  }
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("national_rankings")
      .select(`${select}, ranking_month`)
      .eq("gender", gender)
      .order("id")
      .range(from, from + 999)
    if (error || !data) break
    for (const r of data) add(r, String(r.ranking_month), "live")
    if (data.length < 1000) break
  }

  const timelines: Edition[][] = [...lists.values()].map((editions) =>
    [...editions.entries()]
      .map(([publishedMs, entries]) => {
        const bySurname = new Map<string, Entry[]>()
        for (const e of entries) bySurname.set(surname(e.name), [...(bySurname.get(surname(e.name)) ?? []), e])
        return { publishedMs, entries, bySurname }
      })
      .sort((a, b) => a.publishedMs - b.publishedMs),
  )
  const cache = new Map<string, NationallyRankedOpponent[]>()

  return (name: string, date: string) => {
    const at = Date.parse(date)
    if (!Number.isFinite(at)) return []
    const key = `${name.toLowerCase()}|${new Date(at).toISOString().slice(0, 10)}`
    const hit = cache.get(key)
    if (hit) return hit
    const last = surname(name)
    const out: NationallyRankedOpponent[] = []
    for (const timeline of timelines) {
      let inEffect: Edition | null = null
      for (const edition of timeline) {
        if (edition.publishedMs > at) break
        inEffect = edition
      }
      if (!inEffect || at - inEffect.publishedMs > YEAR_MS) continue
      for (const e of inEffect.bySurname.get(last) ?? []) if (namesLikelySamePerson(e.name, name)) out.push(e)
    }
    cache.set(key, out)
    return out
  }
}
