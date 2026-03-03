import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAll2026Results, getPlacement2026FromRows } from "@/lib/nchsaa-results"

export const dynamic = "force-dynamic"

function normalizeNameForMatch(first: string, last: string): string {
  return `${(first ?? "").trim().toLowerCase()} ${(last ?? "").trim().toLowerCase()}`
}

async function requireAdmin(retry = false): Promise<{ ok: true } | { ok: false; status: 401 | 403; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    if (!retry) {
      await new Promise((r) => setTimeout(r, 400))
      return requireAdmin(true)
    }
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

    let adminClient
    try {
      adminClient = createAdminClient()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : ""
      console.error("[Admin API] blue-express-interest createAdminClient failed:", msg)
      return NextResponse.json(
        {
          ok: false,
          error:
            "Supabase service role is not configured. In Vercel → Settings → Environment Variables set SUPABASE_SERVICE_ROLE_KEY to the service_role key (Supabase Dashboard → Settings → API), not the anon key. Then redeploy.",
        },
        { status: 503 }
      )
    }

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

    const list = result.rows as { id: string; status?: string; first_name?: string; last_name?: string; graduation_year?: string }[]
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
    }

    // Single query for 2026 placements (avoids N+1 and timeouts)
    let rows2026: Awaited<ReturnType<typeof getAll2026Results>> = []
    try {
      rows2026 = await getAll2026Results(adminClient)
    } catch (e) {
      console.warn("[Admin API] blue-express-interest getAll2026Results:", e)
    }

    // Who actually signed up: blue_signups (by athlete name + grad year) and blue_memberships + athletes
    const enrolledKeys = new Set<string>()
    try {
      const { data: signups } = await adminClient
        .from("blue_signups")
        .select("athlete_first_name, athlete_last_name, athlete_graduation_year")
        .limit(5000)
      if (Array.isArray(signups)) {
        for (const s of signups) {
          const first = (s as { athlete_first_name?: string }).athlete_first_name ?? ""
          const last = (s as { athlete_last_name?: string }).athlete_last_name ?? ""
          const gy = (s as { athlete_graduation_year?: number }).athlete_graduation_year
          if (first || last) enrolledKeys.add(normalizeNameForMatch(first, last) + "|" + String(gy ?? ""))
        }
      }
      const { data: memberships } = await adminClient
        .from("blue_memberships")
        .select("athlete_id")
        .in("status", ["active", "pending_payment"])
        .limit(2000)
      if (Array.isArray(memberships) && memberships.length > 0) {
        const aids = [...new Set((memberships as { athlete_id: string }[]).map((m) => m.athlete_id))]
        const { data: athletes } = await adminClient.from("athletes").select("id, name, graduationyear").in("id", aids)
        if (Array.isArray(athletes)) {
          for (const a of athletes) {
            const name = (a as { name?: string }).name ?? ""
            const gy = (a as { graduationyear?: number }).graduationyear ?? ""
            if (name) {
              const parts = (name as string).trim().split(/\s+/)
              const first = parts[0] ?? ""
              const last = parts.slice(1).join(" ")
              enrolledKeys.add(normalizeNameForMatch(first, last) + "|" + String(gy))
            }
          }
        }
      }
    } catch (e) {
      console.warn("[Admin API] blue-express-interest enrolled lookup:", e)
    }

    const submissions: Array<Record<string, unknown> & { placement_2026?: string | null }> = []
    for (const row of list) {
      const link = invitesByInterest[row.id]
      const status = row.status != null && row.status !== "" && STATUS_VALUES.includes(row.status as (typeof STATUS_VALUES)[number]) ? row.status : null
      const first = (row.first_name ?? "").toString().trim()
      const last = (row.last_name ?? "").toString().trim()
      const gradYearStr = (row.graduation_year ?? "").toString().trim()
      const gradYearNum = parseInt(gradYearStr, 10)
      const enrolledFromInvite = !!link?.used_at
      const enrolledFromSignup = enrolledKeys.has(normalizeNameForMatch(first, last) + "|" + gradYearStr) || (gradYearNum && enrolledKeys.has(normalizeNameForMatch(first, last) + "|" + String(gradYearNum)))
      const enrolled = enrolledFromInvite || enrolledFromSignup

      const placement_2026 = getPlacement2026FromRows(
        rows2026,
        `${first} ${last}`.trim(),
        gradYearNum || undefined
      )

      submissions.push({
        ...row,
        status: status ?? null,
        regional: row.regional ?? null,
        placement: row.placement ?? null,
        invite_id: link?.invite_id ?? null,
        invite_sent: !!link,
        enrolled,
        placement_2026,
      })
    }
    if (submissions.length === 0) {
      console.warn("[Admin API] blue_express_interest: 0 rows. If table has data, set SUPABASE_SERVICE_ROLE_KEY (service role, not anon) in Vercel for this environment.")
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
const REGIONAL_VALUES = ["1A", "2A", "3A", "4A", "5A", "6A", "7A", "8A"] as const
const PLACEMENT_VALUES = ["1st", "2nd", "3rd", "4th"] as const

function isValidStatus(v: unknown): v is (typeof STATUS_VALUES)[number] | "" | null {
  if (v === "" || v === null || v === undefined) return true
  return typeof v === "string" && STATUS_VALUES.includes(v as (typeof STATUS_VALUES)[number])
}
function isValidRegional(v: unknown): v is (typeof REGIONAL_VALUES)[number] | "" | null {
  if (v === "" || v === null || v === undefined) return true
  return typeof v === "string" && REGIONAL_VALUES.includes(v as (typeof REGIONAL_VALUES)[number])
}
function isValidPlacement(v: unknown): v is (typeof PLACEMENT_VALUES)[number] | "" | null {
  if (v === "" || v === null || v === undefined) return true
  return typeof v === "string" && PLACEMENT_VALUES.includes(v as (typeof PLACEMENT_VALUES)[number])
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
    }
    const body = await request.json()
    const id = body.id
    if (!id || typeof id !== "string") {
      return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 })
    }
    const updates: Record<string, string | null> = {}
    if (body.hasOwnProperty("status")) {
      if (!isValidStatus(body.status)) {
        return NextResponse.json({ ok: false, error: "Invalid status. Use: (blank), text_sent, invite_sent, registered, declined" }, { status: 400 })
      }
      updates.status = body.status === "" || body.status == null ? null : body.status
    }
    if (body.hasOwnProperty("regional")) {
      if (!isValidRegional(body.regional)) {
        return NextResponse.json({ ok: false, error: "Invalid regional. Use: (blank), 1A–8A" }, { status: 400 })
      }
      updates.regional = body.regional === "" || body.regional == null ? null : body.regional
    }
    if (body.hasOwnProperty("placement")) {
      if (!isValidPlacement(body.placement)) {
        return NextResponse.json({ ok: false, error: "Invalid placement. Use: (blank), 1st, 2nd, 3rd, 4th" }, { status: 400 })
      }
      updates.placement = body.placement === "" || body.placement == null ? null : body.placement
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: false, error: "Provide at least one of: status, regional, placement" }, { status: 400 })
    }
    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from("blue_express_interest")
      .update(updates)
      .eq("id", id)
    if (error) {
      if (error.code === "42P01") {
        return NextResponse.json({ ok: false, error: "Table blue_express_interest does not exist" }, { status: 503 })
      }
      if (error.message?.includes("violates check constraint")) {
        return NextResponse.json({ ok: false, error: "Column or constraint missing. Run SQL in docs/blue-express-interest-table.md" }, { status: 400 })
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
