import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

function isMissingTableError(e: { message?: string; code?: string }): boolean {
  const msg = (e?.message || "").toLowerCase()
  return (
    msg.includes("does not exist") ||
    (msg.includes("relation") && msg.includes("national_team_interest")) ||
    (e as any)?.code === "42P01"
  )
}

/** NHSCA + AAU duals roster columns (admin national-team submissions). */
const NATIONAL_TEAM_DUALS_MIGRATION_SQL = `ALTER TABLE public.national_team_interest_forms
  ADD COLUMN IF NOT EXISTS nhsca_duals_team text,
  ADD COLUMN IF NOT EXISTS nhsca_duals_starter boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS aau_duals_team text,
  ADD COLUMN IF NOT EXISTS aau_duals_starter boolean DEFAULT false;`

function isMissingColumnError(e: { message?: string }): boolean {
  const msg = (e?.message || "").toLowerCase()
  return msg.includes("could not find") && (msg.includes("column") || msg.includes("schema cache"))
}

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

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
    }

    let adminClient
    const debug = typeof request.nextUrl?.searchParams?.get("debug") === "string"

    try {
      adminClient = createAdminClient()
    } catch (e: any) {
      if (/SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY/.test(e?.message || "")) {
        console.error("[Admin API] GET national_team_interest_forms: Supabase env missing —", e?.message)
        const payload: Record<string, unknown> = {
          ok: false,
          error:
            "Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to environment variables.",
        }
        if (debug) payload.debug = { reason: "config_missing", rawMessage: e?.message }
        return NextResponse.json(payload, { status: 503 })
      }
      throw e
    }

    const { data, error } = await adminClient
      .from("national_team_interest_forms")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[Admin API] GET national_team_interest_forms ERROR:", error?.message, error?.code, error?.details)
      if (isMissingTableError(error)) {
        const payload: Record<string, unknown> = {
          ok: false,
          error:
            "The submissions table does not exist. Run the migration: scripts/206-create-national-team-interest-form-table.sql",
        }
        if (debug) payload.debug = { reason: "missing_table", rawMessage: error?.message }
        return NextResponse.json(payload, { status: 503 })
      }
      const payload: Record<string, unknown> = {
        ok: false,
        error: error.message || "Failed to fetch submissions",
      }
      if (debug) payload.debug = { reason: "query_error", rawMessage: error?.message, code: (error as any)?.code }
      return NextResponse.json(payload, { status: 500 })
    }

    const count = data?.length ?? 0
    console.log(`[Admin API] GET national_team_interest_forms: success, count=${count}`)

    const payload: Record<string, unknown> = {
      ok: true,
      submissions: data || [],
      count,
    }
    if (debug)
      payload.debug = { rowCount: count, note: count === 0 ? "Table exists but no rows. Form submissions go here." : "OK" }
    return NextResponse.json(payload)
  } catch (error: any) {
    console.error("[Admin API] Exception fetching submissions:", error)
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to fetch submissions" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ ok: false, error: "Submission ID is required" }, { status: 400 })
    }

    let adminClient
    try {
      adminClient = createAdminClient()
    } catch (e: any) {
      if (/SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY/.test(e?.message || "")) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to environment variables.",
          },
          { status: 503 }
        )
      }
      throw e
    }

    const updateData: any = {
      ...updates,
      updated_at: new Date().toISOString(),
    }

    if (updates.status && updates.status !== "pending") {
      updateData.reviewed_at = new Date().toISOString()
    }

    const { data, error } = await adminClient
      .from("national_team_interest_forms")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("[Admin API] Error updating submission:", error)
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "The submissions table does not exist. Run the migration: scripts/206-create-national-team-interest-form-table.sql",
          },
          { status: 503 }
        )
      }
      if (isMissingColumnError(error)) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Missing database columns for duals roster (NHSCA and/or AAU team/starter). Run the SQL below in Supabase SQL Editor.",
            fixMigrationSql: NATIONAL_TEAM_DUALS_MIGRATION_SQL,
          },
          { status: 503 }
        )
      }
      return NextResponse.json(
        { ok: false, error: error.message || "Failed to update submission" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      submission: data,
    })
  } catch (error: any) {
    console.error("[Admin API] Exception updating submission:", error)
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to update submission" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
    }

    const body = await request.json().catch(() => ({}))
    const id = body?.id

    if (!id) {
      return NextResponse.json({ ok: false, error: "Submission ID is required" }, { status: 400 })
    }

    let adminClient
    try {
      adminClient = createAdminClient()
    } catch (e: any) {
      if (/SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY/.test(e?.message || "")) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to environment variables.",
          },
          { status: 503 }
        )
      }
      throw e
    }

    const { error } = await adminClient
      .from("national_team_interest_forms")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("[Admin API] Error deleting submission:", error)
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "The submissions table does not exist. Run the migration: scripts/206-create-national-team-interest-form-table.sql",
          },
          { status: 503 }
        )
      }
      return NextResponse.json(
        { ok: false, error: error.message || "Failed to delete submission" },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error("[Admin API] Exception deleting submission:", error)
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to delete submission" },
      { status: 500 }
    )
  }
}
