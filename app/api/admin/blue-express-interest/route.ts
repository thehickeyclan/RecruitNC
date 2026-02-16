import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { ok: false as const, status: 401 as const, error: "Unauthorized" }
  }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) {
    return { ok: false as const, status: 403 as const, error: "Admin access required" }
  }
  return { ok: true as const }
}

export async function GET(_request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
    }

    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from("blue_express_interest")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[Admin API] GET blue_express_interest error:", error?.message, "code:", error?.code)
      if (error.code === "42P01") {
        return NextResponse.json(
          { ok: false, error: "Table blue_express_interest does not exist. See docs/blue-express-interest-table.md" },
          { status: 503 }
        )
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    const submissions = data ?? []
    console.log("[Admin API] blue_express_interest fetched:", submissions.length, "rows")
    const response = NextResponse.json({ ok: true, submissions, count: submissions.length })
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
    return response
  } catch (err: unknown) {
    console.error("[Admin API] blue-express-interest:", err)
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to fetch submissions" },
      { status: 500 }
    )
  }
}
