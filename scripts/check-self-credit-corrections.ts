import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { createAdminClient } from "../lib/supabase/admin"
import {
  applySpartanCreditCorrectionsToDonations,
  fetchSpartanCreditCorrectionsIndex,
} from "../lib/spartan-credit-corrections"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
for (const rel of [".env.local", ".env"]) {
  const p = path.join(root, rel)
  if (!fs.existsSync(p)) continue
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const eq = t.indexOf("=")
    if (eq <= 0) continue
    const k = t.slice(0, eq).trim()
    let v = t.slice(eq + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    if (!process.env[k]) process.env[k] = v.replace(/\r$/, "").trim()
  }
}

async function main() {
  const admin = createAdminClient()
  const { data: corrections } = await admin
    .from("spartan_credit_corrections")
    .select("session_id, athlete_code, general_fund, notes, created_at")
    .ilike("athlete_code", "%SELF%")
  console.log("credit corrections for SELF:", corrections)

  const idx = await fetchSpartanCreditCorrectionsIndex(admin)
  const targets = ["Kristin Davis", "Melanie Mintzer", "Anonymous", "May 14", "May 2"]
  const { data: orphans } = await admin
    .from("spartan_donations")
    .select("id, amount_cents, athlete_code, donor_name, created_at, raw_metadata")
    .eq("status", "paid")
    .in("amount_cents", [10000, 2500, 5000])
    .order("created_at", { ascending: true })

  console.log("\nEffective codes for likely Self gifts:")
  for (const r of orphans ?? []) {
    const donor = String((r as { donor_name?: string }).donor_name ?? "")
    const created = String((r as { created_at?: string }).created_at ?? "")
    if (!/mintzer|davis|anonymous|2026-05-02|2026-05-14/i.test(`${donor} ${created}`)) continue
    const sid = String((r as { id?: string }).id ?? "")
    const corrected = idx.athleteBySessionOrPi.get(sid)
    console.log({
      id: sid.slice(0, 20) + "...",
      amount: Number((r as { amount_cents?: number }).amount_cents) / 100,
      mirrorCode: (r as { athlete_code?: string | null }).athlete_code,
      correctedCode: corrected ?? null,
      donor,
      created_at: created,
    })
  }
}

main().catch(console.error)
