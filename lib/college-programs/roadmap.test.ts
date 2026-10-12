import { describe, expect, it } from "vitest"

import { listTarget, planSteps, type PlanInput } from "./roadmap"

const base: PlanInput = {
  firstName: "Gavin",
  athleteId: "a1",
  grade: "sophomore",
  profilePercent: 60,
  profileTodo: { todo: "Add highlight reel", edit: "highlight-video" },
  listStatuses: [],
  questionnairesWaiting: 0,
  scheduleCount: 0,
}

describe("this month", () => {
  it("starts a new family with the profile, the list and the schedule - nothing they cannot do yet", () => {
    const steps = planSteps(base)
    expect(steps.map((s) => s.key)).toEqual(["profile", "list", "schedule"])
    expect(steps[0]).toMatchObject({ done: false, action: { kind: "link", href: "/athletes/a1?edit=highlight-video" } })
    expect(steps[1].title).toBe("Build your list: 0 of 20 schools")
  })

  it("adds questionnaires and the first email once there is a list", () => {
    const steps = planSteps({ ...base, listStatuses: ["interested", "interested", "questionnaire"], questionnairesWaiting: 2 })
    expect(steps.map((s) => s.key)).toEqual(["profile", "list", "questionnaires", "email", "schedule"])
    expect(steps[2].title).toBe("Fill out 2 recruiting questionnaires")
    expect(steps[3]).toMatchObject({ title: "Email your first coach", done: false, action: { kind: "email" } })
  })

  it("counts an offer or a visit as a coach emailed and talking", () => {
    const steps = planSteps({ ...base, profilePercent: 100, profileTodo: null, listStatuses: ["offer", "contacted", "interested"], scheduleCount: 2 })
    expect(steps.find((s) => s.key === "email")?.title).toBe("2 coaches emailed")
    expect(steps.find((s) => s.key === "follow-up")).toMatchObject({ title: "1 program talking to you", done: true })
    expect(steps.find((s) => s.key === "profile")).toMatchObject({ done: true, action: null })
    expect(steps.find((s) => s.key === "schedule")?.done).toBe(true)
  })

  it("asks for a wide list in the middle years and a short one at either end", () => {
    expect([listTarget("freshman"), listTarget("sophomore"), listTarget("junior"), listTarget("senior"), listTarget(null)]).toEqual([10, 20, 20, 10, 20])
  })
})
