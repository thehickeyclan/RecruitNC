import { describe, expect, it } from "vitest"

import { coachSurname, eventDates, gradeLabel, resultClauses, spokenSchoolName } from "./outreach-results"
import { outreachBlocker, renderOutreachEmail, type OutreachFacts, type OutreachInput } from "./outreach-templates"

const facts: OutreachFacts = {
  athleteId: "a1",
  firstName: "Liam",
  lastName: "Hickey",
  graduationYear: 2028,
  grade: "junior",
  highSchool: "Cardinal Gibbons High School",
  hometown: "Raleigh, NC",
  weight: "132",
  results: ["placed 3rd at the 2026 NCHSAA 4A state tournament", "placed 5th at NHSCA Nationals in 2026"],
  gpa: "3.8",
  intendedMajor: "engineering",
  profileUrl: "https://app.ncwrestlingunited.com/view-profile?id=a1",
  phone: "919-555-0100",
  email: "liam@example.com",
  schoolName: "Campbell",
  coachLastName: "Dudley",
}
const input: OutreachInput = {
  kind: "intro",
  why: "I came to your camp in June and liked how hard the room trains",
  questionnaireDone: true,
  events: [{ title: "Super 32", dates: "Oct 24-25", location: "Greensboro, NC" }],
  detail: "",
}

describe("result clauses", () => {
  const creds = {
    allAmerican: [],
    toc: [{ year: 2026, place: 2 }],
    state: [
      { year: 2026, place: 3, classification: "4A" },
      { year: 2025, place: null, classification: "4A" },
    ],
    national: [
      { year: 2026, event: "NHSCA" as const, place: 5, placementText: null, record: "6-2" },
      { year: 2025, event: "Super 32" as const, place: null, placementText: "Round of 16", record: "3-2" },
    ],
  }

  it("leads with the best state finish, then nationals, and stops at three", () => {
    expect(resultClauses(creds)).toEqual([
      "placed 3rd at the 2026 NCHSAA 4A state tournament",
      "placed 5th at NHSCA Nationals in 2026",
      "placed 2nd at the 2026 NC United Tournament of Champions",
    ])
  })

  it("never calls a round-of-16 a placing, and mentions qualifying only with no placing", () => {
    expect(resultClauses(creds).join(" ")).not.toContain("Super 32")
    expect(resultClauses({ ...creds, toc: [], national: [], state: [{ year: 2025, place: 0, classification: "4A" }] })).toEqual([
      "qualified for the 2025 NCHSAA 4A state tournament",
    ])
  })

  it("says nothing when there is nothing verified", () => {
    expect(resultClauses({ allAmerican: [], toc: [], state: [], national: [] })).toEqual([])
  })
})

describe("small rules", () => {
  it("names the grade only while the class is in high school", () => {
    expect(gradeLabel(2027, 2027)).toBe("senior")
    expect(gradeLabel(2030, 2027)).toBe("freshman")
    expect(gradeLabel(2026, 2027)).toBeNull()
    expect(gradeLabel(2031, 2027)).toBeNull()
  })

  it("says a college the way a wrestler would", () => {
    expect(spokenSchoolName("Campbell University")).toBe("Campbell")
    expect(spokenSchoolName("Commonwealth University-Lock Haven (Lock Haven)")).toBe("Commonwealth University-Lock Haven")
    expect(spokenSchoolName("University of Iowa")).toBe("University of Iowa")
  })

  it("writes event dates the way a person would", () => {
    expect(eventDates("2026-10-24", "2026-10-25")).toBe("Oct 24-25")
    expect(eventDates("2026-11-01", null)).toBe("Nov 1")
    expect(eventDates("2026-12-30", "2027-01-01")).toBe("Dec 30 - Jan 1")
  })

  it("greets by surname", () => {
    expect(coachSurname("TJ Dudley")).toBe("Dudley")
    expect(coachSurname("Cael Sanderson Jr.")).toBe("Sanderson")
    expect(coachSurname("Madonna")).toBeNull()
  })
})

describe("introduction", () => {
  it("will not write without the wrestler's own reason", () => {
    expect(outreachBlocker({ ...input, why: "" })).toMatch(/your own words/)
    expect(outreachBlocker(input)).toBeNull()
  })

  it("puts class, weight and school in the subject", () => {
    expect(renderOutreachEmail(facts, input).subject).toBe(
      "Liam Hickey - Class of 2028 - 132 lbs - Cardinal Gibbons High School",
    )
  })

  it("carries the facts, the wrestler's sentence, the schedule and the profile link", () => {
    const { body } = renderOutreachEmail(facts, input)
    expect(body.startsWith("Coach Dudley,")).toBe(true)
    expect(body).toContain("I came to your camp in June and liked how hard the room trains.")
    expect(body).toContain("I placed 3rd at the 2026 NCHSAA 4A state tournament and placed 5th at NHSCA Nationals in 2026.")
    expect(body).toContain("a 3.8 GPA and I'm interested in studying engineering")
    expect(body).toContain("- Super 32, Oct 24-25 (Greensboro, NC)")
    expect(body).toContain(facts.profileUrl)
    expect(body).toContain("I've filled out your recruiting questionnaire.")
  })

  it("leaves out what we do not hold instead of leaving a blank", () => {
    const { body } = renderOutreachEmail(
      { ...facts, results: [], gpa: null, intendedMajor: null, coachLastName: null, weight: null, phone: null },
      { ...input, questionnaireDone: false, events: [] },
    )
    expect(body.startsWith("Coach,")).toBe(true)
    expect(body).not.toMatch(/GPA|questionnaire|wrestling at:|undefined|null|\[\]/)
    expect(body).not.toMatch(/\n\n\n/)
  })

  it("is the same every time for one wrestler and school", () => {
    expect(renderOutreachEmail(facts, input).body).toBe(renderOutreachEmail(facts, input).body)
  })
})

describe("where I'm competing", () => {
  it("needs an event, and lists it", () => {
    expect(outreachBlocker({ ...input, kind: "competing", events: [] })).toMatch(/at least one event/)
    const { subject, body } = renderOutreachEmail(facts, { ...input, kind: "competing" })
    expect(subject).toMatch(/where I'm wrestling next$/)
    expect(body).toContain("- Super 32, Oct 24-25 (Greensboro, NC)")
  })
})
