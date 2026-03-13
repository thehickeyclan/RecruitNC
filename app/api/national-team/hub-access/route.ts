import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

const HUB_ACCESS_COOKIE = "nc_hub_access"
const NHSCA_HUB_SLUGS = ["nhsca-duals-2026", "nhsca-duals-2026-select"]

/** Same rules as hub GET: admin, paid reg (parent_email or parent_user_id), hub code cookie, or DB grant. */
async function validateHubCookie(): Promise<boolean> {
  const cookieStore = await cookies()
  const hubCode = cookieStore.get(HUB_ACCESS_COOKIE)?.value?.trim()
  if (!hubCode) return false
  const hubCodeLower = hubCode.toLowerCase()
  const adminCheck = createAdminClient()
  const { data: codeRows, error: codeErr } = await adminCheck
    .from("national_team_invite_codes")
    .select("id, code, expires_at, max_uses, uses_count")
    .in("event_slug", NHSCA_HUB_SLUGS)
    .limit(50)
  const codeRow =
    codeErr || !Array.isArray(codeRows)
      ? null
      : codeRows.find((r) => (r as { code?: string }).code?.trim().toLowerCase() === hubCodeLower)
  if (!codeRow) return false
  const row = codeRow as { expires_at?: string | null; max_uses?: number | null; uses_count?: number }
  if (row.expires_at && new Date(row.expires_at) < new Date()) return false
  const maxUses = row.max_uses != null ? Number(row.max_uses) : null
  const usesCount = Number(row.uses_count) ?? 0
  if (maxUses != null && usesCount >= maxUses) return false
  return true
}

/** Lightweight check for nav: does the current user have access to the team hub? */
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  const _debug = { hasUser: !!user, userEmail: user?.email ?? null }

  if (authError || !user?.email) {
    if (await validateHubCookie()) return NextResponse.json({ allowed: true })
    return NextResponse.json({ allowed: false, _debug })
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

  const { data: regsByEmail } = await admin
    .from("national_team_event_registrations")
    .select("id")
    .eq("status", "paid")
    .ilike("parent_email", user.email)
  const { data: regsByUserId } = await admin
    .from("national_team_event_registrations")
    .select("id")
    .eq("status", "paid")
    .eq("parent_user_id", user.id)
  const hasReg = !!((regsByEmail?.length ?? 0) > 0 || (regsByUserId?.length ?? 0) > 0)
  if (hasReg) return NextResponse.json({ allowed: true })

  try {
    const { data: grantRow } = await admin
      .from("national_team_hub_access_grants")
      .select("code")
      .eq("user_id", user.id)
      .gt("expires_at", new Date().toISOString())
      .limit(1)
      .maybeSingle()
    if (grantRow && (grantRow as { code?: string }).code) {
      const grantCode = ((grantRow as { code: string }).code ?? "").trim().toLowerCase()
      const { data: codeRows } = await admin
        .from("national_team_invite_codes")
        .select("id, code, expires_at, max_uses, uses_count")
        .in("event_slug", NHSCA_HUB_SLUGS)
        .limit(50)
      const codeRow = Array.isArray(codeRows)
        ? codeRows.find((r) => (r as { code?: string }).code?.trim().toLowerCase() === grantCode)
        : null
      if (codeRow) {
        const cr = codeRow as { expires_at?: string | null; max_uses?: number | null; uses_count?: number }
        const notExpired = !cr.expires_at || new Date(cr.expires_at) >= new Date()
        const maxUses = cr.max_uses != null ? Number(cr.max_uses) : null
        const usesCount = Number(cr.uses_count) ?? 0
        const underLimit = maxUses == null || usesCount < maxUses
        if (notExpired && underLimit) return NextResponse.json({ allowed: true })
      }
    }
  } catch {
    // table may not exist
  }

  if (await validateHubCookie()) return NextResponse.json({ allowed: true })
  return NextResponse.json({ allowed: false, _debug })
}
