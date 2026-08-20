import "server-only"

import { sendToSubscribers } from "@/lib/push-send"
import { getPublicAnnouncedWeight } from "@/lib/toc/public-announced-field"

/**
 * Push a weight-class reveal to the app.
 *
 * Fires from the admin announce route at the moment `announced_at` is set, so the alert and the
 * public page go live together — there is no polling job that could drift or double-send.
 */

export type TocAnnouncePush = { title: string; body: string; data: Record<string, unknown> }

/**
 * Copy for one reveal.
 *
 * Named wrestlers beat a count: "Cormac Beck, Mac Johnson and 10 more" is a reason to open the
 * app, where "12 wrestlers announced" is a statistic. Only athletes already public at this
 * weight are quoted, so the notification can never reveal more than the page it links to.
 */
export function buildTocAnnouncePush(input: {
  weightClass: number
  athleteNames: string[]
}): TocAnnouncePush {
  const { weightClass, athleteNames } = input
  const named = athleteNames.filter((n) => n.trim()).slice(0, 2)
  const remaining = Math.max(0, athleteNames.length - named.length)

  let body: string
  if (named.length === 0) {
    body = "The field for this weight is live. Tap to see who's in."
  } else if (remaining === 0) {
    body = `${named.join(" and ")} — tap to see the full weight.`
  } else {
    body = `${named.join(", ")} and ${remaining} more. Tap to see the full weight.`
  }

  return {
    title: `${weightClass} lbs is live`,
    body,
    data: { kind: "toc-field", weightClass, path: `/toc-field?weight=${weightClass}` },
  }
}

/**
 * Send the reveal. Never throws — a failed push must not fail the release, because the weight
 * is already public on the website by the time this runs and a rolled-back announce would be
 * far worse than a missed notification. Returns null when nothing was sent.
 */
export async function notifyTocWeightAnnounced(
  weightClass: number,
): Promise<{ sent: number; failed: number; pruned: number } | null> {
  try {
    const weight = await getPublicAnnouncedWeight(weightClass)
    if (!weight) {
      console.warn(`[toc-announce-push] weight ${weightClass} is not public — not notifying`)
      return null
    }

    const message = buildTocAnnouncePush({
      weightClass,
      athleteNames: weight.athletes.map((a) => a.name),
    })

    const result = await sendToSubscribers("alert_toc", message)
    console.info(
      `[toc-announce-push] weight ${weightClass}: sent ${result.sent}, failed ${result.failed}, pruned ${result.pruned}`,
    )
    return result
  } catch (e) {
    console.error("[toc-announce-push]", e instanceof Error ? e.message : e)
    return null
  }
}
