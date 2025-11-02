export const dynamic = "force-dynamic"
export const revalidate = 0

import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Server-only service client to bypass RLS for trusted operations
function createServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error("Supabase server environment not configured")
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function GET(request: NextRequest) {
  try {
    const svc = createServiceClient()
    const url = new URL(request.url)
    const status = url.searchParams.get("status") // pending | approved | rejected | all | null
    const athleteId = url.searchParams.get("athlete") // optional filter by athlete_id

    let query = svc.from("edit_requests").select("*").order("created_at", { ascending: false })
    if (athleteId) query = query.eq("athlete_id", athleteId)
    if (status && status !== "all") query = query.eq("status", status)

    const { data: editRequests, error: requestsError } = await query
    if (requestsError) {
      console.error("Error fetching edit requests:", requestsError)
      return NextResponse.json({ error: `Database error: ${requestsError.message}` }, { status: 500 })
    }

    if (!editRequests || editRequests.length === 0) {
      return NextResponse.json({
        requests: [],
        total: 0,
        stats: { pending: 0, approved: 0, rejected: 0 },
      })
    }

    // Enrich with user profile and athlete basics to match UI needs
    const userIds = [...new Set(editRequests.map((r: any) => r.user_id).filter(Boolean))]
    const athleteIds = [...new Set(editRequests.map((r: any) => r.athlete_id).filter(Boolean))]

    const safeUserIds = userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]
    const safeAthleteIds = athleteIds.length ? athleteIds : ["00000000-0000-0000-0000-000000000000"]

    const [{ data: userProfiles }, { data: athletes }] = await Promise.all([
      svc.from("user_profiles").select("user_id, email, first_name, last_name").in("user_id", safeUserIds),
      svc.from("athletes").select("id, name, highschool, college").in("id", safeAthleteIds),
    ])

    const userMap = new Map((userProfiles ?? []).map((u: any) => [u.user_id, u]))
    const athleteMap = new Map((athletes ?? []).map((a: any) => [a.id, a]))

    const formattedRequests = editRequests.map((request: any) => {
      const userProfile = userMap.get(request.user_id)
      const athlete = athleteMap.get(request.athlete_id)
      return {
        id: request.id,
        user_id: request.user_id,
        athlete_id: request.athlete_id,
        athlete_name: athlete?.name || "Unknown Athlete",
        athlete_high_school: athlete?.highschool || "",
        athlete_college: athlete?.college || "",
        user_email: userProfile?.email || "Unknown User",
        user_name: `${userProfile?.first_name || ""} ${userProfile?.last_name || ""}`.trim() || "Unknown",
        request_type: request.request_type,
        status: request.status,
        request_data: request.request_data,
        admin_notes: request.admin_notes,
        created_at: request.created_at,
        updated_at: request.updated_at,
        reviewed_by: request.reviewed_by,
        reviewed_at: request.reviewed_at,
      }
    })

    const stats = {
      pending: formattedRequests.filter((r) => r.status === "pending").length,
      approved: formattedRequests.filter((r) => r.status === "approved").length,
      rejected: formattedRequests.filter((r) => r.status === "rejected").length,
    }

    return NextResponse.json({
      requests: formattedRequests,
      total: formattedRequests.length,
      stats,
    })
  } catch (error) {
    console.error("GET /api/admin/edit-requests error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const svc = createServiceClient()
    const body = await request.json()
    const { requestId, status, adminNotes } = body as {
      requestId: string
      status: "approved" | "rejected" | "pending"
      adminNotes?: string
    }

    if (!requestId || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Load existing request_data to merge admin notes
    const { data: existing, error: loadErr } = await svc
      .from("edit_requests")
      .select("request_data")
      .eq("id", requestId)
      .maybeSingle()

    if (loadErr) {
      console.error("Failed to load existing request_data:", loadErr)
      return NextResponse.json({ error: "Failed to load request" }, { status: 500 })
    }

    const mergedRequestData =
      typeof existing?.request_data === "object" && existing.request_data !== null
        ? { ...existing.request_data, ...(adminNotes ? { adminNotes } : {}) }
        : adminNotes
          ? { adminNotes }
          : (existing?.request_data ?? {})

    // Build base payload (no reviewed_at / reviewed_by)
    const baseUpdate: Record<string, any> = {
      status,
      request_data: mergedRequestData,
    }

    // First try including updated_at (if the column exists)
    let { data: updated, error: updErr } = await svc
      .from("edit_requests")
      .update({ ...baseUpdate, updated_at: new Date().toISOString() })
      .eq("id", requestId)
      .select("*")
      .maybeSingle()

    // If the schema doesn't have updated_at, retry without it
    if (updErr && /updated_at/i.test(updErr.message || "")) {
      const retry = await svc.from("edit_requests").update(baseUpdate).eq("id", requestId).select("*").maybeSingle()
      updated = retry.data
      updErr = retry.error as any
    }

    if (updErr) {
      console.error("Failed to update edit request:", updErr)
      return NextResponse.json({ error: "Failed to update request" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error("PUT /api/admin/edit-requests error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
