import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin } from "@/lib/admin-auth"
import { sendSms } from "@/lib/sms"
import { createAdminClientFresh } from "@/lib/supabase/admin"
import {
  buildTocDefaultReminderMessage,
  formatRecruitNcSmsBody,
} from "@/lib/toc/reminder-message"
import { resolveAthleteNotificationPhones } from "@/lib/toc/invitation-service"
import { tocInvitationsRlsHelp } from "@/lib/toc/supabase-rls"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ id: string }> }

const postSchema = z.object({
  message: z.string().trim().min(1, "Message is required").max(1500),
  phoneE164: z.string().trim().min(8).max(20).optional(),
})

function reminderColumnsMissing(error: { code?: string; message?: string } | null): boolean {
  return error?.code === "42703" && /last_reminder/i.test(error.message ?? "")
}

/** Load editable reminder draft, phone options, and last-sent metadata. */
export async function GET(_request: Request, { params }: Params) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const { id } = await params
    const admin = createAdminClientFresh()

    const { data: invitation, error } = await admin
      .from("toc_invitations")
      .select(
        "id, athlete_id, weight_class, status, payment_status, invited_at, confirmation_token_expires_at, last_reminder_at, last_reminder_body, athletes(id, name)",
      )
      .eq("id", id)
      .maybeSingle()

    if (error) {
      if (reminderColumnsMissing(error)) {
        return NextResponse.json(
          {
            error: "Run docs/sql/toc-phase-4-invitation-reminders.sql.txt in Supabase, then refresh.",
            migrationRequired: true,
          },
          { status: 503 },
        )
      }
      console.error("[admin/toc/invitations/remind GET]", error)
      const rlsHelp = tocInvitationsRlsHelp(error)
      if (rlsHelp) return NextResponse.json({ error: rlsHelp, rlsBlocked: true }, { status: 503 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 })
    }

    const athleteRaw = invitation.athletes
    const athlete = (Array.isArray(athleteRaw) ? athleteRaw[0] : athleteRaw) as
      | { id: string; name: string }
      | null
      | undefined

    const { data: athleteRow } = await admin.from("athletes").select("*").eq("id", invitation.athlete_id).maybeSingle()
    const phones = await resolveAthleteNotificationPhones(admin, invitation.athlete_id, athleteRow ?? undefined)

    const athleteName = athlete?.name ?? "Athlete"
    const defaultMessage = buildTocDefaultReminderMessage({
      athleteName,
      athleteId: invitation.athlete_id,
      weightClass: invitation.weight_class,
      status: invitation.status,
      paymentStatus: invitation.payment_status,
      invitedAt: invitation.invited_at,
      confirmationExpiresAt: invitation.confirmation_token_expires_at,
    })

    return NextResponse.json({
      phones,
      defaultMessage,
      draftMessage:
        typeof invitation.last_reminder_body === "string" && invitation.last_reminder_body.trim()
          ? invitation.last_reminder_body
          : defaultMessage,
      lastReminderAt: invitation.last_reminder_at ?? null,
      lastReminderBody: invitation.last_reminder_body ?? null,
      status: invitation.status,
    })
  } catch (e) {
    console.error("[admin/toc/invitations/remind GET]", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

/** Send SMS reminder from RecruitNC and record last_reminder_at / last_reminder_body. */
export async function POST(request: Request, { params }: Params) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const parsed = postSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 })
    }

    const admin = createAdminClientFresh()
    const { data: invitation, error } = await admin
      .from("toc_invitations")
      .select("id, athlete_id, status")
      .eq("id", id)
      .maybeSingle()

    if (error) {
      console.error("[admin/toc/invitations/remind POST]", error)
      const rlsHelp = tocInvitationsRlsHelp(error)
      if (rlsHelp) return NextResponse.json({ error: rlsHelp, rlsBlocked: true }, { status: 503 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 })
    }
    if (invitation.status === "declined" || invitation.status === "withdrew") {
      return NextResponse.json({ error: "Cannot text a declined or withdrawn invitation." }, { status: 400 })
    }

    const { data: athleteRow } = await admin.from("athletes").select("*").eq("id", invitation.athlete_id).maybeSingle()
    const phones = await resolveAthleteNotificationPhones(admin, invitation.athlete_id, athleteRow ?? undefined)

    if (phones.length === 0) {
      return NextResponse.json(
        {
          error: "No cell phone on file for this athlete or linked parents. Add a phone on their RecruitNC profile first.",
        },
        { status: 400 },
      )
    }

    const target =
      (parsed.data.phoneE164 ? phones.find((p) => p.e164 === parsed.data.phoneE164) : null) ?? phones[0]

    const smsBody = formatRecruitNcSmsBody(parsed.data.message)
    const sent = await sendSms(target.e164, smsBody)
    if (!sent) {
      return NextResponse.json(
        {
          error:
            "SMS failed — check Twilio env (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_MESSAGING_SERVICE_SID) in Vercel.",
        },
        { status: 503 },
      )
    }

    const now = new Date().toISOString()
    const { data: updated, error: updateError } = await admin
      .from("toc_invitations")
      .update({
        last_reminder_at: now,
        last_reminder_body: parsed.data.message,
        updated_at: now,
      })
      .eq("id", id)
      .select("id, last_reminder_at, last_reminder_body")
      .single()

    if (updateError) {
      if (reminderColumnsMissing(updateError)) {
        return NextResponse.json(
          {
            error: "Reminder sent but tracking columns missing — run docs/sql/toc-phase-4-invitation-reminders.sql.txt.",
            migrationRequired: true,
            sent: true,
          },
          { status: 503 },
        )
      }
      console.error("[admin/toc/invitations/remind POST]", updateError)
      return NextResponse.json(
        { error: "Text sent but failed to save reminder date.", sent: true },
        { status: 500 },
      )
    }

    return NextResponse.json({
      ok: true,
      sentTo: { label: target.label, phone: target.display },
      invitation: updated,
    })
  } catch (e) {
    console.error("[admin/toc/invitations/remind POST]", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
