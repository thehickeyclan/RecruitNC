import { NextResponse } from "next/server"
import { z } from "zod"
import { TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"
import { requireTocFieldViewer } from "@/lib/toc/require-toc-field-viewer"
import { createAdminClientFresh } from "@/lib/supabase/admin"
import { planSeedAdoption, viewerOrdersForWeight, type ConfirmedInvitation } from "@/lib/toc/seed-adoption"
import { getBracketLockStatus } from "@/lib/toc/bracket-service"

export const dynamic = "force-dynamic"

const weightSchema = z.coerce
  .number()
  .refine((n) => TOC_WEIGHT_CLASSES.includes(n as (typeof TOC_WEIGHT_CLASSES)[number]), "Invalid weight class")

/**
 * The seeding a weight would take, and the button that takes it.
 *
 * Admin-only in both directions. A seeder's private order is theirs until staff adopt it, and
 * adopting is the moment it becomes the bracket — so this is where the lock lives too.
 */

async function confirmedForWeight(
  admin: ReturnType<typeof createAdminClientFresh>,
  weightClass: number,
): Promise<ConfirmedInvitation[]> {
  const { data: invitations } = await admin
    .from("toc_invitations")
    .select("id, athlete_id, seed")
    .eq("weight_class", weightClass)
    .eq("status", "confirmed")

  const rows = invitations ?? []
  const athleteIds = rows.map((row) => String((row as { athlete_id: unknown }).athlete_id))
  const { data: athletes } = await admin.from("athletes").select("id, name").in("id", athleteIds)
  const nameById = new Map((athletes ?? []).map((a) => [String((a as { id: unknown }).id), String((a as { name: unknown }).name ?? "")]))

  return rows.map((row) => {
    const raw = row as { id: unknown; athlete_id: unknown; seed: unknown }
    const seed = Number(raw.seed)
    return {
      invitationId: String(raw.id),
      athleteName: nameById.get(String(raw.athlete_id)) ?? "Unknown athlete",
      officialSeed: Number.isInteger(seed) && seed > 0 ? seed : null,
    }
  })
}

/**
 * Whether this weight has been submitted to brackets.
 *
 * There is no second lock. Locking the draw is the submit — it reads the official seeds, builds
 * the bracket and writes it — so a weight that has been submitted is exactly a weight whose seeds
 * must stop moving. A separate seeds lock beside it would give two switches for one decision, and
 * the pair of them would eventually disagree.
 *
 * It matters because the draw is a snapshot: once built, changing `toc_invitations.seed` does not
 * change the published bracket. Adopting after submission would leave the official seeds saying
 * one thing and the bracket people are looking at saying another, with nothing to reveal it.
 */
async function submissionFor(admin: ReturnType<typeof createAdminClientFresh>, weightClass: number) {
  const status = await getBracketLockStatus(admin, weightClass)
  const { data } = await admin
    .from("toc_field_publication_status")
    .select("seeds_adopted_from, seeds_adopted_at")
    .eq("weight_class", weightClass)
    .maybeSingle()
  return {
    submitted: status.locked,
    submittedAt: status.lockedAt,
    readyToSubmit: status.readyToLock,
    adoptedFrom: (data as { seeds_adopted_from?: string } | null)?.seeds_adopted_from ?? null,
    adoptedAt: (data as { seeds_adopted_at?: string } | null)?.seeds_adopted_at ?? null,
  }
}

/** Everyone who has seeded this weight, and what adopting each of them would change. */
export async function GET(request: Request) {
  const auth = await requireTocFieldViewer()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  // Scoped seeders may read the board; only staff may see or move the official order.
  if (!auth.isAdmin) return NextResponse.json({ error: "Admin access required" }, { status: 403 })

  const parsed = weightSchema.safeParse(new URL(request.url).searchParams.get("weightClass"))
  if (!parsed.success) return NextResponse.json({ error: "Invalid weight class" }, { status: 400 })
  const weightClass = parsed.data

  const admin = createAdminClientFresh()
  const [confirmed, submission, users] = await Promise.all([
    confirmedForWeight(admin, weightClass),
    submissionFor(admin, weightClass),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ])

  const seeders = viewerOrdersForWeight(
    (users.data?.users ?? []).map((u) => ({ id: u.id, email: u.email, app_metadata: u.app_metadata as Record<string, unknown> })),
    weightClass,
  ).map((seeder) => {
    const plan = planSeedAdoption(seeder.invitationIds, confirmed)
    return {
      userId: seeder.userId,
      email: seeder.email,
      isLead: seeder.isLead,
      // The whole point of the screen: what their order actually says, in names.
      rows: plan.ok ? plan.rows : [],
      changed: plan.ok ? plan.changed : 0,
      blocked: plan.ok ? null : plan.error,
    }
  })

  return NextResponse.json({ weightClass, submission, confirmed: confirmed.length, seeders })
}

const actionSchema = z.object({
  action: z.literal("adopt"),
  weightClass: weightSchema,
  sourceUserId: z.string().uuid(),
})

export async function POST(request: Request) {
  const auth = await requireTocFieldViewer()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  // Scoped seeders may read the board; only staff may see or move the official order.
  if (!auth.isAdmin) return NextResponse.json({ error: "Admin access required" }, { status: 403 })

  const parsed = actionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 })
  }

  const admin = createAdminClientFresh()
  const { weightClass } = parsed.data

  const submission = await submissionFor(admin, weightClass)
  if (submission.submitted) {
    return NextResponse.json(
      { error: "This weight is already submitted to brackets. Unlock the draw before changing seeds." },
      { status: 409 },
    )
  }

  const { data: sourceUser, error: userError } = await admin.auth.admin.getUserById(parsed.data.sourceUserId)
  if (userError || !sourceUser.user) {
    return NextResponse.json({ error: "That seeder no longer exists." }, { status: 404 })
  }

  const [order] = viewerOrdersForWeight(
    [{ id: sourceUser.user.id, email: sourceUser.user.email, app_metadata: sourceUser.user.app_metadata as Record<string, unknown> }],
    weightClass,
  )
  const confirmed = await confirmedForWeight(admin, weightClass)
  const plan = planSeedAdoption(order?.invitationIds ?? [], confirmed)
  if (!plan.ok) return NextResponse.json({ error: plan.error }, { status: 409 })

  // Seeds are unique per weight, so clearing first avoids a collision mid-update — the same
  // reason the drag reorder writes in one pass rather than one row at a time.
  const ids = plan.rows.map((row) => row.invitationId)
  const { error: clearError } = await admin.from("toc_invitations").update({ seed: null }).in("id", ids)
  if (clearError) return NextResponse.json({ error: clearError.message }, { status: 500 })

  for (const row of plan.rows) {
    const { error } = await admin.from("toc_invitations").update({ seed: row.seed }).eq("id", row.invitationId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await admin.from("toc_field_publication_status").upsert(
    {
      weight_class: weightClass,
      seeds_adopted_from: sourceUser.user.id,
      seeds_adopted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "weight_class" },
  )

  return NextResponse.json({
    weightClass,
    adoptedFrom: sourceUser.user.email,
    seeded: plan.rows.length,
    changed: plan.changed,
    rows: plan.rows,
  })
}
