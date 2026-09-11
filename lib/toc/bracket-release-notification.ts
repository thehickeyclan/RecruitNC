import "server-only"
import { sendToSubscribers, type PushMessage } from "@/lib/push-send"
import { TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"

/**
 * The one alert that says brackets are live.
 *
 * Deliberately a single push for the whole tournament rather than one per weight. Ten weights
 * released together would be ten notifications in a minute, which is how people turn a category
 * off — and the brackets going up is one moment, not ten.
 */

export function buildBracketReleasePush(weights: readonly number[]): PushMessage {
  const count = weights.length
  const list = [...weights].sort((a, b) => a - b)

  // Naming a few weights beats a bare count: a parent scanning a lock screen is looking for one
  // number, and seeing it is the difference between opening the app now and later.
  const body =
    count === 1
      ? `The ${list[0]} lb bracket is live. Tap to see the draw.`
      : count <= 4
        ? `${list.slice(0, -1).join(", ")} and ${list[count - 1]} lbs. Tap to see the draws.`
        : // "All" only when it is true. A weight held back for a redraw goes out later, and
          // "All 9 weight classes" on a ten-weight tournament tells that weight's families
          // their bracket is not coming.
          `${count >= TOC_WEIGHT_CLASSES.length ? "All " : ""}${count} weight classes. Tap to see the draws.`

  return {
    title: "Brackets are live",
    body,
    data: { kind: "toc-brackets", path: "/toc-bracket" },
  }
}

/**
 * Send it. Never throws — the brackets are already public by the time this runs, and a failed
 * push must not roll back a release or leave the button reporting an error for something that
 * worked. Returns null when nothing was sent.
 */
export async function notifyTocBracketsReleased(
  weights: readonly number[],
): Promise<{ sent: number; failed: number } | null> {
  if (!weights.length) return null
  try {
    const result = await sendToSubscribers("alert_toc", buildBracketReleasePush(weights))
    console.info(`[toc-bracket-release-push] sent ${result.sent}, failed ${result.failed}`)
    return result
  } catch (e) {
    console.error("[toc-bracket-release-push]", e instanceof Error ? e.message : e)
    return null
  }
}
