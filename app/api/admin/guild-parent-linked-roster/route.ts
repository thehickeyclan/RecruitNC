import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

type Agg = {
  appliedCents: number
  pendingCents: number
  appliedCount: number
  pendingCount: number
  failedCount: number
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

/** RecruitNC accounts with Guild parent id + rollups from guild_credit_allocations. */
export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const admin = createAdminClient()
  const { data: profiles, error: pErr } = await admin
    .from("user_profiles")
    .select("user_id, email, guild_parent_user_id")
    .not("guild_parent_user_id", "is", null)
    .order("email", { ascending: true })

  if (pErr) {
    if (pErr.code === "42703" || pErr.message?.includes("guild_parent_user_id")) {
      return NextResponse.json({
        roster: [],
        note: "Column guild_parent_user_id missing — run the Guild credit SQL migration.",
      })
    }
    console.error("[admin/guild-parent-linked-roster] profiles", pErr)
    return NextResponse.json({ error: pErr.message }, { status: 500 })
  }

  const list = (profiles ?? []) as { user_id: string; email: string | null; guild_parent_user_id: string | null }[]
  const userIds = list.map((p) => p.user_id).filter(Boolean)
  const aggByUser = new Map<string, Agg>()

  const emptyAgg = (): Agg => ({
    appliedCents: 0,
    pendingCents: 0,
    appliedCount: 0,
    pendingCount: 0,
    failedCount: 0,
  })

  const ensure = (uid: string): Agg => {
    const ex = aggByUser.get(uid)
    if (ex) return ex
    const z = emptyAgg()
    aggByUser.set(uid, z)
    return z
  }

  if (userIds.length > 0) {
    for (const part of chunk(userIds, 100)) {
      const { data: allocs, error: aErr } = await admin
        .from("guild_credit_allocations")
        .select("user_id, amount_cents, status")
        .in("user_id", part)

      if (aErr) {
        if (aErr.code === "42P01" || aErr.message?.includes("does not exist")) {
          break
        }
        console.error("[admin/guild-parent-linked-roster] allocations", aErr)
        return NextResponse.json({ error: aErr.message }, { status: 500 })
      }

      for (const r of allocs ?? []) {
        const row = r as { user_id: string; amount_cents: number; status: string }
        const uid = String(row.user_id)
        const a = ensure(uid)
        const cents = Number(row.amount_cents)
        if (row.status === "guild_applied") {
          a.appliedCents += cents
          a.appliedCount += 1
        } else if (row.status === "pending") {
          a.pendingCents += cents
          a.pendingCount += 1
        } else if (row.status === "failed") {
          a.failedCount += 1
        }
      }
    }
  }

  const roster = list.map((p) => {
    const uid = p.user_id
    const a = aggByUser.get(uid) ?? emptyAgg()
    return {
      userId: uid,
      email: p.email,
      guildParentUserId: p.guild_parent_user_id,
      appliedToGuildCents: a.appliedCents,
      pendingCents: a.pendingCents,
      appliedTransferCount: a.appliedCount,
      pendingTransferCount: a.pendingCount,
      failedTransferCount: a.failedCount,
    }
  })

  return NextResponse.json({ roster })
}
