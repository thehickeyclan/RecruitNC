import { describe, expect, it } from "vitest"
import {
  applyKnownIdentities,
  coachCapFlags,
  coachKeyFor,
  groupByContact,
  maskEmail,
  maskPhone,
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
  /** Existing rows as the route now supplies them: key plus the details that identify the person. */
  const onFile = (key: string, over: { email?: string | null; phone?: string | null } = {}) => ({
    coachKey: key,
    coachEmail: over.email ?? (key.includes("@") ? key : null),
    phoneKey: over.phone ?? (key.startsWith("tel:") ? key.slice(4) : null),
  })

  it("allows two", () => {
    expect(fitsWithinCap([], [coach("a@x.com"), coach("b@x.com")]).ok).toBe(true)
  })

  it("refuses a third", () => {
    expect(fitsWithinCap([onFile("a@x.com"), onFile("b@x.com")], [coach("c@x.com")]).ok).toBe(false)
  })

  it("treats re-naming a coach already on file as an edit, not a third", () => {
    // A family fixing a phone number must not be told they are over the limit.
    expect(fitsWithinCap([onFile("a@x.com"), onFile("b@x.com")], [coach("a@x.com")]).ok).toBe(true)
  })

  it("ignores case and spacing when counting", () => {
    expect(fitsWithinCap([onFile("a@x.com"), onFile("b@x.com")], [coach(" A@X.com ")]).ok).toBe(true)
  })

  it("counts one coach once even when he arrives under a different key", () => {
    /**
     * Xavier Bernthal's case. Justin Perry was on file as a phone; the family resubmitted him by
     * email alongside a second coach, and counting keys read three people for two.
     */
    const justinOnFile = onFile("tel:8566388831", { email: null, phone: "8566388831" })
    const justinByEmail = { ...coach("justin.usmc@yahoo.com"), phoneKey: "8566388831" }
    const bo = coach("bolansche@gmail.com")
    expect(fitsWithinCap([justinOnFile], [justinByEmail, bo]).ok).toBe(true)
  })

  it("still refuses a genuine third person", () => {
    const justinOnFile = onFile("tel:8566388831", { email: null, phone: "8566388831" })
    const bo = onFile("bolansche@gmail.com")
    expect(fitsWithinCap([justinOnFile, bo], [coach("someone-else@x.com")]).ok).toBe(false)
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
    submitted_club: null,
    submitted_dob: null,
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

describe("applyKnownIdentities", () => {
  const row = (key: string, email: string | null, phone: string | null, athlete: string) => ({
    coach_key: key,
    coach_name: "Justin Perry",
    coach_email: email,
    coach_phone: phone,
    status: "pending",
    athlete_name: athlete,
    weight_class: null,
    submitted_club: null,
    submitted_dob: null,
  })

  it("collapses a coach given by email on one form and by phone on another", () => {
    // Exactly the Justin Perry case: same person, two designations, two lanyards without this.
    const identities = new Map([
      ["justin.usmc@yahoo.com", { key: "user:abc", name: "Justin Perry", email: "justin.usmc@yahoo.com", phone: "8566388831" }],
      ["tel:8566388831", { key: "user:abc", name: "Justin Perry", email: "justin.usmc@yahoo.com", phone: "8566388831" }],
    ])
    const merged = applyKnownIdentities(
      [row("justin.usmc@yahoo.com", "justin.usmc@yahoo.com", null, "Jacob Perry"),
       row("tel:8566388831", null, "8566388831", "Xavier Bernthal")],
      identities,
    )
    const list = toCheckInList(merged)
    expect(list).toHaveLength(1)
    expect(list[0].athletes.map((a) => a.athleteName).sort()).toEqual(["Jacob Perry", "Xavier Bernthal"])
  })

  it("fills in contact details we hold and the family did not give", () => {
    const identities = new Map([
      ["tel:8566388831", { key: "user:abc", name: "Justin Perry", email: "justin.usmc@yahoo.com", phone: "8566388831" }],
    ])
    const [merged] = applyKnownIdentities([row("tel:8566388831", null, "8566388831", "Xavier Bernthal")], identities)
    expect(merged.coach_email).toBe("justin.usmc@yahoo.com")
  })

  it("leaves a coach we do not know untouched", () => {
    const [merged] = applyKnownIdentities([row("stranger@example.com", "stranger@example.com", null, "A")], new Map())
    expect(merged.coach_key).toBe("stranger@example.com")
  })
})

describe("masking", () => {
  it("shows enough of an email to recognise, not enough to use", () => {
    expect(maskEmail("justin.usmc@yahoo.com")).toBe("j••••••••••@yahoo.com")
  })

  it("shows the last four of a number only", () => {
    expect(maskPhone("8566388831")).toBe("••• ••• 8831")
    expect(maskPhone("+1 (856) 638-8831")).toBe("••• ••• 8831")
  })

  it("returns nothing rather than something misleading", () => {
    expect(maskEmail("not-an-email")).toBeNull()
    expect(maskEmail(null)).toBeNull()
    expect(maskPhone("12")).toBeNull()
  })
})

describe("groupByContact", () => {
  const row = (key: string, email: string | null, phone: string | null) => ({
    coach_key: key,
    coach_email: email,
    coach_phone: phone,
  })

  it("merges the same phone reached under two names", () => {
    // Tom Puckett by email from one family, "Tommy Puckett" by mobile from another. One coach,
    // one lanyard — and he was texted twice before this.
    const map = groupByContact([
      row("tom@carolinacargo.com", "tom@carolinacargo.com", "+1 (704) 453-9208"),
      row("tel:7044539208", null, "7044539208"),
    ])
    expect(map.get("tom@carolinacargo.com")).toBe(map.get("tel:7044539208"))
  })

  it("prefers a real address over a phone as the surviving key", () => {
    const map = groupByContact([
      row("tom@carolinacargo.com", "tom@carolinacargo.com", "7044539208"),
      row("tel:7044539208", null, "7044539208"),
    ])
    expect(map.get("tel:7044539208")).toBe("tom@carolinacargo.com")
  })

  it("prefers a known person over either", () => {
    const map = groupByContact([
      row("user:abc", "justin@x.com", "8566388831"),
      row("justin@x.com", "justin@x.com", null),
      row("tel:8566388831", null, "8566388831"),
    ])
    expect(new Set([...map.values()]).size).toBe(1)
    expect(map.get("tel:8566388831")).toBe("user:abc")
  })

  it("merges on a shared email as well as a shared number", () => {
    const map = groupByContact([
      row("a@club.com", "a@club.com", "1112223333"),
      row("second-key", "A@Club.com", null),
    ])
    expect(map.get("a@club.com")).toBe(map.get("second-key"))
  })

  it("leaves genuinely different coaches apart", () => {
    const map = groupByContact([
      row("one@club.com", "one@club.com", "1112223333"),
      row("two@club.com", "two@club.com", "4445556666"),
    ])
    expect(map.get("one@club.com")).not.toBe(map.get("two@club.com"))
  })

  it("keeps a coach with no contact details to themselves", () => {
    const map = groupByContact([row("solo", null, null)])
    expect(map.get("solo")).toBe("solo")
  })
})

describe("coachCapFlags", () => {
  const row = (over: Partial<Parameters<typeof coachCapFlags>[0][number]>) => ({
    athlete_id: "a1",
    athlete_name: "Johnny Smith",
    weight_class: 133,
    coach_key: "one@x.com",
    coach_name: "One",
    status: "approved",
    ...over,
  })

  it("says nothing when every wrestler is within the cap", () => {
    expect(
      coachCapFlags([row({}), row({ coach_key: "two@x.com", coach_name: "Two" })]),
    ).toEqual([])
  })

  it("flags a wrestler with three approved coaches on one record", () => {
    const flags = coachCapFlags([
      row({}),
      row({ coach_key: "two@x.com", coach_name: "Two" }),
      row({ coach_key: "three@x.com", coach_name: "Three" }),
    ])
    expect(flags).toHaveLength(1)
    expect(flags[0].reason).toBe("over")
    expect(flags[0].approved).toEqual(["One", "Three", "Two"])
    expect(flags[0].athleteName).toBe("Johnny Smith")
  })

  it("counts people rather than rows, so one coach named twice is one coach", () => {
    // Both families named the same coach; identity resolution already collapsed them onto one key.
    expect(
      coachCapFlags([
        row({}),
        row({ coach_key: "one@x.com", coach_name: "One" }),
        row({ coach_key: "two@x.com", coach_name: "Two" }),
      ]),
    ).toEqual([])
  })

  it("does not count declined or pending coaches as approved", () => {
    const flags = coachCapFlags([
      row({}),
      row({ coach_key: "two@x.com", coach_name: "Two" }),
      row({ coach_key: "three@x.com", coach_name: "Three", status: "declined" }),
    ])
    expect(flags).toEqual([])
  })

  it("catches a wrestler holding two athlete records, which the per-athlete cap cannot see", () => {
    const flags = coachCapFlags([
      row({}),
      row({ coach_key: "two@x.com", coach_name: "Two" }),
      row({ athlete_id: "a2", coach_key: "three@x.com", coach_name: "Three" }),
      row({ athlete_id: "a2", coach_key: "four@x.com", coach_name: "Four" }),
    ])
    expect(flags).toHaveLength(1)
    expect(flags[0].reason).toBe("duplicate")
    expect(flags[0].athleteIds.sort()).toEqual(["a1", "a2"])
    expect(flags[0].approved).toHaveLength(4)
  })

  it("treats punctuation and case as the same name", () => {
    const flags = coachCapFlags([
      row({ athlete_name: "Johnny O'Brien-Smith" }),
      row({ athlete_name: "Johnny O'Brien-Smith", coach_key: "two@x.com", coach_name: "Two" }),
      row({ athlete_id: "a2", athlete_name: "johnny obrien smith", coach_key: "three@x.com", coach_name: "Three" }),
    ])
    expect(flags).toHaveLength(1)
    expect(flags[0].reason).toBe("duplicate")
  })

  it("warns before the click when approving what is pending would break the cap", () => {
    const flags = coachCapFlags([
      row({}),
      row({ coach_key: "two@x.com", coach_name: "Two" }),
      row({ coach_key: "three@x.com", coach_name: "Three", status: "pending" }),
    ])
    expect(flags).toHaveLength(1)
    expect(flags[0].reason).toBe("would-exceed")
    expect(flags[0].approved).toEqual(["One", "Two"])
    expect(flags[0].pending).toEqual(["Three"])
  })

  it("reports a wrestler once, at the most serious reason", () => {
    const flags = coachCapFlags([
      row({}),
      row({ coach_key: "two@x.com", coach_name: "Two" }),
      row({ coach_key: "three@x.com", coach_name: "Three" }),
      row({ coach_key: "four@x.com", coach_name: "Four", status: "pending" }),
    ])
    expect(flags).toHaveLength(1)
    expect(flags[0].reason).toBe("over")
  })

  it("groups rows with no athlete id by the name they were filed under", () => {
    const flags = coachCapFlags([
      row({ athlete_id: null }),
      row({ athlete_id: null, coach_key: "two@x.com", coach_name: "Two" }),
      row({ athlete_id: null, coach_key: "three@x.com", coach_name: "Three" }),
    ])
    expect(flags).toHaveLength(1)
    expect(flags[0].reason).toBe("over")
    expect(flags[0].athleteIds).toEqual([])
  })

  it("leaves two different wrestlers who share a coach alone", () => {
    expect(
      coachCapFlags([
        row({ athlete_id: "a1", athlete_name: "Johnny Smith" }),
        row({ athlete_id: "a2", athlete_name: "Peter Jones" }),
      ]),
    ).toEqual([])
  })
})

describe("per-wrestler status on the check-in list", () => {
  const base = {
    coach_key: "tel:5134907421",
    coach_name: "Nick Kostoff",
    coach_email: null,
    coach_phone: "5134907421",
  }

  it("keeps each wrestler's own status, and flags the coach as having pending work", () => {
    const [coach] = toCheckInList([
      { ...base, status: "approved", athlete_name: "Cooper Mathon", weight_class: 133 },
      { ...base, status: "pending", athlete_name: "Vincent Grack", weight_class: 157 },
    ])
    // The lanyard is per person, so the coach reads approved...
    expect(coach.status).toBe("approved")
    // ...but Grack is not cleared, and the card must be able to say so.
    expect(coach.athletes.find((a) => a.athleteName === "Vincent Grack")?.status).toBe("pending")
    expect(coach.hasPendingAthlete).toBe(true)
  })

  it("does not flag a coach whose wrestlers are all approved", () => {
    const [coach] = toCheckInList([
      { ...base, status: "approved", athlete_name: "Cooper Mathon", weight_class: 133 },
      { ...base, status: "approved", athlete_name: "Vincent Grack", weight_class: 157 },
    ])
    expect(coach.hasPendingAthlete).toBe(false)
  })
})
