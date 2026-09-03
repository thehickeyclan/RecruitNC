/**
 * Turns a pasted GoFan coach-credential export into an idempotent upsert.
 *
 * The loop this serves: GoFan collects the buyer's first and last name, Matt pastes the order
 * export into chat, and this writes the SQL. Generated from the parser's output rather than read
 * by eye, because a mistyped order number silently credits the wrong coach.
 *
 *   npx tsx scripts/gofan-coach-tickets-to-sql.ts <paste-file>
 *
 * Names are included whenever the export carries them. They are the route that places a coach who
 * checked out under a club account or a spouse's address, which email matching cannot.
 */
import { parseGoFanPaste, isCoachCredential } from "@/lib/toc/coach-ticket-purchases"
import { readFileSync } from "fs"

const file = process.argv[2]
if (!file) {
  console.error("usage: npx tsx scripts/gofan-coach-tickets-to-sql.ts <paste-file>")
  process.exit(1)
}

const all = parseGoFanPaste(readFileSync(file, "utf8"))
const coach = all.filter(isCoachCredential)
const skipped = all.length - coach.length

const q = (v: string | null) => (v === null ? "null" : `'${v.replace(/'/g, "''")}'`)
const values = coach
  .map(
    (r) =>
      `  (${q(r.orderId)}, ${q(r.email)}, ${q(r.firstName)}, ${q(r.lastName)}, ` +
      `${r.purchasedAt ? `${q(r.purchasedAt)}::date` : "null"}, ${q(r.ticketType)}, ${q(r.status)})`,
  )
  .join(",\n")

console.log(`-- ${coach.length} coach credential(s)${skipped ? `; ${skipped} non-credential row(s) skipped` : ""}`)
console.log(`-- with a buyer name: ${coach.filter((r) => r.firstName && r.lastName).length} of ${coach.length}`)
console.log(`insert into public.toc_coach_ticket_purchases
  (order_id, email, first_name, last_name, purchased_at, ticket_type, status)
values
${values}
on conflict (order_id) do update set
  email        = excluded.email,
  -- Never blank a name we already hold: an older export has these columns empty.
  first_name   = coalesce(excluded.first_name, public.toc_coach_ticket_purchases.first_name),
  last_name    = coalesce(excluded.last_name, public.toc_coach_ticket_purchases.last_name),
  purchased_at = excluded.purchased_at,
  ticket_type  = excluded.ticket_type,
  status       = excluded.status,
  updated_at   = now();`)
