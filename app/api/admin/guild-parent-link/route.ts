import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  fetchGuildParentUsersByEmail,
  fetchGuildUserById,
  isGuildSupabaseConfigured,
  sanitizeEmailForIlike,
} from "@/lib/guild-supabase-admin"

export const dynamic = "force-dynamic"

/** Auth Admin API (GoTrue) — works when PostgREST blocks `auth` schema queries. */
const LIST_AUTH_USERS_PAGE_SIZE = 1000
const LIST_AUTH_USERS_MAX_PAGES = 50

/**
 * GET ?email= — RecruitNC profile(s) + Guild parent user(s) with same email (case-insensitive).
 * POST { recruitNcUserId, guildParentUserId } — set user_profiles.guild_parent_user_id after Guild role check.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const emailRaw = request.nextUrl.searchParams.get("email") ?? ""
  const safe = sanitizeEmailForIlike(emailRaw)
  if (!safe || !safe.includes("@")) {
    return NextResponse.json({ error: "Query parameter email is required." }, { status: 400 })
  }

  const admin = createAdminClient()

  /**
   * Match RecruitNC parents by both `user_profiles.email` **and** `auth.users.email`.
   * They often diverge when profile email is null/stale while the parent still logs in with Auth.
   */
  const { data: profilesByEmail, error: profErr } = await admin
    .from("user_profiles")
    .select("user_id, email, guild_parent_user_id")
    .ilike("email", safe)
    .limit(25)

  if (profErr) {
    console.error("[admin/guild-parent-link] user_profiles", profErr)
    return NextResponse.json({ error: profErr.message }, { status: 500 })
  }

  let authByEmail: { id: string; email: string | null }[] = []
  let recruitNcAuthLookupError: string | null = null
  try {
    const safeLower = safe.toLowerCase()
    for (let page = 1; page <= LIST_AUTH_USERS_MAX_PAGES && authByEmail.length < 25; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: LIST_AUTH_USERS_PAGE_SIZE })
      if (error) {
        recruitNcAuthLookupError = error.message
        break
      }
      for (const u of data.users) {
        const em = u.email?.trim()
        if (em && em.toLowerCase() === safeLower) {
          authByEmail.push({ id: u.id, email: em })
          if (authByEmail.length >= 25) break
        }
      }
      if (data.users.length < LIST_AUTH_USERS_PAGE_SIZE) break
    }
  } catch (e) {
    recruitNcAuthLookupError = e instanceof Error ? e.message : String(e)
    console.warn("[admin/guild-parent-link] auth.admin.listUsers", e)
  }

  const idSet = new Set<string>()
  for (const p of profilesByEmail ?? []) {
    idSet.add(String((p as { user_id: string }).user_id))
  }
  for (const u of authByEmail) {
    idSet.add(String(u.id))
  }

  let fullProfiles: { user_id: string; email: string | null; guild_parent_user_id: string | null }[] = []
  if (idSet.size > 0) {
    const ids = [...idSet]
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100)
      const { data: fp, error: fpErr } = await admin
        .from("user_profiles")
        .select("user_id, email, guild_parent_user_id")
        .in("user_id", chunk)
      if (fpErr) {
        console.error("[admin/guild-parent-link] user_profiles by id", fpErr)
        return NextResponse.json({ error: fpErr.message }, { status: 500 })
      }
      fullProfiles = fullProfiles.concat((fp ?? []) as typeof fullProfiles)
    }
  }

  const profById = new Map(fullProfiles.map((p) => [p.user_id, p]))
  const authById = new Map(authByEmail.map((u) => [u.id, u]))

  const recruitNcProfiles = [...idSet].map((user_id) => {
    const prof = profById.get(user_id)
    const au = authById.get(user_id)
    const email = (prof?.email?.trim() || au?.email?.trim() || null) as string | null
    return {
      user_id,
      email,
      guild_parent_user_id: prof?.guild_parent_user_id ?? null,
      profileRowExists: Boolean(prof),
      /** `user_profiles.email` empty; we showed Auth email instead. */
      emailResolvedFromAuth: Boolean(au?.email?.trim()) && !prof?.email?.trim(),
    }
  })

  recruitNcProfiles.sort((a, b) => {
    if (a.profileRowExists !== b.profileRowExists) return a.profileRowExists ? -1 : 1
    return (a.email ?? "").localeCompare(b.email ?? "")
  })

  const guildConfigured = isGuildSupabaseConfigured()
  const guildResult = guildConfigured ? await fetchGuildParentUsersByEmail(safe) : null

  return NextResponse.json({
    emailQuery: safe,
    guildSupabaseConfigured: guildConfigured,
    recruitNcProfiles,
    recruitNcAuthLookupError,
    guildParentUsers:
      guildResult && guildResult.ok ? guildResult.rows : [],
    guildLookupError: guildResult && !guildResult.ok ? guildResult.error : null,
  })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  let body: { recruitNcUserId?: string; guildParentUserId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const recruitNcUserId = (body.recruitNcUserId ?? "").trim()
  const guildParentUserId = (body.guildParentUserId ?? "").trim()
  if (!recruitNcUserId || !guildParentUserId) {
    return NextResponse.json({ error: "recruitNcUserId and guildParentUserId are required." }, { status: 400 })
  }

  if (!isGuildSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Guild Supabase is not configured (GUILD_SUPABASE_URL / GUILD_SUPABASE_SERVICE_ROLE_KEY)." },
      { status: 503 },
    )
  }

  const guildUser = await fetchGuildUserById(guildParentUserId)
  if (!guildUser) {
    return NextResponse.json({ error: "Guild user id not found in Guild database." }, { status: 404 })
  }
  if (guildUser.role !== "parent") {
    return NextResponse.json(
      {
        error: `Guild user must have role "parent" (this row is "${guildUser.role ?? "unknown"}").`,
        guildUser,
      },
      { status: 400 },
    )
  }

  const admin = createAdminClient()
  const { data: existing, error: exErr } = await admin
    .from("user_profiles")
    .select("user_id, email")
    .eq("user_id", recruitNcUserId)
    .maybeSingle()

  if (exErr) {
    console.error("[admin/guild-parent-link] select profile", exErr)
    return NextResponse.json({ error: exErr.message }, { status: 500 })
  }
  if (!existing) {
    return NextResponse.json({ error: "RecruitNC user_profiles row not found for that user_id." }, { status: 404 })
  }

  const { error: updErr } = await admin
    .from("user_profiles")
    .update({ guild_parent_user_id: guildParentUserId })
    .eq("user_id", recruitNcUserId)

  if (updErr) {
    if (updErr.code === "42703" || updErr.message?.includes("guild_parent_user_id")) {
      return NextResponse.json(
        { error: "Column guild_parent_user_id missing — run the Guild credit SQL migration on RecruitNC." },
        { status: 503 },
      )
    }
    console.error("[admin/guild-parent-link] update", updErr)
    return NextResponse.json({ error: updErr.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    recruitNcUserId,
    guildParentUserId,
    guildEmail: guildUser.email,
  })
}
