import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/admin-auth"
import { isCoachCredential, parseGoFanPaste } from "@/lib/toc/coach-ticket-purchases"
import { PURCHASES_TABLE } from "@/lib/toc/coach-purchase-view"

/**
 * Coach credentials bought at GoFan, pasted straight out of the order report.
 *
 * GoFan has no feed worth wiring up for one weekend, so this takes the report as it comes —
 * tabs, "--" cells and all — and keys on the order number, which means the same paste can be
 * dropped in twice and a later export that includes earlier orders costs nothing.
 *
 * A link an admin made by hand is never overwritten by a re-import: working out who a buyer is
 * is the part a person had to do, and losing it to a paste would be worse than not storing it.
 */

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = (await request.json().catch(() => null)) as { paste?: unknown; orderId?: unknown; coachKey?: unknown } | null
  const admin = createAdminClient()

  // Joining a buyer to a coach by hand.
  if (typeof body?.orderId === "string" && body.orderId.trim()) {
    const orderId = body.orderId.trim()
    const coachKey = typeof body.coachKey === "string" && body.coachKey.trim() ? body.coachKey.trim() : null
    const { error, count } = await admin
      .from(PURCHASES_TABLE)
      .update({ linked_coach_key: coachKey, updated_at: new Date().toISOString() }, { count: "exact" })
      .eq("order_id", orderId)

    if (error) {
      console.error("[toc purchases] link:", error.message)
      return NextResponse.json({ error: tableHint(error.message) }, { status: 500 })
    }
    if (!count) return NextResponse.json({ error: "That order is no longer on the list." }, { status: 404 })
    return NextResponse.json({ ok: true, orderId, coachKey })
  }

  const paste = typeof body?.paste === "string" ? body.paste : ""
  if (!paste.trim()) return NextResponse.json({ error: "Paste the GoFan order report." }, { status: 400 })

  const parsed = parseGoFanPaste(paste)
  // The full event export can be pasted in as it comes; only credentials are kept.
  const purchases = parsed.filter(isCoachCredential)
  const skipped = parsed.length - purchases.length

  if (parsed.length > 0 && purchases.length === 0) {
    return NextResponse.json(
      { error: `Found ${parsed.length} orders but no coach credentials among them.` },
      { status: 400 },
    )
  }
  if (purchases.length === 0) {
    return NextResponse.json(
      { error: "No orders found in that. Each row needs an email address and an order number." },
      { status: 400 },
    )
  }

  const now = new Date().toISOString()
  const { error } = await admin.from(PURCHASES_TABLE).upsert(
    purchases.map((purchase) => ({
      order_id: purchase.orderId,
      email: purchase.email,
      purchased_at: purchase.purchasedAt,
      ticket_type: purchase.ticketType,
      status: purchase.status,
      updated_at: now,
    })),
    { onConflict: "order_id" },
  )

  if (error) {
    console.error("[toc purchases] import:", error.message)
    return NextResponse.json({ error: tableHint(error.message) }, { status: 500 })
  }

  return NextResponse.json({ ok: true, imported: purchases.length, skipped })
}

/** The one failure worth explaining rather than logging: the table is not there yet. */
function tableHint(message: string): string {
  return /does not exist|schema cache/i.test(message)
    ? "The purchases table does not exist yet — run the migration in the Supabase SQL editor first."
    : "Could not save that."
}
