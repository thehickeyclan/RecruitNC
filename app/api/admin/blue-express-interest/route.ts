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

    async function fetchRows(): Promise<{ rows: unknown[]; error: { message: string; code?: string } | null }> {
      const { data, error } = await adminClient
        .from("blue_express_interest")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5000)
      return { rows: data ?? [], error }
    }

    let result = await fetchRows()
    if (result.error) {
      console.error("[Admin API] GET blue_express_interest error:", result.error?.message, "code:", result.error?.code)
      if (result.error.code === "42P01") {
        return NextResponse.json(
          { ok: false, error: "Table blue_express_interest does not exist. Run the SQL in docs/blue-express-interest-table.md (or Blue tables doc) in Supabase SQL Editor.", code: "TABLE_MISSING" },
          { status: 503 }
        )
      }
      return NextResponse.json({ ok: false, error: result.error.message }, { status: 500 })
    }

    if (result.rows.length === 0) {
      await new Promise((r) => setTimeout(r, 1200))
      result = await fetchRows()
      if (result.error) {
        return NextResponse.json({ ok: false, error: result.error.message }, { status: 500 })
      }
    }

    const list = result.rows as { id: string; status?: string }[]
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

    const submissions = list.map((row: Record<string, unknown> & { id: string; status?: string }) => {
      const link = invitesByInterest[row.id]
      const status = row.status && STATUS_VALUES.includes(row.status as (typeof STATUS_VALUES)[number]) ? row.status : "text_sent"
      return {
        ...row,
        status,
        invite_id: link?.invite_id ?? null,
        invite_sent: !!link,
        enrolled: !!link?.used_at,
      }
    })
    if (submissions.length === 0) {
      console.warn("[Admin API] blue_express_interest: 0 rows. If table has data, set SUPABASE_SERVICE_ROLE_KEY to the service role key (not anon) in Vercel for this environment.")
    } else {
      console.log("[Admin API] blue_express_interest fetched:", submissions.length, "rows")
    }
    const response = NextResponse.json({
      ok: true,
      submissions,
      count: submissions.length,
      zeroRowsHint: submissions.length === 0,
    })
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
    response.headers.set("Pragma", "no-cache")
    response.headers.set("Expires", "0")
    return response
  } catch (err: unknown) {
    console.error("[Admin API] blue-express-interest:", err)
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to fetch submissions" },
      { status: 500 }
    )
  }
}

const STATUS_VALUES = ["text_sent", "invite_sent", "registered", "declined"] as const

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
    }
    const body = await request.json()
    const id = body.id
    const status = body.status
    if (!id || typeof id !== "string") {
      return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 })
    }
    if (!status || !STATUS_VALUES.includes(status)) {
      return NextResponse.json({ ok: false, error: "Invalid status. Use: text_sent, invite_sent, registered, declined" }, { status: 400 })
    }
    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from("blue_express_interest")
      .update({ status })
      .eq("id", id)
    if (error) {
      if (error.code === "42P01") {
        return NextResponse.json({ ok: false, error: "Table blue_express_interest does not exist" }, { status: 503 })
      }
      if (error.message?.includes("violates check constraint") || error.message?.includes("status")) {
        return NextResponse.json({ ok: false, error: "Add status column. Run SQL in docs/blue-express-interest-table.md" }, { status: 400 })
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    console.error("[Admin API] blue-express-interest PATCH:", err)
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to update" },
      { status: 500 }
    )
  }
}
