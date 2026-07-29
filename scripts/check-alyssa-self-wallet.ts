/**
 * Alyssa Self — Stripe vs mirror reconciliation for NCU-SELF-28.
 *   npx tsx scripts/check-alyssa-self-wallet.ts
 */

import fs from "fs"
import path from "path"
import Stripe from "stripe"
import { fileURLToPath } from "url"
import { createAdminClient } from "../lib/supabase/admin"
import {
  applySpartanCreditCorrectionsToDonations,
  fetchSpartanCreditCorrectionsIndex,
} from "../lib/spartan-credit-corrections"
import { listSpartanFayettevilleDonationsAllRegisteredCampaigns } from "../lib/spartan-fayetteville-stripe"

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

const ALYSSA_ID = "6832e4ff-8315-438c-83e6-e3a62f268666"
const CODE = "NCU-SELF-28"
const SLUG = "ncu-self-28"

function dollars(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

async function main() {
  const admin = createAdminClient()

  const { data: fp } = await admin.from("athlete_fundraising_profiles").select("*").eq("athlete_id", ALYSSA_ID)
  console.log("athlete_fundraising_profiles:", fp)

  const { data: mirrorGifts } = await admin
    .from("spartan_donations")
    .select("amount_cents, athlete_code, fundraising_athlete_slug, status, created_at")
    .eq("status", "paid")
    .or(`athlete_code.ilike.${CODE},fundraising_athlete_slug.ilike.${SLUG}`)
    .order("created_at", { ascending: false })

  const mirrorTotal = (mirrorGifts ?? []).reduce((s, r) => s + Number((r as { amount_cents?: number }).amount_cents ?? 0), 0)
  console.log(`\nMirror (spartan_donations) for code+slug: ${dollars(mirrorTotal)} (${(mirrorGifts ?? []).length} rows)`)
  for (const g of mirrorGifts ?? []) console.log(" ", g)

  const { data: selfMirror } = await admin
    .from("spartan_donations")
    .select("amount_cents, athlete_code, fundraising_athlete_slug, created_at")
    .eq("status", "paid")
    .or("athlete_code.ilike.%SELF%,fundraising_athlete_slug.ilike.%self%")
    .order("created_at", { ascending: false })

  console.log(`\nAll mirror rows with SELF in code or slug:`)
  for (const g of selfMirror ?? []) console.log(" ", g)

  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim()
  if (!stripeKey) {
    console.log("\nNo STRIPE_SECRET_KEY — cannot load Stripe totals")
    return
  }

  const lookbackDays = 5475
  const since = Math.floor((Date.now() - lookbackDays * 86400000) / 1000)
  const stripe = new Stripe(stripeKey)
  const [raw, idx] = await Promise.all([
    listSpartanFayettevilleDonationsAllRegisteredCampaigns(stripe, since, 400),
    fetchSpartanCreditCorrectionsIndex(admin),
  ])
  const rows = applySpartanCreditCorrectionsToDonations(raw, idx)

  const byCode = rows.filter((r) => (r.athleteCode ?? "").toUpperCase() === CODE)
  const bySlug = rows.filter((r) => (r.fundraisingAthleteSlug ?? "").toLowerCase() === SLUG)
  const bySelfCode = rows.filter((r) => /SELF/i.test(r.athleteCode ?? ""))

  const sum = (list: typeof rows) => list.reduce((s, r) => s + (r.amountCents ?? 0), 0)

  console.log(`\nStripe lifetime (${lookbackDays}d lookback):`)
  console.log(`  ${CODE} only: ${dollars(sum(byCode))} (${byCode.length} sessions)`)
  for (const r of byCode) console.log("   ", r.sessionId, dollars(r.amountCents ?? 0), r.fundraisingAthleteSlug)

  console.log(`  slug ${SLUG}: ${dollars(sum(bySlug))} (${bySlug.length} sessions)`)
  for (const r of bySlug) console.log("   ", r.sessionId, dollars(r.amountCents ?? 0), r.athleteCode)

  console.log(`  any code containing SELF: ${dollars(sum(bySelfCode))} (${bySelfCode.length} sessions)`)
  for (const r of bySelfCode) console.log("   ", r.athleteCode, dollars(r.amountCents ?? 0), r.fundraisingAthleteSlug)

  const slugCodes = new Set(bySlug.map((r) => (r.athleteCode ?? "").toUpperCase()).filter(Boolean))
  const mergedCodes = new Set([CODE, ...slugCodes])
  const merged = rows.filter((r) => mergedCodes.has((r.athleteCode ?? "").toUpperCase()))
  const seen = new Set<string>()
  let mergedTotal = 0
  let mergedCount = 0
  for (const r of merged) {
    const sid = r.sessionId.trim()
    if (!sid || seen.has(sid)) continue
    seen.add(sid)
    mergedTotal += r.amountCents ?? 0
    mergedCount++
  }
  console.log(`\nWallet-style merge (code ${CODE} + slug-discovered codes): ${dollars(mergedTotal)} (${mergedCount} sessions)`)
  console.log("  ledger codes:", [...mergedCodes])
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
