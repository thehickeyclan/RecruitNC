import { NextResponse } from "next/server"
import { z } from "zod"
import { TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"
import { requireTocFieldViewer } from "@/lib/toc/require-toc-field-viewer"
import { createAdminClientFresh } from "@/lib/supabase/admin"
import { planSeedAdoption, viewerOrdersForWeight, type ConfirmedInvitation } from "@/lib/toc/seed-adoption"

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

class MigrationMissing extends Error {}

async function lockStateFor(admin: ReturnType<typeof createAdminClientFresh>, weightClass: number) {
  const { data, error } = await admin
    .from("toc_field_publication_status")
    .select("seeds_locked, seeds_locked_at, seeds_adopted_from, seeds_adopted_at")
    .eq("weight_class", weightClass)
    .maybeSingle()
  // Without this the missing columns would read as "not locked", and the first adopt would move a
  // locked weight while reporting success. A lock that fails open is worse than no lock.
  if (error && (error.code === "42703" || /seeds_locked|column .* does not exist/i.test(error.message))) {
    throw new MigrationMissing(
      "The seed-lock columns are not in the database yet — run the toc_field_publication_status migration.",
    )
  }
  return {
    locked: (data as { seeds_locked?: boolean } | null)?.seeds_locked === true,
    lockedAt: (data as { seeds_locked_at?: string } | null)?.seeds_locked_at ?? null,
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
  try {
  const [confirmed, lock, users] = await Promise.all([
    confirmedForWeight(admin, weightClass),
    lockStateFor(admin, weightClass),
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
      // The whole point of the screen: what their order actually says, in names.
      rows: plan.ok ? plan.rows : [],
      changed: plan.ok ? plan.changed : 0,
      blocked: plan.ok ? null : plan.error,
    }
  })

  return NextResponse.json({ weightClass, lock, confirmed: confirmed.length, seeders })
  } catch (error) {
    if (error instanceof MigrationMissing) return NextResponse.json({ error: error.message }, { status: 503 })
    throw error
  }
}

const actionSchema = z.union([
  z.object({ action: z.literal("adopt"), weightClass: weightSchema, sourceUserId: z.string().uuid() }),
  z.object({ action: z.literal("lock"), weightClass: weightSchema, locked: z.boolean() }),
])

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

  if (parsed.data.action === "lock") {
    const { error } = await admin.from("toc_field_publication_status").upsert(
      {
        weight_class: weightClass,
        seeds_locked: parsed.data.locked,
        seeds_locked_at: parsed.data.locked ? new Date().toISOString() : null,
        seeds_locked_by: parsed.data.locked ? auth.userId : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "weight_class" },
    )
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ weightClass, locked: parsed.data.locked })
  }

  let lock: Awaited<ReturnType<typeof lockStateFor>>
  try {
    lock = await lockStateFor(admin, weightClass)
  } catch (error) {
    if (error instanceof MigrationMissing) return NextResponse.json({ error: error.message }, { status: 503 })
    throw error
  }
  if (lock.locked) {
    return NextResponse.json({ error: "Seeds for this weight are locked. Unlock it first." }, { status: 409 })
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
