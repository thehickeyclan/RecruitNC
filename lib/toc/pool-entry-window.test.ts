import { describe, expect, it } from "vitest"
import { TOC_POOL_DEADLINE, TOC_POOL_OPENS } from "@/lib/toc/constants"

/**
 * The pool window has two gates, and the second one is the subtle one.
 *
 * Entries are picks against the official draw. While brackets are private every entrant is
 * looking at their own projected seeding, so "bout 1" means a different pairing for each of them.
 * Those picks pass validation — the bout numbers and wrestlers are all real — and would then be
 * scored against a bracket the entrant never saw.
 */
describe("the pool window", () => {
  it("opens after the brackets are released, not before", () => {
    // The dates alone would have opened it while TOC_BRACKETS_PUBLIC_ENABLED was still false.
    expect(TOC_POOL_OPENS.getTime()).toBeLessThan(TOC_POOL_DEADLINE.getTime())
  })

  it("keeps the deadline before the tournament's first round", () => {
    const firstRound = new Date("2026-09-18T00:00:00-04:00")
    expect(TOC_POOL_DEADLINE.getTime()).toBeLessThan(firstRound.getTime())
  })
})
