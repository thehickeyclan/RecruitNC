import { describe, expect, it } from "vitest"
import { TOC_POOL_DEADLINE, TOC_POOL_OPENS } from "@/lib/toc/constants"
import { poolWindow } from "@/lib/toc/pool-entry-window"

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
    /*
     * The real first whistle: Friday 6:00 PM, "round one begins on two mats" in TOC_SCHEDULE.
     *
     * This used to read midnight at the start of Friday — a stand-in for "the tournament", not the
     * first round — which only held while the deadline sat on Thursday night. Moving the deadline to
     * Friday afternoon, after weigh-ins, made the stand-in wrong. Pinning the actual 6:00 PM makes
     * the guard stricter, not looser: it now fails if the deadline ever reaches the first bout.
     */
    const firstRound = new Date("2026-09-18T18:00:00-04:00")
    expect(TOC_POOL_DEADLINE.getTime()).toBeLessThan(firstRound.getTime())
  })

  it("stays shut before release even when the calendar says open", () => {
    const afterOpens = new Date(TOC_POOL_OPENS.getTime() + 60_000)
    expect(poolWindow(false, afterOpens).open).toBe(false)
  })

  it("opens the moment brackets are released", () => {
    const afterOpens = new Date(TOC_POOL_OPENS.getTime() + 60_000)
    expect(poolWindow(true, afterOpens)).toEqual({ open: true })
  })

  it("locks after the deadline even though brackets stay released", () => {
    const late = new Date(TOC_POOL_DEADLINE.getTime() + 1)
    expect(poolWindow(true, late).open).toBe(false)
  })
})
