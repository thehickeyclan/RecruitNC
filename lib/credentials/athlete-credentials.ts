import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { loadAthleteTournamentBundle } from "@/lib/athlete-tournament-bundle"

/**
 * What credentials an athlete holds — one definition, for every surface that shows one.
 *
 * This exists because four surfaces each answered that question their own way and gave four
 * different answers about the same wrestler. The public rankings page reconciled names through
 * {@link loadAthleteTournamentBundle}; the Tournament of Champions field read `nhsca_placements`
 * and `fargo_results` keyed on `athlete_id`; the phone app, in its own repo with only the anon
 * key, reimplemented a third version against the raw tables.
 *
 * The ID-keyed versions were the broken ones, and they were broken invisibly. Sixty of the 106
 * All-American rows in `nhsca_placements` carry no `athlete_id` — a 2025 import shifted the first
 * word of the school onto the wrestler's name ("Connor Reece Oak", school "Ridge"), so exact-name
 * matching failed and the link was never made. A query keyed on that column drops those wrestlers
 * without erroring, which is why Ryan Thompson's All-American showed and Jacob Perry's did not.
 * Nothing about that is predictable from the outside.
 *
 * The bundle reconciles a name against the athlete's school and the seasons they could plausibly
 * have wrestled, so it finds the credential whether or not anybody linked the row. Every surface
 * should ask this module, and no surface should read the underlying tables to decide what a
 * wrestler has won.
 */

/** Top eight at a national championship is All-American. */
export const ALL_AMERICAN_PLACES = 8

export type AllAmericanFinish = {
  year: number
  event: "NHSCA" | "Fargo"
  /** Numeric finish, 1–8. */
  place: number
  /** The division as recorded, e.g. "16U Boys Freestyle". Never published; kept for auditing. */
  division: string | null
}

export type StateFinish = {
  year: number
  /** Null means qualified without placing. A zero in the source table means the same thing. */
  place: number | null
  classification: string | null
}

/**
 * One national appearance, newest-first across every event.
 *
 * Ordering is by year and not by event, because a card shows the last three things a wrestler did
 * and "last" is a question about time. Grouping by event meant a 2024 NHSCA trip could outrank a
 * 2026 Super 32 placing purely because NHSCA was queried first.
 */
export type NationalResult = {
  year: number
  event: "NHSCA" | "Super 32" | "Fargo"
  /** Numeric finish where there is one; 1–8 is All-American at NHSCA and Fargo. */
  place: number | null
  /** The placement as written when it is not a number, e.g. "Round of 16". */
  placementText: string | null
  record: string | null
}

export type AthleteCredentials = {
  allAmerican: AllAmericanFinish[]
  state: StateFinish[]
  /** Every national appearance, newest first — placings and record-only trips alike. */
  national: NationalResult[]
}

/**
 * A placement as a number, from the several shapes the sources use.
 *
 * `nhsca_placements` stores an integer; the merged bundle hands back the display string it was
 * imported with ("7th All-American", "Champion", "Runner-up"). Both have to reduce to the same
 * number or the same wrestler scores differently depending on which table answered first.
 */
export function placementNumber(value: unknown): number | null {
  const text = String(value ?? "").trim()
  if (!text) return null
  if (/champ/i.test(text)) return 1
  if (/runner|finalist/i.test(text)) return 2
  /*
   * Anchored at the start, and deliberately so. A loose \d search read "Round of 16" as a 16th-place
   * finish — turning an early exit into a placing on every card that showed one. A placement always
   * leads with its number ("7", "7th", "4th All-American"); a round never does.
   */
  const match = text.match(/^(\d{1,2})\s*(?:st|nd|rd|th)?\b/i)
  if (!match) return null
  const place = Number(match[1])
  return Number.isInteger(place) && place >= 1 && place <= 99 ? place : null
}

function isAllAmericanPlace(place: number | null): place is number {
  return place != null && place >= 1 && place <= ALL_AMERICAN_PLACES
}

/**
 * Fargo counts in both styles.
 *
 * The public rankings page filtered these to freestyle, which quietly cost Aaron Ellison the
 * Greco-Roman All-American the Tournament of Champions field was showing him for. Fargo is the
 * national championship in both styles and a podium is a podium; the narrower rule was an
 * accident of whichever page was written first, not a judgement anybody made.
 */
function fargoFinishes(bundle: { fargo: Array<Record<string, unknown>> }): AllAmericanFinish[] {
  return finishesFrom(bundle.fargo, "Fargo")
}

/** Shared shape work for both national events, so neither can drift from the other. */
function finishesFrom(rows: Array<Record<string, unknown>>, event: "NHSCA" | "Fargo"): AllAmericanFinish[] {
  const out: AllAmericanFinish[] = []
  for (const row of rows) {
    const year = Number(row.year)
    const place = placementNumber(row.placement)
    if (!Number.isFinite(year) || !isAllAmericanPlace(place)) continue
    out.push({ year, event, place, division: typeof row.division === "string" ? row.division : null })
  }
  return out
}

function nhscaFinishes(bundle: { nhsca: Array<Record<string, unknown>> }): AllAmericanFinish[] {
  return finishesFrom(bundle.nhsca, "NHSCA")
}

/**
 * Credentials for one athlete.
 *
 * `athlete` must carry the identity columns: `id`, `name`, `wrestling_name`, `firstName`,
 * `lastName`, `highschool`, `graduationyear`, `nhsca_results` and `super32_results`. The matcher
 * reads the school and the graduation year to decide whose result is whose, and a row with the
 * school left out silently weakens every match rather than failing — which is exactly how the
 * Tournament of Champions field ended up matching on a `highschool` its own select never asked
 * for. Pass an allowlist of those columns, not `select("*")`: this table also holds GPA, contact
 * details and staff evaluation notes.
 */
