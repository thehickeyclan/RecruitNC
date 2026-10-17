import { describe, expect, it } from "vitest"

import { messagingRule } from "@/lib/coach-messages-compliance"

const now = new Date("2026-10-17T12:00:00Z")
const base = { firstName: "Jordan", now }

describe("messagingRule", () => {
  it("lets every level but Division I message any time", () => {
    for (const division of ["NCAA Division II", "NCAA Division III", "NAIA", "NJCAA"] as const) {
      expect(messagingRule({ ...base, division, gender: "Male", classYear: 2030 }).status).toBe("open")
    }
  })
  it("holds a Division I coach to April 1 of junior year for a 2028 boy", () => {
    const r = messagingRule({ ...base, division: "NCAA Division I", gender: "Male", classYear: 2028 })
    expect(r.status).toBe("not_yet")
    if (r.status !== "open") expect(r.title).toBe("Division I coaches may message Jordan from April 1, 2027")
  })
  it("opens June 15 after sophomore year for girls and the 2027 boys", () => {
    // A girl of 2028 opened June 15, 2026; a girl of 2029 opens June 15, 2027.
    expect(messagingRule({ ...base, division: "NCAA Division I", gender: "Female", classYear: 2028 }).status).toBe("open")
    const g = messagingRule({ ...base, division: "NCAA Division I", gender: "Female", classYear: 2029 })
    expect(g.status !== "open" && g.title).toBe("Division I coaches may message Jordan from June 15, 2027")
    expect(messagingRule({ ...base, division: "NCAA Division I", gender: "Male", classYear: 2027 }).status).toBe("open")
  })
  it("asks a coach to check when the class or the level is unknown", () => {
    expect(messagingRule({ ...base, division: "NCAA Division I", gender: "Male", classYear: null }).status).toBe("check")
    expect(messagingRule({ ...base, division: null, gender: "Male", classYear: 2029 }).status).toBe("check")
    expect(messagingRule({ ...base, division: null, gender: "Male", classYear: 2027 }).status).toBe("open")
  })
})
