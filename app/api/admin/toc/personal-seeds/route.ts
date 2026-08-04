import { NextResponse } from "next/server"
import { z } from "zod"
import { TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"
import { TOC_MAX_CONFIRMED_PER_WEIGHT } from "@/lib/toc/invitations"
import { readTocPersonalSeedOrders } from "@/lib/toc/personal-seeding"
import { requireTocFieldViewer } from "@/lib/toc/require-toc-field-viewer"
import { createAdminClientFresh } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

const schema = z.object({
  weightClass: z.coerce
    .number()
    .refine((n) => TOC_WEIGHT_CLASSES.includes(n as (typeof TOC_WEIGHT_CLASSES)[number]), "Invalid weight class"),
  invitationIds: z.array(z.string().uuid()).min(1).max(TOC_MAX_CONFIRMED_PER_WEIGHT),
})

/** Save one viewer's private seed order without changing the official field. */
export async function PATCH(request: Request) {
  const auth = await requireTocFieldViewer()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const parsed = schema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid seed order" }, { status: 400 })
  }

  const { weightClass, invitationIds } = parsed.data
  if (new Set(invitationIds).size !== invitationIds.length) {
    return NextResponse.json({ error: "Each wrestler can only appear once." }, { status: 400 })
  }

  const admin = createAdminClientFresh()
  const { data: rows, error: rowsError } = await admin
    .from("toc_invitations")
    .select("id")
    .eq("weight_class", weightClass)
    .eq("status", "confirmed")

  if (rowsError) return NextResponse.json({ error: rowsError.message }, { status: 500 })
  const confirmedIds = (rows ?? []).map((row) => String(row.id))
  if (
    confirmedIds.length !== invitationIds.length ||
    confirmedIds.some((id) => !invitationIds.includes(id))
  ) {
    return NextResponse.json({ error: "Seed order must include every confirmed wrestler in this weight." }, { status: 400 })
  }

  const { data: userResult, error: userError } = await admin.auth.admin.getUserById(auth.userId)
  if (userError || !userResult.user) {
    return NextResponse.json({ error: userError?.message ?? "User not found" }, { status: 500 })
  }

  const appMetadata = (userResult.user.app_metadata ?? {}) as Record<string, unknown>
  const orders = readTocPersonalSeedOrders(appMetadata)
  orders[String(weightClass)] = invitationIds
  const { error: updateError } = await admin.auth.admin.updateUserById(auth.userId, {
    app_metadata: { ...appMetadata, toc_personal_seed_orders: orders },
  })
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ ok: true, weightClass, invitationIds })
}
