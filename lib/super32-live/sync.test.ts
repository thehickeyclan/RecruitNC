import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { buildBoutRows, SYNC_SOURCE_FILE } from "./sync"
import type { SnapshotData } from "./snapshot"

const csv = fs.readFileSync(path.join(process.cwd(), "scripts/data/super32-2025-flo-export.csv"), "utf8")

describe("buildBoutRows", () => {
  it("writes every boys' high school bout once per wrestler and links NC wrestlers by profile", () => {
    const snap = { entrants: [{ name: "Bentley Sly", gender: "boys", weight: "150", athleteId: "sly-id" }] } as unknown as SnapshotData
    const rows = buildBoutRows("super32-2026", csv, [], snap)
    const sly = rows.filter((r) => r.athlete_name === "Bentley Sly")
    expect(sly.filter((r) => !r.is_bye)).toHaveLength(10)
    expect(sly.every((r) => r.athlete_id === "sly-id" && r.source_file === SYNC_SOURCE_FILE && r.event_key === "super32-2026")).toBe(true)
    // A same-named wrestler from another state is never linked.
    expect(rows.filter((r) => r.athlete_id && r.athlete_club !== "NC")).toHaveLength(0)
    // Every real bout is two rows that agree: one win, one loss.
    const real = rows.filter((r) => !r.is_bye)
    expect(real.filter((r) => r.win).length).toBe(real.filter((r) => !r.win).length)
  })
})
