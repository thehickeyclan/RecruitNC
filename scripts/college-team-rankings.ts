#!/usr/bin/env npx tsx
/**
 * Dry run of the weekly team-rankings job: reads the NWCA poll stories and prints each poll found,
 * every team it could not place on the map, and every story it skipped. Writes nothing.
 *
 *   npx tsx scripts/college-team-rankings.ts [since YYYY-MM-DD]
 *   npx tsx --env-file=.env.local scripts/college-team-rankings.ts 2025-10-01 --write   (also saves, as the job does)
 */
import data from "../lib/college-programs/programs-2026-27.json"
import { buildTeamRankings } from "../lib/college-programs/team-rankings-build"
import type { PollSchool } from "../lib/college-programs/team-rankings"

async function main() {
  const since = process.argv.slice(2).find((a) => /^\d{4}-/.test(a)) ?? "2025-10-01"
  const build = await buildTeamRankings(data.schools as PollSchool[], since)
  for (const poll of build.polls) {
    console.log(`\n${poll.scope} ${poll.gender} ${poll.kind}  ${poll.date}  ${poll.teams} teams, ${poll.unmatched.length} unplaced\n  ${poll.url}`)
    if (poll.unmatched.length) console.log("  UNPLACED:", poll.unmatched.join(" | "))
  }
  console.log(`\n${build.rankings.length} rankings for ${new Set(build.rankings.map((r) => r.schoolId)).size} colleges`)
  if (process.argv.includes("--write")) {
    const { saveTeamRankings } = await import("../lib/college-programs/team-rankings-snapshot")
    console.log("saved:", await saveTeamRankings(build))
  }
  console.log("\nSKIPPED:")
  for (const s of build.skipped) console.log(" ", s.why, "\n   ", s.url)
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
