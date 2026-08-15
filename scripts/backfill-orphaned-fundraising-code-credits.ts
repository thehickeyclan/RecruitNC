/**
 * Re-credit gifts stranded on retired NCU codes.
 *
 * NCU codes are **derived** from `athletes.name` + `graduationyear`. When a later athlete collides on
 * surname+year (or a name is edited), the generator hands out a different suffix — and every gift already
 * banked under the old code falls out of that athlete's wallet ledger union
 * (`ledgerCodesForFundraisingWallet`), so the family sees Raised $0 while Guild holds still show as Spent.
 *
 * This writes `spartan_credit_corrections` rows (the same mechanism as Admin → Fundraising and
 * `npm run spartan:credit`) mapping each stranded checkout to the athlete's current code. Both the Stripe
 * and `spartan_donations` mirror paths honour those rows, so the wallet, the public gift page and the admin
 * ledger all agree afterwards.
 *
 *   npx tsx scripts/backfill-orphaned-fundraising-code-credits.ts            # dry run, writes nothing
 *   npx tsx scripts/backfill-orphaned-fundraising-code-credits.ts --apply
 *
 * Safety: every donation row must carry the expected `athlete_display_name` (stamped by checkout at the time
 * of the gift) or the whole batch aborts. Existing correction rows are left alone — re-running is a no-op.
 *
 * Requires .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import fs from "fs"
import path from "path"
import { createRequire } from "module"
import { fileURLToPath } from "url"

const req = createRequire(import.meta.url)
const reactMod = req("react") as { cache?: <T>(fn: T) => T }
if (typeof reactMod.cache !== "function") reactMod.cache = (fn) => fn

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
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1)
    if (!process.env[key]) process.env[key] = val.replace(/\r$/, "").trim()
  }
}
loadEnvFile(".env.local")
loadEnvFile(".env")

/**
 * Ownership was established from `athlete_display_name` persisted on each gift at checkout — that string is
 * the directory label the donor actually saw, so it identifies the athlete independently of today's code.
 */
const PLAN: {
  retiredCode: string
  currentCode: string
  athleteId: string
  athleteName: string
  /** Every paid gift on `retiredCode` must carry exactly this display name. */
  expectDisplayName: string
}[] = [
  {
    retiredCode: "NCU-THOMAS-27",
    currentCode: "NCU-THOMASJ-27",
    athleteId: "ca4cdc62-99ac-4951-bab6-6577885aad3e",
    athleteName: "Jaxon Thomas",
    expectDisplayName: "J. Thomas '27 · Piedmont",
  },
  {
    retiredCode: "NCU-GUERRERO-29",
    currentCode: "NCU-PEREZ-29",
    athleteId: "14ad272b-11d0-4323-a3ef-4e5ab94314ed",
    athleteName: "Gael Guerrero Perez",
    expectDisplayName: "G. Guerrero '29 · Bunn",
  },
]

/**
 * `NCU-GORE-27`, `NCU-ADAMSV1-27`, `NCU-ADAMSM2-27` and `NCU-APONTEV1-31` look stranded if you group
 * `spartan_donations` by the raw `athlete_code` column, but each already carries a `spartan_credit_corrections`
 * row pointing at the athlete's current code, so that money does reach the wallet. Measure strandedness with
 * `effectiveAthleteCodeForDonationLedgerRow`, never the raw column.
 */

const usd = (c: number) => `$${(c / 100).toFixed(2)}`

type DonationRow = {
  id: string
  amount_cents: number | null
  created_at: string | null
  athlete_display_name: string | null
  donor_name: string | null
  raw_metadata: unknown
}

function paymentIntentId(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null
  const v = (raw as Record<string, unknown>).stripe_payment_intent_id
  return typeof v === "string" && v.trim() ? v.trim() : null
}

