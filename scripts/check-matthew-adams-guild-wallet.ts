/**
 * Can Matthew Adams (matad22@gmail.com) see wallet + transfer to Guild?
 *   npx tsx scripts/check-matthew-adams-guild-wallet.ts
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { createAdminClient } from "../lib/supabase/admin"
import { fetchReimbursementPaidCentsByAthleteIdAllTime } from "../lib/athlete-reimbursement-net"
import { fetchGuildReservedCentsForAthleteIds, allocatableToGuildFromNet } from "../lib/guild-credit-allocations"
import { isGuildGrantConfigured } from "../lib/guild-grant-client"
import { isGuildSupabaseConfigured } from "../lib/guild-supabase-admin"

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
const GMAIL_EMAIL = "matad22@gmail.com"
const MATTEX_ID = "a42f215b-8bf6-44e1-894b-fbb3838fcd31"

function dollars(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

async function sumPaidDonationsForMattex(
  admin: ReturnType<typeof createAdminClient>,
  profile: { slug?: string | null; primary_fundraising_code?: string | null } | null,
) {
  const codes = new Set<string>()
  const slug = profile?.slug?.trim()
  const primary = profile?.primary_fundraising_code?.trim()
  if (primary && primary !== "NCU-UNKNOWN-30") codes.add(primary)
  if (slug) codes.add(slug)

  // Mattex Adams '27 — common generated codes
  for (const c of ["NCU-ADAMV1-27", "NCU-ADAMV2-27", "NCU-ADAMS-27"]) codes.add(c)

  let totalCents = 0
  let giftCount = 0
  for (const code of codes) {
    const { data, error } = await admin
      .from("spartan_donations")
      .select("amount_cents")
      .eq("status", "paid")
      .or(`athlete_code.ilike.${code},fundraising_athlete_slug.ilike.${code.toLowerCase()}`)
    if (error) continue
    for (const r of data ?? []) {
      totalCents += Number((r as { amount_cents?: number }).amount_cents ?? 0)
      giftCount++
    }
  }
  return { totalCents, giftCount, codes: [...codes] }
}

async function main() {
  const admin = createAdminClient()

  console.log("\n=== Matthew Adams — Guild wallet check (production data) ===\n")

  const { data: prof } = await admin
    .from("user_profiles")
    .select("email, full_name, guild_parent_user_id")
    .eq("user_id", GMAIL_USER_ID)
    .maybeSingle()

  const guildParentId = (prof as { guild_parent_user_id?: string | null } | null)?.guild_parent_user_id?.trim() ?? null
  console.log("Login:", GMAIL_EMAIL)
  console.log("Guild linked:", guildParentId ? `YES (${guildParentId})` : "NO")

  const { data: link } = await admin
    .from("parent_athlete_links")
    .select("id")
    .eq("user_id", GMAIL_USER_ID)
    .eq("athlete_id", MATTEX_ID)
    .maybeSingle()
  console.log("Mattex on wallet:", link ? "YES" : "NO")

  const { data: frProfile } = await admin
    .from("athlete_fundraising_profiles")
    .select("id, slug, is_active, primary_fundraising_code, total_raised_cents, checkout_live")
    .eq("athlete_id", MATTEX_ID)
    .order("is_active", { ascending: false })
    .limit(3)

  console.log("\nFundraising profile(s):", frProfile?.length ? frProfile : "(none)")

  const frRow = frProfile?.[0] as { slug?: string; primary_fundraising_code?: string } | undefined
  console.log("\nFundraising profile:", frRow ?? "(none)")

  const donations = await sumPaidDonationsForMattex(admin, frRow ?? null)
  console.log("Codes checked:", donations.codes)

  const reimbMap = await fetchReimbursementPaidCentsByAthleteIdAllTime(admin)
  const reimbCents = reimbMap.get(MATTEX_ID) ?? 0
  const guildReservedMap = await fetchGuildReservedCentsForAthleteIds(admin, [MATTEX_ID])
  const guildReservedAnyUser = guildReservedMap.get(MATTEX_ID) ?? 0
  const netCents = Math.max(0, donations.totalCents - reimbCents)
  const allocatable = allocatableToGuildFromNet(netCents, guildReservedAnyUser, false)

  console.log("\n--- Wallet math (Mattex) ---")
  console.log("Paid gifts (mirror):", dollars(donations.totalCents), `(${donations.giftCount} rows)`)
  console.log("Reimbursements paid:", dollars(reimbCents))
  console.log("Net after reimbursements:", dollars(netCents))
  console.log("Already reserved/sent to Guild:", dollars(guildReservedAnyUser))
  console.log("Allocatable to Guild NOW:", dollars(allocatable))

  const { data: ledger } = await admin
    .from("fundraising_ledger_entries")
    .select("entry_type, amount_cents, ncu_code, created_at")
    .eq("athlete_id", MATTEX_ID)
    .order("created_at", { ascending: false })
    .limit(10)
  console.log("\nRecent ledger (Mattex):", ledger?.length ? ledger : "(none)")

  const { data: reimbRows } = await admin
    .from("athlete_reimbursement_requests")
    .select("status, amount_cents, created_at")
    .eq("athlete_id", MATTEX_ID)
    .order("created_at", { ascending: false })
    .limit(5)
  console.log("Reimbursement requests:", reimbRows?.length ? reimbRows : "(none)")

  const { data: slugDonations } = await admin
    .from("spartan_donations")
    .select("amount_cents, athlete_code, fundraising_athlete_slug, athlete_display_name, created_at")
    .eq("status", "paid")
    .ilike("fundraising_athlete_slug", "ncu-adams-27")
    .limit(10)
  console.log("Paid gifts on slug ncu-adams-27:", slugDonations?.length ? slugDonations : "(none)")

  const { data: guildAllocs } = await admin
    .from("guild_credit_allocations")
    .select("user_id, amount_cents, status, created_at")
    .eq("athlete_id", MATTEX_ID)
    .order("created_at", { ascending: false })
    .limit(5)
  console.log("Guild allocation history:", guildAllocs?.length ? guildAllocs : "(none)")

  console.log("\n--- Infra ---")
  console.log("Guild DB configured:", isGuildSupabaseConfigured())
  console.log("Guild grant API configured:", isGuildGrantConfigured())

  const blockers: string[] = []
  if (!guildParentId) blockers.push("Guild not linked")
  if (!link) blockers.push("Mattex not on wallet")
  if (frRow?.primary_fundraising_code === "NCU-UNKNOWN-30") {
    blockers.push("Fundraising profile has placeholder code NCU-UNKNOWN-30 — wallet totals may be wrong until code is fixed")
  }
  if (!isGuildGrantConfigured()) blockers.push("Guild grant API not configured in this env")
  if (allocatable <= 0) blockers.push(`Nothing to transfer (${dollars(allocatable)} available)`)

  console.log("\n=== VERDICT ===")
  if (!guildParentId || !link) {
    console.log("NO — wrong account or missing links. Must use", GMAIL_EMAIL)
  } else if (allocatable > 0 && isGuildGrantConfigured()) {
    console.log(`YES — sign in as ${GMAIL_EMAIL} → Profile → Fundraise → transfer up to ${dollars(allocatable)}`)
  } else if (guildParentId && link) {
    console.log(`PARTIAL — wallet + Guild UI will load, but transfer cap is ${dollars(allocatable)}`)
    if (blockers.length) for (const b of blockers) console.log("  •", b)
  } else {
    for (const b of blockers) console.log("  •", b)
  }
  console.log("")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
