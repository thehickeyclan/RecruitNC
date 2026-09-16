import { describe, expect, it } from "vitest"

import { UP_NEXT_EVENTS, getUpNextEvents, upNextAthleteIds } from "./recruiting-guide-up-next"

/**
 * This map is typed by hand from a group chat, keyed by uuid, and read by a document that gets
 * printed and bound. A mistyped key fails silently — the wrestler simply prints without a
 * schedule, which nobody notices until the books are in the room. These guard the shape; that the
 * ids belong to the right wrestlers was checked against the confirmed field before they were
 * entered.
 */

describe("up-next schedules", () => {
  const ids = upNextAthleteIds()

  it("keys every entry by a well-formed athlete id", () => {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    for (const id of ids) expect(id, `${id} is not a uuid`).toMatch(uuid)
  })

  it("never lists the same wrestler twice", () => {
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("gives every listed wrestler at least one event", () => {
    for (const id of ids) expect(getUpNextEvents(id).length, `${id} has no events`).toBeGreaterThan(0)
  })

  it("prints one spelling per event", () => {
    // The chat had "S32", "Super32", "I64", "I-64" and "journeyman" for four events.
    //
    // A parenthetical detail may follow the name — "Journeymen (main event, 160)" — so the
    // check is on the name in front of it, which is the part that must not vary.
    const allowed = new Set<string>(Object.values(UP_NEXT_EVENTS))
    for (const id of ids) {
      for (const event of getUpNextEvents(id)) {
        const name = event.split(" (")[0]
        expect(allowed.has(name), `"${event}" is not a normalised event name`).toBe(true)
      }
    }
  })

  it("never repeats an event within one wrestler's list", () => {
    for (const id of ids) {
      const events = getUpNextEvents(id)
      expect(new Set(events).size, `${id} repeats an event`).toBe(events.length)
    }
  })

  it("returns nothing for a wrestler nobody sent a schedule for", () => {
    expect(getUpNextEvents("00000000-0000-0000-0000-000000000000")).toEqual([])
    expect(getUpNextEvents("")).toEqual([])
  })
})
