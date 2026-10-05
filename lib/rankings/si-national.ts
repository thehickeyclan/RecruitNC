import type { SupabaseClient } from "@supabase/supabase-js"

import { buildAthleteIndex, matchAthlete, type MatchableAthlete } from "@/lib/other-tournament-import"

/**
 * Sports Illustrated's national boys rankings, kept current without anyone remembering to.
 *
 * SI (High School On SI, Billy Buckheit) republishes the 420-wrestler list every week or two —
 * five preseason editions by October 2026. We loaded the September one by hand and nothing else,
 * so Tobin McNair's win over Devon Weber, #20 at 165 in Version 5, showed no ranking, and a
 * wrestler had to tell us. A daily cron (/api/cron/si-rankings) now finds the newest edition on
 * SI's wrestling page and loads it the day it appears.
 */

const LISTING_URL = "https://www.si.com/high-school/wrestling"
const UA = "Mozilla/5.0 (compatible; RecruitNC rankings sync; +https://app.ncwrestlingunited.com)"

/** A full edition is 14 weights x 30. Anything far short means the page changed shape: refuse it. */
export const MIN_EDITION_ROWS = 400

export type SiRankingRow = {
  rank: number
  athlete_name: string
  weight_class: string
  class_year: number | null
  high_school: string | null
  state: string | null
}

const CLASS_YEAR: Record<string, (seasonEnd: number) => number> = {
  SR: (y) => y,
  JR: (y) => y + 1,
  SO: (y) => y + 2,
  FR: (y) => y + 3,
  "8TH": (y) => y + 4,
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
}

/** Boys national-ranking article links on SI's wrestling page (girls and P4P lists excluded). */
export function boysEditionLinks(listingHtml: string): string[] {
  const links = new Set<string>()
  for (const m of listingHtml.matchAll(/href="(https:\/\/www\.si\.com\/high-school\/wrestling\/[^"]+)"/g)) {
    const url = m[1]!
    if (/boys/.test(url) && /wrestling-rankings/.test(url) && !/pound-for-pound|girls/.test(url)) links.add(url)
  }
  return [...links]
}

/** The article's publish time, from its JSON-LD or meta tags. */
export function publishedAt(articleHtml: string): string | null {
  const m =
    articleHtml.match(/"datePublished"\s*:\s*"([^"]+)"/) ??
    articleHtml.match(/property="article:published_time"\s+content="([^"]+)"/)
  return m ? m[1]! : null
}

/**
 * The ranked rows of one edition: "20-Devon Weber (Greece Schools, NY) JR" under a "165-Pounds"
 * heading. Honorable mentions are skipped — they carry no rank. The page renders each paragraph
 * twice (once inside an HTML comment), so comments are stripped and each weight/rank kept once.
 */
export function parseSiEdition(articleHtml: string, seasonEnd: number): SiRankingRow[] {
  const html = articleHtml.replace(/<!--[\s\S]*?-->/g, "")
  type Token = { at: number; kind: "weight" | "hm" | "row"; value: string }
  const tokens: Token[] = []
  for (const m of html.matchAll(/>\s*(\d{3})-Pounds\s*</g)) tokens.push({ at: m.index!, kind: "weight", value: m[1]! })
  for (const m of html.matchAll(/>\s*HM:?\s*</g)) tokens.push({ at: m.index!, kind: "hm", value: "" })
  for (const m of html.matchAll(/<p[^>]*>([^<]*)<\/p>/g)) {
    const text = decode(m[1]!).trim()
    if (/^\d+-\S/.test(text)) tokens.push({ at: m.index!, kind: "row", value: text })
  }
  tokens.sort((a, b) => a.at - b.at)

  const rows: SiRankingRow[] = []
  const seen = new Set<string>()
  let weight: string | null = null
  let honorable = false
  for (const t of tokens) {
    if (t.kind === "weight") {
      weight = t.value
      honorable = false
      continue
    }
    if (t.kind === "hm") {
      honorable = true
      continue
    }
    if (!weight || honorable) continue
    // The school may itself carry parentheses: "Lafayette (Wildwood), MO".
    const m = t.value.match(/^(\d+)-(.+?)\s*\((.*)\)\s*(\S*)\s*$/)
    if (!m) continue
    const [, rank, name, inside, year] = m
    const key = `${weight}|${rank}`
    if (seen.has(key)) continue
    seen.add(key)
    const comma = inside!.lastIndexOf(",")
    const tail = comma >= 0 ? inside!.slice(comma + 1).trim() : inside!.trim()
    const hasState = /^[A-Z]{2}$/.test(tail)
    rows.push({
      rank: Number(rank),
      athlete_name: name!.trim(),
      weight_class: weight,
      class_year: CLASS_YEAR[year!.toUpperCase()]?.(seasonEnd) ?? null,
      high_school: hasState ? (comma >= 0 ? inside!.slice(0, comma).trim() : null) : inside!.trim() || null,
      state: hasState ? tail : null,
    })
  }
  return rows
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": UA }, cache: "no-store" })
  if (!res.ok) throw new Error(`${url} -> ${res.status}`)
  return res.text()
}

