import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/admin-auth"
import { coachCapFlags, MAX_COACHES_PER_ATHLETE, toCheckInList } from "@/lib/toc/coach-designation"
import { loadResolvedCoachRows } from "@/lib/toc/coach-identity"
import { loadCoachTickets } from "@/lib/toc/coach-purchase-view"

/** The deduped coach list, and approving or declining one. */

export const dynamic = "force-dynamic"

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error, coaches: [] }, { status: auth.status })

  const admin = createAdminClient()
  const loaded = await loadResolvedCoachRows(admin)
  if (!loaded.ok) {
    console.error("[toc coaches] load:", loaded.error)
    return NextResponse.json({ error: "Could not load coaches.", coaches: [] }, { status: 500 })
  }
  const { rows, resolved } = loaded.value

  const coaches = toCheckInList(resolved as never)
  // Wrestlers who have named at least one coach — the response rate, and the number that says
  // how much chasing is left rather than how much has arrived.
  const wrestlers = new Set(rows.map((r) => r.athlete_name)).size

  // Counted on the resolved rows, so one coach named twice by different details is one coach.
  const capFlags = coachCapFlags(resolved as never)

  // Approved and told is not the same as gone and got it, and only the door cares about the
  // difference. Degrades to nothing when the purchases table is not there yet.
  const tickets = await loadCoachTickets(admin, loaded.value, coaches)
  const withTickets = coaches.map((coach) => ({ ...coach, ticket: tickets.byCoach.get(coach.coachKey) ?? null }))

  return NextResponse.json({
    coaches: withTickets,
    unmatchedPurchases: tickets.unmatched,
    purchasesReady: tickets.ready,
    capFlags,
    maxCoachesPerAthlete: MAX_COACHES_PER_ATHLETE,
    totals: {
      coaches: coaches.length,
      wrestlers,
      approved: coaches.filter((c) => c.status === "approved").length,
      pending: coaches.filter((c) => c.status === "pending").length,
      notified: coaches.filter((c) => c.notifiedAt).length,
      awaitingSend: coaches.filter((c) => c.status === "approved" && !c.notifiedAt).length,
      overCap: capFlags.filter((f) => f.reason !== "would-exceed").length,
      ticketsBought: withTickets.filter((c) => c.ticket).length,
      approvedWithoutTicket: withTickets.filter((c) => c.status === "approved" && !c.ticket).length,
      /**
       * Bought a credential and still waiting on approval — the easiest approvals there are, and
       * the ones that cost most while they sit. Four coaches were in this state, unnamed on the
       * public field page despite having paid.
       */
      paidAwaitingApproval: withTickets.filter((c) => c.status !== "approved" && c.ticket).length,
    },
  })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = (await request.json().catch(() => null)) as { coachKey?: unknown; status?: unknown } | null
  const coachKey = typeof body?.coachKey === "string" ? body.coachKey.trim() : ""
  const status = String(body?.status ?? "")

  if (!coachKey) return NextResponse.json({ error: "Which coach?" }, { status: 400 })
  if (!["approved", "declined", "pending"].includes(status)) {
    return NextResponse.json({ error: "Unknown status." }, { status: 400 })
  }

  const admin = createAdminClient()

  // The list shows resolved coaches, so the key that comes back may be a person rather than any
  // key stored in the table. Map it to the rows that produced them, or the update matches
  // nothing and reports success.
  const loaded = await loadResolvedCoachRows(admin)
  if (!loaded.ok) {
    console.error("[toc coaches] review load:", loaded.error)
    return NextResponse.json({ error: "Could not save that." }, { status: 500 })
  }
  const keys = loaded.value.originalKeys.get(coachKey) ?? [coachKey]

  const { error, count } = await admin
    .from("toc_coach_designations")
    .update(
      { status, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { count: "exact" },
    )
    .in("coach_key", keys)

  if (error) {
    console.error("[toc coaches] review:", error.message)
    return NextResponse.json({ error: "Could not save that." }, { status: 500 })
  }
  // A silent no-op is what this bug looked like the first time; say so instead.
  if (!count) {
    return NextResponse.json({ error: "That coach is no longer on the list." }, { status: 404 })
  }

  return NextResponse.json({ ok: true, coachKey, status })
}
