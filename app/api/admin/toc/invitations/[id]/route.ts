import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClientFresh } from "@/lib/supabase/admin"
import { tocAdminInvitationPatchSchema } from "@/lib/toc/invitations"
import { tocInvitationsRlsHelp } from "@/lib/toc/supabase-rls"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ id: string }> }

/** Update invited weight, seed, notes, status, or refresh confirm window. */
export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const parsed = tocAdminInvitationPatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 })
    }

    const admin = createAdminClientFresh()
    const { data: existing, error: findError } = await admin
      .from("toc_invitations")
      .select("id, weight_class, status, seed, invited_at")
      .eq("id", id)
      .maybeSingle()

    if (findError) {
      console.error("[admin/toc/invitations/[id]]", findError)
      const rlsHelp = tocInvitationsRlsHelp(findError)
      if (rlsHelp) {
        return NextResponse.json({ error: rlsHelp, rlsBlocked: true }, { status: 503 })
      }
      return NextResponse.json({ error: findError.message }, { status: 500 })
    }
    if (!existing) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 })
    }

    const nextStatus = parsed.data.status
    const refreshInviteWindow = parsed.data.refreshInviteWindow === true
    const reactivating =
      (existing.status === "declined" || existing.status === "withdrew") &&
      (nextStatus === "invited" || refreshInviteWindow)

    if ((existing.status === "declined" || existing.status === "withdrew") && !reactivating) {
      return NextResponse.json(
        { error: "This invitation is declined/withdrawn. Reactivate it to invited first." },
        { status: 400 },
      )
    }

    if (
      existing.status === "confirmed" &&
      (refreshInviteWindow || (nextStatus != null && nextStatus !== "withdrew"))
    ) {
      return NextResponse.json(
        { error: "A confirmed athlete can only be marked withdrawn from the Field page." },
        { status: 400 },
      )
    }

    if (parsed.data.seed !== undefined && parsed.data.seed != null && existing.status !== "confirmed") {
      return NextResponse.json({ error: "Only confirmed wrestlers can be seeded." }, { status: 400 })
    }

    const nextWeight =
      parsed.data.weightClass !== undefined ? parsed.data.weightClass : existing.weight_class

    if (parsed.data.seed != null) {
      const { data: conflict } = await admin
        .from("toc_invitations")
        .select("id")
        .eq("weight_class", nextWeight)
        .eq("status", "confirmed")
        .eq("seed", parsed.data.seed)
        .neq("id", id)
        .maybeSingle()

      if (conflict) {
        return NextResponse.json(
          { error: `Seed ${parsed.data.seed} is already assigned at ${nextWeight} lbs.` },
          { status: 400 },
        )
      }
    }

    const now = new Date().toISOString()
    const update: Record<string, unknown> = { updated_at: now }

    if (parsed.data.weightClass !== undefined && parsed.data.weightClass !== existing.weight_class) {
      update.weight_class = parsed.data.weightClass
      if (existing.seed != null) {
        update.seed = null
      }
    }

    if (parsed.data.seed !== undefined) update.seed = parsed.data.seed
    if (parsed.data.notes !== undefined) update.notes = parsed.data.notes

    if (nextStatus === "declined" || nextStatus === "withdrew") {
      const canWithdrawConfirmed = nextStatus === "withdrew" && existing.status === "confirmed"
      if (existing.status !== "invited" && existing.status !== "nominated" && !canWithdrawConfirmed) {
        return NextResponse.json(
          { error: "Only invited athletes can be declined; confirmed athletes may be marked withdrawn." },
          { status: 400 },
        )
      }
      update.status = nextStatus
      update.status_reason = parsed.data.statusReason
      update.status_reason_other = parsed.data.statusReason === "other" ? parsed.data.statusReasonOther?.trim() : null
      if (canWithdrawConfirmed) update.seed = null
    }

    if (nextStatus === "invited" || refreshInviteWindow) {
      update.status = "invited"
      update.invited_at = now
      update.status_reason = null
      update.status_reason_other = null
    }

    if (Object.keys(update).length === 1) {
      return NextResponse.json({
        ok: true,
        invitation: {
          id: existing.id,
          weight_class: existing.weight_class,
          seed: existing.seed,
          status: existing.status,
          invited_at: existing.invited_at,
        },
      })
    }

    const { data: updated, error: updateError } = await admin
      .from("toc_invitations")
      .update(update)
      .eq("id", id)
      .select("id, weight_class, seed, notes, status, status_reason, status_reason_other, invited_at")
      .single()

    if (updateError) {
      console.error("[admin/toc/invitations/[id]]", updateError)
      const rlsHelp = tocInvitationsRlsHelp(updateError)
      if (rlsHelp) {
        return NextResponse.json({ error: rlsHelp, rlsBlocked: true }, { status: 503 })
      }
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, invitation: updated })
  } catch (e) {
    console.error("[admin/toc/invitations/[id]]", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
