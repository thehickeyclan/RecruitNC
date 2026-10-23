import { readFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import { scheduledJobsOff } from "@/lib/scheduled-jobs"

const ROOT = join(__dirname, "..")
const crons = (JSON.parse(readFileSync(join(ROOT, "vercel.json"), "utf8")).crons ?? []) as Array<{ path: string }>

describe("scheduled jobs run in one project only", () => {
  afterEach(() => vi.unstubAllEnvs())

  it("every job in vercel.json checks SCHEDULED_JOBS before doing anything", () => {
    expect(crons.length).toBeGreaterThan(0)
    for (const { path } of crons) {
      const src = readFileSync(join(ROOT, "app", path, "route.ts"), "utf8")
      const body = src.slice(src.indexOf("export async function GET"))
      expect(body.split("\n")[1]?.trim(), path).toBe("if (scheduledJobsOff()) return skippedJob()")
    }
  })

  it("is off only when the deployment says so", () => {
    vi.stubEnv("SCHEDULED_JOBS", "")
    expect(scheduledJobsOff()).toBe(false)
    vi.stubEnv("SCHEDULED_JOBS", "off")
    expect(scheduledJobsOff()).toBe(true)
    vi.stubEnv("SCHEDULED_JOBS", " OFF ")
    expect(scheduledJobsOff()).toBe(true)
  })
})
