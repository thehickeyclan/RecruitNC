import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/admin-auth"
import { toCheckInList } from "@/lib/toc/coach-designation"

/** The deduped coach list, and approving or declining one. */

export const dynamic = "force-dynamic"

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error, coaches: [] }, { status: auth.status })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("toc_coach_designations")
    .select("coach_key,coach_name,coach_email,coach_phone,status,athlete_name,weight_class,relationship,submitted_club,submitted_dob")
    .order("created_at", { ascending: true })

  if (error) {
    console.error("[toc coaches] load:", error.message)
    return NextResponse.json({ error: "Could not load coaches.", coaches: [] }, { status: 500 })
  }

  const coaches = toCheckInList(data ?? [])
  return NextResponse.json({
    coaches,
    totals: {
      coaches: coaches.length,
      designations: (data ?? []).length,
      approved: coaches.filter((c) => c.status === "approved").length,
      pending: coaches.filter((c) => c.status === "pending").length,
    },
  })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = (await request.json().catch(() => null)) as { coachKey?: unknown; status?: unknown } | null
  const coachKey = typeof body?.coachKey === "string" ? body.coachKey.trim().toLowerCase() : ""
  const status = String(body?.status ?? "")

  if (!coachKey) return NextResponse.json({ error: "Which coach?" }, { status: 400 })
  if (!["approved", "declined", "pending"].includes(status)) {
    return NextResponse.json({ error: "Unknown status." }, { status: 400 })
  }

  // A decision is about the person, not one of their wrestlers: the lanyard is per coach, so
  // every row for that coach moves together.
  const admin = createAdminClient()
  const { error } = await admin
    .from("toc_coach_designations")
    .update({ status, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("coach_key", coachKey)

  if (error) {
    console.error("[toc coaches] review:", error.message)
    return NextResponse.json({ error: "Could not save that." }, { status: 500 })
  }
  return NextResponse.json({ ok: true, coachKey, status })
}
