#!/usr/bin/env node
/**
 * Verify a row in public.spartan_credit_corrections (fundraising re-credit to correct athlete).
 *
 * Requires .env.local (or .env) with NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.
 *
 *   node scripts/validate-spartan-credit-correction.js <pi_...|cs_...> <expected_NCU_code>
 *   node scripts/validate-spartan-credit-correction.js cs_abc… FUND   # NC United fund row (general_fund true)
 *   npm run validate:spartan-credit -- pi_3Abc... NCU-SHUSTER-28
 *
 * Exit 0 = row exists and athlete_code matches (case-insensitive). Exit 1 = missing, wrong, or error.
 */

const fs = require("fs")
const path = require("path")
const { createClient } = require("@supabase/supabase-js")

const root = path.resolve(__dirname, "..")

function loadEnvFile(rel) {
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

const args = process.argv.slice(2)
if (args.length < 2) {
  console.error(
    "Usage: node scripts/validate-spartan-credit-correction.js <pi_...|cs_...> <NCU-CODE|FUND>",
  )
  process.exit(1)
}

const sessionId = args[0].trim()
const expectArg = args[1].trim().toUpperCase()
const expectGeneralFund = expectArg === "FUND" || expectArg === "NC_UNITED_FUND" || expectArg === "GENERAL"

if (!sessionId || (!sessionId.startsWith("pi_") && !sessionId.startsWith("cs_"))) {
  console.error("First arg must be a Stripe PaymentIntent (pi_…) or Checkout Session (cs_…).")
  process.exit(1)
}

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").trim()
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim()

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY in .env.local")
  process.exit(1)
}

const supabase = createClient(url, key)

async function main() {
  const { data, error } = await supabase
    .from("spartan_credit_corrections")
    .select("session_id, athlete_code, general_fund, note, created_at")
    .eq("session_id", sessionId)
    .maybeSingle()

  if (error) {
    if (String(error.message || "").includes("does not exist") || error.code === "42P01") {
      console.error(
        "FAIL: table public.spartan_credit_corrections does not exist. Run scripts/add-spartan-credit-corrections.sql in Supabase.",
      )
    } else {
      console.error("FAIL: Supabase error:", error.message)
    }
    process.exit(1)
  }

  if (!data) {
    console.error(
      `FAIL: no correction row for session_id=\n  ${sessionId}\n\nInsert one in Supabase or Admin → Fundraising → Fix athlete credit.`,
    )
    process.exit(1)
  }

  if (expectGeneralFund) {
    if (data.general_fund !== true) {
      console.error("FAIL: expected general_fund row (NC United fund).")
      console.error("Row:", JSON.stringify(data, null, 2))
      process.exit(1)
    }
    console.log("OK: correction row is NC United fund (general_fund).")
  } else {
    const got = String(data.athlete_code || "").trim().toUpperCase()
    if (got !== expectArg) {
      console.error("FAIL: athlete_code mismatch.")
      console.error(`  expected: ${expectArg}`)
      console.error(`  got:      ${got || "(empty)"}`)
      console.error("Row:", JSON.stringify(data, null, 2))
      process.exit(1)
    }
    console.log("OK: correction row matches expected athlete code.")
  }
  console.log(JSON.stringify(data, null, 2))
  process.exit(0)
}

main().catch((e) => {
  console.error("FAIL:", e)
  process.exit(1)
})
