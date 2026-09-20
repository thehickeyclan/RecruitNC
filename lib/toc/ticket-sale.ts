/**
 * TOC ticket sale gate — one clock for every surface that mentions tickets.
 *
 * Before Friday Aug 28th, 2026 8:00 AM ET: announcement, no purchase link anywhere.
 * From that moment: GoFan buy buttons, no deploy needed. The TOC page is force-dynamic,
 * so server renders flip at the exact request; TocTicketCta flips live for anyone already
 * on the page when the clock strikes.
 *
 * And a close, because the sale had an opening with no end: the homepage was still pulsing
 * "Tickets on sale now" at a tournament that had already crowned its champions. Every surface
 * asks this one function, so the close only has to be written once — but each of them owes the
 * reader a third answer, because "not yet" is as wrong as "on sale now" the day after.
 */

/** Public sale, opened on the morning of Aug 28 2026. Athlete families had presale access first
 * (~Aug 24) through a private GoFan link. Brought forward from 9:00 on the day itself. */
export const TOC_TICKET_SALE_AT_MS = Date.parse("2026-08-28T08:00:00-04:00")

/** Saturday night: the finals are wrestled and the doors are shut. Matches the app's TOC_ENDED. */
export const TOC_EVENT_ENDED_AT_MS = Date.parse("2026-09-19T22:00:00-04:00")

/** Whether the 2026 tournament is behind us, which is what most event copy now hangs on. */
export function tocEventIsOver(nowMs: number = Date.now()): boolean {
  return nowMs >= TOC_EVENT_ENDED_AT_MS
}

export function tocTicketsOnSale(nowMs: number = Date.now()): boolean {
  return nowMs >= TOC_TICKET_SALE_AT_MS && !tocEventIsOver(nowMs)
}

/** ms until the flip (0 once live) — for scheduling the client-side re-render. */
export function msUntilTocTicketSale(nowMs: number = Date.now()): number {
  return Math.max(0, TOC_TICKET_SALE_AT_MS - nowMs)
}
