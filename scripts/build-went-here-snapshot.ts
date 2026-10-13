#!/usr/bin/env npx tsx
/**
 * Builds and saves the "NC wrestlers who went here" snapshot by hand, exactly as the six-hourly
 * job does (/api/cron/college-went-here). For when a change to what the snapshot holds should
 * not wait for the next run.
 *
 *   NODE_OPTIONS=--conditions=react-server npx tsx --env-file=.env.local scripts/build-went-here-snapshot.ts
 */
import { buildWentHereSnapshot } from "../lib/college-programs/went-here"
import { saveWentHereSnapshot } from "../lib/college-programs/went-here-snapshot"
import { createAdminClientFresh } from "../lib/supabase/admin"

async function main() {
  const snapshot = await buildWentHereSnapshot(createAdminClientFresh())
  const by = (g: string | null | undefined) => snapshot.commits.filter((c) => (c.gender ?? null) === g).length
  console.log(`${snapshot.commits.length} commits: ${by("mens")} men, ${by("womens")} women, ${by(null)} with no gender on the profile`)
  console.log("women's GPA groups by level:", Object.keys(snapshot.gpaByDivisionGender ?? {}).filter((k) => k.endsWith("|womens")))
  console.log("men's GPA groups by level:", Object.keys(snapshot.gpaByDivisionGender ?? {}).filter((k) => k.endsWith("|mens")))
  console.log("saved:", await saveWentHereSnapshot(snapshot))
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
