import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClientFresh } from "@/lib/supabase/admin"
import { TOC_MAX_CONFIRMED_PER_WEIGHT } from "@/lib/toc/invitations"
import { tocInvitationsRlsHelp } from "@/lib/toc/supabase-rls"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  seed: z.number().int().min(1).max(TOC_MAX_CONFIRMED_PER_WEIGHT).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
})

/** Update seed or admin notes on an invitation (e.g. for bracket build). */
export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 })
    }

    const admin = createAdminClientFresh()
    const { data: existing, error: findError } = await admin
      .from("toc_invitations")
      .select("id, weight_class, status, seed")
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

    if (parsed.data.seed !== undefined && parsed.data.seed != null && existing.status !== "confirmed") {
      return NextResponse.json({ error: "Only confirmed wrestlers can be seeded." }, { status: 400 })
    }

    if (parsed.data.seed != null) {
      const { data: conflict } = await admin
        .from("toc_invitations")
        .select("id")
        .eq("weight_class", existing.weight_class)
        .eq("status", "confirmed")
        .eq("seed", parsed.data.seed)
        .neq("id", id)
        .maybeSingle()

      if (conflict) {
        return NextResponse.json(
          { error: `Seed ${parsed.data.seed} is already assigned at ${existing.weight_class} lbs.` },
          { status: 400 },
        )
      }
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (parsed.data.seed !== undefined) update.seed = parsed.data.seed
    if (parsed.data.notes !== undefined) update.notes = parsed.data.notes

    const { data: updated, error: updateError } = await admin
      .from("toc_invitations")
      .update(update)
      .eq("id", id)
      .select("id, seed, notes")
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
