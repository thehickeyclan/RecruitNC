import type { SupabaseClient } from "@supabase/supabase-js"

import { hasBusinessGrant } from "@/lib/business/access"
import { cleanViewAsId } from "@/lib/view-as/cookie"

/**
 * The family a business account (Rhett) is looking at, kept on the account itself in Auth
 * app_metadata.view_as_family (Matt, 4 Nov 2026). A browser cookie did not survive on his phone,
 * so every Command Center page bounced him to the plans page. Only the service role writes it:
 * /view-as-family/<id> sets it, /view-as-family/exit clears it.
 */
export function familyFromMetadata(meta: unknown): string | null {
  if (!hasBusinessGrant(meta)) return null
  return cleanViewAsId((meta as { view_as_family?: unknown } | null)?.view_as_family as string | undefined)
}

export async function accountFamily(admin: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await admin.auth.admin.getUserById(userId).catch(() => ({ data: null }))
  return familyFromMetadata(data?.user?.app_metadata)
}

export async function setAccountFamily(admin: SupabaseClient, userId: string, familyId: string | null): Promise<void> {
  const { data } = await admin.auth.admin.getUserById(userId)
  const meta = { ...(data?.user?.app_metadata ?? {}) } as Record<string, unknown>
  if (familyId) meta.view_as_family = familyId
  else delete meta.view_as_family
  await admin.auth.admin.updateUserById(userId, { app_metadata: meta })
}
