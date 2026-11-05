import type { SupabaseClient } from "@supabase/supabase-js"

import { hasBusinessGrant } from "@/lib/business/access"

/**
 * Who may open a college coach's My Recruits, Recruiting Needs and tournament reports as that
 * coach sees them, read-only (`?as=<coach user id>`, listed at /admin/view-as-coach).
 *
 * Admins always could. A business account may too (Matt, 4 Nov 2026: give Rhett "same view i
 * have" of My Recruits), but without contact details: Matt chose the version that hides them, in
 * line with his rule that Rhett never sees a kid's or a parent's details. The board carries one
 * such field, the wrestler's own phone; `withoutContact` removes it for a business viewer, on the
 * server, so it never reaches his browser.
 *
 * A business account only ever views as a named coach. Without `?as=` it has no board of its own.
 */
export type ViewAsRole = "admin" | "business" | null

export async function viewAsRole(admin: SupabaseClient, userId: string, appMetadata?: unknown): Promise<ViewAsRole> {
  const { data: me } = await admin.from("user_profiles").select("is_admin, role").eq("user_id", userId).maybeSingle()
  if (me?.is_admin === true || me?.role === "admin") return "admin"
  const meta = appMetadata !== undefined ? appMetadata : (await admin.auth.admin.getUserById(userId).catch(() => null))?.data?.user?.app_metadata
  return hasBusinessGrant(meta) ? "business" : null
}

/** Whether this account holds the business grant, for routes that only know the user id. */
export async function businessGrantFor(admin: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await admin.auth.admin.getUserById(userId).catch(() => ({ data: null }))
  return hasBusinessGrant(data?.user?.app_metadata)
}

/** The board's rows with every contact field emptied, for a business viewer. */
export function withoutContact<T extends { phone?: string | null }>(rows: T[]): T[] {
  return rows.map((row) => ({ ...row, phone: null }))
}
