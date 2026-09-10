import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

/**
 * One engine answers "what has this wrestler won", and these tests are what keeps it that way.
 *
 * The bug this repo spent a long time not seeing: four surfaces each derived credentials their own
 * way. Profiles and rankings reconciled names; the Tournament of Champions field and the phone app
 * queried `nhsca_placements` and `fargo_results` keyed on `athlete_id`. Sixty of the 106
 * All-American rows in that first table have no `athlete_id` — a 2025 import shifted the first
 * word of each school onto the wrestler's name — so the ID-keyed surfaces dropped real
 * All-Americans without erroring. Ryan Thompson's showed. Jacob Perry's did not. From the outside
 * it looked random, because from the outside there was nothing to see.
 *
 * A direct query is always the tempting shortcut: it is one round trip instead of N, and it
 * appears to work, because it does work for whoever happens to be linked. So the rule is
 * structural rather than advisory — the surfaces that publish credentials do not get to read the
 * underlying tables at all.
 */

const ROOT = path.resolve(__dirname, "../..")

/**
 * Directories whose job is to publish credentials to a person.
 *
 * Admin import and matching tools under `app/api/admin/nhsca-placements` are deliberately absent:
 * operating on the raw rows is the whole point of those. So are the Data Dawg leaderboard
 * handlers, which answer cross-athlete questions ("most state champions by school") rather than
 * "what does this athlete hold".
 */
const PUBLISHING_DIRS = ["lib/toc", "lib/rankings", "app/api/public", "components/rankings", "components/toc"]

/** The sources the engine reconciles. Reading one of these directly is the regression. */
const RAW_ACCOLADE_TABLES = [
  "nhsca_placements",
  "fargo_results",
  "wrestling_nchsaa_results",
  "wrestling_nhsca_results",
  "super32_results",
  "nhsca_roster",
]

function sourceFiles(dir: string): string[] {
  const abs = path.join(ROOT, dir)
  if (!fs.existsSync(abs)) return []
  const out: string[] = []
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const full = path.join(abs, entry.name)
    if (entry.isDirectory()) out.push(...sourceFiles(path.join(dir, entry.name)))
    else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) out.push(full)
  }
  return out
}

describe("credential engine boundary", () => {
  it("no page that publishes credentials reads the raw accolade tables", () => {
    const offenders: string[] = []
    for (const dir of PUBLISHING_DIRS) {
      for (const file of sourceFiles(dir)) {
        const text = fs.readFileSync(file, "utf8")
        for (const table of RAW_ACCOLADE_TABLES) {
          if (text.includes(`from("${table}")`) || text.includes(`from('${table}')`)) {
            offenders.push(`${path.relative(ROOT, file)} queries ${table}`)
          }
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it("keeps the engine reachable, so the rule above is followable", () => {
    // A guard that forbids the shortcut without leaving an alternative just gets deleted.
    const engine = path.join(ROOT, "lib/credentials/athlete-credentials.ts")
    expect(fs.existsSync(engine)).toBe(true)
    const text = fs.readFileSync(engine, "utf8")
    expect(text).toContain("export async function loadAthleteCredentials")
    expect(text).toContain("export async function loadAthleteCredentialsBatch")
  })

  it("the two public credential surfaces both go through it", () => {
    // Named explicitly rather than inferred: if either is rewritten to derive its own credentials,
    // this fails loudly instead of the two silently drifting apart again.
    for (const file of ["lib/toc/public-announced-field.ts", "lib/rankings/public-rankings-view.ts"]) {
      const text = fs.readFileSync(path.join(ROOT, file), "utf8")
      expect(text, `${file} should use the shared credential engine`).toContain(
        "@/lib/credentials/athlete-credentials",
      )
    }
  })
})
