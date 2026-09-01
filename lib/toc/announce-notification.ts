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

/** Strongest first. Not seeds — see the note on pickHeadliners. */
const CREDENTIAL_RANK: Record<string, number> = {
  "all-american": 0,
  "state-champion": 1,
  "state-placer": 2,
  "state-qualifier": 3,
}

export type AnnounceAthlete = { name: string; credentials?: { kind: string }[] }

/**
 * The two names worth leading with.
 *
 * The field page is ordered alphabetically on purpose — it is unseeded until the seeds drop, and
 * row order must not let anyone infer them. Taking the first two names off that page therefore
 * led with whoever happened to sort first, which sells the weight short.
 *
 * So this ranks by accolade, not by seed: All-American, then state champion, then placer, then
 * qualifier. Every one of those is already printed on the public page as a credential pill, so
 * nothing new is revealed — and unlike seed order it says nothing about how the bracket will be
 * drawn. Alphabetical breaks ties, so the choice stays stable between sends.
 */
export function pickHeadliners(athletes: readonly AnnounceAthlete[], count = 2): string[] {
  const best = (a: AnnounceAthlete) =>
    Math.min(...[...(a.credentials ?? []).map((c) => CREDENTIAL_RANK[c.kind] ?? 9), 9])

  return [...athletes]
    .filter((a) => a.name?.trim())
    .sort((a, b) => best(a) - best(b) || a.name.localeCompare(b.name))
    .slice(0, count)
    .map((a) => a.name)
}

/**
 * Copy for one reveal.
 *
 * Named wrestlers beat a count: "Cormac Beck, Mac Johnson and 10 more" is a reason to open the
 * app, where "12 wrestlers announced" is a statistic. Only athletes already public at this
 * weight are quoted, so the notification can never reveal more than the page it links to.
 */
export function buildTocAnnouncePush(input: {
  weightClass: number
  athletes: readonly AnnounceAthlete[]
}): TocAnnouncePush {
  const { weightClass, athletes } = input
  const named = pickHeadliners(athletes)
  const remaining = Math.max(0, athletes.length - named.length)

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
      athletes: weight.athletes.map((a) => ({ name: a.name, credentials: a.credentials })),
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
