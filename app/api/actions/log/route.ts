import { NextResponse, type NextRequest } from "next/server"
import { createClient as createSupabase } from "@supabase/supabase-js"

function need(v: string | undefined, key: string) {
  if (!v) throw new Error(`${key} not configured`)
  return v
}

function anonWithBearer(token: string) {
  const url = need(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL, "SUPABASE_URL")
  const anon = need(process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "SUPABASE_ANON_KEY")
  return createSupabase(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function serviceClient() {
  const url = need(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL, "SUPABASE_URL")
  const srv = need(process.env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY")
  return createSupabase(url, srv, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function POST(req: NextRequest) {
  try {
    const authz = req.headers.get("authorization") || ""
    const token = authz.startsWith("Bearer ") ? authz.slice(7) : null
    if (!token) return NextResponse.json({ error: "Missing Authorization Bearer token" }, { status: 401 })

    const anon = anonWithBearer(token)
    const { data: userRes, error: userErr } = await anon.auth.getUser()
    if (userErr || !userRes?.user) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 })
    }
    const user = userRes.user

    const body = await req.json().catch(() => ({}))
    const { targetType, targetId, action, pageUrl: bodyPageUrl, pageTitle } = body as {
      targetType?: string
      targetId?: string
      action?: "green" | "red"
      pageUrl?: string
      pageTitle?: string
    }

    if (!targetType || !targetId || !action || !["green", "red"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid payload: need targetType, targetId, action ['green'|'red']" },
        { status: 400 }
      )
    }

    // Page URL is required by your DB; derive from body or Referer header; fallback to "/"
    const referrer = req.headers.get("referer") || undefined
    const pageUrl = bodyPageUrl || referrer || "/"

    const svc = serviceClient()
    const { error: insertErr } = await svc.from("user_analytics").insert({
      user_id: user.id,
      event_type: "action_click",
      event_data: { action, targetType, targetId, pageTitle },
      page_url: pageUrl,
    })

    if (insertErr) {
      return NextResponse.json(
        {
          error: `Database insert failed: ${insertErr.message}`,
          details: insertErr.details,
          hint: insertErr.hint,
          code: insertErr.code,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 })
  }
}
