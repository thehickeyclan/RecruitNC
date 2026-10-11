import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { programStages } from "@/lib/recruiting/program-stage"

describe("programStages", () => {
  it("takes the most recently changed staff row for a wrestler", () => {
    const stages = programStages([
      { athlete_id: "a", pipeline_stage: "Contacted", updated_at: "2026-09-01T00:00:00Z", starred_at: "2026-08-01T00:00:00Z" },
      { athlete_id: "a", pipeline_stage: "Offered", updated_at: "2026-10-01T00:00:00Z", starred_at: "2026-08-02T00:00:00Z" },
      { athlete_id: "b", pipeline_stage: "Visited", updated_at: "2026-10-02T00:00:00Z", starred_at: "2026-08-02T00:00:00Z" },
    ])
    expect(stages.get("a")).toBe("Offered")
    expect(stages.get("b")).toBe("Visited")
  })

  it("reads old stored values as today's stages, and nothing as Prospect", () => {
    const stages = programStages([
      { athlete_id: "a", pipeline_stage: "prospect", updated_at: "2026-10-01T00:00:00Z" },
      { athlete_id: "b", pipeline_stage: "Reached Out", updated_at: "2026-10-01T00:00:00Z" },
      { athlete_id: "c", pipeline_stage: "College Athlete", updated_at: "2026-10-01T00:00:00Z" },
      { athlete_id: "d", pipeline_stage: null, starred_at: "2026-10-01T00:00:00Z" },
    ])
    expect([...stages.values()]).toEqual(["Prospect", "Contacted", "Signed", "Prospect"])
  })
})
