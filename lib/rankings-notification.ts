import "server-only"

import { sendToSubscribers } from "@/lib/push-send"

/**
 * Push a rankings publish to the app.
 *
 * Fires from the admin publish route, so the alert and the public rankings go live together —
 * the same shape as a TOC weight release, and for the same reason: the moment is known, so
 * there is nothing for a polling job to miss or double-send.
 */

export type RankingsPush = { title: string; body: string; data: Record<string, unknown> }

/**
 * Copy for one class publish.
 *
 * Leads with the names at the top, because "Carson Worrick leads the Class of 2027" is a
 * reason to open the app and "Class of 2027 rankings updated" is a notice. Only athletes in
 * the published set are named, so the alert cannot reveal more than the page it links to.
 */
export function buildRankingsPush(input: {
  graduationYear: number
  gender: string
  topNames: string[]
  total: number
}): RankingsPush {
  const { graduationYear, gender, topNames, total } = input
  const named = topNames.filter((n) => n?.trim()).slice(0, 2)
  const girls = /female|girls|women/i.test(gender)
  const who = girls ? "girls " : ""

  let body: string
  if (named.length === 0) {
    body = `${total} ranked ${girls ? "girls " : ""}wrestlers. Tap to see the list.`
  } else if (named.length === 1) {
    body = `${named[0]} leads the class. Tap to see all ${total}.`
  } else {
    body = `${named[0]} and ${named[1]} lead the class. Tap to see all ${total}.`
  }

  return {
    title: `Class of ${graduationYear} ${who}rankings are out`.replace("  ", " "),
    body,
    data: { kind: "rankings", graduationYear, gender, path: "/rankings" },
  }
}

/**
 * Send the rankings alert. Never throws — the rankings are already public by the time this
 * runs, and failing the publish because a notification failed would be the wrong trade.
 */
export async function notifyRankingsPublished(input: {
  graduationYear: number
  gender: string
  rankedNames: string[]
}): Promise<{ sent: number; failed: number; pruned: number; undelivered: number } | null> {
  try {
    const message = buildRankingsPush({
      graduationYear: input.graduationYear,
      gender: input.gender,
      topNames: input.rankedNames,
      total: input.rankedNames.length,
    })
    const result = await sendToSubscribers("alert_rankings", message)
    console.info(
      `[rankings-push] class of ${input.graduationYear} ${input.gender}: sent ${result.sent}, failed ${result.failed}, undelivered ${result.undelivered}`,
    )
    return result
  } catch (e) {
    console.error("[rankings-push]", e instanceof Error ? e.message : e)
    return null
  }
}
