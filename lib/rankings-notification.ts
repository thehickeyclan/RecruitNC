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

  let body: string
  if (named.length === 0) {
    body = `${total} ranked ${girls ? "women's " : ""}wrestlers. Tap to see the list.`
  } else if (named.length === 1) {
    body = `${named[0]} leads the class. Tap to see all ${total}.`
  } else {
    body = `${named[0]} and ${named[1]} lead the class. Tap to see all ${total}.`
  }

  return {
    title: `${girls ? "Women's " : ""}Class of ${graduationYear} rankings are out`,
    body,
    /*
     * Deep-link to /public-rankings, not /rankings.
     *
     * /rankings is the sales page. /public-rankings is the hub, and it already sends anyone
     * without access back to /rankings on its own - so this one link is right for everybody:
     * a Blue family lands on the boards they were told about, and a stranger lands on the
     * offer. Pointing the alert at the sales page sent paying members to be sold to.
     */
    data: { kind: "rankings", graduationYear, gender, path: girls ? `/public-rankings/women/${graduationYear}` : "/public-rankings" },
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

/**
 * One alert for a whole rankings update (Matt, 30 October 2026).
 *
 * An update publishes several boards in one evening - 2027, 2028, 2029 and the Top 75 - and an
 * alert per board would hit the same parents four times for one event. This names everything
 * published in the update and who leads it, and links to the hub where every board is.
 */
export function buildRankingsUpdatePush(input: {
  classes: number[]
  top75: boolean
  leader: string | null
  /** The events this update added, named in the alert ("TOC", "Journeymen", "Super 32"). */
  events?: string[]
}): RankingsPush {
  const classes = [...new Set(input.classes)].sort((a, b) => a - b)
  const classPart = classes.length === 1 ? `Class of ${classes[0]}` : classes.length ? `Classes of ${joinAnd(classes.map(String))}` : ""
  const boards =
    classPart && input.top75 ? `${classPart} and the Top 75 College Prospects` : classPart || (input.top75 ? "The Top 75 College Prospects" : "The rankings")
  const events = (input.events ?? []).filter((e) => e.trim())
  const plural = classes.length > 1 || (classes.length > 0 && input.top75)
  // No names (Matt, 31 Oct 2026): the alert announces the boards, not a wrestler, and sends
  // people to log in - the boards are members-only.
  return {
    title: plural && input.top75 ? "All NC College Prospect Rankings updated" : "NC College Prospect Rankings updated",
    body: `${boards} ${events.length ? `now include ${joinAnd(events)} results` : plural ? "are updated" : "is updated"}. Log in to see them.`,
    // Same kind and hub link as a class alert, so phones on an older app bundle open it too.
    data: { kind: "rankings", graduationYear: classes[0] ?? null, gender: "Male", path: "/public-rankings" },
  }
}

function joinAnd(items: string[]): string {
  return items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`
}

export async function notifyRankingsUpdate(input: {
  classes: number[]
  top75: boolean
  leader: string | null
}): Promise<{ sent: number; failed: number; pruned: number; undelivered: number } | null> {
  try {
    const result = await sendToSubscribers("alert_rankings", buildRankingsUpdatePush(input))
    console.info(`[rankings-push] update ${input.classes.join(",")}${input.top75 ? "+top75" : ""}: sent ${result.sent}, failed ${result.failed}`)
    return result
  } catch (e) {
    console.error("[rankings-push]", e instanceof Error ? e.message : e)
    return null
  }
}
