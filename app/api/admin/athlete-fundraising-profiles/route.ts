import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getFundraisingAthleteEntries } from "@/lib/spartan-fundraising-code"
import { normalizeFundraisingProfileSlug } from "@/lib/fundraising/athlete-fundraising-profiles"
import {
  emptyFundraisingWiringSnapshot,
  getFundraisingWiringSnapshotsForAthleteIds,
  type FundraisingWiringAdminSnapshot,
} from "@/lib/fundraising/fundraising-wiring-status"

export const dynamic = "force-dynamic"

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
const NCU_RE = /^NCU-[A-Za-z0-9]+-\d{2}$/i

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

type AdminAthleteFundraisingProfileRow = {
  id: string
  created_at: string
  updated_at: string
  athlete_id: string
  slug: string
  bio: string | null
  photo_url: string | null
  is_active: boolean
  campaign_goal_cents: number | null
  total_raised_cents: number | null
  primary_fundraising_code: string | null
  athlete_name: string | null
  roster_ncu_code: string | null
  /** Non-admin gift-page edit wiring — same signals staff checks after Attach parent / profile claim. */
  wiring: FundraisingWiringAdminSnapshot
}

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()
  const { data: profiles, error } = await admin
    .from("athlete_fundraising_profiles")
    .select("*")
    .order("slug", { ascending: true })

  if (error) {
    console.error("[athlete-fundraising-profiles] GET", error)
    return NextResponse.json(
      { error: error.message, hint: "Run database/create-athlete-fundraising-profiles.sql if the table is missing." },
      { status: 500 },
    )
  }

  const entries = await getFundraisingAthleteEntries(admin)
  const codeByAthlete = new Map(entries.map((e) => [e.id, e.code]))
  const ids = [...new Set((profiles ?? []).map((p: { athlete_id: string }) => p.athlete_id))]
  const { data: athletes } =
    ids.length > 0 ? await admin.from("athletes").select("id, name").in("id", ids) : { data: [] as { id: string; name: string | null }[] }
  const nameById = new Map((athletes ?? []).map((a) => [a.id, typeof a.name === "string" ? a.name : null]))

  const wiringByAthlete =
    ids.length > 0 ? await getFundraisingWiringSnapshotsForAthleteIds(admin, ids) : new Map<string, FundraisingWiringAdminSnapshot>()

  const out: AdminAthleteFundraisingProfileRow[] = (profiles ?? []).map((p: Record<string, unknown>) => {
    const athleteId = String(p.athlete_id ?? "")
    return {
      id: String(p.id ?? ""),
      created_at: String(p.created_at ?? ""),
      updated_at: String(p.updated_at ?? ""),
      athlete_id: athleteId,
      slug: String(p.slug ?? ""),
      bio: (p.bio as string | null) ?? null,
      photo_url: (p.photo_url as string | null) ?? null,
      is_active: p.is_active === true,
      campaign_goal_cents: typeof p.campaign_goal_cents === "number" ? p.campaign_goal_cents : null,
      total_raised_cents: typeof p.total_raised_cents === "number" ? p.total_raised_cents : null,
      primary_fundraising_code: (p.primary_fundraising_code as string | null) ?? null,
      athlete_name: nameById.get(athleteId) ?? null,
      roster_ncu_code: codeByAthlete.get(athleteId) ?? null,
      wiring: wiringByAthlete.get(athleteId) ?? emptyFundraisingWiringSnapshot(),
    }
  })

  return NextResponse.json({ profiles: out })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  let body: {
    athlete_id?: string
    slug?: string
    bio?: string | null
    photo_url?: string | null
    is_active?: boolean
    campaign_goal_cents?: number | null
    primary_fundraising_code?: string | null
  } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const athleteId = typeof body.athlete_id === "string" ? body.athlete_id.trim() : ""
  const slug = normalizeFundraisingProfileSlug(typeof body.slug === "string" ? body.slug : "")
  if (!athleteId || !slug) {
    return NextResponse.json({ error: "athlete_id and slug are required" }, { status: 400 })
  }
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json(
      { error: "slug must be lowercase letters, numbers, and single hyphens (e.g. ncu-smith-27)" },
      { status: 400 },
    )
  }

  let primary: string | null = null
  if (body.primary_fundraising_code != null && String(body.primary_fundraising_code).trim()) {
    const c = String(body.primary_fundraising_code).trim().toUpperCase()
    if (!NCU_RE.test(c)) {
      return NextResponse.json({ error: "primary_fundraising_code must look like NCU-NAME-YY" }, { status: 400 })
    }
    primary = c
  }

  const admin = createAdminClient()
  const { data: athleteOk, error: athleteErr } = await admin.from("athletes").select("id").eq("id", athleteId).maybeSingle()
  if (athleteErr) {
    console.error("[athlete-fundraising-profiles] POST athlete check", athleteErr)
    return NextResponse.json({ error: athleteErr.message }, { status: 500 })
  }
  if (!athleteOk) return NextResponse.json({ error: "athlete_id not found in athletes" }, { status: 400 })

  const now = new Date().toISOString()
  const insert = {
    athlete_id: athleteId,
    slug,
    bio: typeof body.bio === "string" ? body.bio.trim() || null : null,
    photo_url: typeof body.photo_url === "string" ? body.photo_url.trim() || null : null,
    is_active: body.is_active !== false,
    campaign_goal_cents: typeof body.campaign_goal_cents === "number" ? Math.max(0, Math.round(body.campaign_goal_cents)) : null,
    primary_fundraising_code: primary,
    updated_at: now,
  }

  const { data: created, error: insErr } = await admin.from("athlete_fundraising_profiles").insert(insert).select("*").single()

  if (insErr) {
    console.error("[athlete-fundraising-profiles] POST insert", insErr)
    if (insErr.code === "23505") {
      return NextResponse.json(
        { error: "That slug or athlete already has a fundraising profile (unique constraint)." },
        { status: 409 },
      )
    }
    return NextResponse.json({ error: insErr.message }, { status: 500 })
  }

  return NextResponse.json({ profile: created })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  let body: {
    id?: string
    athlete_id?: string
    slug?: string
    bio?: string | null
    photo_url?: string | null
    is_active?: boolean
    campaign_goal_cents?: number | null
    primary_fundraising_code?: string | null
  } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const id = typeof body.id === "string" ? body.id.trim() : ""
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })

  const admin = createAdminClient()
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (body.athlete_id !== undefined) {
    const athleteId = typeof body.athlete_id === "string" ? body.athlete_id.trim() : ""
    if (!athleteId) {
      return NextResponse.json({ error: "athlete_id cannot be empty" }, { status: 400 })
    }
    const { data: athleteOk, error: athleteErr } = await admin.from("athletes").select("id").eq("id", athleteId).maybeSingle()
    if (athleteErr) {
      console.error("[athlete-fundraising-profiles] PATCH athlete check", athleteErr)
      return NextResponse.json({ error: athleteErr.message }, { status: 500 })
    }
    if (!athleteOk) return NextResponse.json({ error: "athlete_id not found in athletes" }, { status: 400 })
    patch.athlete_id = athleteId
  }

  if (body.slug !== undefined) {
    const slug = normalizeFundraisingProfileSlug(typeof body.slug === "string" ? body.slug : "")
    if (!SLUG_RE.test(slug)) {
      return NextResponse.json(
        { error: "slug must be lowercase letters, numbers, and single hyphens" },
        { status: 400 },
      )
    }
    patch.slug = slug
  }
  if (body.bio !== undefined) {
    patch.bio = typeof body.bio === "string" ? body.bio.trim() || null : null
  }
  if (body.photo_url !== undefined) {
    patch.photo_url = typeof body.photo_url === "string" ? body.photo_url.trim() || null : null
  }
  if (body.is_active !== undefined) {
    patch.is_active = body.is_active === true
  }
  if (body.campaign_goal_cents !== undefined) {
    patch.campaign_goal_cents =
      body.campaign_goal_cents === null ? null : Math.max(0, Math.round(Number(body.campaign_goal_cents)))
  }
  if (body.primary_fundraising_code !== undefined) {
    const raw = body.primary_fundraising_code
    if (raw === null || raw === "") {
      patch.primary_fundraising_code = null
    } else {
      const c = String(raw).trim().toUpperCase()
      if (!NCU_RE.test(c)) {
        return NextResponse.json({ error: "primary_fundraising_code must look like NCU-NAME-YY" }, { status: 400 })
      }
      patch.primary_fundraising_code = c
    }
  }

  const { data: updated, error: upErr } = await admin
    .from("athlete_fundraising_profiles")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle()

  if (upErr) {
    console.error("[athlete-fundraising-profiles] PATCH", upErr)
    if (upErr.code === "23505") {
      const slugTaken = patch.slug !== undefined
      return NextResponse.json(
        {
          error: slugTaken
            ? "That slug is already taken."
            : "That athlete already has a donor fundraising profile — merge or delete the other row first.",
        },
        { status: 409 },
      )
    }
    return NextResponse.json({ error: upErr.message }, { status: 500 })
  }
  if (!updated) return NextResponse.json({ error: "Profile not found" }, { status: 404 })

  return NextResponse.json({ profile: updated })
}
