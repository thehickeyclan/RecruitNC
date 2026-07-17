/**
 * One-off: sync blue_wiq_subscriptions to the LIVE WrestlingIQ subscription list the owner
 * pasted on 7/17/2026 (51 subs), because a clean CSV export wasn't available.
 *
 * The June 3 CSV import had counted "Canceled — active until <date>" families as active;
 * their windows have since lapsed, leaving 12 ghost members inflating the dashboard
 * (mirror said 63 billable / ~$2,867; live truth is 49 billing + 2 paused / ~$2,259 charged).
 *
 * What it does, in order:
 *   1. Full JSON backup of the table (printed path) BEFORE any write.
 *   2. Match each live entry to its mirror row via wiq_billing_partner_id, using the
 *      7/17 CSV (name + member-since → sub_w id) to resolve ids — this is what keeps the
 *      two Elias Taylor and two Fares Alkurdasi subs distinct.
 *   3. Update the 51: status active/paused, fresh next_due_at (feeds the signup-route
 *      billing anchor), amount, last_seen/last_import stamps.
 *   4. Cancel every other still-billable mirror row (the 12 ghosts).
 *   5. Insert a blue_wiq_import_runs row so the dashboard freshness stamp reflects today.
 *
 * Run: npx tsx scripts/sync-wiq-from-live-paste-2026-07-17.ts        (dry run)
 *      npx tsx scripts/sync-wiq-from-live-paste-2026-07-17.ts --apply
 * Interim only — replaced by a nightly WIQ API sync once API access is granted.
 */

import fs from "node:fs"
import { createAdminClient } from "@/lib/supabase/admin"

const CSV_PATH = "/Users/matthickey/Downloads/Membership Summary Report - 7_17_2026, 11_04 am.csv"
const BACKUP_PATH = `/tmp/blue_wiq_subscriptions.backup.${Date.now()}.json`
const APPLY = process.argv.includes("--apply")

