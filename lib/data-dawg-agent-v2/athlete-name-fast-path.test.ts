import { describe, expect, it } from "vitest"
import {
  isLikelyAthleteNameLookup,
  pickClearAthleteId,
} from "./athlete-name-fast-path-detect"

describe("isLikelyAthleteNameLookup", () => {
  it("accepts bare and conversational athlete names", () => {
    expect(isLikelyAthleteNameLookup("mac johnson")).toBe(true)
    expect(isLikelyAthleteNameLookup("Mac Johnson")).toBe(true)
    expect(isLikelyAthleteNameLookup("who is Mac Johnson")).toBe(true)
    expect(isLikelyAthleteNameLookup("tell me about Mac Johnson")).toBe(true)
  })

  it("rejects topic queries that need the full agent", () => {
    expect(isLikelyAthleteNameLookup("class of 2027 rankings")).toBe(false)
    expect(isLikelyAthleteNameLookup("how many NHSCA All-Americans")).toBe(false)
    expect(isLikelyAthleteNameLookup("Fargo results 2026")).toBe(false)
    expect(isLikelyAthleteNameLookup("4x state champs")).toBe(false)
  })

  it("rejects single-token and school-ish phrases", () => {
    expect(isLikelyAthleteNameLookup("johnson")).toBe(false)
    expect(isLikelyAthleteNameLookup("avery county")).toBe(false)
  })
})

describe("pickClearAthleteId", () => {
  it("picks an exact unique name match", () => {
    const id = pickClearAthleteId(
      "Mac Johnson",
      [
        { id: "aaa", name: "Mac Johnson", firstname: "Mac", lastname: "Johnson" },
        { id: "bbb", name: "Mack Johnson", firstname: "Mack", lastname: "Johnson" },
      ],
      null,
    )
    expect(id).toBe("aaa")
  })

  it("matches O'Brien apostrophe variants", () => {
    const id = pickClearAthleteId(
      "Kevin O'Brien",
      [{ id: "kob", name: "Kevin O’Brien", firstname: "Kevin", lastname: "O’Brien" }],
      null,
    )
    expect(id).toBe("kob")

    const id2 = pickClearAthleteId(
      "Kevin O'Brien",
      [{ id: "kob2", name: "Kevin OBrien", firstname: "Kevin", lastname: "OBrien" }],
      null,
    )
    expect(id2).toBe("kob2")
  })

  it("returns null when disambiguation is present", () => {
    expect(
      pickClearAthleteId("John Smith", [{ id: "1", name: "John Smith" }], [{ athlete_name: "john smith" }]),
    ).toBeNull()
  })
})

describe("isLikelyAthleteNameLookup follow-ups", () => {
  it("still treats bare names as athlete lookups", () => {
    expect(isLikelyAthleteNameLookup("Kevin O'Brien")).toBe(true)
  })
})