async function main() {
  const apply = process.argv.includes("--apply")
  const { createAdminClient } = await import("../lib/supabase/admin")
  const { getFundraisingAthleteEntries } = await import("../lib/spartan-fundraising-code")
  const admin = createAdminClient()

  console.log(apply ? "MODE: APPLY (writing corrections)\n" : "MODE: DRY RUN (nothing will be written)\n")

  // The target code must actually be one the directory hands this athlete today, or we'd strand it again.
  const entries = await getFundraisingAthleteEntries(admin)
  for (const p of PLAN) {
    const owned = entries.filter((e) => e.id === p.athleteId).map((e) => e.code.toUpperCase())
    if (!owned.includes(p.currentCode.toUpperCase())) {
      console.error(
        `ABORT: ${p.currentCode} is not a current directory code for ${p.athleteName} (has: ${owned.join(", ") || "none"})`,
      )
      process.exit(1)
    }
  }

  const { data: existingRows, error: exErr } = await admin.from("spartan_credit_corrections").select("session_id")
  if (exErr) {
    console.error("read spartan_credit_corrections:", exErr.message)
    process.exit(1)
  }
  const already = new Set((existingRows ?? []).map((r) => String((r as { session_id?: string }).session_id ?? "").trim()))

  const pending: { session_id: string; athlete_code: string }[] = []
  let grandTotal = 0

  for (const p of PLAN) {
    const { data, error } = await admin
      .from("spartan_donations")
      .select("id, amount_cents, created_at, athlete_display_name, donor_name, raw_metadata")
      .eq("status", "paid")
      .ilike("athlete_code", p.retiredCode)

    if (error) {
      console.error(`ABORT: reading ${p.retiredCode}: ${error.message}`)
      process.exit(1)
    }

    const rows = (data ?? []) as DonationRow[]
    if (rows.length === 0) {
      console.log(`${p.retiredCode}: no paid gifts (already re-credited?) — skipping\n`)
      continue
    }

    const wrong = rows.filter((r) => (r.athlete_display_name ?? "").trim() !== p.expectDisplayName)
    if (wrong.length > 0) {
      console.error(`ABORT: ${p.retiredCode} has ${wrong.length} gift(s) whose display name is not "${p.expectDisplayName}":`)
      for (const w of wrong) console.error(`   ${w.id}  "${w.athlete_display_name}"`)
      process.exit(1)
    }

    const subtotal = rows.reduce((s, r) => s + Number(r.amount_cents ?? 0), 0)
    grandTotal += subtotal
    console.log(`${p.retiredCode} → ${p.currentCode}   ${p.athleteName}`)
    console.log(`   ${rows.length} gift(s), ${usd(subtotal)}`)

    for (const r of rows) {
      const pi = paymentIntentId(r.raw_metadata)
      // Key on both the checkout session and the payment intent — the Stripe and mirror readers each look
      // the row up by whichever id they hold.
      for (const key of [r.id, pi].filter((k): k is string => Boolean(k?.trim()))) {
        if (already.has(key)) {
          console.log(`   = ${key} already corrected — leaving as is`)
          continue
        }
        if (pending.some((x) => x.session_id === key)) continue
        pending.push({ session_id: key, athlete_code: p.currentCode })
        console.log(`   + ${key}  ${usd(Number(r.amount_cents ?? 0))}  ${r.created_at?.slice(0, 10)}  ${r.donor_name ?? ""}`)
      }
    }
    console.log("")
  }

  console.log(`${"-".repeat(60)}`)
  console.log(`gifts re-credited: ${usd(grandTotal)}   correction rows to insert: ${pending.length}`)

  if (!apply) {
    console.log("\nDry run — re-run with --apply to write these rows.")
    return
  }
  if (pending.length === 0) {
    console.log("\nNothing to write.")
    return
  }

  const { error: insErr } = await admin.from("spartan_credit_corrections").insert(pending)
  if (insErr) {
    console.error("insert failed:", insErr.message)
    process.exit(1)
  }
  console.log(`\nInserted ${pending.length} correction row(s).`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
