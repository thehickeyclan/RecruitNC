import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

const FALLBACK_TOC_MANAGER_EMAILS = new Set([
  "matthickey@gmail.com",
  "matt@ncwrestlingunited.com",
  "info@ncwrestlingunited.com",
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
  let profile: { is_admin?: boolean; role?: string } | null = null
  let profileErrorMessage: string | null = null

  const byUserId = await admin
    .from("user_profiles")
    .select("is_admin, role")
    .eq("user_id", user.id)
    .maybeSingle()
  if (byUserId.error) {
    profileErrorMessage = byUserId.error.message
  } else {
    profile = byUserId.data as { is_admin?: boolean; role?: string } | null
  }

  if (!profile) {
    const byId = await admin
      .from("user_profiles")
      .select("is_admin, role")
      .eq("id", user.id)
      .maybeSingle()
    if (byId.error) {
      profileErrorMessage = profileErrorMessage ?? byId.error.message
    } else {
      profile = byId.data as { is_admin?: boolean; role?: string } | null
    }
  }

  if (!profile) {
    const byEmail = await admin
      .from("user_profiles")
      .select("is_admin, role")
      .ilike("email", email)
      .maybeSingle()
    if (byEmail.error) {
      profileErrorMessage = profileErrorMessage ?? byEmail.error.message
    } else {
      profile = byEmail.data as { is_admin?: boolean; role?: string } | null
    }
  }

  if (!profile && profileErrorMessage) {
    console.warn("[toc invitation manager auth] profile lookup failed", profileErrorMessage)
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