export async function loadAthleteCredentials(
  supabase: SupabaseClient,
  athlete: Record<string, unknown>,
): Promise<AthleteCredentials> {
  const bundle = await loadAthleteTournamentBundle(supabase, athlete, { nhscaAllTime: true })

  const allAmerican = [...nhscaFinishes(bundle as never), ...fargoFinishes(bundle as never)].sort(
    (a, b) => b.year - a.year || a.place - b.place,
  )

  const state: StateFinish[] = bundle.nchsaa
    .map((row) => ({
      year: Number(row.year),
      // A zero in this table means qualified and did not place, not first.
      place: row.place == null || Number(row.place) < 1 ? null : Number(row.place),
      classification: (row as { classification?: string | null }).classification ?? null,
    }))
    .filter((row) => Number.isFinite(row.year))
    .sort((a, b) => b.year - a.year)

  const national: NationalResult[] = (
    [
      [bundle.nhsca, "NHSCA"],
      [bundle.super32, "Super 32"],
      [bundle.fargo, "Fargo"],
    ] as const
  )
    .flatMap(([rows, event]) =>
      (rows as unknown as Array<Record<string, unknown>>).map((row) => {
        const raw = String(row.placement ?? "").trim()
        const place = placementNumber(raw)
        return {
          year: Number(row.year),
          event,
          place,
          // Keep the words when the finish is not a number: "Round of 16" is a real result.
          placementText: place == null && raw ? raw : null,
          record: String(row.record ?? "").trim() || null,
        }
      }),
    )
    .filter((row) => Number.isFinite(row.year))
    /*
     * Placings first, then trips that produced only a record — each group newest-first.
     *
     * Callers cap these at two or three lines, so ordering decides what a card actually shows.
     * Sorting purely by year let a newer losing record push an older podium finish off the end:
     * a wrestler with a 2026 Fargo 0-2 and a 2025 NHSCA 4th would lead with the 0-2. A card is a
     * summary of what someone has done, and what they have done is the placing.
     */
    .sort((a, b) => {
      const placed = (r: NationalResult) => (r.place != null || r.placementText ? 0 : 1)
      return placed(a) - placed(b) || b.year - a.year || (a.place ?? 99) - (b.place ?? 99)
    })

  return { allAmerican, state, national }
}

/**
 * Run at most `limit` at once.
 *
 * Reconciling a name is not one query — each source tries an exact match, then a last-first form,
 * then each spelling variant, awaiting one before starting the next. Fanning ten weights of eight
 * wrestlers out at once therefore asked Postgres for several hundred things simultaneously, and it
 * started refusing. See {@link loadAthleteCredentialsBatch} for what that cost.
 */
async function mapWithLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = next++
      if (i >= items.length) return
      out[i] = await fn(items[i]!)
    }
  })
  await Promise.all(workers)
  return out
}

const CONCURRENCY = 4
const RETRY_DELAY_MS = 250

/**
 * Credentials for a set of athletes, one bundle each.
 *
 * A batched query on `athlete_id` would be one round trip instead of N, and that is exactly the
 * shortcut that broke this in the first place. Reconciliation is per-athlete by nature: it needs
 * the school and the graduation year to tell two wrestlers with one name apart. Every caller
 * caches its result, and a credential that is wrong is worth nothing however fast it loads.
 *
 * **This used to swallow failures, and that was the worst thing in the file.** A per-athlete catch
 * returned empty credentials on error, which is indistinguishable from a wrestler who has won
 * nothing. Under the load of the whole field at once Postgres began refusing connections, and 23
 * of the 80 wrestlers in the Tournament of Champions field lost their pills in production —
 * everyone at 149, half of 197 and 285 — silently, and cached that way for half an hour. It was
 * the same class of bug this module exists to end: a lookup that fails by quietly saying "nothing".
 *
 * So: bounded concurrency, one retry, and then a throw. A caller that cannot load credentials must
 * find out. Blanking a weight is bad; publishing a state champion with no credentials, and
 * believing it, is worse — nobody looking at the page can tell that anything went wrong.
 */
export async function loadAthleteCredentialsBatch(
  supabase: SupabaseClient,
  athletes: Array<Record<string, unknown>>,
): Promise<Map<string, AthleteCredentials>> {
  const out = new Map<string, AthleteCredentials>()
  if (athletes.length === 0) return out

  const settled = await mapWithLimit(athletes, CONCURRENCY, async (athlete) => {
    const id = String(athlete.id ?? "")
    try {
      return [id, await loadAthleteCredentials(supabase, athlete)] as const
    } catch (first) {
      // Almost always a connection Postgres declined under load, which succeeds on a second ask.
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
      try {
        return [id, await loadAthleteCredentials(supabase, athlete)] as const
      } catch (second) {
        console.error(`[athlete-credentials] lookup failed twice for ${id}:`, second ?? first)
        throw second
      }
    }
  })

  for (const [id, credentials] of settled) {
    if (id) out.set(id, credentials)
  }
  return out
}

/** "4" reads as a stray number under a photo; "4th" reads as a finish. */
export function ordinal(place: number): string {
  const suffix =
    place % 100 >= 11 && place % 100 <= 13
      ? "th"
      : place % 10 === 1
        ? "st"
        : place % 10 === 2
          ? "nd"
          : place % 10 === 3
            ? "rd"
            : "th"
  return `${place}${suffix}`
}

/** How many All-American honours, and the newest one — the two numbers every pill needs. */
export function allAmericanSummary(credentials: AthleteCredentials): {
  honors: number
  newest: AllAmericanFinish | null
} {
  return { honors: credentials.allAmerican.length, newest: credentials.allAmerican[0] ?? null }
}
