/**
 * Loads a GoFan fan-ticket export into toc_fan_ticket_buyers. Safe to re-run with a newer export:
 * rows upsert on email, and refunded tickets are skipped.
 *
 *   node --env-file=.env.local scripts/import-toc-fan-ticket-buyers.mjs ~/Downloads/export_fan-tickets_....csv
 */
import { readFileSync } from "node:fs"
import pg from "pg"

const file = process.argv[2]
if (!file) { console.error("Pass the GoFan CSV path."); process.exit(1) }

const parse = (line) => {
  const out = []; let cur = ""; let quoted = false
  for (const c of line) {
    if (c === '"') quoted = !quoted
    else if (c === "," && !quoted) { out.push(cur); cur = "" }
    else cur += c
  }
  out.push(cur)
  return out
}
const lines = readFileSync(file, "utf8").trim().split(/\r?\n/)
const header = parse(lines[0])
const col = (name) => header.indexOf(name)
const [iEmail, iFirst, iLast, iDate, iRefunded] = ["Email", "First name", "Last name", "Purchase date", "Refunded At"].map(col)
if (iEmail < 0) { console.error("No Email column — is this the fan-ticket export?"); process.exit(1) }

const buyers = new Map()
let refunded = 0
for (const line of lines.slice(1)) {
  const r = parse(line)
  if (r[iRefunded] && r[iRefunded] !== "--") { refunded++; continue }
  const email = r[iEmail]?.trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue
  const prev = buyers.get(email)
  buyers.set(email, {
    email,
    first: prev?.first || r[iFirst]?.trim() || null,
    last: prev?.last || r[iLast]?.trim() || null,
    tickets: (prev?.tickets ?? 0) + 1,
    date: [prev?.date, r[iDate]].filter(Boolean).sort().pop() ?? null,
  })
}

const client = new pg.Client({ connectionString: process.env.POSTGRES_URL_NON_POOLING.replace(/[?&]sslmode=[^&]*/, ""), ssl: { rejectUnauthorized: false } })
await client.connect()
for (const b of buyers.values()) {
  await client.query(
    `insert into public.toc_fan_ticket_buyers (email, first_name, last_name, tickets, last_purchased_at)
     values ($1, $2, $3, $4, $5)
     on conflict (email) do update set first_name = excluded.first_name, last_name = excluded.last_name,
       tickets = excluded.tickets, last_purchased_at = excluded.last_purchased_at, updated_at = now()`,
    [b.email, b.first, b.last, b.tickets, b.date],
  )
}
const { rows } = await client.query("select count(*)::int as n from public.toc_fan_ticket_buyers")
await client.end()
console.log(`Imported ${buyers.size} buyers (${lines.length - 1} tickets, ${refunded} refunded skipped). Table holds ${rows[0].n}.`)
