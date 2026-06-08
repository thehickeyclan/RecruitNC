/**
 * Backend fix: Tobin McNair (parent + wrestler) — link profile, claim athlete, fundraising profile + NCU code.
 *
 * Usage:
 *   npx tsx scripts/fix-tobin-mcnair-wallet.ts
 *   npx tsx scripts/fix-tobin-mcnair-wallet.ts --dry-run
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { createAdminClient } from "../lib/supabase/admin"
import { ensureParentAthleteLinkAdmin } from "../lib/fundraising/ensure-parent-athlete-link-admin"
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

const LOGIN_EMAIL = "tobinmcnair2008@gmail.com"
const FALLBACK_ATHLETE_ID = "63ea613d-0886-4af0-b64b-1c3d80fe0332"
const FALLBACK_USER_ID = "0f704b20-79f2-472c-abc0-e7debdc6ea8e"
const FALLBACK_CODE = "NCU-MCNAIR-27"
const FALLBACK_SLUG = "ncu-mcnair-27"

async function main() {
  const dryRun = process.argv.includes("--dry-run")
  const admin = createAdminClient()

  const { data: authList } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const user = authList?.users?.find((u) => u.email?.toLowerCase() === LOGIN_EMAIL.toLowerCase())
  const userId = user?.id ?? FALLBACK_USER_ID
  if (!user) {
    console.warn(`Auth user not found by email; using fallback user_id ${userId}`)
  } else {
    console.log("User:", user.id, user.email)
  }

  const { data: athlete, error: athleteErr } = await admin
    .from("athletes")
    .select("id, name, graduationyear, claimed_by_user_id")
    .eq("id", FALLBACK_ATHLETE_ID)
    .maybeSingle()

  if (athleteErr || !athlete) {
    console.error("Athlete not found:", athleteErr?.message ?? FALLBACK_ATHLETE_ID)
    process.exit(1)
  }

  console.log("Athlete:", athlete)

  const entries = await getFundraisingAthleteEntries(admin)
  const rosterEntry = entries.find((e) => e.athleteId === athlete.id || e.code?.toUpperCase() === FALLBACK_CODE)
  const ncuCode = rosterEntry?.code?.toUpperCase() ?? FALLBACK_CODE
  const slug = FALLBACK_SLUG

  console.log("Resolved NCU code:", ncuCode, "slug:", slug)

  const { data: profBefore } = await admin
    .from("user_profiles")
    .select("user_id, role, profile_type, athlete_id, email, full_name")
    .eq("user_id", userId)
    .maybeSingle()
  console.log("Profile before:", profBefore ?? "(no row)")

  const { data: fpBefore } = await admin
    .from("athlete_fundraising_profiles")
    .select("*")
    .eq("athlete_id", athlete.id)
  console.log("Fundraising profile before:", fpBefore?.length ? fpBefore : "(none)")

  if (dryRun) {
    console.log("\n[DRY RUN] Would apply: claim + profile athlete_id + parent link + fundraising profile")
    return
  }

  const now = new Date().toISOString()

  const linkResult = await ensureParentAthleteLinkAdmin(admin, {
    parentUserId: userId,
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
      claimed_by_user_id: userId,
      claimed_at: now,
      updated_at: now,
    })
    .eq("id", athlete.id)
  if (claimErr) {
    console.error("athletes claim update:", claimErr.message)
    process.exit(1)
  }
  console.log("athletes: claimed_by_user_id set")

  const profilePayload = {
    athlete_id: athlete.id,
    email: user?.email ?? LOGIN_EMAIL,
    full_name: (user?.user_metadata?.full_name as string | undefined)?.trim() || athlete.name,
    profile_type: "parent" as const,
    role: "user" as const,
    is_admin: false,
  }

  if (profBefore) {
    const { error: profErr } = await admin.from("user_profiles").update({ athlete_id: athlete.id }).eq("user_id", userId)
    if (profErr) {
      console.error("user_profiles update:", profErr.message)
      process.exit(1)
    }
    console.log("user_profiles: athlete_id linked")
  } else {
    const { error: profInsErr } = await admin.from("user_profiles").insert({
      user_id: userId,
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
        primary_fundraising_code: ncuCode,
        is_active: true,
        checkout_live: true,
        updated_at: now,
      })
      .eq("id", (existingFp as { id: string }).id)
    if (fpUpdErr) {
      console.error("athlete_fundraising_profiles update:", fpUpdErr.message)
      process.exit(1)
    }
    console.log("athlete_fundraising_profiles: updated existing row")
  } else {
    const { error: fpInsErr } = await admin.from("athlete_fundraising_profiles").insert({
      athlete_id: athlete.id,
      slug,
      primary_fundraising_code: ncuCode,
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
    .select("user_id, role, profile_type, athlete_id, email, full_name")
    .eq("user_id", userId)
    .maybeSingle()
  const { data: athleteAfter } = await admin
    .from("athletes")
    .select("id, name, claimed_by_user_id")
    .eq("id", athlete.id)
    .single()
  const { data: fpAfter } = await admin.from("athlete_fundraising_profiles").select("*").eq("athlete_id", athlete.id)
  const { data: linkAfter } = await admin
    .from("parent_athlete_links")
    .select("*")
    .eq("user_id", userId)
    .eq("athlete_id", athlete.id)

  console.log("\n=== After ===")
  console.log("Profile:", profAfter)
  console.log("Athlete:", athleteAfter)
  console.log("Fundraising profile:", fpAfter)
  console.log("Parent link:", linkAfter)

  const { data: dons } = await admin
    .from("spartan_donations")
    .select("amount_cents, status")
    .or(`raw_metadata->>athlete_code.ilike.${ncuCode},raw_metadata->>fundraising_code.ilike.${ncuCode}`)
    .eq("status", "paid")

  const paidCents = (dons ?? []).reduce((s, d) => s + Number((d as { amount_cents?: number }).amount_cents ?? 0), 0)
  console.log(`Paid donations for ${ncuCode}: ${dons?.length ?? 0} rows, $${(paidCents / 100).toFixed(2)} gross`)
  console.log("\nDone — Tobin should see his digital wallet on Profile after refresh.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
