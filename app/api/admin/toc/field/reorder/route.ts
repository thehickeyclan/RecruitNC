import { NextResponse } from "next/server"
import { z } from "zod"
import { TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"
import { TOC_MAX_CONFIRMED_PER_WEIGHT } from "@/lib/toc/invitations"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClientFresh } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

const reorderSchema = z.object({
  weightClass: z.coerce
    .number()
    .refine((n) => TOC_WEIGHT_CLASSES.includes(n as (typeof TOC_WEIGHT_CLASSES)[number]), "Invalid weight class"),
  invitationIds: z
    .array(z.string().uuid())
    .min(1, "At least one invitation is required")
    .max(TOC_MAX_CONFIRMED_PER_WEIGHT, `Only ${TOC_MAX_CONFIRMED_PER_WEIGHT} confirmed wrestlers can be seeded`)
    .optional(),
  seedSlots: z
    .array(z.string().uuid().nullable())
    .length(TOC_MAX_CONFIRMED_PER_WEIGHT, `Seed slots must include all ${TOC_MAX_CONFIRMED_PER_WEIGHT} seeds`)
    .optional(),
})

/** Reorder confirmed TOC wrestlers in one pass so drag/drop swaps do not hit duplicate seed conflicts. */
export async function PATCH(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const parsed = reorderSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid reorder request" }, { status: 400 })
    }

    const { weightClass } = parsed.data
    const invitationIds = parsed.data.seedSlots
      ? parsed.data.seedSlots.filter((id): id is string => Boolean(id))
      : parsed.data.invitationIds

    if (!invitationIds?.length) {
      return NextResponse.json({ error: "At least one invitation is required" }, { status: 400 })
    }
    if (new Set(invitationIds).size !== invitationIds.length) {
      return NextResponse.json({ error: "Each wrestler can only appear once in the seed order." }, { status: 400 })
    }

    const admin = createAdminClientFresh()
    const { data: rows, error: findError } = await admin
      .from("toc_invitations")
      .select("id, weight_class, status")
      .in("id", invitationIds)

    if (findError) {
      console.error("[admin/toc/field/reorder]", findError)
      return NextResponse.json({ error: findError.message }, { status: 500 })
    }

    if ((rows ?? []).length !== invitationIds.length) {
      return NextResponse.json({ error: "One or more wrestlers could not be found." }, { status: 404 })
    }

    const invalid = (rows ?? []).find((row) => row.weight_class !== weightClass || row.status !== "confirmed")
    if (invalid) {
      return NextResponse.json(
        { error: "Only confirmed wrestlers in the selected weight class can be reordered." },
        { status: 400 },
      )
    }

    const now = new Date().toISOString()

    const { error: clearError } = await admin
      .from("toc_invitations")
      .update({ seed: null, updated_at: now })
      .eq("weight_class", weightClass)
      .eq("status", "confirmed")

    if (clearError) {
      console.error("[admin/toc/field/reorder] clear", clearError)
      return NextResponse.json({ error: clearError.message }, { status: 500 })
    }

    const assignments = parsed.data.seedSlots
      ? parsed.data.seedSlots
          .map((id, index) => (id ? { id, seed: index + 1 } : null))
          .filter((row): row is { id: string; seed: number } => row != null)
      : invitationIds.map((id, index) => ({ id, seed: index + 1 }))

    for (const assignment of assignments) {
      const { error: updateError } = await admin
        .from("toc_invitations")
        .update({ seed: assignment.seed, updated_at: now })
        .eq("id", assignment.id)

      if (updateError) {
        console.error("[admin/toc/field/reorder] update", updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
    }

    return NextResponse.json({
      ok: true,
      weightClass,
      seeds: assignments.map((assignment) => ({ invitationId: assignment.id, seed: assignment.seed })),
    })
  } catch (e) {
    console.error("[admin/toc/field/reorder]", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
