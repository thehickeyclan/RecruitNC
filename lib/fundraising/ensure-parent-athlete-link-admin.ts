import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Idempotent: inserts `parent_athlete_links` with service role (or RPC fallback when RLS blocks).
 * Mirrors `POST /api/admin/parent-athlete-link`.
 */
export async function ensureParentAthleteLinkAdmin(
  admin: SupabaseClient,
  params: { parentUserId: string; athleteId: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parentUserId = params.parentUserId.trim()
  const athleteId = params.athleteId.trim()
  if (!parentUserId || !athleteId) {
    return { ok: false, error: "parentUserId and athleteId are required." }
  }

  const { data: athlete, error: athleteErr } = await admin.from("athletes").select("id").eq("id", athleteId).maybeSingle()
  if (athleteErr || !athlete) {
    return { ok: false, error: "Athlete not found for link." }
  }

  const { data: existingLink } = await admin
    .from("parent_athlete_links")
    .select("id")
    .eq("user_id", parentUserId)
    .eq("athlete_id", athleteId)
    .maybeSingle()

  if (existingLink) return { ok: true }

  let insertErr = (
    await admin.from("parent_athlete_links").insert({
      user_id: parentUserId,
      athlete_id: athleteId,
    })
  ).error

  if (
    insertErr &&
    /row-level security|42501/i.test(`${insertErr.message} ${insertErr.code ?? ""}`)
  ) {
    const rpc = await admin.rpc("insert_parent_athlete_link_admin", {
      p_parent_user_id: parentUserId,
      p_athlete_id: athleteId,
    })
    if (!rpc.error) {
      insertErr = null
    } else if (
      rpc.error.code === "42883" ||
      /does not exist|could not find.*function/i.test(rpc.error.message ?? "")
    ) {
      console.error("[ensureParentAthleteLinkAdmin] RLS blocked insert; RPC not installed:", rpc.error.message)
    } else {
      insertErr = rpc.error
    }
  }

  if (insertErr) {
    if (insertErr.code === "23505") return { ok: true }
    const rlsHint =
      /row-level security/i.test(insertErr.message)
        ? " Confirm Vercel SUPABASE_SERVICE_ROLE_KEY is the service_role secret (not anon). Optional: run docs/sql/parent-athlete-link-admin-rpc.sql.txt in Supabase SQL Editor."
        : ""
    return { ok: false, error: `${insertErr.message}${rlsHint}` }
  }

  return { ok: true }
}
