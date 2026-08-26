import { describe, expect, it } from "vitest"
import {
  coachKeyFor,
  dedupeIncoming,
  fitsWithinCap,
  toCheckInList,
  validateCoachDesignation,
} from "./coach-designation"

const coach = (email: string, name = "Coach Smith") => ({
  coachName: name,
  coachEmail: email,
  coachPhone: null,
  relationship: null,
  coachKey: coachKeyFor(email, null)!,
  phoneKey: null,
})

describe("validateCoachDesignation", () => {
  it("takes a complete designation", () => {
    const r = validateCoachDesignation({ coachName: "John Smith", coachEmail: "John@Club.com ", coachPhone: "919-555-0100" })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.coachName).toBe("John Smith")
      // The key is what dedupes twelve families naming the same person.
      expect(r.value.coachKey).toBe("john@club.com")
    }
  })

  it("refuses a name too short to be a name", () => {
    expect(validateCoachDesignation({ coachName: "J", coachEmail: "a@b.com" }).ok).toBe(false)
  })

  it("refuses an address that is not one", () => {
    expect(validateCoachDesignation({ coachName: "John Smith", coachEmail: "john at club" }).ok).toBe(false)
  })

  it("accepts a coach given only by phone", () => {
    // A parent may have their coach's number and not their email; refusing that loses a coach.
    const r = validateCoachDesignation({ coachName: "John Smith", coachPhone: "(919) 555-0100" })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.coachKey).toBe("tel:9195550100")
  })

  it("treats the same number written differently as one coach", () => {
    const a = validateCoachDesignation({ coachName: "John Smith", coachPhone: "919-555-0100" })
    const b = validateCoachDesignation({ coachName: "John Smith", coachPhone: "+1 (919) 555 0100" })
    expect(a.ok && b.ok && a.value.coachKey === b.value.coachKey).toBe(true)
  })

  it("prefers the email when both are given, so it stays the key", () => {
    const r = validateCoachDesignation({
      coachName: "John Smith",
      coachEmail: "john@club.com",
      coachPhone: "919-555-0100",
    })
    expect(r.ok && r.value.coachKey).toBe("john@club.com")
  })

  it("refuses a coach with no way to reach them", () => {
    expect(validateCoachDesignation({ coachName: "John Smith" }).ok).toBe(false)
  })

  it("refuses a phone number that is not one", () => {
    expect(validateCoachDesignation({ coachName: "John Smith", coachPhone: "12345" }).ok).toBe(false)
  })
})

describe("fitsWithinCap", () => {
  it("allows two", () => {
    expect(fitsWithinCap([], [coach("a@x.com"), coach("b@x.com")]).ok).toBe(true)
  })

  it("refuses a third", () => {
    expect(fitsWithinCap(["a@x.com", "b@x.com"], [coach("c@x.com")]).ok).toBe(false)
  })

  it("treats re-naming a coach already on file as an edit, not a third", () => {
    // A family fixing a phone number must not be told they are over the limit.
    expect(fitsWithinCap(["a@x.com", "b@x.com"], [coach("a@x.com")]).ok).toBe(true)
  })

  it("ignores case and spacing when counting", () => {
    expect(fitsWithinCap(["a@x.com", "b@x.com"], [coach(" A@X.com ")]).ok).toBe(true)
  })
})

describe("dedupeIncoming", () => {
  it("collapses the same coach entered twice on one form", () => {
    expect(dedupeIncoming([coach("a@x.com"), coach("A@X.com")])).toHaveLength(1)
  })
})

describe("toCheckInList", () => {
  const row = (key: string, athlete: string, weight: number, status = "approved", name = "John Smith") => ({
    coach_key: key,
    coach_name: name,
    coach_email: key,
    coach_phone: null,
    status,
    athlete_name: athlete,
    weight_class: weight,
    relationship: null,
  })

  it("gives one row per coach with everyone they corner", () => {
    const list = toCheckInList([
      row("smith@club.com", "Miller", 133),
      row("smith@club.com", "Jones", 117),
      row("other@club.com", "Perry", 149, "approved", "Ann Other"),
    ])
    expect(list).toHaveLength(2)
    expect(list[0].coachName).toBe("John Smith")
    expect(list[0].athletes.map((a) => a.athleteName)).toEqual(["Jones", "Miller"])
  })

  it("puts the busiest coach first — that is who the desk sees most", () => {
    const list = toCheckInList([
      row("one@club.com", "Perry", 149, "approved", "Ann One"),
      row("many@club.com", "Miller", 133, "approved", "Bob Many"),
      row("many@club.com", "Jones", 117, "approved", "Bob Many"),
    ])
    expect(list[0].coachName).toBe("Bob Many")
  })

  it("counts a coach as approved once any of their designations is", () => {
    // The lanyard is per person: approved for one wrestler is approved at the door.
    const list = toCheckInList([
      row("smith@club.com", "Miller", 133, "pending"),
      row("smith@club.com", "Jones", 117, "approved"),
    ])
    expect(list[0].status).toBe("approved")
  })
})
