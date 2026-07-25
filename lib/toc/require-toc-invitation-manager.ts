import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

const FALLBACK_TOC_MANAGER_EMAILS = new Set([
  "lisa.hickey@yahoo.com",
  "justin.usmc@yahoo.com",
  "jeannineaponte@gmail.com",
  "ericnaponte@gmail.com",
  "cpalmer@goldgroupinc.com",
])

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
  const { data: profile, error: profileError } = await admin
    .from("user_profiles")
    .select("is_admin, role")
    .eq("user_id", user.id)
    .maybeSingle()
  if (profileError) {
    console.warn("[toc invitation manager auth] profile lookup failed", profileError.message)
  }
  if (profile?.is_admin || profile?.role === "admin") {
    return { ok: true, userId: user.id, email, isAdmin: true }
  }

  const { data: managers, error: managerError } = await admin
    .from("toc_invitation_managers")
    .select("email")
    .eq("email", email)
    .limit(1)

  if (managerError?.code === "42P01" || managerError?.code === "PGRST205") {
    if (FALLBACK_TOC_MANAGER_EMAILS.has(email)) {
      return { ok: true, userId: user.id, email, isAdmin: false }
    }
    return { ok: false, status: 503, error: "TOC invitation manager access has not been configured." }
  }
  if (managerError) {
    console.error("[toc invitation manager auth]", managerError)
    if (FALLBACK_TOC_MANAGER_EMAILS.has(email)) {
      return { ok: true, userId: user.id, email, isAdmin: false }
    }
    return { ok: false, status: 503, error: "Unable to verify TOC invitation access." }
  }
  if (!managers?.length && !FALLBACK_TOC_MANAGER_EMAILS.has(email)) {
    return { ok: false, status: 403, error: "TOC invitation manager access required" }
  }

  return { ok: true, userId: user.id, email, isAdmin: false }
}