/** The live WIQ "active subscriptions" view, pasted 7/17/2026. Created-at disambiguates dupes. */
const LIVE: Array<{ name: string; amount: number; nextDue: string; created: string; paused?: boolean }> = [
  { name: "Spencer Moore", amount: 51, nextDue: "8/15/2026 07:33 pm", created: "2/15/2026 06:33 pm" },
  { name: "Elias Taylor", amount: 51, nextDue: "8/11/2026 09:32 am", created: "2/11/2026 08:32 am" },
  { name: "Logan Mumy", amount: 51, nextDue: "8/15/2026 11:40 pm", created: "1/15/2026 10:40 pm" },
  { name: "Luke Padgett", amount: 51, nextDue: "8/15/2026 07:00 pm", created: "1/15/2026 06:00 pm" },
  { name: "Fares Alkurdasi", amount: 51, nextDue: "8/9/2026 10:59 am", created: "1/9/2026 09:59 am" },
  { name: "Joseph Shook", amount: 51, nextDue: "8/3/2026 07:47 pm", created: "1/3/2026 06:47 pm" },
  { name: "Matthew Carter", amount: 51, nextDue: "7/19/2026 06:28 pm", created: "12/19/2025 05:28 pm" },
  { name: "Fares Alkurdasi", amount: 51, nextDue: "8/8/2026 02:33 pm", created: "12/8/2025 01:33 pm" },
  { name: "Angel Olalde", amount: 51, nextDue: "8/6/2026 04:37 pm", created: "12/6/2025 03:37 pm" },
  { name: "Cole Shuster", amount: 38.25, nextDue: "7/30/2026 02:04 pm", created: "11/30/2025 01:04 pm" },
  { name: "Shane Shuster", amount: 38.25, nextDue: "7/30/2026 02:04 pm", created: "11/30/2025 01:04 pm" },
  { name: "Jacob De La Torre", amount: 51, nextDue: "7/18/2026 08:26 pm", created: "11/18/2025 07:26 pm" },
  { name: "Josh Brezac", amount: 51, nextDue: "7/18/2026 02:15 am", created: "11/18/2025 01:15 am" },
  { name: "Paxton Kearns", amount: 51, nextDue: "8/9/2026 05:11 pm", created: "10/9/2025 05:11 pm" },
  { name: "Bennett Myles", amount: 40.8, nextDue: "8/13/2026 07:30 pm", created: "9/13/2025 07:30 pm" },
  { name: "Keyshon Morrison", amount: 0, nextDue: "8/12/2026 09:53 pm", created: "9/12/2025 09:53 pm" },
  { name: "Campbell Tufts-Piercy", amount: 51, nextDue: "8/12/2026 06:32 am", created: "9/12/2025 06:32 am" },
  { name: "Chris Vargas", amount: 51, nextDue: "8/1/2026 02:32 pm", created: "8/1/2025 02:32 pm", paused: true },
  { name: "Stephen Cross", amount: 51, nextDue: "7/28/2026 06:09 pm", created: "7/28/2025 06:09 pm" },
  { name: "Xavier Bernthal", amount: 51, nextDue: "7/26/2026 02:38 pm", created: "7/26/2025 02:38 pm" },
  { name: "Brieon Mayfield", amount: 51, nextDue: "7/26/2026 01:04 pm", created: "7/26/2025 01:04 pm" },
  { name: "Naylor Higgins", amount: 51, nextDue: "7/25/2026 06:01 pm", created: "7/25/2025 06:01 pm" },
  { name: "Aaron Ruiz-Angel", amount: 51, nextDue: "8/1/2026 08:02 pm", created: "6/1/2025 08:02 pm" },
  { name: "Aidan Szewczyk", amount: 51, nextDue: "7/27/2026 08:31 pm", created: "5/27/2025 08:31 pm" },
  { name: "Gavin Lopez", amount: 51, nextDue: "8/5/2026 05:54 pm", created: "5/5/2025 05:54 pm" },
  { name: "Garrison Raper", amount: 51, nextDue: "7/19/2026 06:04 pm", created: "3/19/2025 06:04 pm" },
  { name: "Joshua S. Stonebraker", amount: 51, nextDue: "8/16/2026 09:33 pm", created: "3/16/2025 09:33 pm" },
  { name: "Liam Myles", amount: 51, nextDue: "8/16/2026 08:14 pm", created: "3/16/2025 08:14 pm" },
  { name: "Drew Teeter", amount: 51, nextDue: "8/8/2026 12:03 am", created: "3/7/2025 11:03 pm" },
  { name: "Sam boltes", amount: 51, nextDue: "8/4/2026 09:31 pm", created: "3/4/2025 08:31 pm" },
  { name: "Jaxon Thomas", amount: 51, nextDue: "8/4/2026 12:24 am", created: "3/3/2025 11:24 pm" },
  { name: "Adam Walker", amount: 51, nextDue: "8/3/2026 10:18 pm", created: "3/3/2025 09:18 pm" },
  { name: "Aiden Burkholder", amount: 51, nextDue: "8/3/2026 07:15 pm", created: "3/3/2025 06:15 pm" },
  { name: "Mitchell Rowland", amount: 51, nextDue: "8/3/2026 09:44 am", created: "3/3/2025 08:44 am" },
  { name: "Jake Amiott", amount: 51, nextDue: "8/2/2026 09:37 pm", created: "3/2/2025 08:37 pm" },
  { name: "Aiden White", amount: 51, nextDue: "8/2/2026 12:59 pm", created: "3/2/2025 11:59 am", paused: true },
  { name: "Ryan Thompson", amount: 51, nextDue: "8/1/2026 08:06 pm", created: "3/1/2025 07:06 pm" },
  { name: "Bryce Perry", amount: 51, nextDue: "8/10/2026 09:46 am", created: "2/10/2025 08:46 am" },
  { name: "Elias Taylor", amount: 51, nextDue: "8/10/2026 09:29 pm", created: "1/10/2025 08:29 pm" },
  { name: "dantrell Williams", amount: 0, nextDue: "7/28/2026 09:45 pm", created: "12/28/2024 08:45 pm" },
  { name: "Carson Raper", amount: 51, nextDue: "7/28/2026 10:51 am", created: "12/28/2024 09:51 am" },
  { name: "Aidan Gore", amount: 51, nextDue: "7/24/2026 02:20 pm", created: "12/24/2024 01:20 pm" },
  { name: "Trevelian Hall", amount: 0, nextDue: "7/29/2026 04:19 pm", created: "11/29/2024 03:19 pm" },
  { name: "Dominic Blue", amount: 51, nextDue: "7/27/2026 12:41 pm", created: "11/27/2024 11:41 am" },
  { name: "Carson Worrick", amount: 51, nextDue: "7/25/2026 11:17 pm", created: "11/25/2024 10:17 pm" },
  { name: "Ethan Halstead", amount: 51, nextDue: "7/25/2026 02:15 pm", created: "11/25/2024 01:15 pm" },
  { name: "Mason Brown", amount: 51, nextDue: "7/25/2026 12:16 pm", created: "11/25/2024 11:16 am" },
  { name: "Luke Richards", amount: 51, nextDue: "7/24/2026 08:53 pm", created: "11/24/2024 07:53 pm" },
  { name: "Connor Reece", amount: 51, nextDue: "7/24/2026 07:06 pm", created: "11/24/2024 06:06 pm" },
  { name: "Holt Quincy", amount: 51, nextDue: "7/24/2026 04:16 pm", created: "11/24/2024 03:16 pm" },
  { name: "Liam Hickey", amount: 0, nextDue: "7/24/2026 12:11 pm", created: "11/24/2024 11:11 am" },
]

