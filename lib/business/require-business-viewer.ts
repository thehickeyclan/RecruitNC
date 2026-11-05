import { createClient } from "@/lib/supabase/server"

import { businessDecision } from "@/lib/business/access"

export type BusinessViewerAuth =
  | { ok: true; isAdmin: boolean; userId: string }
  | { ok: false; status: 401 | 403; error: string }

/**
 * First line of every Business admin page and route: a full admin, or an account holding the
 * business grant for a page on its list (lib/business/access.ts). Everything else is refused.
 *
 * `page` is the path being opened. A business account that asks for a page not on the list is a
 * 403 even though it holds the grant - the grant is a key to named doors, not to admin.
 */
export async function requireBusinessViewer(page: string): Promise<BusinessViewerAuth> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false, status: 401, error: "Unauthorized" }

  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).maybeSingle()
  const decision = businessDecision(profile?.is_admin === true, user.app_metadata, page)
  if (!decision.allow) return { ok: false, status: 403, error: decision.reason }
  return { ok: true, isAdmin: decision.isAdmin, userId: user.id }
}
