/**
 * List paid Spartan Fayetteville checkouts that credit to a given NCU code, after
 * `spartan_credit_corrections` (same as Admin → Fundraising).
 *
 * Requires .env.local: STRIPE_SECRET_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 *   npx tsx scripts/list-spartan-payments-for-ncu-code.ts [NCU-CODE] [days]
 *   npx tsx scripts/list-spartan-payments-for-ncu-code.ts NCU-PALMER-29 120
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import Stripe from "stripe"
import { listSpartanFayettevilleDonations } from "../lib/spartan-fayetteville-stripe"
import {
  applySpartanCreditCorrectionsToDonations,
  fetchSpartanCreditCorrectionsIndex,
} from "../lib/spartan-credit-corrections"
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

const codeArg = (process.argv[2] ?? "NCU-PALMER-29").trim().toUpperCase()
const daysArg = Number(process.argv[3] ?? "120")
const days = !Number.isFinite(daysArg) || daysArg < 1 ? 120 : Math.min(400, daysArg)

const stripeKey = process.env.STRIPE_SECRET_KEY?.trim()
if (!stripeKey) {
  console.error("Set STRIPE_SECRET_KEY in .env.local")
  process.exit(1)
}

const since = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000)

async function main() {
  const stripe = new Stripe(stripeKey)
  const admin = createAdminClient()
  const raw = await listSpartanFayettevilleDonations(stripe, since)
  const index = await fetchSpartanCreditCorrectionsIndex(admin)
  const rows = applySpartanCreditCorrectionsToDonations(raw, index)
  const match = rows.filter((r) => (r.athleteCode ?? "").trim().toUpperCase() === codeArg)

  console.log(
    `Spartan Fayetteville — last ${days} days — athlete_code after corrections = ${codeArg}\n` +
      `Matches: ${match.length} (of ${rows.length} paid sessions in window)\n`,
  )

  const lines = match.map((r) => {
    const amount = (r.amountCents / 100).toFixed(2)
    const donor = r.donorName ?? "—"
    return [
      r.createdIso,
      `$${amount}`,
      donor,
      r.fundraisingType,
      r.sessionId,
      r.paymentIntentId ?? "—",
    ].join("\t")
  })
  if (lines.length) {
    console.log(["paid_at_utc", "amount", "donor", "type", "checkout_session", "payment_intent"].join("\t"))
    console.log(lines.join("\n"))
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
