#!/usr/bin/env npx tsx
/**
 * The Business charts, from the command line. Read-only, counts only.
 *
 *   npx tsx scripts/business-metrics.ts                  every state, both genders
 *   npx tsx scripts/business-metrics.ts --state NC --gender Female
 *   npx tsx scripts/business-metrics.ts --starts         where each source actually begins
 *
 * Two jobs. It checks that what /admin/business draws matches what the database holds, without
 * opening a browser or signing in. And `--starts` re-measures the first row of each source, which
 * is what `METRIC_STARTS` in lib/business/metrics.ts hard-codes - run it if a source is ever
 * backfilled, and update that table if a date has moved.
 *
 * Prints no name, email, phone or address: every line is a count.
 */
import fs from "fs"
import path from "path"
import { createRequire } from "module"
import { createClient } from "@supabase/supabase-js"

const req = createRequire(import.meta.url)
req.cache[req.resolve("server-only")] = { exports: {} } as never

for (const f of [".env.local", ".env"]) {
  const p = path.join(process.cwd(), f)
  if (!fs.existsSync(p)) continue
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
}

const { loadBusinessData } = req("../lib/business/load") as typeof import("../lib/business/load")
const { METRICS, METRIC_LABEL, METRIC_STARTS, series, statesPresent } = req("../lib/business/metrics") as typeof import("../lib/business/metrics")

const arg = (n: string) => {
  const i = process.argv.indexOf(`--${n}`)
  return i > -1 ? process.argv[i + 1] : undefined
}

async function main() {
  const admin = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const started = Date.now()
  const data = await loadBusinessData(admin)
  const today = new Date().toISOString().slice(0, 10)
  console.log(`Loaded in ${((Date.now() - started) / 1000).toFixed(1)}s · ${data.dims.size} wrestlers · states: ${statesPresent(data.dims).join(" ")}`)

  if (process.argv.includes("--starts")) {
    console.log("\nFirst row in each source, against what the code says:")
    for (const m of METRICS) {
      const first = data.events[m].map((e) => String(e.at).slice(0, 10)).sort()[0] ?? "-"
      const says = METRIC_STARTS[m]
      console.log(` ${METRIC_LABEL[m].padEnd(18)} data ${first}   code ${says}   ${first === says ? "ok" : "DIFFERENT - update METRIC_STARTS"}`)
    }
    return
  }

  const state = arg("state") ?? "all"
  const gender = (arg("gender") ?? "all") as "Male" | "Female" | "all"
  const site = (arg("site") ?? "all") as "rw" | "ncu" | "app" | "untagged" | "all"
  const from = arg("from") ?? "2025-04-01"
  const filters = { state, gender, site }
  console.log(`\nstate=${state} gender=${gender} site=${site} from=${from} to=${today}\n`)

  for (const m of METRICS) {
    const s = series(m, data.events[m], data.dims, filters, { from, to: today })
    if (s.unavailable) {
      console.log(` ${s.label.padEnd(18)} ${"n/a".padStart(7)}   ${s.unavailable}`)
      continue
    }
    const last4 = s.points.slice(-4).map((p) => p.count).join(" ")
    const note = [s.startsAt ? `starts ${s.startsAt}` : "", s.unassigned ? `${s.unassigned} unassigned` : ""].filter(Boolean).join(" · ")
    console.log(` ${s.label.padEnd(18)} ${String(s.total).padStart(7)}   last 4 weeks: ${last4.padEnd(16)} ${note}`)
  }
}

main().catch((e) => {
  console.error("Failed:", e instanceof Error ? e.message : e)
  process.exit(1)
})
