import { NATIONAL_RANKING_SOURCES, type NationalRankingSource } from "@/lib/national-rankings"
import { seasonEnd } from "@/lib/rankings/national-import"

/**
 * Whether a national rankings list is current, and what to say when it is not.
 *
 * Split out of the daily cron so the wording can be tested. Each watched list answers for itself:
 * an outlet publishes several, and a board per recruiting class, each on its own clock.
 */

/** Nobody has looked at this list in two days: the daily check has stopped. */
export const CHECK_STALE_DAYS = 2
/** No new edition in three weeks: worth a human look, since in season they publish weekly. */
export const EDITION_STALE_DAYS = 21

const GENDER: Record<string, string> = { M: "boys", F: "girls" }
const SCOPE: Record<string, string> = { weight: "", p4p: " P4P", big_board: " Big Board" }

export type WatchedList = {
  source: string
  gender: string
  scope: string
  editionClassYear: number
  lastCheckedAt?: string | null
  lastChangedAt?: string | null
  /** The day the outlet published the edition we hold, for this season. */
  published?: string | null
  /**
   * The newest edition the outlet has, when it is last season's and so was not stored. Knowing
   * this is the difference between "Flo has never published a girls list" and "Flo's newest girls
   * list is the 2025-26 final" - which read identically before, both as nothing at all.
   */
  priorSeasonPublished?: string | null
}

export function listLabel(list: Pick<WatchedList, "source" | "gender" | "scope" | "editionClassYear">): string {
  const source = NATIONAL_RANKING_SOURCES[list.source as NationalRankingSource] ?? list.source
  const covers = Number(list.editionClassYear) > 0 ? ` class of ${list.editionClassYear}` : ""
  return `${source} ${GENDER[list.gender] ?? list.gender}${SCOPE[list.scope] ?? ""}${covers}`
}

function daysSince(iso: string | null | undefined, now: Date): number {
  return iso ? (now.getTime() - new Date(iso).getTime()) / 86_400_000 : Infinity
}

/** A season runs August-July, and outlets start publishing it in September. */
function seasonStart(now: Date): number {
  return Date.UTC(seasonEnd(now) - 1, 8, 1)
}

export function freshnessProblem(list: WatchedList, now = new Date()): string | null {
  const label = listLabel(list)
  const checked = daysSince(list.lastCheckedAt, now)
  if (checked > CHECK_STALE_DAYS) {
    return `${label}: not checked ${Number.isFinite(checked) ? `in ${Math.floor(checked)} days` : "ever"}`
  }

  /*
   * No edition for this season. Measured from the start of the season rather than from the last
   * change, because a list that has never had one has no last change: that read as infinitely
   * stale and alerted every day forever, which is how a real gap becomes noise and gets ignored.
   */
  if (!list.published) {
    const waiting = Math.floor((now.getTime() - seasonStart(now)) / 86_400_000)
    if (waiting <= EDITION_STALE_DAYS) return null
    const season = `${seasonEnd(now) - 1}-${String(seasonEnd(now)).slice(2)}`
    return list.priorSeasonPublished
      ? `${label}: no ${season} edition ${waiting} days into the season — the newest list they have is last season's final (${list.priorSeasonPublished}), which ranks wrestlers who have since graduated`
      : `${label}: checked daily, but they have published no ${season} edition — ${waiting} days into the season`
  }

  const changed = daysSince(list.lastChangedAt, now)
  if (changed > EDITION_STALE_DAYS) {
    return `${label}: checked daily, but no new edition in ${Math.floor(changed)} days (last published ${list.published})`
  }
  return null
}
