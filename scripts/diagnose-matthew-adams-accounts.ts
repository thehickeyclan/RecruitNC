/**
 * Matthew Adams / Mattex Adams — which RecruitNC login has wallet links + Guild?
 *
 * Usage:
 *   npx tsx scripts/diagnose-matthew-adams-accounts.ts
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { createAdminClient } from "../lib/supabase/admin"

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

const PARENT_USER_IDS = [
  { label: "iCloud login", id: "4d389e5f-ea32-4fce-a28b-fe4cf50ac89e", email: "roque.mantids.8a@icloud.com" },
  { label: "Gmail login", id: "983e6f68-a2ed-4912-93c1-9fe4dbc6e3d6", email: "matad22@gmail.com" },
] as const

async function main() {
  const admin = createAdminClient()

  console.log("\n=== Mattex Adams athlete rows ===\n")
  const { data: athletes, error: athErr } = await admin
    .from("athletes")
    .select("id, name, graduationyear, highschool, fundraising_code")
    .or("name.ilike.%Mattex%Adams%,name.ilike.%Matthew%Adams%")
    .order("name")
  if (athErr) {
    console.error("athletes:", athErr.message)
  } else if (!athletes?.length) {
    console.log("(no athletes matching Mattex/Matthew Adams — try manual name search in SQL)")
  } else {
    for (const a of athletes) {
      console.log(JSON.stringify(a, null, 2))
    }
  }

  for (const parent of PARENT_USER_IDS) {
    console.log(`\n=== ${parent.label} (${parent.email}) ===`)
    console.log(`user_id: ${parent.id}\n`)

    const { data: prof } = await admin
      .from("user_profiles")
      .select("user_id, email, full_name, guild_parent_user_id, athlete_id")
      .eq("user_id", parent.id)
      .maybeSingle()
    console.log("user_profiles:", prof ?? "(no row)")

    const { data: links, error: linkErr } = await admin
      .from("parent_athlete_links")
      .select("id, user_id, athlete_id, created_at")
      .eq("user_id", parent.id)
    if (linkErr) {
      console.log("parent_athlete_links error:", linkErr.message)
    } else {
      console.log("parent_athlete_links:", links?.length ? links : "(none)")
      if (links?.length) {
        const ids = links.map((l) => l.athlete_id).filter(Boolean)
        if (ids.length) {
          const { data: linkedAthletes } = await admin
            .from("athletes")
            .select("id, name, graduationyear, highschool")
            .in("id", ids)
          console.log("linked athletes:", linkedAthletes)
        }
      }
    }

    const { data: blue } = await admin
      .from("blue_memberships")
      .select("id, athlete_id, status, payer_user_id")
      .eq("payer_user_id", parent.id)
    console.log("blue_memberships (payer):", blue?.length ? blue : "(none)")
  }

  console.log("\nDone.\n")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
