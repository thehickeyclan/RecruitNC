/**
 * One-shot: merge duplicate athletes (point FKs at KEEP, delete MERGE) + pin Stripe NCU code in
 * `spartan_fundraising_athletes` so Admin fundraising directory resolves it.
 *
 * Usage:
 *   npx tsx scripts/merge-athletes-and-pin-spartan-code.ts --keep <uuid> --merge <uuid> --code NCU-ADAMSM-27
 *   npx tsx scripts/merge-athletes-and-pin-spartan-code.ts --keep ... --merge ... --code ... --execute
 *
 * Without `--execute`, prints the plan only (dry run).
 *
 * Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { createAdminClient } from "../lib/supabase/admin"
import { parseNameFromAthleteName } from "../lib/spartan-fundraising-code"

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

function parseArgs(argv: string[]) {
  let keep = ""
  let merge = ""
  let code = ""
  let execute = false
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--keep" && argv[i + 1]) {
      keep = argv[++i].trim()
      continue
    }
    if (a === "--merge" && argv[i + 1]) {
      merge = argv[++i].trim()
      continue
    }
    if (a === "--code" && argv[i + 1]) {
      code = argv[++i].trim().toUpperCase()
      continue
    }
    if (a === "--execute") {
      execute = true
      continue
    }
  }
  return { keep, merge, code, execute }
}

async function repointParentAthleteLinks(admin: ReturnType<typeof createAdminClient>, keepId: string, mergeId: string) {
  const { data: links, error } = await admin.from("parent_athlete_links").select("id, user_id").eq("athlete_id", mergeId)
  if (error) throw new Error(`parent_athlete_links select: ${error.message}`)
  for (const row of links ?? []) {
    const { data: clash } = await admin
      .from("parent_athlete_links")
      .select("id")
      .eq("user_id", row.user_id)
      .eq("athlete_id", keepId)
      .maybeSingle()
    if (clash) {
      await admin.from("parent_athlete_links").delete().eq("id", row.id)
    } else {
      const { error: u } = await admin.from("parent_athlete_links").update({ athlete_id: keepId }).eq("id", row.id)
      if (u) throw new Error(`parent_athlete_links update ${row.id}: ${u.message}`)
    }
  }
}

async function simpleAthleteFkUpdate(
  admin: ReturnType<typeof createAdminClient>,
  table: string,
  keepId: string,
  mergeId: string,
): Promise<{ ok: boolean; note?: string }> {
  const { error } = await admin.from(table).update({ athlete_id: keepId }).eq("athlete_id", mergeId)
  if (error) return { ok: false, note: error.message }
  return { ok: true }
}

async function updateUserProfilesAthlete(admin: ReturnType<typeof createAdminClient>, keepId: string, mergeId: string, keepName: string) {
  const { error } = await admin
    .from("user_profiles")
    .update({ athlete_id: keepId, athlete_name: keepName })
    .eq("athlete_id", mergeId)
  if (error) {
    const msg = error.message.toLowerCase()
    if (msg.includes("column") && msg.includes("does not exist")) {
      console.log("○ user_profiles — no athlete_id column (skipped)")
      return
    }
    throw new Error(`user_profiles: ${error.message}`)
  }
}

async function upsertSpartanFundraisingCode(
  admin: ReturnType<typeof createAdminClient>,
  code: string,
  athlete: { name: string | null; graduationyear: number | null; highschool: string | null },
) {
  const gy =
    athlete.graduationyear != null && Number.isFinite(Number(athlete.graduationyear))
      ? Number(athlete.graduationyear)
      : null
  if (!gy) throw new Error("KEEP athlete needs graduationyear set to upsert spartan_fundraising_athletes.")

  const parsed = parseNameFromAthleteName(athlete.name ?? "")
  const fn = parsed?.firstName?.trim() || "Athlete"
  const ln = parsed?.lastName?.trim() || "Unknown"
  const school = (athlete.highschool ?? "").trim().slice(0, 120)

  const row = {
    code,
    first_name: fn,
    last_name: ln,
    grad_year: gy,
    school: school || null,
    active: true,
  }

  const { error } = await admin.from("spartan_fundraising_athletes").upsert(row, { onConflict: "code" })
  if (error) throw new Error(`spartan_fundraising_athletes upsert: ${error.message}`)
}

async function main() {
  const { keep, merge, code, execute } = parseArgs(process.argv)
  if (!UUID_RE.test(keep) || !UUID_RE.test(merge)) {
    console.error("Usage: npx tsx scripts/merge-athletes-and-pin-spartan-code.ts --keep <uuid> --merge <uuid> --code NCU-...")
    console.error("Add --execute to apply.")
    process.exit(1)
  }
  if (keep === merge) {
    console.error("keep and merge must differ.")
    process.exit(1)
  }
  if (!/^NCU-[A-Z0-9]+-\d{2}$/i.test(code)) {
    console.error("--code must look like NCU-LAST-YY")
    process.exit(1)
  }

  const admin = createAdminClient()
  const { data: keepAth, error: e1 } = await admin
    .from("athletes")
    .select("id, name, graduationyear, highschool")
    .eq("id", keep)
    .single()
  const { data: mergeAth, error: e2 } = await admin
    .from("athletes")
    .select("id, name, graduationyear, highschool")
    .eq("id", merge)
    .single()
  if (e1 || !keepAth) {
    console.error("KEEP athlete not found:", e1?.message ?? keep)
    process.exit(1)
  }
  if (e2 || !mergeAth) {
    console.error("MERGE athlete not found:", e2?.message ?? merge)
    process.exit(1)
  }

  console.log("KEEP (survives): ", keep, keepAth.name, keepAth.graduationyear)
  console.log("MERGE (deleted): ", merge, mergeAth.name, mergeAth.graduationyear)
  console.log("PIN fundraising code:", code)
  console.log("")

  if (!execute) {
    console.log("Dry run — nothing changed. Re-run with --execute to apply.")
    console.log("")
    console.log("This will:")
    console.log("  1. Upsert spartan_fundraising_athletes so directory recognizes", code)
    console.log("  2. Repoint parent_athlete_links + FK tables listed in scripts/merge-duplicate-athletes.md")
    console.log("  3. DELETE merge athlete row")
    process.exit(0)
  }

  console.log("Executing…")

  await upsertSpartanFundraisingCode(admin, code, {
    name: keepAth.name as string | null,
    graduationyear: keepAth.graduationyear as number | null,
    highschool: keepAth.highschool as string | null,
  })
  console.log("✓ spartan_fundraising_athletes upserted")

  await repointParentAthleteLinks(admin, keep, merge)
  console.log("✓ parent_athlete_links")

  try {
    await updateUserProfilesAthlete(admin, keep, merge, String(keepAth.name ?? ""))
    console.log("✓ user_profiles")
  } catch (e) {
    console.log("○ user_profiles:", e instanceof Error ? e.message : e)
  }

  const fkTables = [
    "matches",
    "likes",
    "edit_requests",
    "recruiting_actions",
    "college_coach_stars",
    "athlete_confirmations",
  ] as const
  for (const t of fkTables) {
    const r = await simpleAthleteFkUpdate(admin, t, keep, merge)
    if (r.ok) console.log(`✓ ${t}`)
    else console.log(`○ ${t} skipped: ${r.note}`)
  }

  const nhsca = await simpleAthleteFkUpdate(admin, "nhsca_placements", keep, merge)
  if (nhsca.ok) console.log("✓ nhsca_placements")
  else console.log("○ nhsca_placements skipped")

  const { error: delErr } = await admin.from("athletes").delete().eq("id", merge)
  if (delErr) {
    console.error("DELETE merge athlete failed:", delErr.message)
    console.error("You may need to manually remove remaining FK refs to MERGE id, then delete the row.")
    process.exit(1)
  }
  console.log("✓ deleted MERGE athlete")
  console.log("")
  console.log("Done. Wait ~5 min or redeploy if fundraising directory cache still shows old state, then Refresh admin fundraising.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
