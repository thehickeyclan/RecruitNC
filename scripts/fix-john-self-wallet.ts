/**
 * Connect self.john@gmail.com → John Self (NCU-SELF-28) for wallet + expense submissions.
 *
 *   npx tsx scripts/fix-john-self-wallet.ts
 *   npx tsx scripts/fix-john-self-wallet.ts --dry-run
 *
 * Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { createAdminClient } from "../lib/supabase/admin"
import { ensureParentAthleteLinkAdmin } from "../lib/fundraising/ensure-parent-athlete-link-admin"
import {
  invalidateFundraisingAthleteEntriesCache,
  parseNameFromAthleteName,
} from "../lib/spartan-fundraising-code"

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
const TARGET_SLUG = "ncu-self-28"
const GRAD_YEAR = 2028
const ATHLETE_NAME = "John Self"

async function findAuthUser(admin: ReturnType<typeof createAdminClient>) {
  let page = 1
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(`auth listUsers: ${error.message}`)
    const user = data.users.find((u) => u.email?.toLowerCase() === LOGIN_EMAIL.toLowerCase())
    if (user) return user
    if (data.users.length < 1000) break
    page++
  }
  return null
}

async function resolveAthlete(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const { data: byEmail } = await admin
    .from("athletes")
    .select("id, name, graduationyear, highschool, claimed_by_user_id, contactEmail")
    .or(`contactEmail.ilike.${LOGIN_EMAIL},email.ilike.${LOGIN_EMAIL}`)
    .limit(5)

  if (byEmail?.length === 1) return byEmail[0]
  if (byEmail && byEmail.length > 1) {
    console.warn("Multiple athletes with this email — using first:", byEmail[0]?.id)
    return byEmail[0]
  }

  const { data: byName } = await admin
    .from("athletes")
    .select("id, name, graduationyear, highschool, claimed_by_user_id, contactEmail")
    .ilike("name", "%self%")
    .eq("graduationyear", GRAD_YEAR)
    .order("name")

  console.log("Self '28 athletes:", byName?.map((a) => ({ id: a.id, name: a.name })))

  // Prefer athlete already linked to this login
  const { data: existingLinks } = await admin
    .from("parent_athlete_links")
    .select("athlete_id")
    .eq("user_id", userId)

  const linkedIds = new Set((existingLinks ?? []).map((r) => r.athlete_id))
  const linkedMatch = byName?.find((a) => linkedIds.has(a.id))
  if (linkedMatch) return linkedMatch

  if (byName?.length === 1) return byName[0]
  if (byName && byName.length > 1) {
    const exact = byName.find((a) => (a.name ?? "").toLowerCase().includes("john"))
    if (exact) return exact
    console.warn("Multiple Self '28 athletes — using first:", byName[0]?.id)
    return byName[0]
  }

  const { data: pinned } = await admin
    .from("spartan_fundraising_athletes")
    .select("athlete_id")
    .ilike("code", TARGET_CODE)
    .maybeSingle()

  const pinnedId = (pinned as { athlete_id?: string | null } | null)?.athlete_id
  if (pinnedId) {
    const { data: athlete } = await admin
      .from("athletes")
      .select("id, name, graduationyear, highschool, claimed_by_user_id, contactEmail")
      .eq("id", pinnedId)
      .maybeSingle()
    if (athlete) return athlete
  }

  const { data: fp } = await admin
    .from("athlete_fundraising_profiles")
    .select("athlete_id")
    .or(`primary_fundraising_code.ilike.${TARGET_CODE},slug.ilike.${TARGET_SLUG}`)
    .limit(1)
    .maybeSingle()

  if (fp?.athlete_id) {
    const { data: athlete } = await admin
      .from("athletes")
      .select("id, name, graduationyear, highschool, claimed_by_user_id, contactEmail")
      .eq("id", fp.athlete_id)
      .maybeSingle()
    if (athlete) return athlete
  }

  return null
}

async function createAthlete(admin: ReturnType<typeof createAdminClient>) {
  const payload: Record<string, unknown> = {
    name: ATHLETE_NAME,
    graduationyear: GRAD_YEAR,
    contactEmail: LOGIN_EMAIL,
    recruiting_status: "Uncommitted",
    is_prospect: true,
  }
  const { data, error } = await admin.from("athletes").insert(payload).select("id, name, graduationyear, highschool, claimed_by_user_id, contactEmail").single()
  if (error) throw new Error(`athletes insert: ${error.message}`)
  return data
}

async function main() {
  const dryRun = process.argv.includes("--dry-run")
  const admin = createAdminClient()

  const user = await findAuthUser(admin)
  if (!user) {
    console.error(`Auth user not found for ${LOGIN_EMAIL}. They must sign up / create a RecruitNC account first.`)
    process.exit(1)
  }
  console.log("User:", user.id, user.email)

  let athlete = await resolveAthlete(admin, user.id)
  if (!athlete) {
    console.log("No athlete found — will create:", ATHLETE_NAME, GRAD_YEAR)
    if (!dryRun) athlete = await createAthlete(admin)
  } else {
    console.log("Athlete:", athlete)
    if (!dryRun && athlete.graduationyear !== GRAD_YEAR) {
      const { error } = await admin.from("athletes").update({ graduationyear: GRAD_YEAR }).eq("id", athlete.id)
      if (error) console.warn("Could not set graduationyear:", error.message)
      else athlete = { ...athlete, graduationyear: GRAD_YEAR }
    }
  }

  if (!athlete) {
    console.log("\n[DRY RUN] Would create athlete, pin code, link user, fundraising profile")
    return
  }

  const parsed = parseNameFromAthleteName(typeof athlete.name === "string" ? athlete.name : ATHLETE_NAME)
  const fn = (parsed?.firstName ?? "John").trim()
  const ln = (parsed?.lastName ?? "Self").trim()
  const school = (typeof athlete.highschool === "string" ? athlete.highschool : "").trim().slice(0, 120)

  const spartanRow = {
    code: TARGET_CODE,
    first_name: fn,
    last_name: ln,
    grad_year: GRAD_YEAR,
    school: school || null,
    active: true,
    athlete_id: athlete.id,
  }

  const { data: profBefore } = await admin
    .from("user_profiles")
    .select("user_id, role, profile_type, athlete_id, email, full_name, guild_parent_user_id")
    .eq("user_id", user.id)
    .maybeSingle()
  console.log("Profile before:", profBefore ?? "(no row)")

  const { data: linkBefore } = await admin
    .from("parent_athlete_links")
    .select("*")
    .eq("user_id", user.id)
    .eq("athlete_id", athlete.id)
  console.log("Parent link before:", linkBefore?.length ? linkBefore : "(none)")

  const { data: fpBefore } = await admin
    .from("athlete_fundraising_profiles")
    .select("*")
    .eq("athlete_id", athlete.id)
  console.log("Fundraising profile before:", fpBefore?.length ? fpBefore : "(none)")

  if (dryRun) {
    console.log("\n[DRY RUN] Would apply spartan pin + parent link + profile + fundraising profile")
    return
  }

  const now = new Date().toISOString()

  const { error: spartanErr } = await admin.from("spartan_fundraising_athletes").upsert(spartanRow, { onConflict: "code" })
  if (spartanErr) {
    console.error("spartan_fundraising_athletes:", spartanErr.message)
    process.exit(1)
  }
  invalidateFundraisingAthleteEntriesCache()
  console.log("spartan_fundraising_athletes: pinned", TARGET_CODE, "→", athlete.id)

  const linkResult = await ensureParentAthleteLinkAdmin(admin, {
    parentUserId: user.id,
    athleteId: athlete.id,
  })
  if (!linkResult.ok) {
    console.error("parent_athlete_links:", linkResult.error)
    process.exit(1)
  }
  console.log("parent_athlete_links: OK")

  const { error: claimErr } = await admin
    .from("athletes")
    .update({
      claimed_by_user_id: user.id,
      claimed_at: now,
      contactEmail: LOGIN_EMAIL,
      updated_at: now,
    })
    .eq("id", athlete.id)
  if (claimErr) console.warn("athletes claim update:", claimErr.message)
  else console.log("athletes: claimed_by_user_id set")

  const profilePayload = {
    athlete_id: athlete.id,
    email: user.email ?? LOGIN_EMAIL,
    full_name: (user.user_metadata?.full_name as string | undefined)?.trim() || ATHLETE_NAME,
    profile_type: "athlete" as const,
    role: "user" as const,
    is_admin: false,
  }

  if (profBefore) {
    const { error: profErr } = await admin
      .from("user_profiles")
      .update({ athlete_id: athlete.id, email: user.email ?? LOGIN_EMAIL })
      .eq("user_id", user.id)
    if (profErr) {
      console.error("user_profiles update:", profErr.message)
      process.exit(1)
    }
    console.log("user_profiles: athlete_id linked")
  } else {
    const { error: profInsErr } = await admin.from("user_profiles").insert({
      user_id: user.id,
      ...profilePayload,
    })
    if (profInsErr) {
      console.error("user_profiles insert:", profInsErr.message)
      process.exit(1)
    }
    console.log("user_profiles: created with athlete_id")
  }

  const { data: existingFp } = await admin
    .from("athlete_fundraising_profiles")
    .select("id, slug, primary_fundraising_code, is_active, checkout_live")
    .eq("athlete_id", athlete.id)
    .maybeSingle()

  if (existingFp) {
    const { error: fpUpdErr } = await admin
      .from("athlete_fundraising_profiles")
      .update({
        primary_fundraising_code: TARGET_CODE,
        is_active: true,
        checkout_live: true,
        updated_at: now,
      })
      .eq("id", (existingFp as { id: string }).id)
    if (fpUpdErr) {
      console.error("athlete_fundraising_profiles update:", fpUpdErr.message)
      process.exit(1)
    }
    console.log("athlete_fundraising_profiles: updated")
  } else {
    const { error: fpInsErr } = await admin.from("athlete_fundraising_profiles").insert({
      athlete_id: athlete.id,
      slug: TARGET_SLUG,
      primary_fundraising_code: TARGET_CODE,
      is_active: true,
      checkout_live: true,
      updated_at: now,
    })
    if (fpInsErr) {
      console.error("athlete_fundraising_profiles insert:", fpInsErr.message)
      process.exit(1)
    }
    console.log("athlete_fundraising_profiles: created")
  }

  const { data: profAfter } = await admin
    .from("user_profiles")
    .select("user_id, athlete_id, email, guild_parent_user_id")
    .eq("user_id", user.id)
    .maybeSingle()
  const { data: linkAfter } = await admin
    .from("parent_athlete_links")
    .select("*")
    .eq("user_id", user.id)
    .eq("athlete_id", athlete.id)
  const { data: spartanAfter } = await admin
    .from("spartan_fundraising_athletes")
    .select("code, athlete_id, active")
    .ilike("code", TARGET_CODE)
    .maybeSingle()

  console.log("\n=== After ===")
  console.log("Profile:", profAfter)
  console.log("Parent link:", linkAfter)
  console.log("Spartan row:", spartanAfter)

  const { data: dons } = await admin
    .from("spartan_donations")
    .select("amount_cents, status")
    .ilike("athlete_code", TARGET_CODE)
    .eq("status", "paid")
  const paidCents = (dons ?? []).reduce((s, d) => s + Number((d as { amount_cents?: number }).amount_cents ?? 0), 0)
  console.log(`Paid donations for ${TARGET_CODE}: ${dons?.length ?? 0} rows, $${(paidCents / 100).toFixed(2)} gross`)
  console.log("\nDone — sign in as self.john@gmail.com → Profile → Fundraise to manage wallet and submit expenses.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
