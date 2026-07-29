/**
 * Diagnose self.john@gmail.com + NCU-SELF-28 wallet wiring.
 *
 *   npx tsx scripts/diagnose-john-self-wallet.ts
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
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val.replace(/\r$/, "").trim()
  }
}

loadEnvFile(".env.local")
loadEnvFile(".env")

const LOGIN_EMAIL = "self.john@gmail.com"
const TARGET_CODE = "NCU-SELF-28"

async function main() {
  const admin = createAdminClient()

  const { data: authList } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const user = authList?.users?.find((u) => u.email?.toLowerCase() === LOGIN_EMAIL.toLowerCase())
  console.log("Auth user:", user ? { id: user.id, email: user.email, created: user.created_at } : "(not found)")

  if (user) {
    const { data: prof } = await admin
      .from("user_profiles")
      .select("user_id, email, full_name, profile_type, athlete_id, guild_parent_user_id, is_admin")
      .eq("user_id", user.id)
      .maybeSingle()
    console.log("user_profiles:", prof ?? "(no row)")

    const { data: links } = await admin.from("parent_athlete_links").select("*").eq("user_id", user.id)
    console.log("parent_athlete_links:", links?.length ? links : "(none)")

  }

  const { data: roster } = await admin
    .from("spartan_fundraising_athletes")
    .select("*")
    .or(`code.ilike.${TARGET_CODE},code.ilike.%SELF%`)
  console.log("\nspartan_fundraising_athletes (SELF):", roster)

  const { data: dons } = await admin
    .from("spartan_donations")
    .select("id, athlete_code, amount_cents, status, donor_email, created_at, raw_metadata")
    .ilike("athlete_code", TARGET_CODE)
  console.log("\nspartan_donations:", dons)

  const { data: fps } = await admin
    .from("athlete_fundraising_profiles")
    .select("*")
    .or(`primary_fundraising_code.ilike.${TARGET_CODE},slug.ilike.ncu-self-28`)
  console.log("\nathlete_fundraising_profiles:", fps)

  const { data: athletes } = await admin
    .from("athletes")
    .select("id, name, graduationyear, highschool, claimed_by_user_id, email")
    .or("name.ilike.%self%,email.ilike.%self.john%")
    .order("name")
  console.log("\nathletes matching Self / email:", athletes)

  const entries = await getFundraisingAthleteEntries(admin)
  const codeEntry = entries.find((e) => e.code?.toUpperCase() === TARGET_CODE)
  console.log("\nDerived roster entry for NCU-SELF-28:", codeEntry ?? "(none)")

  if (codeEntry?.athleteId) {
    const { data: pinned } = await admin.from("athletes").select("*").eq("id", codeEntry.athleteId).maybeSingle()
    console.log("Pinned athlete:", pinned)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
