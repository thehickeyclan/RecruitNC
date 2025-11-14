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

export async function GET(req: NextRequest) {
  try {
    const authz = req.headers.get("authorization") || ""
    const token = authz.startsWith("Bearer ") ? authz.slice(7) : null
    if (!token) return NextResponse.json({ error: "Missing Authorization" }, { status: 401 })

    const anon = anonWithBearer(token)
    const { data: userRes, error: userErr } = await anon.auth.getUser()
    if (userErr || !userRes?.user) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 })
    }
    const user = userRes.user

    // Admin check via user_profiles.is_admin
    const svc = serviceClient()
    const { data: adminRow, error: adminErr } = await svc
      .from("user_profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .maybeSingle()

    if (adminErr) {
      return NextResponse.json({ error: "Admin check failed", details: adminErr.message }, { status: 500 })
    }
    if (!adminRow?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data, error } = await svc
      .from("user_analytics")
      .select("id, user_id, event_type, event_data, page_url, created_at")
      .eq("event_type", "action_click")
      .order("created_at", { ascending: false })
      .limit(200)

    if (error) {
      return NextResponse.json({ error: "Query failed", details: error.message }, { status: 500 })
    }

    return NextResponse.json({ items: data ?? [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 })
  }
}
