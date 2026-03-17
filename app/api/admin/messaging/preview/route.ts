import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { markdownToHtml } from "@/lib/blast-format"
import { buildAdminBlastEmailHtml } from "@/lib/admin-blast-email-html"

export const dynamic = "force-dynamic"

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://app.ncwrestlingunited.com"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false as const, status: 401 as const }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false as const, status: 403 as const }
  return { ok: true as const }
}

/** POST: { subject?, body? } (body = markdown). Returns { html } for the email preview. */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status })

  let body: { subject?: string; body?: string; logoVariant?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const subject = typeof body.subject === "string" ? body.subject.trim() || "Update from RecruitNC" : "Update from RecruitNC"
  const rawBody = typeof body.body === "string" ? body.body.trim() : ""
  const logoVariant = body.logoVariant === "nc-united" ? "nc-united" : "recruitnc"
  const htmlBody = markdownToHtml(rawBody || "Your message here.")
  const baseUrl = (SITE_URL || "").replace(/\/$/, "")
  const html = buildAdminBlastEmailHtml(subject, htmlBody, baseUrl, logoVariant)
  return NextResponse.json({ html })
}
