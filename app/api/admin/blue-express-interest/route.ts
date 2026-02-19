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
    const { data: rows, error } = await adminClient
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

    const list = rows ?? []
    const ids = list.map((r: { id: string }) => r.id)

    // If blue_invites has interest_id, attach invite sent / enrolled status per submission
    let invitesByInterest: Record<string, { invite_id: string; used_at: string | null }> = {}
    if (ids.length > 0) {
      const { data: invites, error: invError } = await adminClient
        .from("blue_invites")
        .select("id, interest_id, used_at")
        .in("interest_id", ids)
      if (!invError && Array.isArray(invites)) {
        for (const inv of invites) {
          const iid = (inv as { interest_id?: string }).interest_id
          if (iid) invitesByInterest[iid] = { invite_id: (inv as { id: string }).id, used_at: (inv as { used_at: string | null }).used_at }
        }
      }
      // If interest_id column doesn't exist, invError is set; submissions still return without link
    }

    const submissions = list.map((row: Record<string, unknown> & { id: string }) => {
      const link = invitesByInterest[row.id]
      return {
        ...row,
        invite_id: link?.invite_id ?? null,
        invite_sent: !!link,
        enrolled: !!link?.used_at,
      }
    })
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
