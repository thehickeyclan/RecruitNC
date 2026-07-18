import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export type TocInvitationManagerAuth =
  | { ok: true; userId: string; email: string; isAdmin: boolean }
  | { ok: false; status: 401 | 403 | 503; error: string }

/** Full admins or explicitly allow-listed TOC invitation managers. */
export async function requireTocInvitationManager(): Promise<TocInvitationManagerAuth> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  const email = user?.email?.trim().toLowerCase()
  if (authError || !user || !email) {
    return { ok: false, status: 401, error: "Unauthorized" }
  }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("user_profiles")
    .select("is_admin")
    .eq("user_id", user.id)
    .maybeSingle()
  if (profile?.is_admin) {
    return { ok: true, userId: user.id, email, isAdmin: true }
  }

  const { data: manager, error: managerError } = await admin
    .from("toc_invitation_managers")
    .select("email")
    .eq("email", email)
    .maybeSingle()

  if (managerError?.code === "42P01" || managerError?.code === "PGRST205") {
    return { ok: false, status: 503, error: "TOC invitation manager access has not been configured." }
  }
  if (managerError) {
    console.error("[toc invitation manager auth]", managerError)
    return { ok: false, status: 503, error: "Unable to verify TOC invitation access." }
  }
  if (!manager) {
    return { ok: false, status: 403, error: "TOC invitation manager access required" }
  }

  return { ok: true, userId: user.id, email, isAdmin: false }
}
