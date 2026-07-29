/** Check mirror rows for Alyssa's three known gifts */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { createAdminClient } from "../lib/supabase/admin"

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
  const amounts = [10000, 2500, 5000]
  for (const cents of amounts) {
    const { data } = await admin
      .from("spartan_donations")
      .select("id, amount_cents, athlete_code, athlete_display_name, donor_name, created_at, status")
      .eq("status", "paid")
      .eq("amount_cents", cents)
      .order("created_at", { ascending: false })
      .limit(5)
    console.log(`\n$${cents / 100} rows:`, data)
  }
  const { data: codeRows } = await admin
    .from("spartan_donations")
    .select("id, amount_cents, athlete_code, donor_name, created_at")
    .eq("status", "paid")
    .ilike("athlete_code", "NCU-SELF-28")
  console.log("\nAll NCU-SELF-28:", codeRows)
  let sum = 0
  for (const r of codeRows ?? []) sum += Number(r.amount_cents ?? 0)
  console.log("Code total:", sum / 100)
}

main().catch(console.error)
