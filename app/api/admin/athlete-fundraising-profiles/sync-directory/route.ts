import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getFundraisingAthleteEntries } from "@/lib/spartan-fundraising-code"
import { normalizeFundraisingProfileSlug } from "@/lib/fundraising/athlete-fundraising-profiles"
import { fundraisingSlugFromCode } from "@/lib/fundraising/athlete-fundraising-slug"

export const dynamic = "force-dynamic"

const ATHLETE_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const NCU_RE = /^NCU-[A-Za-z0-9]+-\d{2}$/i

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

async function requireAdmin(): Promise<{ ok: true } | { ok: false; status: 401 | 403; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false, status: 401, error: "Unauthorized" }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false, status: 403, error: "Admin required" }
  return { ok: true }
}

/**
 * Creates missing `athlete_fundraising_profiles` rows for real directory athletes:
 * slug = lowercase NCU code, primary_fundraising_code = uppercase NCU.
 * Skips roster-only placeholders, athletes who already have any profile, and slug conflicts.
 */
export async function POST() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()
  const entries = await getFundraisingAthleteEntries(admin)

  const { data: existingRows, error: listErr } = await admin
    .from("athlete_fundraising_profiles")
    .select("athlete_id, slug")

  if (listErr) {
    console.error("[sync-directory] list profiles", listErr)
    return NextResponse.json({ error: listErr.message }, { status: 500 })
  }

  const athleteHasProfile = new Set((existingRows ?? []).map((r: { athlete_id: string }) => String(r.athlete_id)))
  const slugOwner = new Map<string, string>()
  for (const r of existingRows ?? []) {
    const slug = String((r as { slug: string }).slug ?? "")
    const aid = String((r as { athlete_id: string }).athlete_id ?? "")
    if (slug) slugOwner.set(slug, aid)
  }

  let created = 0
  let skippedHasProfile = 0
  let skippedNotDirectoryAthlete = 0
  let skippedBadCode = 0
  const conflicts: { code: string; athleteId: string; reason: string }[] = []

  const now = new Date().toISOString()

  for (const e of entries) {
    if (!ATHLETE_UUID_RE.test(e.id)) {
      skippedNotDirectoryAthlete++
      continue
    }
    if (athleteHasProfile.has(e.id)) {
      skippedHasProfile++
      continue
    }

    const codeUpper = e.code.trim().toUpperCase()
    if (!NCU_RE.test(codeUpper)) {
      skippedBadCode++
      continue
    }

    const slug = normalizeFundraisingProfileSlug(fundraisingSlugFromCode(codeUpper))
    if (!SLUG_RE.test(slug)) {
      skippedBadCode++
      continue
    }

    const owner = slugOwner.get(slug)
    if (owner && owner !== e.id) {
      conflicts.push({ code: codeUpper, athleteId: e.id, reason: `slug ${slug} belongs to another athlete` })
      continue
    }

    const insert = {
      athlete_id: e.id,
      slug,
      bio: null as string | null,
      photo_url: null as string | null,
      is_active: true,
      checkout_live: false,
      campaign_goal_cents: null as number | null,
      primary_fundraising_code: codeUpper,
      updated_at: now,
    }

    const { error: insErr } = await admin.from("athlete_fundraising_profiles").insert(insert)

    if (insErr) {
      if (insErr.code === "23505") {
        conflicts.push({ code: codeUpper, athleteId: e.id, reason: insErr.message })
      } else {
        conflicts.push({ code: codeUpper, athleteId: e.id, reason: insErr.message })
      }
      continue
    }

    created++
    athleteHasProfile.add(e.id)
    slugOwner.set(slug, e.id)
  }

  return NextResponse.json({
    ok: true,
    created,
    skippedHasProfile,
    skippedNotDirectoryAthlete,
    skippedBadCode,
    conflicts,
    scanned: entries.length,
  })
}
