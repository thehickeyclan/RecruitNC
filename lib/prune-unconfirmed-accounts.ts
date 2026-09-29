import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Remove sign-ups that never became users.
 *
 * An account that never confirmed its email and never signed in is not a user: a mistyped
 * address (gmail.con), a sign-up abandoned at the confirmation step, or a bot - 48 of the last kind
 * were cleared by hand on 29 September 2026. Seven days is the grace period: long enough to find a
 * confirmation email in a spam folder, short enough that the users list stays honest.
 *
 * Anything tied to something real is left alone and reported, not deleted - a claimed or linked
 * wrestler or a Blue membership means a person is behind it, whatever the email status says.
 */
export const GRACE_DAYS = 7
/** A bad day's worth; a larger batch means something is wrong and deserves a look first. */
export const MAX_PER_RUN = 200

type AuthUser = { id: string; email?: string | null; created_at: string; email_confirmed_at?: string | null; last_sign_in_at?: string | null }

/** Accounts past the grace period that never confirmed and never signed in. Pure, for the tests. */
export function staleUnconfirmed(users: readonly AuthUser[], now = new Date()): AuthUser[] {
  const cutoff = now.getTime() - GRACE_DAYS * 86_400_000
  return users.filter((u) => !u.email_confirmed_at && !u.last_sign_in_at && Date.parse(u.created_at) < cutoff)
}

export type PruneResult = { candidates: number; deleted: string[]; skipped: Array<{ email: string; reason: string }>; errors: string[]; capped: boolean }

export async function pruneUnconfirmedAccounts(admin: SupabaseClient, now = new Date()): Promise<PruneResult> {
  const users: AuthUser[] = []
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(`listUsers: ${error.message}`)
    users.push(...(data.users as AuthUser[]))
    if (data.users.length < 1000) break
  }

  const stale = staleUnconfirmed(users, now)
  const result: PruneResult = { candidates: stale.length, deleted: [], skipped: [], errors: [], capped: stale.length > MAX_PER_RUN }
  if (result.capped) return result

  for (const user of stale) {
    const email = user.email ?? user.id
    const [{ count: links }, { count: claimed }, { count: blue }] = await Promise.all([
      admin.from("parent_athlete_links").select("user_id", { count: "exact", head: true }).eq("user_id", user.id),
      admin.from("athletes").select("id", { count: "exact", head: true }).eq("claimed_by_user_id", user.id),
      admin.from("blue_memberships").select("id", { count: "exact", head: true }).eq("payer_user_id", user.id),
    ])
    const ties = [links ? "linked wrestler" : "", claimed ? "claimed profile" : "", blue ? "Blue membership" : ""].filter(Boolean)
    if (ties.length) {
      result.skipped.push({ email, reason: ties.join(", ") })
      continue
    }
    const { error: profileError } = await admin.from("user_profiles").delete().eq("user_id", user.id)
    if (profileError) {
      result.errors.push(`${email}: profile ${profileError.message}`)
      continue
    }
    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error) result.errors.push(`${email}: ${error.message}`)
    else result.deleted.push(email)
  }
  return result
}
