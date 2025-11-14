import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET() {
  try {
    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceRoleKey) {
      return NextResponse.json({ error: "Supabase URL or Service Role Key is not configured" }, { status: 500 })
    }

    const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } })
    const { data, error } = await supabase.rpc("division_sync_health_report")

    if (error) {
      const hint = "If the function is missing, run scripts/create-sync-health-function.sql in the Supabase SQL Editor."
      return NextResponse.json({ ok: false, error: error.message, hint }, { status: 500 })
    }

    return NextResponse.json({ ok: true, report: data })
  } catch (err: any) {
    console.error("Health report failed:", err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
