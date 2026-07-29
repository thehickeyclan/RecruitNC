/**
 * Mattex Adams — verify NCU-ADAMSM-27 wallet + Guild transfer amount
 *   npx tsx scripts/check-mattex-adamsm-wallet.ts
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { createAdminClient } from "../lib/supabase/admin"
import { fetchReimbursementPaidCentsByAthleteIdAllTime } from "../lib/athlete-reimbursement-net"
import { fetchGuildReservedCentsForAthleteIds, allocatableToGuildFromNet } from "../lib/guild-credit-allocations"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")

function loadEnvFile(rel: string) {
  const p = path.join(root, rel)
  if (!fs.existsSync(p)) return
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const eq = t.indexOf("=")
    if (eq <= 0) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val.replace(/\r$/, "").trim()
  }
}

loadEnvFile(".env.local")
loadEnvFile(".env")

const GMAIL_USER_ID = "983e6f68-a2ed-4912-93c1-9fe4dbc6e3d6"
const MATTEX_ID = "a42f215b-8bf6-44e1-894b-fbb3838fcd31"
const CODE = "NCU-ADAMSM-27"

function dollars(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

async function main() {
  const admin = createAdminClient()

  console.log("\n=== Mattex / NCU-ADAMSM-27 ===\n")

  const { data: spartanRow } = await admin
    .from("spartan_fundraising_athletes")
    .select("code, first_name, last_name, grad_year, school, athlete_id, active")
    .ilike("code", CODE)
    .maybeSingle()

  console.log("spartan_fundraising_athletes:", spartanRow)

  const { data: profile } = await admin
    .from("athlete_fundraising_profiles")
    .select("slug, primary_fundraising_code, is_active")
    .eq("athlete_id", MATTEX_ID)
    .eq("is_active", true)
    .maybeSingle()

  console.log("athlete_fundraising_profiles:", profile)

  const { data: gifts } = await admin
    .from("spartan_donations")
    .select("amount_cents, athlete_code, fundraising_athlete_slug, created_at")
    .eq("status", "paid")
    .ilike("athlete_code", CODE)

  const raisedCents = (gifts ?? []).reduce((s, r) => s + Number((r as { amount_cents?: number }).amount_cents ?? 0), 0)
  console.log(`Paid gifts on ${CODE}:`, dollars(raisedCents), `(${(gifts ?? []).length} rows)`)

  const reimbMap = await fetchReimbursementPaidCentsByAthleteIdAllTime(admin)
  const reimbCents = reimbMap.get(MATTEX_ID) ?? 0
  const guildMap = await fetchGuildReservedCentsForAthleteIds(admin, [MATTEX_ID])
  const guildReserved = guildMap.get(MATTEX_ID) ?? 0
  const net = Math.max(0, raisedCents - reimbCents)
  const allocatable = allocatableToGuildFromNet(net, guildReserved, false)

  console.log("Reimbursements (Mattex athlete_id):", dollars(reimbCents))
  console.log("Net after reimb:", dollars(net))
  console.log("Guild reserved:", dollars(guildReserved))
  console.log("Allocatable to Guild:", dollars(allocatable))

  const { data: prof } = await admin
    .from("user_profiles")
    .select("guild_parent_user_id")
    .eq("user_id", GMAIL_USER_ID)
    .maybeSingle()

  console.log("\nGmail Guild linked:", Boolean((prof as { guild_parent_user_id?: string | null } | null)?.guild_parent_user_id))

  console.log("\n=== VERDICT ===")
  if (raisedCents >= 100000 && allocatable >= 90000) {
    console.log(`YES — ${dollars(allocatable)} transferable on ${CODE} when signed in as matad22@gmail.com`)
  } else {
    console.log("Mismatch vs admin $945 — check spartan row athlete_id pin and profile primary code")
  }
  console.log("")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
