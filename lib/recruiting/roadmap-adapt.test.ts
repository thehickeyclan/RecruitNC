import { describe, expect, it } from "vitest"

import { adaptRoadmap, collegeKey, type RoadmapSignals } from "@/lib/recruiting/roadmap-adapt"

const base: RoadmapSignals = {
  firstName: "Jordan",
  grade: 11,
  gpa: 3.1,
  sat: null,
  act: null,
  hasVideo: false,
  profilePercent: 60,
  listCount: 0,
  questionnaireOrBeyond: 0,
  contactedOrBeyond: 0,
  upcomingEvents: 0,
  viewedNotListed: 0,
  stateFinish: null,
  nationalFinish: null,
}
const year = (r: ReturnType<typeof adaptRoadmap>, g: number) => r.years.find((y) => y.grade === g)!

describe("adaptRoadmap", () => {
  it("ticks what the data proves, with the reason", () => {
    const r = adaptRoadmap({ ...base, sat: 1210, hasVideo: true, listCount: 6 }, [])
    expect(r.done).toEqual(expect.arrayContaining(["g11-tests", "g10-video", "g10-list", "g8-profile"]))
    expect(year(r, 11).items.find((i) => i.id === "g11-tests")).toMatchObject({ auto: true, because: "SAT 1210 on the profile" })
  })

  it("adds a GPA step against the division minimums", () => {
    expect(year(adaptRoadmap({ ...base, gpa: 2.25 }, []), 11).items[0]).toMatchObject({ added: true, text: "Raise the core GPA to 2.3 or better" })
    expect(year(adaptRoadmap({ ...base, gpa: 2.0 }, []), 11).items[0].text).toBe("Raise the core GPA to 2.2 or better")
    expect(year(adaptRoadmap({ ...base, gpa: null }, []), 11).items[0].text).toBe("Add the GPA to the profile")
    // Academic aid comes after the steps carried forward.
    expect(year(adaptRoadmap({ ...base, gpa: 3.8 }, ["g10-list", "g10-video", "g10-questionnaires", "g10-email", "g8-ec", "g9-explore"]), 11).items[0].text).toBe("Ask admissions about academic scholarships")
  })

  it("prefers a national finish over a state one", () => {
    const r = adaptRoadmap({ ...base, stateFinish: { year: 2026, place: 1 }, nationalFinish: { year: 2026, event: "Fargo", place: 3 } }, [])
    const sends = year(r, 11).items.filter((i) => i.id.startsWith("a-send"))
    expect(sends).toHaveLength(1)
    expect(sends[0].because).toBe("3rd at Fargo 2026")
  })

  it("carries an undone earlier step into this year, not twice", () => {
    const r = adaptRoadmap(base, [])
    expect(year(r, 11).items.some((i) => i.id === "g10-list" && i.because === "Carried from 10th grade")).toBe(true)
    expect(year(r, 10).items.some((i) => i.id === "g10-list")).toBe(false)
    // Done by hand: nothing to carry.
    expect(year(adaptRoadmap(base, ["g10-list"]), 11).items.some((i) => i.id === "g10-list")).toBe(false)
  })

  it("adds no more than four steps to a year", () => {
    const r = adaptRoadmap({ ...base, grade: 12, gpa: 4.1, stateFinish: { year: 2026, place: 1 }, viewedNotListed: 7 }, [])
    expect(year(r, 12).items.filter((i) => i.added || i.because?.startsWith("Carried"))).toHaveLength(4)
  })

  it("leaves a younger wrestler's later years alone", () => {
    const r = adaptRoadmap({ ...base, grade: 9 }, [])
    expect(year(r, 11).items.every((i) => !i.added)).toBe(true)
  })
})

describe("collegeKey", () => {
  it("matches a viewer's school name to the list's", () => {
    expect(collegeKey("The University of North Carolina at Pembroke")).toBe(collegeKey("North Carolina Pembroke"))
    expect(collegeKey("Campbell University")).toBe(collegeKey("Campbell"))
  })
})
