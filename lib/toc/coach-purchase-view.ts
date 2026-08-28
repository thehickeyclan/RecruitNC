import type { SupabaseClient } from "@supabase/supabase-js"
import { contactsByCoach, type ResolvedCoachRows } from "@/lib/toc/coach-identity"
import {
  matchPurchases,
  suggestCoaches,
  type PurchaseCoachMatch,
  type TicketPurchase,
} from "@/lib/toc/coach-ticket-purchases"

/** What the door wants to know about one coach: not just told, but gone and got it. */
export type CoachTicket = {
  orderId: string
  purchasedAt: string | null
  status: string | null
  via: PurchaseCoachMatch["via"]
}

export type UnmatchedPurchase = TicketPurchase & {
  suggestions: { coachKey: string; coachName: string }[]
}

export const PURCHASES_TABLE = "toc_coach_ticket_purchases"

/**
 * Credentials bought, matched onto the coaches we hold.
 *
 * Returns empty rather than failing when the table is not there yet, so the coaches page keeps
 * working before the migration is run — a page that dies because a new feature has no storage is
 * worse than a page missing a badge.
 */
export async function loadCoachTickets(
  admin: SupabaseClient,
  rows: ResolvedCoachRows,
  coaches: readonly { coachKey: string; coachName: string }[],
): Promise<{ byCoach: Map<string, CoachTicket>; unmatched: UnmatchedPurchase[]; ready: boolean }> {
  const { data, error } = await admin
    .from(PURCHASES_TABLE)
    .select("order_id,email,purchased_at,ticket_type,status,linked_coach_key")

  if (error) return { byCoach: new Map(), unmatched: [], ready: false }

  const purchases: TicketPurchase[] = (data ?? []).map((row) => ({
    email: String(row.email ?? "").toLowerCase(),
    orderId: String(row.order_id),
    purchasedAt: row.purchased_at ? String(row.purchased_at) : null,
    ticketType: row.ticket_type ? String(row.ticket_type) : null,
    status: row.status ? String(row.status) : null,
  }))

  const linked = new Map<string, string>()
  for (const row of data ?? []) {
    if (row.linked_coach_key) linked.set(String(row.order_id), String(row.linked_coach_key))
  }

  // The address somebody checks out with is often the one on their account rather than the one a
  // family gave us, so the accounts behind these addresses are part of the match.
  const emails = [...new Set(purchases.map((p) => p.email))]
  const directory = emails.length
    ? ((await admin.from("user_profiles").select("user_id,email,cell_phone").in("email", emails)).data ?? []).map(
        (person) => ({
          userId: String(person.user_id),
          email: person.email ? String(person.email) : null,
          phone: person.cell_phone ? String(person.cell_phone) : null,
        }),
      )
    : []

  const contacts = contactsByCoach(rows)
  const matches = matchPurchases({
    purchases,
    emailsByCoach: contacts.emails,
    phonesByCoach: contacts.phones,
    directory,
    linked,
  })

  const byCoach = new Map<string, CoachTicket>()
  const unmatched: UnmatchedPurchase[] = []
  for (const purchase of purchases) {
    const match = matches.get(purchase.orderId)
    if (!match) {
      unmatched.push({ ...purchase, suggestions: suggestCoaches(purchase.email, coaches) })
      continue
    }
    // A coach who bought twice keeps the first: the door only needs to know that they did.
    if (!byCoach.has(match.coachKey)) {
      byCoach.set(match.coachKey, {
        orderId: purchase.orderId,
        purchasedAt: purchase.purchasedAt,
        status: purchase.status,
        via: match.via,
      })
    }
  }

  unmatched.sort((a, b) => (b.purchasedAt ?? "").localeCompare(a.purchasedAt ?? "") || a.email.localeCompare(b.email))
  return { byCoach, unmatched, ready: true }
}
