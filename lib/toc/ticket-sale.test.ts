import { describe, expect, it } from "vitest"
import {
  msUntilTocTicketSale,
  TOC_EVENT_ENDED_AT_MS,
  TOC_TICKET_SALE_AT_MS,
  tocEventIsOver,
  tocTicketsOnSale,
} from "@/lib/toc/ticket-sale"

describe("tocTicketsOnSale", () => {
  it("pins the announced moment: Friday Aug 28, 2026 8:00 AM ET (EDT = 12:00 UTC)", () => {
    expect(TOC_TICKET_SALE_AT_MS).toBe(Date.parse("2026-08-28T12:00:00Z"))
    // And it really is a Friday, as the announcement says.
    expect(new Date(TOC_TICKET_SALE_AT_MS).getUTCDay()).toBe(5)
  })

  it("is off before, on at the exact moment, and on after", () => {
    expect(tocTicketsOnSale(TOC_TICKET_SALE_AT_MS - 1)).toBe(false)
    expect(tocTicketsOnSale(TOC_TICKET_SALE_AT_MS)).toBe(true)
    expect(tocTicketsOnSale(TOC_TICKET_SALE_AT_MS + 1)).toBe(true)
  })

  it("is off at 7:59 AM ET and on at 8:01 AM ET on sale day", () => {
    expect(tocTicketsOnSale(Date.parse("2026-08-28T07:59:00-04:00"))).toBe(false)
    expect(tocTicketsOnSale(Date.parse("2026-08-28T08:01:00-04:00"))).toBe(true)
  })

  it("shuts the sale when the tournament ends", () => {
    // The bug this closes: the homepage was still pulsing "Tickets on sale now" the morning after.
    expect(tocTicketsOnSale(TOC_EVENT_ENDED_AT_MS - 60_000)).toBe(true)
    expect(tocTicketsOnSale(TOC_EVENT_ENDED_AT_MS)).toBe(false)
    expect(tocTicketsOnSale(Date.parse("2026-11-01T12:00:00-05:00"))).toBe(false)
  })

  it("counts down to the flip and clamps at zero once live", () => {
    expect(msUntilTocTicketSale(TOC_TICKET_SALE_AT_MS - 5_000)).toBe(5_000)
    expect(msUntilTocTicketSale(TOC_TICKET_SALE_AT_MS)).toBe(0)
    expect(msUntilTocTicketSale(TOC_TICKET_SALE_AT_MS + 60_000)).toBe(0)
  })
})

describe("tocEventIsOver", () => {
  it("turns over on Saturday night, when the finals are done", () => {
    expect(TOC_EVENT_ENDED_AT_MS).toBe(Date.parse("2026-09-20T02:00:00Z"))
    expect(tocEventIsOver(TOC_EVENT_ENDED_AT_MS - 1)).toBe(false)
    expect(tocEventIsOver(TOC_EVENT_ENDED_AT_MS)).toBe(true)
  })
})
