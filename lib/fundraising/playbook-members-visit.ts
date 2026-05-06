import type { SupabaseClient, User } from "@supabase/supabase-js"

export type PlaybookMemberVisitRole = "athlete" | "parent" | "coach" | "other"

type ProfileRow = {
  full_name?: string | null
  email?: string | null
  athlete_id?: string | number | null
  role?: string | null
  profile_type?: string | null
}

/** Strip query string and cap length — avoids leaking tokens from referer URLs. */
export function safePlaybookReferrer(headerValue: string | null): string | null {
  if (!headerValue?.trim()) return null
  try {
    const u = new URL(headerValue)
    return `${u.origin}${u.pathname}`.slice(0, 500)
  } catch {
    return null
  }
}

export function playbookMemberRoleFromProfile(profile: ProfileRow | null | undefined): PlaybookMemberVisitRole {
  if (profile?.athlete_id != null && String(profile.athlete_id).trim() !== "") return "athlete"
  const r = String(profile?.role ?? "").toLowerCase()
  if (r === "coach") return "coach"
  const pt = String(profile?.profile_type ?? "").toLowerCase()
  if (pt.includes("parent")) return "parent"
  return "other"
}

export async function logPlaybookMembersVisit(
  supabase: SupabaseClient,
  user: User,
  referrerHeader: string | null,
): Promise<void> {
  const referrer = safePlaybookReferrer(referrerHeader)
  const email = user.email?.trim() ?? ""

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("full_name, email, athlete_id, role, profile_type")
    .eq("user_id", user.id)
    .maybeSingle()

  const p = profile as ProfileRow | null | undefined
  const userName = (p?.full_name?.trim() || user.user_metadata?.full_name || user.user_metadata?.fullName || "").trim() || null
  const userEmail = (p?.email?.trim() || email || null) as string | null
  const userRole = playbookMemberRoleFromProfile(p ?? null)

  const { error } = await supabase.from("playbook_members_visits").insert({
    user_id: user.id,
    referrer,
    user_name: userName,
    user_email: userEmail,
    user_role: userRole,
  })

  if (error) {
    if (error.code === "42P01" || error.message?.includes("does not exist")) {
      console.warn("[playbook-members] playbook_members_visits missing — run scripts/supabase-playbook-members-visits.sql:", error.message)
      return
    }
    console.warn("[playbook-members] visit log failed:", error.message)
  }
}
