import type { SupabaseClient } from "@supabase/supabase-js"

import { importNationalEdition, markRankingChecked, seasonEnd, type ImportEditionResult } from "@/lib/rankings/national-import"

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

/** National-ranking article links on SI's wrestling page for one gender (P4P lists excluded). */
export function editionLinks(listingHtml: string, gender: "M" | "F"): string[] {
  const links = new Set<string>()
  for (const m of listingHtml.matchAll(/href="(https:\/\/www\.si\.com\/high-school\/wrestling\/[^"]+)"/g)) {
    const url = m[1]!
    if (!/wrestling-rankings/.test(url) || /pound-for-pound/.test(url)) continue
    const girls = /girls/.test(url)
    if (gender === "F" ? girls : /boys/.test(url) && !girls) links.add(url)
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
  for (const m of html.matchAll(/>\s*(\d{2,3})-Pounds\s*</g)) tokens.push({ at: m.index!, kind: "weight", value: m[1]! })
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

/** A full boys edition is 14 x 30; girls lists are shorter. Far short means the page changed shape. */
const MIN_ROWS = { M: MIN_EDITION_ROWS, F: 150 } as const

export type SiSyncResult = { gender: "M" | "F"; url: string } & (
  | { status: "current" }
  | ImportEditionResult
)

/**
 * Finds SI's newest boys and girls editions and loads any we do not already hold, through the
 * shared import (lib/rankings/national-import.ts).
 */
export async function syncSiNationalRankings(admin: SupabaseClient, options?: { force?: boolean }): Promise<SiSyncResult[]> {
  const listing = await fetchText(LISTING_URL)
  const results: SiSyncResult[] = []
  for (const gender of ["M", "F"] as const) {
    const links = editionLinks(listing, gender)
    if (!links.length) {
      if (gender === "M") throw new Error("No boys national-ranking articles found on SI's wrestling page")
      continue
    }
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
    if (held?.length && !options?.force) {
      await markRankingChecked(admin, "sports_illustrated", gender, "si-cron")
      results.push({ gender, url: newest.url, status: "current" })
      continue
    }

    const published = newest.published ? new Date(newest.published) : new Date()
    const season = seasonEnd(published)
    const rows = parseSiEdition(newest.html, season)
    const weights = new Set(rows.map((r) => r.weight_class))
    if (rows.length < MIN_ROWS[gender] || weights.size < 10) {
      throw new Error(`SI ${gender} edition parsed to ${rows.length} rows over ${weights.size} weights (${newest.url}); refusing a partial import`)
    }
    const result = await importNationalEdition(admin, {
      source: "sports_illustrated",
      gender,
      published: published.toISOString().slice(0, 10),
      url: newest.url,
      rows: rows.map((r) => ({ rank: r.rank, name: r.athlete_name, weight: r.weight_class, school: r.high_school, state: r.state, grade: r.class_year })),
      checkedBy: "si-cron",
    })
    results.push({ ...result, gender, url: newest.url })
  }
  return results
}
