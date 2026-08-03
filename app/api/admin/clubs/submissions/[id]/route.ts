import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createClient } from "@/lib/supabase/server"
import { createAdminClientFresh } from "@/lib/supabase/admin"
import { normalizeClubName } from "@/lib/clubs/club-normalize"
import { programSummary, sanitizeClubWebsite, type ClubSubmissionRow } from "@/lib/clubs/club-submissions"

export const dynamic = "force-dynamic"

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

async function currentUserId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const admin = createAdminClientFresh()
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const action = String(body.action ?? "save")
  const reviewedBy = await currentUserId()

  const { data: submission, error: fetchError } = await admin
    .from("wrestling_club_submissions")
    .select("*")
    .eq("id", params.id)
    .maybeSingle()

  if (fetchError) {
    console.error("[admin/clubs/submissions/:id]", fetchError)
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }
  if (!submission) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 })
  }

  const row = submission as ClubSubmissionRow
  const now = new Date().toISOString()
  const latitude = nullableNumber(body.latitude)
  const longitude = nullableNumber(body.longitude)
  const adminNotes = String(body.adminNotes ?? row.admin_notes ?? "").trim() || null

  if (action === "approve") {
    const normalizedName = normalizeClubName(row.club_name)
    const clubPayload = {
      name: row.club_name,
      normalized_name: normalizedName,
      location: row.city || row.address,
      address: row.address,
      city: row.city,
      state: row.state || "NC",
      zip_code: row.zip_code,
      latitude,
      longitude,
      website: sanitizeClubWebsite(row.website),
      contact_email: row.contact_email,
      contact_phone: row.contact_phone,
      verified: true,
      boys_program: row.has_mens,
      girls_program: row.has_womens,
      youth_program: row.has_youth,
      middle_school_program: row.has_middle_school,
      high_school_program: row.has_high_school,
      freestyle_greco: row.has_freestyle_greco,
      programs_offered: programSummary(row),
      public_notes: row.notes,
      updated_at: now,
    }

    const { data: existingClub } = await admin
      .from("wrestling_clubs")
      .select("id")
      .eq("normalized_name", normalizedName)
      .limit(1)
      .maybeSingle()

    const clubResult = existingClub?.id
      ? await admin.from("wrestling_clubs").update(clubPayload).eq("id", existingClub.id).select("id").single()
      : await admin.from("wrestling_clubs").insert(clubPayload).select("id").single()

    if (clubResult.error) {
      console.error("[admin/clubs/submissions/:id approve]", clubResult.error)
      return NextResponse.json({ error: clubResult.error.message }, { status: 500 })
    }

    const approvedClubId = clubResult.data.id as number

    await admin
      .from("wrestling_club_aliases")
      .upsert(
        {
          club_id: approvedClubId,
          alias: row.club_name,
          normalized_alias: normalizedName,
        },
        { onConflict: "club_id,normalized_alias" },
      )

    const { data: updated, error: updateError } = await admin
      .from("wrestling_club_submissions")
      .update({
        status: "approved",
        admin_notes: adminNotes,
        latitude,
        longitude,
        approved_club_id: approvedClubId,
        reviewed_by_user_id: reviewedBy,
        reviewed_at: now,
        updated_at: now,
      })
      .eq("id", params.id)
      .select("*")
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true, submission: updated })
  }

  const nextStatus =
    action === "decline" ? "declined" : action === "needs_info" ? "needs_info" : String(body.status ?? row.status)

  const { data: updated, error: updateError } = await admin
    .from("wrestling_club_submissions")
    .update({
      status: nextStatus,
      admin_notes: adminNotes,
      latitude,
      longitude,
      reviewed_by_user_id: action === "save" ? row.reviewed_by_user_id : reviewedBy,
      reviewed_at: action === "save" ? row.reviewed_at : now,
      updated_at: now,
    })
    .eq("id", params.id)
    .select("*")
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, submission: updated })
}
