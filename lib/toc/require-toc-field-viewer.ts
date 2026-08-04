import { createClient } from "@/lib/supabase/server"

export type TocFieldViewerAuth =
  | { ok: true; isAdmin: boolean }
  | { ok: false; status: 401 | 403; error: string }

/**
 * Grants private TOC field/bracket access to full admins and explicitly approved
 * media/staff accounts. The scoped flag lives in Supabase Auth app_metadata so
 * users cannot grant it to themselves.
 */
export async function requireTocFieldViewer(): Promise<TocFieldViewerAuth> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { ok: false, status: 401, error: "Unauthorized" }
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("user_id", user.id)
    .maybeSingle()

  const isAdmin = profile?.is_admin === true
  const hasScopedAccess = user.app_metadata?.toc_field_access === true

  if (!isAdmin && !hasScopedAccess) {
    return { ok: false, status: 403, error: "TOC field access required" }
  }

  return { ok: true, isAdmin }
}
