import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST() {
  try {
    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !serviceRoleKey) {
      return NextResponse.json({ error: "Supabase URL or Service Role Key is not configured" }, { status: 500 })
    }

    // Server-side Supabase client with Service Role (bypasses RLS for this RPC)
    const supabase = createClient(url, serviceRoleKey, {
      auth: { persistSession: false },
    })

    const { data, error } = await supabase.rpc("sync_athlete_divisions")

    if (error) {
      // If the function doesn't exist, guide the operator to install it.
      const hint =
        "If this complains the function does not exist, run scripts/create-sync-function.sql in Supabase SQL Editor, then try again."
      return NextResponse.json({ ok: false, error: error.message, hint }, { status: 500 })
    }

    const rowsUpdated = typeof data === "number" ? data : 0
    return NextResponse.json({ ok: true, rowsUpdated })
  } catch (err: any) {
    console.error("Division sync failed:", err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: "POST to this endpoint to run the sync via Supabase RPC.",
  })
}
