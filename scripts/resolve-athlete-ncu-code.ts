/**
 * Show the canonical Spartan NCU code for a RecruitNC athlete (same rules as /spartan checkout & Admin).
 *
 * Codes are **derived** from `athletes.name` + `athletes.graduationyear` (and collisions), not hand-entered.
 * If the athlete is missing a grad year, no code is generated until you set it (or add a manual
 * `spartan_fundraising_athletes` row for roster-only use).
 *
 *   npx tsx scripts/resolve-athlete-ncu-code.ts <uuid>
 *   npx tsx scripts/resolve-athlete-ncu-code.ts "Addison Gore"
 *   npx tsx scripts/resolve-athlete-ncu-code.ts Gore
 *
 * Requires: .env or .env.local with NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function main() {
  const q = (process.argv[2] ?? "").trim()
  if (!q) {
    console.error("Usage: npx tsx scripts/resolve-athlete-ncu-code.ts <athlete-uuid | partial name>")
    process.exit(1)
  }

  const admin = createAdminClient()
  const entries = await getFundraisingAthleteEntries(admin)

  const { data: rows, error } = await admin
    .from("athletes")
    .select("id, name, graduationyear, highschool")
    .order("name", { ascending: true })

  if (error) {
    console.error("[athletes]", error.message)
    process.exit(1)
  }

  let candidates = rows ?? []
  if (UUID_RE.test(q)) {
    candidates = candidates.filter((r) => r.id === q)
  } else {
    const ql = q.toLowerCase()
    candidates = candidates.filter((r) => (r.name ?? "").toLowerCase().includes(ql))
  }

  if (candidates.length === 0) {
    console.log("No athletes found. Check spelling or pass the exact athlete UUID from admin / view-profile ?id=…")
    process.exit(0)
  }

  const byId = new Map(entries.filter((e) => !e.id.startsWith("spartan-fundraising:")).map((e) => [e.id, e]))

  for (const a of candidates) {
    const e = byId.get(a.id)
    const gy = a.graduationyear
    console.log("---")
    console.log("Athlete id:  ", a.id)
    console.log("Name:        ", a.name ?? "—")
    console.log("Grad year:   ", gy != null ? gy : "(missing — set on athlete or no NCU code from roster)")
    console.log("High school: ", a.highschool ?? "—")
    if (e) {
      console.log("NCU code:    ", e.code)
      console.log("Label:       ", e.label)
    } else {
      if (gy == null) {
        console.log(
          "NCU code:    (none — add graduation year on the athlete, or insert an active row in `spartan_fundraising_athletes` for roster-only codes)"
        )
      } else {
        console.log("NCU code:    (unexpected: no entry; check name/grad for parsing issues)")
      }
    }
    console.log("")
  }

  if (candidates.length > 0) {
    console.log("— Next steps —")
    console.log("• Re-align Stripe payments: Admin → Fundraising, or POST /api/admin/spartan-credit-corrections")
    console.log("  { \"session_id\": \"cs_… or pi_…\", \"athlete_code\": \"NCU-…-YY\" }")
    const first = byId.get(candidates[0].id)
    if (first) {
      console.log(`• List recent payments for this code: npm run spartan:list-by-code -- ${first.code} 120`)
    }
    console.log("• Link parent: insert into public.parent_athlete_links (user_id, athlete_id) values (")
    console.log("    '<parent user_profiles.user_id (auth)>',", `'${candidates[0].id}'`, ");")
    console.log("  (use Supabase; avoid duplicate (user_id, athlete_id) if you have a unique constraint)")
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
