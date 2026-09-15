import { createClient } from "@/lib/supabase/server"

export type TocWeighInStaffAuth =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403; error: string }

/**
 * Who may run the Friday weigh-in check-in.
 *
 * Scale staff need this one page and nothing else. TOC field access is too broad for them — it also
 * opens TOC Madness entrants and their emails and the private seeding boards — so they get a
 * narrower `toc_weigh_in` flag. Admins and existing field-access staff are allowed as well. Both
 * flags live in Supabase Auth app_metadata, which users cannot set on themselves.
 */
export async function requireTocWeighInStaff(): Promise<TocWeighInStaffAuth> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { ok: false, status: 401, error: "Unauthorized" }

  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).maybeSingle()

  const allowed =
    profile?.is_admin === true ||
    user.app_metadata?.toc_field_access === true ||
    user.app_metadata?.toc_weigh_in === true

  if (!allowed) return { ok: false, status: 403, error: "Weigh-in access required. Ask NC United staff to add you." }
  return { ok: true, userId: user.id }
}
