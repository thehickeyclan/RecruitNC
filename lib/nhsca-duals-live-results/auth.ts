import type { User } from "@supabase/supabase-js"
import type { SupabaseClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase/admin"

export async function isNhscaDualsAdmin(user: User | null): Promise<boolean> {
  if (!user?.id && !user?.email) return false
  const admin = createAdminClient()
  let profile: { is_admin?: boolean; role?: string } | null = null
  if (user.id) {
    profile = (
      await admin.from("user_profiles").select("is_admin, role").eq("user_id", user.id).maybeSingle()
    ).data as { is_admin?: boolean; role?: string } | null
  }
  if (!profile && user.email) {
    profile = (
      await admin.from("user_profiles").select("is_admin, role").ilike("email", user.email).maybeSingle()
    ).data as { is_admin?: boolean; role?: string } | null
  }
  return !!profile?.is_admin || profile?.role === "admin"
}

export async function requireNhscaDualsAdmin(
  supabase: SupabaseClient,
  user: User | null
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const ok = await isNhscaDualsAdmin(user)
  if (!ok) return { ok: false, status: 403, error: "Admin only" }
  return { ok: true }
}
