import type { SupabaseClient } from "@supabase/supabase-js"
import {
  fetchGuildParentUsersByEmail,
  fetchGuildUserById,
  isGuildSupabaseConfigured,
  sanitizeEmailForIlike,
} from "@/lib/guild-supabase-admin"

export type GuildAutoLinkAttemptResult =
  | { linked: true; guildParentUserId: string }
  | { linked: false; reason: string }

/**
 * When unset or not "0"/"false", wallet load may set `user_profiles.guild_parent_user_id` if the
 * session email matches exactly one Wrestling Guild parent. Set `RECRUITNC_GUILD_AUTO_LINK=0` to disable.
 */
function guildAutoLinkEnabledFromEnv(): boolean {
  const v = process.env.RECRUITNC_GUILD_AUTO_LINK?.trim().toLowerCase()
  if (v === "0" || v === "false" || v === "off" || v === "no") return false
  return true
}

/**
 * Idempotent: links RecruitNC profile → Guild parent when safe.
 * Uses **Auth session email** only (no client-supplied email).
 *
 * Skips when: Guild env missing, feature disabled, no profile row, already linked,
 * zero or multiple Guild parent matches, or Guild user fails parent verification.
 *
 * {@link options.profileEmail} is used when Auth email is missing (e.g. some OAuth flows);
 * must match the same person — we only use it to find the Guild parent row, then verify role/email.
 */
export async function tryGuildAutoLinkForSessionUser(
  admin: SupabaseClient,
  recruitNcUserId: string,
  authEmail: string | null | undefined,
  options?: { profileEmail?: string | null },
): Promise<GuildAutoLinkAttemptResult> {
  if (!isGuildSupabaseConfigured()) {
    return { linked: false, reason: "guild_not_configured" }
  }
  if (!guildAutoLinkEnabledFromEnv()) {
    return { linked: false, reason: "disabled_by_env" }
  }

  let email = sanitizeEmailForIlike(authEmail ?? "")
  if (!email.includes("@") && options?.profileEmail) {
    email = sanitizeEmailForIlike(options.profileEmail)
  }
  if (!email.includes("@")) {
    return { linked: false, reason: "no_auth_email" }
  }

  const { data: profile, error: profErr } = await admin
    .from("user_profiles")
    .select("guild_parent_user_id")
    .eq("user_id", recruitNcUserId)
    .maybeSingle()

  if (profErr) {
    if (profErr.code === "42703" || profErr.message?.includes("guild_parent_user_id")) {
      return { linked: false, reason: "column_missing" }
    }
    return { linked: false, reason: `profile_error:${profErr.message}` }
  }
  if (!profile) {
    return { linked: false, reason: "no_user_profiles_row" }
  }

  const existing = (profile as { guild_parent_user_id?: string | null }).guild_parent_user_id
  if (typeof existing === "string" && existing.trim()) {
    return { linked: false, reason: "already_linked" }
  }

  const guildResult = await fetchGuildParentUsersByEmail(email)
  if (!guildResult.ok) {
    return { linked: false, reason: `guild_lookup:${guildResult.error}` }
  }
  const rows = guildResult.rows
  if (rows.length === 0) {
    return { linked: false, reason: "no_guild_parent_match" }
  }
  if (rows.length > 1) {
    return { linked: false, reason: "ambiguous_guild_parent" }
  }

  const guildParentUserId = rows[0]!.id
  const verify = await fetchGuildUserById(guildParentUserId)
  if (!verify || verify.role !== "parent") {
    return { linked: false, reason: "guild_role_verify_failed" }
  }

  const gEmail = verify.email?.trim().toLowerCase()
  if (gEmail && gEmail !== email.toLowerCase()) {
    return { linked: false, reason: "email_mismatch" }
  }

  const { error: updErr } = await admin
    .from("user_profiles")
    .update({ guild_parent_user_id: guildParentUserId })
    .eq("user_id", recruitNcUserId)

  if (updErr) {
    console.error("[guild-auto-link] update", updErr)
    return { linked: false, reason: `update_failed:${updErr.message}` }
  }

  console.info("[RecruitNC] guild auto-link ok", { recruitNcUserId, guildParentUserId })
  return { linked: true, guildParentUserId }
}