const norm = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim()

/** "8/15/2026 07:33 pm" (WIQ shows Eastern) → ISO. July/Aug 2026 are EDT (-04:00). */
function parseEastern(s: string): string {
  const m = s.trim().match(/^(\d+)\/(\d+)\/(\d+)\s+(\d+):(\d+)\s*(am|pm)$/i)
  if (!m) throw new Error(`bad date: ${s}`)
  let h = Number(m[4]) % 12
  if (m[6].toLowerCase() === "pm") h += 12
  const iso = `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}T${String(h).padStart(2, "0")}:${m[5]}:00-04:00`
  return new Date(iso).toISOString()
}

function csvKey(name: string, memberSince: string): string {
  return `${norm(name)}|${memberSince.trim().toLowerCase()}`
}

async function main() {
  // 1) sub_w id map from the 7/17 CSV: (wrestler + member-since) → billing partner id.
  const csv = fs.readFileSync(CSV_PATH, "utf-8")
  const lines = csv.split(/\r?\n/).filter(Boolean)
  const idByKey = new Map<string, string>()
  for (const line of lines.slice(1)) {
    // naive CSV split is fine here: quoted fields ("NC United Blue ") contain no commas.
    const cols = line.split(",").map((c) => c.replace(/^"|"$/g, "").trim())
    const [_, wrestler, __, memberSince] = [cols[0], cols[1], cols[2], cols[3]]
    const id = cols[cols.length - 1]
    if (wrestler && memberSince && id?.startsWith("sub_w_")) idByKey.set(csvKey(wrestler, memberSince), id)
  }
  console.log(`CSV id map: ${idByKey.size} rows`)

  // resolve every live entry to a sub_w id — hard-fail on any miss before writing anything
  const live = LIVE.map((e) => {
    const id = idByKey.get(csvKey(e.name, e.created))
    if (!id) throw new Error(`no sub id for ${e.name} created ${e.created}`)
    return { ...e, id }
  })
  const liveIds = new Set(live.map((e) => e.id))
  console.log(`live entries resolved to ids: ${live.length}/${LIVE.length}`)

  const admin = createAdminClient()
  const { data: mirror, error } = await admin.from("blue_wiq_subscriptions").select("*")
  if (error || !mirror) throw new Error(`mirror read failed: ${error?.message}`)

  // 2) backup before any write
  fs.writeFileSync(BACKUP_PATH, JSON.stringify(mirror, null, 1))
  console.log(`backup (${mirror.length} rows): ${BACKUP_PATH}`)

  const byPartnerId = new Map(mirror.map((r: any) => [r.wiq_billing_partner_id, r]))
  const now = new Date().toISOString()

  const updates: Array<{ id: string; name: string; from: string; to: string }> = []
  const ghosts: Array<{ id: string; name: string; from: string }> = []

  for (const e of live) {
    const row: any = byPartnerId.get(e.id)
    if (!row) throw new Error(`live sub ${e.id} (${e.name}) not in mirror — aborting, nothing written`)
    const to = e.paused ? "paused" : "active"
    updates.push({ id: row.id, name: e.name, from: row.status, to })
    if (APPLY) {
      const { error: upErr } = await admin
        .from("blue_wiq_subscriptions")
        .update({
          status: to,
          next_due_at: parseEastern(e.nextDue),
          amount_cents: Math.round(e.amount * 100),
          amount_display: `$${e.amount.toFixed(2)}/ month`,
          missing_from_last_import: false,
          last_seen_at: now,
          last_import_at: now,
          updated_at: now,
        })
        .eq("id", row.id)
      if (upErr) throw new Error(`update failed for ${e.name}: ${upErr.message}`)
    }
  }

  // 4) ghosts: anything still counted billable/paused that is not in the live list
  for (const row of mirror as any[]) {
    if (["active", "past_due", "grace", "paused"].includes(row.status) && !liveIds.has(row.wiq_billing_partner_id)) {
      ghosts.push({ id: row.id, name: row.wrestler_name, from: row.status })
      if (APPLY) {
        const { error: gErr } = await admin
          .from("blue_wiq_subscriptions")
          .update({ status: "cancelled", missing_from_last_import: true, last_import_at: now, updated_at: now })
          .eq("id", row.id)
        if (gErr) throw new Error(`cancel failed for ${row.wrestler_name}: ${gErr.message}`)
      }
    }
  }

  // 5) freshness stamp
  if (APPLY) {
    const { error: runErr } = await admin.from("blue_wiq_import_runs").insert({
      imported_by: null,
      file_label: "live-paste-sync 7/17/2026 (owner-pasted WIQ subscription list)",
      total_rows: LIVE.length,
      blue_rows: LIVE.length,
      upserted: updates.length,
      flagged_missing: ghosts.length,
    })
    if (runErr) console.warn(`import-run insert failed (freshness stamp will stay stale): ${runErr.message}`)
  }

  console.log(`\n${APPLY ? "APPLIED" : "DRY RUN (pass --apply to write)"}`)
  console.log(`updated to live status: ${updates.length} (${updates.filter((u) => u.to === "paused").length} paused)`)
  const changed = updates.filter((u) => u.from !== u.to)
  for (const u of changed) console.log(`   ${u.name}: ${u.from} -> ${u.to}`)
  console.log(`ghosts cancelled: ${ghosts.length}`)
  for (const g of ghosts) console.log(`   ${g.name} (was ${g.from})`)

  // expected dashboard numbers after sync
  const billing = live.filter((e) => !e.paused)
  const std = billing.reduce((s, e) => s + Math.min(e.amount, 50), 0)
  console.log(`\nexpected dashboard after sync: WIQ Paid/Billable ${billing.length} · Paused 2 · MRR std ≈ $${std.toFixed(2)}`)
}

void main().catch((e) => {
  console.error("FAILED:", e instanceof Error ? e.message : e)
  process.exit(1)
})
