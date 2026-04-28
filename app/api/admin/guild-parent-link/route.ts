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
  const { data: profiles, error: profErr } = await admin
    .from("user_profiles")
    .select("user_id, email, guild_parent_user_id")
    .ilike("email", safe)
    .limit(10)

  if (profErr) {
    console.error("[admin/guild-parent-link] user_profiles", profErr)
    return NextResponse.json({ error: profErr.message }, { status: 500 })
  }

  const guildConfigured = isGuildSupabaseConfigured()
  const guildResult = guildConfigured ? await fetchGuildParentUsersByEmail(safe) : null

  return NextResponse.json({
    emailQuery: safe,
    guildSupabaseConfigured: guildConfigured,
    recruitNcProfiles: profiles ?? [],
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
