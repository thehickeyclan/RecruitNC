/**
 * Broad Supabase scan for Alyssa Self fundraising attribution.
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { createAdminClient } from "../lib/supabase/admin"
import { getFundraisingAthleteEntries } from "../lib/spartan-fundraising-code"

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

const ALYSSA_ID = "6832e4ff-8315-438c-83e6-e3a62f268666"

async function main() {
  const admin = createAdminClient()
  const { data: athlete, error: athleteErr } = await admin
    .from("athletes")
    .select("id, name, graduationyear, highschool")
    .eq("id", ALYSSA_ID)
    .maybeSingle()
  console.log("athlete:", athlete, athleteErr?.message ?? "")

  const entries = await getFundraisingAthleteEntries(admin)
  const derived = entries.filter((e) => e.id === ALYSSA_ID)
  console.log("\nderived roster entries for Alyssa id:", derived)

  const { data: allPaid } = await admin
    .from("spartan_donations")
    .select("amount_cents, athlete_code, fundraising_athlete_slug, spartan_campaign, created_at, raw_metadata")
    .eq("status", "paid")
    .order("created_at", { ascending: false })
    .limit(5000)

  const selfRows = (allPaid ?? []).filter((r) => {
    const code = String((r as { athlete_code?: string }).athlete_code ?? "").toUpperCase()
    const slug = String((r as { fundraising_athlete_slug?: string }).fundraising_athlete_slug ?? "").toLowerCase()
    const meta = JSON.stringify((r as { raw_metadata?: unknown }).raw_metadata ?? "").toLowerCase()
    return code.includes("SELF") || slug.includes("self") || meta.includes("self") || meta.includes("alyssa")
  })
  console.log("\nPaid mirror rows matching SELF/alyssa in code, slug, or metadata:", selfRows.length)
  let total = 0
  for (const r of selfRows) {
    const c = Number((r as { amount_cents?: number }).amount_cents ?? 0)
    total += c
    const row = r as {
      athlete_code?: string | null
      fundraising_athlete_slug?: string | null
      spartan_campaign?: string | null
      created_at?: string | null
      raw_metadata?: Record<string, unknown> | null
    }
    const meta = row.raw_metadata ?? {}
    const metaCode = String(meta.athlete_code ?? meta.fundraising_code ?? meta.athleteCode ?? "")
    const metaSlug = String(meta.fundraising_athlete_slug ?? meta.fundraisingAthleteSlug ?? "")
    console.log(" ", {
      athlete_code: row.athlete_code,
      slug: row.fundraising_athlete_slug,
      campaign: row.spartan_campaign,
      dollars: c / 100,
      created_at: row.created_at,
      metaCode: metaCode || null,
      metaSlug: metaSlug || null,
    })
  }
  console.log("Mirror scan total:", total / 100)

  const { data: reimb } = await admin
    .from("athlete_expense_requests")
    .select("amount_cents, amount_approved_cents, status")
    .eq("athlete_id", ALYSSA_ID)
  console.log("\nexpense requests:", reimb)
}

main().catch(console.error)
