#!/usr/bin/env npx tsx
/**
 * Bouts linked to the wrong wrestler - the same check the nightly cron runs
 * (app/api/cron/bout-link-guard, rules in lib/bout-link-guard.ts). Run it after an import to see
 * the result straight away instead of waiting for the night.
 *
 *   npx tsx --env-file=.env.local scripts/audit-bout-links.ts             # report
 *   npx tsx --env-file=.env.local scripts/audit-bout-links.ts --unlink    # clear the wrong links
 */
import { createClient } from "@supabase/supabase-js"

import { runBoutLinkGuard } from "../lib/bout-link-guard-run"

async function main() {
  const apply = process.argv.includes("--unlink")
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const { checked, wrong, resultsCleared, athletes } = await runBoutLinkGuard(sb, { apply })
  const grouped = new Map<string, number>()
  for (const b of wrong) {
    const key = `${athletes.get(b.athlete_id)?.name} <- ${b.athlete_name}, ${b.athlete_club}, ${b.event_key}: ${b.why}`
    grouped.set(key, (grouped.get(key) ?? 0) + 1)
  }
  for (const [k, n] of [...grouped.entries()].sort()) console.log(`${String(n).padStart(4)}  ${k}`)
  console.log(`\nchecked ${checked}; ${wrong.length} wrongly linked bouts on ${new Set(wrong.map((b) => b.athlete_id)).size} profiles`)
  console.log(apply ? `Unlinked ${wrong.length} bouts and ${resultsCleared} result rows.` : "Report only. --unlink clears them.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
