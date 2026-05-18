import type { SupabaseClient } from "@supabase/supabase-js"
import { fetchGuildUserById, isGuildSupabaseConfigured } from "@/lib/guild-supabase-admin"

export type GuildLinkAttemptResult =
  | { linked: true; guildParentUserId: string }
  | { linked: false; reason: string }

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function parseUuidString(v: unknown): string | null {
  if (typeof v !== "string") return null
  const t = v.trim()
  return UUID_RE.test(t) ? t : null
}

/** Shallow extract if Guild HTTP JSON echoes parent id (shape varies by Guild version). */
export function extractGuildParentIdFromGrantResponseJson(raw: unknown): string | null {
  const shallow = extractGuildParentIdShallow(raw)
  if (shallow) return shallow
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
  const nest = (raw as Record<string, unknown>).data
  if (nest && typeof nest === "object" && !Array.isArray(nest)) {
    return extractGuildParentIdShallow(nest)
  }
  return null
}

function extractGuildParentIdShallow(raw: unknown): string | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const keys = [
    "guild_parent_id",
    "guildParentId",
    "parent_id",
    "parentId",
    "guild_parent_user_id",
    "recipient_parent_id",
  ]
  for (const k of keys) {
    const found = parseUuidString(o[k])
    if (found) return found
  }
  return null
}

/**
 * When `user_profiles.guild_parent_user_id` was cleared but this login already has successful
 * Guild grants, recover the parent id from {@link guild_credit_allocations} and re-save it.
 * Requires Guild Supabase for role verification (same as email auto-link).
 */
export async function tryRestoreGuildParentFromPriorAllocations(
  admin: SupabaseClient,
  recruitNcUserId: string,
): Promise<GuildLinkAttemptResult> {
  if (!isGuildSupabaseConfigured()) {
    return { linked: false, reason: "guild_not_configured" }
  }

  const { data: profile, error: pErr } = await admin
    .from("user_profiles")
    .select("guild_parent_user_id")
    .eq("user_id", recruitNcUserId)
    .maybeSingle()

  if (pErr) {
    if (pErr.code === "42703" || pErr.message?.includes("guild_parent_user_id")) {
      return { linked: false, reason: "column_missing" }
    }
    return { linked: false, reason: `profile_error:${pErr.message}` }
  }
  if (!profile) {
    return { linked: false, reason: "no_user_profiles_row" }
  }

  const existing = (profile as { guild_parent_user_id?: string | null }).guild_parent_user_id
  if (typeof existing === "string" && existing.trim()) {
    return { linked: false, reason: "already_linked" }
  }

  let q = admin
    .from("guild_credit_allocations")
    .select("guild_response, guild_parent_user_id_at_grant")
    .eq("user_id", recruitNcUserId)
    .eq("status", "guild_applied")
    .order("created_at", { ascending: false })
    .limit(40)

  let { data: rows, error: allocErr } = await q

  if (
    allocErr &&
    (allocErr.code === "42703" || allocErr.message?.includes("guild_parent_user_id_at_grant"))
  ) {
    const res2 = await admin
      .from("guild_credit_allocations")
      .select("guild_response")
      .eq("user_id", recruitNcUserId)
      .eq("status", "guild_applied")
      .order("created_at", { ascending: false })
      .limit(40)
    rows = res2.data
    allocErr = res2.error
  }

  if (allocErr) {
    if (allocErr.code === "42P01" || allocErr.message?.includes("does not exist")) {
      return { linked: false, reason: "no_allocations_table" }
    }
    console.error("[guild-restore] allocations", allocErr)
    return { linked: false, reason: `allocations_error:${allocErr.message}` }
  }

  const candidates = new Set<string>()
  for (const r of rows ?? []) {
    const row = r as { guild_response?: unknown; guild_parent_user_id_at_grant?: string | null }
    const fromCol = parseUuidString(row.guild_parent_user_id_at_grant)
    if (fromCol) candidates.add(fromCol)
    const fromJson = extractGuildParentIdFromGrantResponseJson(row.guild_response)
    if (fromJson) candidates.add(fromJson)
  }

  if (candidates.size === 0) {
    return { linked: false, reason: "no_parent_id_in_allocation_history" }
  }
  if (candidates.size > 1) {
    return { linked: false, reason: "ambiguous_allocation_parent_ids" }
  }

  const guildParentUserId = [...candidates][0]!
  const verify = await fetchGuildUserById(guildParentUserId)
  if (!verify || verify.role !== "parent") {
    return { linked: false, reason: "guild_role_verify_failed" }
  }

  const { error: updErr } = await admin
    .from("user_profiles")
    .update({ guild_parent_user_id: guildParentUserId })
    .eq("user_id", recruitNcUserId)

  if (updErr) {
    console.error("[guild-restore] profile update", updErr)
    return { linked: false, reason: `update_failed:${updErr.message}` }
  }

  console.info("[RecruitNC] guild parent restored from allocation history", { recruitNcUserId, guildParentUserId })
  return { linked: true, guildParentUserId }
}
