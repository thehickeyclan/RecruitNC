import { TOC_POOL_DEADLINE } from "@/lib/toc/constants"
import type { PushMessage } from "@/lib/push-send"

/**
 * What TOC Madness tells people, and when it is allowed to.
 *
 * Pure on purpose. The rules for "may this go out" are the part that must not be wrong — telling
 * a phone TOC Madness is open before the brackets are live breaks the one promise the release is
 * built around — so they live here where a test can hold them still.
 */

/** "Tuesday at 11:59 PM", in the tournament's own time zone. */
export function formatPoolDeadline(deadline: Date = TOC_POOL_DEADLINE): string {
  const day = deadline.toLocaleDateString("en-US", { weekday: "long", timeZone: "America/New_York" })
  const time = deadline.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" })
  return `${day} at ${time}`
}

/** Sent once, by an admin, after the brackets are live. */
export function buildTocMadnessOpenPush(deadline: Date = TOC_POOL_DEADLINE): PushMessage {
  return {
    title: "TOC Madness is open",
    body: `Pick every bout at every weight. Picks lock ${formatPoolDeadline(deadline)}.`,
    data: { kind: "toc-madness", path: "/toc-bracket" },
  }
}

/**
 * Sent to everyone with TOC alerts on, because phones are not linked to accounts.
 *
 * `push_devices` has no user column, so there is no way to find the phones whose owners have
 * unfinished picks — the wording therefore has to make sense to someone who has already finished.
 * The targeted version of this reminder is the email.
 */
export function buildTocMadnessReminderPush(deadline: Date = TOC_POOL_DEADLINE): PushMessage {
  return {
    title: "TOC Madness picks lock soon",
    body: `Every weight counts. Make sure all ten are in before ${formatPoolDeadline(deadline)}.`,
    data: { kind: "toc-madness", path: "/toc-bracket" },
  }
}

export type PoolEntryRow = { user_id: string | null; weight_class: number | null; submitted: boolean | null }

/**
 * Entrants who started and have not finished — the only people an unfinished-picks reminder is for.
 *
 * Somebody with no entry at all is not "unfinished"; they never began, and a reminder about
 * brackets they did not start reads as spam. Finished means a submitted entry for every weight
 * that has a locked draw, not a fixed ten, so a weight still waiting on a draw is not held against
 * anyone.
 */
export function incompleteEntrants(rows: readonly PoolEntryRow[], lockedWeights: readonly number[]): string[] {
  const needed = new Set(lockedWeights)
  const submittedByUser = new Map<string, Set<number>>()
  for (const row of rows) {
    if (!row.user_id) continue
    const set = submittedByUser.get(row.user_id) ?? new Set<number>()
    if (row.submitted && row.weight_class != null && needed.has(Number(row.weight_class))) set.add(Number(row.weight_class))
    submittedByUser.set(row.user_id, set)
  }
  return [...submittedByUser.entries()].filter(([, done]) => done.size < needed.size).map(([id]) => id)
}

export type SendWindow = { ok: true } | { ok: false; reason: string }

/**
 * Whether a TOC Madness notice may go out right now.
 *
 * Never before release, never after the deadline, and — for reminders — never twice inside the
 * gap, so a double-press or a reload cannot send the same alert to the same phones back to back.
 */
export function tocMadnessSendWindow(input: {
  bracketsReleased: boolean
  now: Date
  deadline?: Date
  lastSentAt: string | null
  minGapMs: number
}): SendWindow {
  const deadline = input.deadline ?? TOC_POOL_DEADLINE
  if (!input.bracketsReleased) return { ok: false, reason: "Brackets are not released yet. Press GO first." }
  if (input.now > deadline) return { ok: false, reason: "The TOC Madness deadline has passed." }
  if (input.lastSentAt && input.now.getTime() - new Date(input.lastSentAt).getTime() < input.minGapMs) {
    return { ok: false, reason: "That was already sent recently." }
  }
  return { ok: true }
}
