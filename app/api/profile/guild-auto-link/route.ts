import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { runGuildLinkForProfile } from "@/lib/guild-auto-link"

export const dynamic = "force-dynamic"

/**
 * POST: Attempt to set `user_profiles.guild_parent_user_id` when the signed-in user’s Auth email
 * matches exactly one Wrestling Guild user with `role = parent`. Idempotent and safe for repeated calls.
 *
 * Disable project-wide: `RECRUITNC_GUILD_AUTO_LINK=0`
 */
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: pe } = await admin.from("user_profiles").select("email").eq("user_id", user.id).maybeSingle()
  const result = await runGuildLinkForProfile(admin, user.id, user.email, {
    profileEmail: (pe as { email?: string | null } | null)?.email ?? null,
  })

  return NextResponse.json({
    linked: result.linked,
    ...(result.linked ? { guildParentUserId: result.guildParentUserId } : { reason: result.reason }),
  })
}
