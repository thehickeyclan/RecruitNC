import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendTocAthleteConfirmedEmail } from "@/lib/toc/email"
import {
  assertWeightClassHasCapacity,
  resolveAthleteNotificationEmails,
} from "@/lib/toc/invitation-service"
import { tocAthleteConfirmSchema } from "@/lib/toc/invitations"
import {
  confirmDeadlineMessage,
  isConfirmPastDeadline,
  TOC_CONFIRM_WITHIN_DAYS,
} from "@/lib/toc/registration-policy"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = tocAthleteConfirmSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid submission" },
        { status: 400 },
      )
    }

    const input = parsed.data
    const admin = createAdminClient()

    const { data: invitation, error: findError } = await admin
      .from("toc_invitations")
      .select("*")
      .eq("athlete_id", input.athleteId)
      .maybeSingle()

    if (findError?.code === "42P01") {
      return NextResponse.json({ ok: false, error: "Confirmation is not available yet." }, { status: 503 })
    }
    if (findError) {
      console.error("[toc/athlete-confirm]", findError)
      return NextResponse.json({ ok: false, error: "Failed to load invitation" }, { status: 500 })
    }
    if (!invitation) {
      return NextResponse.json(
        { ok: false, error: "No invitation found for this athlete. Contact NC United if you believe this is an error." },
        { status: 400 },
      )
    }
    if (invitation.status === "confirmed") {
      return NextResponse.json({ ok: true, alreadyConfirmed: true })
    }
    if (invitation.status !== "invited") {
      return NextResponse.json(
        { ok: false, error: "This invitation is not open for confirmation." },
        { status: 400 },
      )
    }

    if (isConfirmPastDeadline(invitation.invited_at)) {
      const deadline = confirmDeadlineMessage(invitation.invited_at)
      return NextResponse.json(
        {
          ok: false,
          error: deadline
            ? `The confirmation window closed on ${deadline}. Contact ${process.env.TOC_CONTACT_EMAIL ?? "info@ncwrestlingunited.com"}.`
            : `Confirmation must be completed within ${TOC_CONFIRM_WITHIN_DAYS} days of your invite. Contact NC United.`,
        },
        { status: 400 },
      )
    }

    const capacity = await assertWeightClassHasCapacity(admin, input.weightClass, invitation.id)
    if (!capacity.ok) {
      return NextResponse.json({ ok: false, error: capacity.message }, { status: 400 })
    }

    const medicalNotes = input.medicalNotes?.trim() || null
    const now = new Date().toISOString()

    const { data: updated, error: updateError } = await admin
      .from("toc_invitations")
      .update({
        status: "confirmed",
        confirmed_at: now,
        updated_at: now,
        weight_class: input.weightClass,
        jacket_size: input.jacketSize,
        medical_notes: medicalNotes,
        attendance_acknowledgment: true,
        weight_acknowledgment: true,
        usaw_acknowledgment: true,
        photo_release_accepted: true,
      })
      .eq("id", invitation.id)
      .eq("status", "invited")
      .select("id, athlete_id, weight_class, jacket_size")
      .maybeSingle()

    if (updateError) {
      console.error("[toc/athlete-confirm]", updateError)
      if (updateError.code === "42703") {
        return NextResponse.json(
          {
            ok: false,
            error: "Database needs Phase 2 TOC columns. Run docs/sql/toc-phase-2-invitations.sql.txt in Supabase.",
          },
          { status: 503 },
        )
      }
      return NextResponse.json({ ok: false, error: "Failed to confirm spot" }, { status: 500 })
    }
    if (!updated) {
      return NextResponse.json({ ok: false, error: "Invitation was already updated. Refresh and try again." }, { status: 409 })
    }

    const { data: athlete } = await admin.from("athletes").select("*").eq("id", input.athleteId).maybeSingle()
    const athleteName = typeof athlete?.name === "string" ? athlete.name : "Athlete"
    const emails = await resolveAthleteNotificationEmails(
      admin,
      input.athleteId,
      athlete as Record<string, unknown> | undefined,
    )

    if (emails.length > 0) {
      void sendTocAthleteConfirmedEmail({
        to: emails,
        athleteName,
        weightClass: input.weightClass,
        jacketSize: input.jacketSize,
        athleteId: input.athleteId,
      })
    }

    return NextResponse.json({ ok: true, weightClass: input.weightClass })
  } catch (e) {
    console.error("[toc/athlete-confirm]", e)
    return NextResponse.json({ ok: false, error: "Something went wrong" }, { status: 500 })
  }
}
