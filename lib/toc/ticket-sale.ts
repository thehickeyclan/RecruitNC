/**
 * TOC ticket sale gate — one clock for every surface that mentions tickets.
 *
 * Before Friday Aug 28th, 2026 9:00 AM ET: announcement, no purchase link anywhere.
 * From that moment: GoFan buy buttons, no deploy needed. The TOC page is force-dynamic,
 * so server renders flip at the exact request; TocTicketCta flips live for anyone already
 * on the page when the clock strikes.
 */

/** 9:00 AM Eastern on Aug 28, 2026 is EDT (UTC-4) → 13:00 UTC. Public sale opens with the full-field reveal; athlete families get presale access first (~Aug 24) via a private GoFan link. */
export const TOC_TICKET_SALE_AT_MS = Date.parse("2026-08-28T09:00:00-04:00")

export function tocTicketsOnSale(nowMs: number = Date.now()): boolean {
  return nowMs >= TOC_TICKET_SALE_AT_MS
}

/** ms until the flip (0 once live) — for scheduling the client-side re-render. */
export function msUntilTocTicketSale(nowMs: number = Date.now()): number {
  return Math.max(0, TOC_TICKET_SALE_AT_MS - nowMs)
}
