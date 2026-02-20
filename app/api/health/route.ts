import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * GET /api/health
 *
 * Safe diagnostic route to verify Supabase config and DB reachability after a deploy.
 * Use after changing env vars to confirm one project/key without redeploying.
 * Does not expose secrets (no URLs or keys in response).
 */
export async function GET() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const keyOverride = process.env.SUPABASE_SERVICE_ROLE_KEY_OVERRIDE
  const keyIntegration = process.env.SUPABASE_SERVICE_ROLE_KEY
  const keySource = keyOverride ? "OVERRIDE" : keyIntegration ? "integration" : "none"

  if (!url || !keySource || keySource === "none") {
    return NextResponse.json(
      {
        ok: false,
        error: "Supabase not configured",
        supabase: { url: !!url, keySource },
      },
      { status: 503 }
    )
  }

  try {
    const supabase = createAdminClient()
    const { count, error } = await supabase
      .from("athletes")
      .select("id", { count: "exact", head: true })

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: "DB reachable but query failed",
          supabase: { url: true, keySource },
          dbError: error.code || error.message,
        },
        { status: 503 }
      )
    }

    return NextResponse.json({
      ok: true,
      supabase: { url: true, keySource },
      db: { athletesTable: "ok", count: count ?? null },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      {
        ok: false,
        error: "Supabase client or DB failed",
        supabase: { url: true, keySource },
        detail: message.slice(0, 100),
      },
      { status: 503 }
    )
  }
}
