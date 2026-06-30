import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendTocAthleteInviteEmail } from "@/lib/toc/email"
import { buildTocAthleteInviteMessage } from "@/lib/toc/invite-message"
import { confirmPageUrl, resolveAthleteNotificationEmails } from "@/lib/toc/invitation-service"
import { tocAdminInviteSchema } from "@/lib/toc/invitations"

export const dynamic = "force-dynamic"

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("toc_invitations")
    .select("*, athletes(id, name, highschool, graduationyear)")
    .order("created_at", { ascending: false })

  if (error) {
    if (error.code === "42P01") {
      return NextResponse.json({ invitations: [], unavailable: true })
    }
    if (error.code === "42703") {
      return NextResponse.json(
        {
          error:
            "TOC Phase 2 columns missing in Supabase. Run docs/sql/toc-phase-2-invitations.sql.txt in the SQL Editor, then refresh.",
          migrationRequired: true,
        },
        { status: 503 },
      )
    }
    console.error("[admin/toc/invitations]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ invitations: data ?? [] })
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const body = await request.json()
    const parsed = tocAdminInviteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 })
    }

    const { athleteId, weightClass, notes, sendEmail } = parsed.data
    const admin = createAdminClient()

    const { data: athlete, error: athleteError } = await admin.from("athletes").select("*").eq("id", athleteId).maybeSingle()
    if (athleteError || !athlete) {
      return NextResponse.json({ error: "Athlete not found" }, { status: 404 })
    }

    const now = new Date().toISOString()

    const { data: existing } = await admin
      .from("toc_invitations")
      .select("id, status")
      .eq("athlete_id", athleteId)
      .maybeSingle()

    let invitationId: string

    if (existing) {
      if (existing.status === "confirmed") {
        return NextResponse.json({ error: "Athlete is already confirmed." }, { status: 400 })
      }
      const { data: updated, error: updateError } = await admin
        .from("toc_invitations")
        .update({
          weight_class: weightClass,
          status: "invited",
          invited_at: now,
          updated_at: now,
          notes: notes ?? null,
        })
        .eq("id", existing.id)
        .select("id")
        .single()

      if (updateError) {
        console.error("[admin/toc/invitations]", updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
      invitationId = updated.id
    } else {
      const { data: inserted, error: insertError } = await admin
        .from("toc_invitations")
        .insert({
          athlete_id: athleteId,
          weight_class: weightClass,
          status: "invited",
          invited_at: now,
          notes: notes ?? null,
        })
        .select("id")
        .single()

      if (insertError) {
        console.error("[admin/toc/invitations]", insertError)
        if (insertError.code === "42P01") {
          return NextResponse.json({ error: "Run toc-phase-1 SQL in Supabase first." }, { status: 503 })
        }
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
      invitationId = inserted.id
    }

    const athleteName = String(athlete.name ?? "Athlete")
    const confirmUrl = confirmPageUrl(athleteId)
    const share = buildTocAthleteInviteMessage({ athleteName, weightClass, confirmUrl })

    if (sendEmail) {
      const emails = await resolveAthleteNotificationEmails(admin, athleteId, athlete as Record<string, unknown>)
      if (emails.length === 0) {
        return NextResponse.json({
          ok: true,
          id: invitationId,
          warning: "Invitation saved but no athlete/parent email on file — copy the text or link below and send manually.",
          confirmUrl,
          share,
        })
      }
      void sendTocAthleteInviteEmail({
        to: emails,
        athleteName,
        weightClass,
        confirmUrl,
      })
    }

    return NextResponse.json({
      ok: true,
      id: invitationId,
      confirmUrl,
      share,
      emailed: Boolean(sendEmail),
    })
  } catch (e) {
    console.error("[admin/toc/invitations]", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