/** All NC athletes for the strict name matcher, paged past PostgREST's 1,000-row cap. */
async function loadRoster(admin: SupabaseClient): Promise<MatchableAthlete[]> {
  const out: MatchableAthlete[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin
      .from("athletes")
      .select('id, name, wrestling_name, highschool, "wrestlingClub", graduationyear')
      .range(from, from + 999)
    if (error) throw new Error(`Loading athletes: ${error.message}`)
    out.push(...((data ?? []) as MatchableAthlete[]))
    if (!data || data.length < 1000) break
  }
  return out
}

export type SiSyncResult =
  | { status: "current"; url: string }
  | { status: "imported"; url: string; month: string; rows: number; ncMatched: string[] }

/**
 * Finds SI's newest boys edition and loads it if we do not already hold it. Same rules as
 * scripts/import-national-rankings.ts: only NC rows are matched to profiles (they earn the
 * five-star rating), every row is stored for opponent accolades, the month's edition is
 * replaced, and editions beyond the retained three are pruned.
 */
export async function syncSiNationalRankings(admin: SupabaseClient, options?: { force?: boolean }): Promise<SiSyncResult> {
  const links = boysEditionLinks(await fetchText(LISTING_URL))
  if (!links.length) throw new Error("No boys national-ranking articles found on SI's wrestling page")

  const editions = await Promise.all(
    links.map(async (url) => {
      const html = await fetchText(url)
      return { url, html, published: publishedAt(html) ?? "" }
    }),
  )
  editions.sort((a, b) => b.published.localeCompare(a.published))
  const newest = editions[0]!

  const { data: held } = await admin
    .from("national_rankings")
    .select("source_url")
    .eq("source", "sports_illustrated")
    .eq("source_url", newest.url)
    .limit(1)
  if (held?.length && !options?.force) return { status: "current", url: newest.url }

  const published = newest.published ? new Date(newest.published) : new Date()
  // A season runs August-July: an October 2026 edition ranks the class of 2027 as seniors.
  const seasonEnd = published.getMonth() >= 6 ? published.getFullYear() + 1 : published.getFullYear()
  const rows = parseSiEdition(newest.html, seasonEnd)
  const weights = new Set(rows.map((r) => r.weight_class))
  if (rows.length < MIN_EDITION_ROWS || weights.size < 14) {
    throw new Error(`SI edition parsed to ${rows.length} rows over ${weights.size} weights (${newest.url}); refusing a partial import`)
  }

  const index = buildAthleteIndex(await loadRoster(admin))
  const month = `${published.getFullYear()}-${String(published.getMonth() + 1).padStart(2, "0")}`
  const rankingMonth = `${month}-01`
  const ncMatched: string[] = []
  const payload = rows.map((row) => {
    const isNc = row.state === "NC" || !row.state
    const outcome = isNc ? matchAthlete(row.athlete_name, row.high_school ?? "", index) : ({ status: "unmatched" } as const)
    const athleteId = outcome.status === "matched" ? outcome.athlete.id : null
    if (athleteId) ncMatched.push(`#${row.rank} ${row.athlete_name} (${row.weight_class})`)
    return {
      source: "sports_illustrated",
      ranking_month: rankingMonth,
      athlete_id: athleteId,
      athlete_name: row.athlete_name,
      rank: row.rank,
      scope: "weight",
      weight_class: row.weight_class,
      class_year: row.class_year,
      high_school: row.high_school,
      state: row.state,
      source_url: newest.url,
    }
  })

  const { error: clearError } = await admin
    .from("national_rankings")
    .delete()
    .eq("source", "sports_illustrated")
    .eq("ranking_month", rankingMonth)
    .eq("scope", "weight")
  if (clearError) throw new Error(`Clearing edition: ${clearError.message}`)
  for (let i = 0; i < payload.length; i += 500) {
    const { error } = await admin.from("national_rankings").insert(payload.slice(i, i + 500))
    if (error) throw new Error(`Inserting: ${error.message}`)
  }
  await admin.rpc("prune_national_rankings")

  return { status: "imported", url: newest.url, month, rows: payload.length, ncMatched }
}
