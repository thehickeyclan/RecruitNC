import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

/** Lightweight check for nav: does the current user have access to the team hub? (admin or has a paid registration) */
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user?.email) {
    return NextResponse.json({ allowed: false })
  }

  const admin = createAdminClient()
  let profile = (await admin
    .from("user_profiles")
    .select("is_admin, role")
    .eq("user_id", user.id)
    .maybeSingle()).data as { is_admin?: boolean; role?: string } | null
  if (!profile && user.email) {
    profile = (await admin
      .from("user_profiles")
      .select("is_admin, role")
      .ilike("email", user.email)
      .maybeSingle()).data as { is_admin?: boolean; role?: string } | null
  }
  const isAdmin = !!profile?.is_admin || profile?.role === "admin"
  if (isAdmin) return NextResponse.json({ allowed: true })

  const { data: regs } = await admin
    .from("national_team_event_registrations")
    .select("id")
    .eq("status", "paid")
    .ilike("parent_email", user.email)

  const allowed = !!(regs && regs.length > 0)
  return NextResponse.json({ allowed })
}
