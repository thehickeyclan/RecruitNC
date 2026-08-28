import { describe, expect, it } from "vitest"
import {
  displayNameKey,
  normalizeDisplayName,
  shortenRealName,
  validateDisplayName,
} from "./pool-display-name"

const FIELD = ["Jekai Sedgwick", "Adam Walker", "Devin Hord"]

describe("validateDisplayName", () => {
  it("accepts an ordinary nickname", () => {
    expect(validateDisplayName("HollySpringsHammer", FIELD)).toEqual({
      ok: true, name: "HollySpringsHammer", key: "hollyspringshammer",
    })
  })

  it("keeps spaces and the punctuation nicknames use", () => {
    const result = validateDisplayName("  Mat  Monster-26 ", FIELD)
    expect(result).toEqual({ ok: true, name: "Mat Monster-26", key: "mat monster-26" })
  })

  it("refuses names that are too short or too long", () => {
    expect(validateDisplayName("ab", FIELD).ok).toBe(false)
    expect(validateDisplayName("a".repeat(21), FIELD).ok).toBe(false)
  })

  it("refuses characters that do not belong in a name", () => {
    expect(validateDisplayName("hammer<script>", FIELD).ok).toBe(false)
    expect(validateDisplayName("hammer@home", FIELD).ok).toBe(false)
  })

  it("refuses a wrestler who is actually in the field", () => {
    const result = validateDisplayName("Jekai Sedgwick", FIELD)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/wrestler in the field/i)
  })

  it("sees through punctuation and digits used to dodge the field check", () => {
    expect(validateDisplayName("Jeka1_5edgwick", FIELD).ok).toBe(false)
  })

  it("lets an entrant use their own name when they are not in the field", () => {
    expect(validateDisplayName("Matthew Hickey", FIELD).ok).toBe(true)
  })

  it("refuses names that borrow the event's authority", () => {
    expect(validateDisplayName("NC United", FIELD).ok).toBe(false)
    expect(validateDisplayName("official", FIELD).ok).toBe(false)
    expect(validateDisplayName("Adm1n", FIELD).ok).toBe(false)
  })

  it("refuses the obvious ugliness, including dodged spellings", () => {
    expect(validateDisplayName("shithead", FIELD).ok).toBe(false)
    expect(validateDisplayName("Sh1t_Head", FIELD).ok).toBe(false)
    expect(validateDisplayName("F4ggot", FIELD).ok).toBe(false)
  })

  it("does not refuse an innocent name that merely contains a short run of letters", () => {
    expect(validateDisplayName("Cassidy", FIELD).ok).toBe(true)
    expect(validateDisplayName("Scunthorpe", FIELD).ok).toBe(true)
  })

  it("refuses a name with no letters at all", () => {
    expect(validateDisplayName("---", FIELD).ok).toBe(false)
  })
})

describe("displayNameKey", () => {
  it("treats case and spacing as the same name", () => {
    expect(displayNameKey("  Mat   Monster ")).toBe(displayNameKey("mat monster"))
  })

  it("keeps genuinely different names apart", () => {
    expect(displayNameKey("Hammer")).not.toBe(displayNameKey("Hammer2"))
  })
})

describe("normalizeDisplayName", () => {
  it("folds the digit-for-letter swaps", () => {
    expect(normalizeDisplayName("H4mm3r")).toBe("hammer")
  })
})

describe("shortenRealName", () => {
  it("gives a first name and a last initial", () => {
    expect(shortenRealName("Matthew Hickey", "Entrant")).toBe("Matthew H.")
  })

  it("leaves a single name alone", () => {
    expect(shortenRealName("Prince", "Entrant")).toBe("Prince")
  })

  it("falls back when there is no name at all", () => {
    expect(shortenRealName(null, "Entrant")).toBe("Entrant")
    expect(shortenRealName("   ", "Entrant")).toBe("Entrant")
  })
})

describe("the Scunthorpe problem", () => {
  // Real surnames with something rude inside them. Refusing these tells a real person their own
  // name is obscene, which is worse than the thing the list is guarding against.
  it.each(["Cassidy", "Dickinson", "Cumberland", "Scunthorpe", "Hitchcock", "Bassett", "Fagan", "Spicer"])(
    "allows %s",
    (name) => {
      expect(validateDisplayName(name, FIELD).ok).toBe(true)
    },
  )

  it.each(["Big Dick", "cock", "ASS", "d1ck", "Anal"])("still refuses %s", (name) => {
    expect(validateDisplayName(name, FIELD).ok).toBe(false)
  })
})
