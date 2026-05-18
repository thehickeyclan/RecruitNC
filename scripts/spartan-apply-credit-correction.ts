/**
 * CLI: read/write public.spartan_credit_corrections (same rules as Admin → Fundraising).
 *
 * Requires .env.local (or .env):
 *   
 * NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY
 * Optional: STRIPE_SECRET_KEY (for `dual-fund` to set both cs_… and pi_…)
 *
 * Examples:
 *
 *   # Show correction + spartan_donations row (if any)
 *   npx tsx scripts/spartan-apply-credit-correction.ts status cs_live_abc123
 *
 *   # Credit this checkout / PI to NC United fund (not an athlete) — one id only
 *   npx tsx scripts/spartan-apply-credit-correction.ts to-fund cs_live_abc123
 *
 *   # Recommended after a wrong athlete credit: set BOTH session + payment intent ids
 *   npx tsx scripts/spartan-apply-credit-correction.ts dual-fund cs_live_abc123
 *
 *   # Re-credit to a specific NCU code
 *   npx tsx scripts/spartan-apply-credit-correction.ts to-athlete cs_live_abc123 NCU-SMITH-29
 *
 * If `to-fund`/`dual-fund` errors on general_fund column, run in Supabase:
 *   scripts/add-spartan-credit-corrections-general-fund.sql
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import Stripe from "stripe"
import { createAdminClient } from "../lib/supabase/admin"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")

function loadEnvFile(rel: string) {
  const p = path.join(root, rel)
  if (!fs.existsSync(p)) return
  const text = fs.readFileSync(p, "utf8")
  for (const line of text.split("\n")) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const eq = t.indexOf("=")
    if (eq <= 0) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    val = val.replace(/\r$/, "").trim()
    if (!process.env[key]) process.env[key] = val
  }
}

loadEnvFile(".env.local")
loadEnvFile(".env")

const SESSION_RE = /^(cs_[a-zA-Z0-9_]+|pi_[a-zA-Z0-9]+)$/
const CODE_RE = /^NCU-[A-Za-z0-9]+-\d{2}$/i

function usage(msg?: string) {
  if (msg) console.error(msg + "\n")
  console.error(`Usage:
  npx tsx scripts/spartan-apply-credit-correction.ts status <cs_|pi_>
  npx tsx scripts/spartan-apply-credit-correction.ts to-fund <cs_|pi_>
  npx tsx scripts/spartan-apply-credit-correction.ts dual-fund <cs_…>   # needs STRIPE_SECRET_KEY
  npx tsx scripts/spartan-apply-credit-correction.ts to-athlete <cs_|pi_> <NCU-CODE>`)
  process.exit(1)
}

async function deleteCorrection(admin: ReturnType<typeof createAdminClient>, rawId: string) {
  const { error } = await admin.from("spartan_credit_corrections").delete().eq("session_id", rawId)
  if (error) throw new Error(`delete: ${error.message}`)
}

async function insertFund(admin: ReturnType<typeof createAdminClient>, rawId: string) {
  const { error } = await admin
    .from("spartan_credit_corrections")
    .insert({ session_id: rawId, athlete_code: null, general_fund: true })
  if (error) {
    if (error.message?.includes("general_fund") || error.code === "42703") {
      throw new Error(
        "Missing column general_fund. Run scripts/add-spartan-credit-corrections-general-fund.sql in Supabase SQL Editor.",
      )
    }
    if (error.message?.includes("null value") || error.code === "23502") {
      throw new Error(
        "athlete_code null not allowed. Run scripts/add-spartan-credit-corrections-general-fund.sql (allows null for fund rows).",
      )
    }
    throw new Error(`insert fund: ${error.message}`)
  }
}

async function insertAthlete(admin: ReturnType<typeof createAdminClient>, rawId: string, code: string) {
  const normalized = code.trim().toUpperCase()
  const { error } = await admin
    .from("spartan_credit_corrections")
    .insert({ session_id: rawId, athlete_code: normalized, general_fund: false })
  if (error) throw new Error(`insert athlete: ${error.message}`)
}

async function cmdStatus(admin: ReturnType<typeof createAdminClient>, id: string) {
  const { data: corr, error: cErr } = await admin
    .from("spartan_credit_corrections")
    .select("*")
    .eq("session_id", id)
    .maybeSingle()

  if (cErr) throw new Error(cErr.message)

  console.log("=== spartan_credit_corrections ===")
  console.log(corr ? JSON.stringify(corr, null, 2) : "(no row for this session_id)")

  if (id.startsWith("cs_")) {
    const { data: don, error: dErr } = await admin
      .from("spartan_donations")
      .select("id, status, amount_cents, athlete_code, athlete_display_name, created_at, raw_metadata")
      .eq("id", id)
      .maybeSingle()
    if (dErr) console.warn("spartan_donations:", dErr.message)
    console.log("\n=== spartan_donations (id = checkout session) ===")
    console.log(don ? JSON.stringify(don, null, 2) : "(no paid row synced for this cs_ id yet)")
  } else {
    console.log("\n(spartan_donations.id is the cs_… id; use `status cs_…` for ledger row, or dual-fund from cs_)")
  }
}

async function cmdDualFund(stripe: Stripe, admin: ReturnType<typeof createAdminClient>, csId: string) {
  if (!csId.startsWith("cs_")) usage("dual-fund only accepts a Checkout Session id (cs_…).")
  const session = await stripe.checkout.sessions.retrieve(csId)
  if (session.payment_status !== "paid") {
    console.warn("Warning: Stripe session payment_status is not 'paid':", session.payment_status)
  }
  const pi = session.payment_intent
  const piId = typeof pi === "string" ? pi : pi?.id ?? null

  console.log("Checkout Session:", csId)
  console.log("PaymentIntent:", piId ?? "(none)")

  await deleteCorrection(admin, csId)
  await insertFund(admin, csId)
  console.log("OK: wrote general_fund for", csId)

  if (piId) {
    await deleteCorrection(admin, piId)
    await insertFund(admin, piId)
    console.log("OK: wrote general_fund for", piId)
  } else {
    console.log("No PI id — only cs_ correction stored. If live feed still shows wrong credit, add pi_ row manually from Stripe.")
  }
}

async function main() {
  const argv = process.argv.slice(2)
  if (argv.length < 2) usage()

  const cmd = argv[0]!.toLowerCase().trim()
  const id = argv[1]!.trim()
  if (!SESSION_RE.test(id)) usage("Second arg must be cs_… or pi_…")

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").trim()
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim()
  if (!url || !key) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in .env.local")
    process.exit(1)
  }

  const admin = createAdminClient()

  if (cmd === "status") {
    await cmdStatus(admin, id)
    return
  }

  if (cmd === "to-fund") {
    await deleteCorrection(admin, id)
    await insertFund(admin, id)
    console.log("OK: NC United fund credit saved for", id)
    console.log("Validate: npm run validate:spartan-credit --", id, "FUND")
    return
  }

  if (cmd === "dual-fund") {
    const stripeKey = process.env.STRIPE_SECRET_KEY?.trim()
    if (!stripeKey) {
      console.error("dual-fund requires STRIPE_SECRET_KEY in .env.local")
      process.exit(1)
    }
    const stripe = new Stripe(stripeKey)
    await cmdDualFund(stripe, admin, id)
    if (id.startsWith("cs_")) {
      console.log("\nValidate cs: npm run validate:spartan-credit --", id, "FUND")
    }
    return
  }

  if (cmd === "to-athlete") {
    const code = argv[2]?.trim() ?? ""
    if (!code || !CODE_RE.test(code)) usage("to-athlete needs a valid NCU code like NCU-SMITH-29")
    await deleteCorrection(admin, id)
    await insertAthlete(admin, id, code)
    console.log("OK: athlete credit saved:", id, "→", code.toUpperCase())
    console.log("Validate: npm run validate:spartan-credit --", id, code.toUpperCase())
    return
  }

  usage(`Unknown command: ${cmd}`)
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
