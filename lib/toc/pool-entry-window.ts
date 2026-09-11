import { TOC_POOL_DEADLINE, TOC_POOL_OPENS } from "@/lib/toc/constants"

export type PoolWindow = { open: boolean; reason?: string }

/**
 * Whether TOC Madness is taking entries.
 *
 * Opens on the same switch as the brackets — the release row the admin GO button writes — and
 * nothing else.
 *
 * It used to open on an environment variable, `TOC_BRACKETS_PUBLIC_ENABLED`, which was set in no
 * Vercel environment at all. Pressing GO would have put every bracket in the app and left the
 * pool shut: people would fill in all ten weights, press submit, and be told "the pool opens when
 * official brackets are released" while looking at the official brackets. Two switches for one
 * moment is exactly how that happens.
 *
 * Picks are made against the official draw, so the pool can never open before release whatever
 * the calendar says; the dates only narrow the window further.
 */
export function poolWindow(bracketsReleased: boolean, now: Date): PoolWindow {
  if (!bracketsReleased || now < TOC_POOL_OPENS) {
    return { open: false, reason: "The pool opens when official brackets are released." }
  }
  if (now > TOC_POOL_DEADLINE) return { open: false, reason: "The deadline has passed. Entries are locked." }
  return { open: true }
}
