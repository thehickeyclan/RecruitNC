export const dynamic = "force-dynamic"
export const revalidate = 0

import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { buildAthleteUpdateFromRequest } from "@/lib/admin/apply-edit-request"
import { resolveClubName, resolveSchoolName } from "@/lib/admin/canonical-affiliations"

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

    // Load existing request with user and athlete info for email
    const { data: existing, error: loadErr } = await svc
      .from("edit_requests")
      .select("request_data, user_id, athlete_id, status")
      .eq("id", requestId)
      .maybeSingle()

    if (loadErr) {
      console.error("Failed to load existing request_data:", loadErr)
      return NextResponse.json({ error: "Failed to load request" }, { status: 500 })
    }

    if (!existing) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
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

    /**
     * Approving has to change the profile, not just the row.
     *
     * This step did not exist: approve set a status and sent the family an email saying the change
     * was made, while the athlete record kept its old values. Anything free-text is reported back
     * in `manual` rather than guessed at — see buildAthleteUpdateFromRequest.
     */
    let applied: Record<string, string | number> = {}
    let manual: string[] = []
    if (status === "approved" && existing.athlete_id) {
      const plan = buildAthleteUpdateFromRequest(existing.request_data as never)
      applied = plan.updates
      manual = plan.manual

      /**
       * Club and school names are logo join keys. Take the registry's spelling, and refuse a name
       * that is not in the registry rather than writing text that resolves to no crest.
       */
      if (typeof applied.wrestlingClub === "string") {
        const club = await resolveClubName(svc, applied.wrestlingClub)
        if (club.ok) {
          applied.wrestlingClub = club.canonical
          if (club.clubId != null) applied.wrestling_club_id = club.clubId
        } else {
          delete applied.wrestlingClub
          manual = [...manual, `Club not applied: ${club.reason}`]
        }
      }
      if (typeof applied.highschool === "string") {
        const school = await resolveSchoolName(svc, applied.highschool)
        if (school.ok) applied.highschool = school.canonical
        else {
          delete applied.highschool
          manual = [...manual, `School not applied: ${school.reason}`]
        }
      }
      if (Object.keys(applied).length > 0) {
        const { error: applyErr } = await svc
          .from("athletes")
          .update({ ...applied, updated_at: new Date().toISOString() })
          .eq("id", existing.athlete_id)
        if (applyErr) {
          console.error("Failed to apply approved edit to athlete:", applyErr)
          /** Put the request back so it is not silently marked done against an unchanged profile. */
          await svc.from("edit_requests").update({ status: "pending" }).eq("id", requestId)
          return NextResponse.json(
            { error: `Approved, but the profile could not be updated: ${applyErr.message}. The request has been left pending.` },
            { status: 500 },
          )
        }
      }
    }

    // Send email notification if status is approved or rejected
    if ((status === "approved" || status === "rejected") && existing.user_id && existing.athlete_id) {
      try {
        // Fetch user and athlete info for email
        const [{ data: userProfile }, { data: athlete }] = await Promise.all([
          svc
            .from("user_profiles")
            .select("email, first_name, last_name")
            .eq("user_id", existing.user_id)
            .maybeSingle(),
          svc.from("athletes").select("name").eq("id", existing.athlete_id).maybeSingle(),
        ])

        if (userProfile?.email && athlete?.name) {
          const userName = `${userProfile.first_name || ""} ${userProfile.last_name || ""}`.trim() || "User"
          const { sendEditRequestNotification } = await import("@/lib/email")
          
          // Send email asynchronously (don't block the response)
          sendEditRequestNotification({
            to: userProfile.email,
            userName,
            athleteName: athlete.name,
            status,
            adminNotes: adminNotes || undefined,
          }).catch((emailError) => {
            // Log but don't fail the request if email fails
            console.error("Failed to send email notification:", emailError)
          })
        }
      } catch (emailError) {
        // Log but don't fail the request if email fails
        console.error("Error preparing email notification:", emailError)
      }
    }

    return NextResponse.json({ success: true, data: updated, applied, manual })
  } catch (error) {
    console.error("PUT /api/admin/edit-requests error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
