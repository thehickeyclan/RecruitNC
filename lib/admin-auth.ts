import { createClient } from "@/lib/supabase/server"

export async function requireAdmin(): Promise<
  { ok: true } | { ok: false; status: 401 | 403; error: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { ok: false, status: 401, error: "Unauthorized" }
  }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) {
    return { ok: false, status: 403, error: "Admin required" }
  }
  return { ok: true }
}
