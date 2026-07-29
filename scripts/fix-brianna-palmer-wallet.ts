/**
 * Connect Brianna Palmer (NCU-PALMER-29) for wallet — both parent logins.
 *
 *   npx tsx scripts/fix-brianna-palmer-wallet.ts
 *   npx tsx scripts/fix-brianna-palmer-wallet.ts --dry-run
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

const PARENT_EMAILS = ["coachpalmer2@gmail.com", "brianna.lillie@gmail.com"]
const TARGET_CODE = "NCU-PALMER-29"
const TARGET_SLUG = "ncu-palmer-29"
const GRAD_YEAR = 2029
const ATHLETE_NAME = "Brianna Palmer"
const PRIMARY_PROFILE_EMAIL = "coachpalmer2@gmail.com"

async function findAuthUser(admin: ReturnType<typeof createAdminClient>, email: string) {
  let page = 1
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(`auth listUsers: ${error.message}`)
    const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (user) return user
    if (data.users.length < 1000) break
    page++
  }
  return null
}

async function resolveAthlete(admin: ReturnType<typeof createAdminClient>) {
  const { data: roster } = await admin
    .from("spartan_fundraising_athletes")
    .select("athlete_id, first_name, last_name, grad_year")
    .ilike("code", TARGET_CODE)
    .maybeSingle()

  const pinnedId = (roster as { athlete_id?: string | null } | null)?.athlete_id
  if (pinnedId) {
    const { data: athlete } = await admin
      .from("athletes")
      .select("id, name, graduationyear, highschool, claimed_by_user_id, contactEmail")
      .eq("id", pinnedId)
      .maybeSingle()
    if (athlete) return athlete
  }

  const { data: byName } = await admin
    .from("athletes")
    .select("id, name, graduationyear, highschool, claimed_by_user_id, contactEmail")
    .ilike("name", "%palmer%")
    .eq("graduationyear", GRAD_YEAR)
    .order("name")

  const brianna = byName?.find((a) => (a.name ?? "").toLowerCase().includes("brianna"))
  if (brianna) return brianna
  if (byName?.length === 1) return byName[0]

  const { data: fp } = await admin
    .from("athlete_fundraising_profiles")
    .select("athlete_id")
    .or(`primary_fundraising_code.ilike.${TARGET_CODE},slug.ilike.${TARGET_SLUG}`)
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

async function ensureProfile(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  email: string,
  athleteId: string,
  isPrimary: boolean,
) {
  const { data: profBefore } = await admin
    .from("user_profiles")
    .select("user_id, athlete_id, email, full_name, profile_type")
    .eq("user_id", userId)
    .maybeSingle()

  const payload = {
    athlete_id: isPrimary ? athleteId : profBefore?.athlete_id ?? null,
    email,
    profile_type: isPrimary ? ("parent" as const) : ((profBefore as { profile_type?: string } | null)?.profile_type ?? "parent"),
    role: "user" as const,
    is_admin: false,
  }

  if (profBefore) {
    const update: Record<string, unknown> = { email }
    if (isPrimary) update.athlete_id = athleteId
    const { error } = await admin.from("user_profiles").update(update).eq("user_id", userId)
    if (error) throw new Error(`user_profiles update ${email}: ${error.message}`)
  } else {
    const { error } = await admin.from("user_profiles").insert({
      user_id: userId,
      ...payload,
      full_name: email.split("@")[0],
    })
    if (error) throw new Error(`user_profiles insert ${email}: ${error.message}`)
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run")
  const admin = createAdminClient()

  const users: { email: string; id: string }[] = []
  for (const email of PARENT_EMAILS) {
    const user = await findAuthUser(admin, email)
    if (!user) {
      console.error(`Auth user not found: ${email}`)
      process.exit(1)
    }
    console.log("User:", user.id, user.email)
    users.push({ email: user.email ?? email, id: user.id })
  }

  let athlete = await resolveAthlete(admin)
  if (!athlete) {
    console.log("No athlete found — would create", ATHLETE_NAME, GRAD_YEAR)
    if (dryRun) return
    const { data, error } = await admin
      .from("athletes")
      .insert({
        name: ATHLETE_NAME,
        graduationyear: GRAD_YEAR,
        highschool: "Cardinal Gibbons",
        contactEmail: "brianna.lillie@gmail.com",
        recruiting_status: "Uncommitted",
        is_prospect: true,
      })
      .select("id, name, graduationyear, highschool, claimed_by_user_id, contactEmail")
      .single()
    if (error) throw new Error(`athletes insert: ${error.message}`)
    athlete = data
  }

  console.log("Athlete:", athlete)

  const parsed = parseNameFromAthleteName(typeof athlete!.name === "string" ? athlete!.name : ATHLETE_NAME)
  const fn = (parsed?.firstName ?? "Brianna").trim()
  const ln = (parsed?.lastName ?? "Palmer").trim()
  const school = (typeof athlete!.highschool === "string" ? athlete!.highschool : "Cardinal Gibbons").trim().slice(0, 120)

  const { data: linkBefore } = await admin.from("parent_athlete_links").select("*").eq("athlete_id", athlete!.id)
  console.log("Existing parent links:", linkBefore)

  const { data: fpBefore } = await admin
    .from("athlete_fundraising_profiles")
    .select("*")
    .eq("athlete_id", athlete!.id)
  console.log("Fundraising profile:", fpBefore?.length ? fpBefore : "(none)")

  if (dryRun) {
    console.log("\n[DRY RUN] Would pin code, link both users, fundraising profile")
    return
  }

  const now = new Date().toISOString()

  const { error: spartanErr } = await admin.from("spartan_fundraising_athletes").upsert(
    {
      code: TARGET_CODE,
      first_name: fn,
      last_name: ln,
      grad_year: GRAD_YEAR,
      school: school || null,
      active: true,
      athlete_id: athlete!.id,
    },
    { onConflict: "code" },
  )
  if (spartanErr) throw new Error(`spartan_fundraising_athletes: ${spartanErr.message}`)
  invalidateFundraisingAthleteEntriesCache()
  console.log("Pinned", TARGET_CODE)

  for (const u of users) {
    const linkResult = await ensureParentAthleteLinkAdmin(admin, {
      parentUserId: u.id,
      athleteId: athlete!.id,
    })
    if (!linkResult.ok) throw new Error(`parent link ${u.email}: ${linkResult.error}`)
    console.log("Linked:", u.email)

    await ensureProfile(admin, u.id, u.email, athlete!.id, u.email.toLowerCase() === PRIMARY_PROFILE_EMAIL)
  }

  const primaryUser = users.find((u) => u.email.toLowerCase() === PRIMARY_PROFILE_EMAIL)!
  await admin
    .from("athletes")
    .update({
      claimed_by_user_id: primaryUser.id,
      claimed_at: now,
      updated_at: now,
    })
    .eq("id", athlete!.id)

  const { data: existingFp } = await admin
    .from("athlete_fundraising_profiles")
    .select("id")
    .eq("athlete_id", athlete!.id)
    .maybeSingle()

  if (existingFp) {
    await admin
      .from("athlete_fundraising_profiles")
      .update({
        primary_fundraising_code: TARGET_CODE,
        is_active: true,
        checkout_live: true,
        updated_at: now,
      })
      .eq("id", (existingFp as { id: string }).id)
  } else {
    await admin.from("athlete_fundraising_profiles").insert({
      athlete_id: athlete!.id,
      slug: TARGET_SLUG,
      primary_fundraising_code: TARGET_CODE,
      is_active: true,
      checkout_live: true,
      updated_at: now,
    })
  }
  console.log("Fundraising profile OK")

  const { data: linksAfter } = await admin
    .from("parent_athlete_links")
    .select("user_id, athlete_id, user_profiles(email, full_name)")
    .eq("athlete_id", athlete!.id)

  console.log("\n=== Done ===")
  console.log("Athlete:", athlete!.id, athlete!.name)
  console.log("Links:", linksAfter)
  console.log("\nSign in as coachpalmer2@gmail.com or brianna.lillie@gmail.com → Profile → Fundraise")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
