import { describe, expect, it } from "vitest"
import { msUntilTocTicketSale, TOC_TICKET_SALE_AT_MS, tocTicketsOnSale } from "@/lib/toc/ticket-sale"

describe("tocTicketsOnSale", () => {
  it("pins the announced moment: Friday Aug 28, 2026 9:00 AM ET (EDT = 13:00 UTC)", () => {
    expect(TOC_TICKET_SALE_AT_MS).toBe(Date.parse("2026-08-28T13:00:00Z"))
    // And it really is a Friday, as the announcement says.
    expect(new Date(TOC_TICKET_SALE_AT_MS).getUTCDay()).toBe(5)
  })

  it("is off before, on at the exact moment, and on after", () => {
    expect(tocTicketsOnSale(TOC_TICKET_SALE_AT_MS - 1)).toBe(false)
    expect(tocTicketsOnSale(TOC_TICKET_SALE_AT_MS)).toBe(true)
    expect(tocTicketsOnSale(TOC_TICKET_SALE_AT_MS + 1)).toBe(true)
  })

  it("is off at 8:59 AM ET and on at 9:01 AM ET on sale day", () => {
    expect(tocTicketsOnSale(Date.parse("2026-08-28T08:59:00-04:00"))).toBe(false)
    expect(tocTicketsOnSale(Date.parse("2026-08-28T09:01:00-04:00"))).toBe(true)
  })

  it("counts down to the flip and clamps at zero once live", () => {
    expect(msUntilTocTicketSale(TOC_TICKET_SALE_AT_MS - 5_000)).toBe(5_000)
    expect(msUntilTocTicketSale(TOC_TICKET_SALE_AT_MS)).toBe(0)
    expect(msUntilTocTicketSale(TOC_TICKET_SALE_AT_MS + 60_000)).toBe(0)
  })
})
