/**
 * Coach credentials bought at GoFan, matched back to the coaches we designated.
 *
 * Approving a coach and telling them about the link is not the same as their having used it.
 * The door needs the second fact, and until now nothing carried it: the admin page could say a
 * coach had been texted, never that they had acted on it.
 *
 * Matching is exact or it is nothing. A coach may be held by email, by mobile, or as an account,
 * and the address somebody checks out with is whichever one they happened to type — so three
 * exact routes are tried and anything left over is shown to a human rather than guessed at.
 * The last time a fuzzy matcher ran unattended here it decided South Stanly was a misspelling of
 * North Stanly.
 */

export type TicketPurchase = {
  email: string
  orderId: string
  /**
   * The buyer's name, once GoFan is set to ask for it.
   *
   * Both null on every order taken so far — the export carries the columns and writes them "--".
   * They are worth reading because email matching keeps failing on people who checked out under a
   * club account or a spouse's address, and a name would have placed every one of them.
   */
  firstName: string | null
  lastName: string | null
  /** ISO date, or null when the paste did not carry one. */
  purchasedAt: string | null
  ticketType: string | null
  status: string | null
}

const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
}

const EMAIL = /[^\s<>@,;]+@[^\s<>@,;]+\.[a-z]{2,}/gi

/** One row of a proper CSV, respecting quoted fields. */
function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let field = ""
  let quoted = false
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i]
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { field += '"'; i += 1; continue }
      if (c === '"') { quoted = false; continue }
      field += c
      continue
    }
    if (c === '"') { quoted = true; continue }
    if (c === ",") { out.push(field); field = ""; continue }
    field += c
  }
  out.push(field)
  return out
}

const CELL_EMPTY = (v: string | undefined) => {
  const t = (v ?? "").trim()
  return !t || t === "--" ? null : t
}

/**
 * The same export downloaded as a CSV rather than pasted.
 *
 * GoFan offers both, and they are not the same shape. Reading a CSV with the paste parser looked
 * like it worked — it returned rows, with order numbers — and was wrong: on a 315-row export it
 * found 162 records, missed a real credential and invented five, because that parser splits on
 * runs of text around each email and a CSV puts several emails' worth of columns on one line.
 * A wrong order number credits the wrong coach, so the format is detected rather than assumed.
 */
export function parseGoFanCsv(text: string): TicketPurchase[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim())
  if (!lines.length) return []

  const header = splitCsvLine(lines[0]).map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase())
  const col = (name: string) => header.indexOf(name)
  const iEmail = col("email")
  const iOrder = col("order id")
  if (iEmail < 0 || iOrder < 0) return []

  const iFirst = col("first name")
  const iLast = col("last name")
  const iDate = col("purchase date")
  const iType = col("ticket type")
  const iStatus = col("status")
  const iRefunded = col("refunded at")

  const out: TicketPurchase[] = []
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line)
    const email = CELL_EMPTY(cells[iEmail])
    const orderId = CELL_EMPTY(cells[iOrder])
    if (!email || !orderId) continue

    // "Refunded At" carries a date when the order was given back; that is not a held credential.
    const refunded = iRefunded >= 0 ? CELL_EMPTY(cells[iRefunded]) : null
    const status = iStatus >= 0 ? CELL_EMPTY(cells[iStatus]) : null

    out.push({
      email: email.toLowerCase(),
      orderId,
      firstName: iFirst >= 0 ? CELL_EMPTY(cells[iFirst]) : null,
      lastName: iLast >= 0 ? CELL_EMPTY(cells[iLast]) : null,
      purchasedAt: iDate >= 0 ? isoDate(CELL_EMPTY(cells[iDate])) : null,
      ticketType: iType >= 0 ? CELL_EMPTY(cells[iType]) : null,
      status: refunded ? "Refunded" : status,
    })
  }
  return out
}

/** "Sep-08-2026" or "2026-09-08" to an ISO date. */
function isoDate(raw: string | null): string | null {
  if (!raw) return null
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const named = raw.match(/^([A-Za-z]{3})[a-z]*[-\s](\d{1,2})[-,\s]+(\d{4})/)
  if (named) {
    const month = MONTHS[named[1].toLowerCase()]
    if (month) return `${named[3]}-${month}-${named[2].padStart(2, "0")}`
  }
  return null
}

/**
 * Read whichever form the export arrived in.
 *
 * A header row with an Email and an Order ID column means a downloaded CSV; anything else is a
 * paste. Callers should use this rather than choosing, because choosing wrong is silent.
 */
export function parseGoFanExport(text: string): TicketPurchase[] {
  const firstLine = text.split(/\r?\n/, 1)[0]?.toLowerCase() ?? ""
  if (firstLine.includes("email") && firstLine.includes("order id") && firstLine.includes(",")) {
    return parseGoFanCsv(text)
  }
  return parseGoFanPaste(text)
}

/**
 * Reads a GoFan order export pasted straight in.
 *
 * The export is tab-separated with the status on a line of its own and empty cells written as
 * "--", which no CSV reader survives. So rather than parse the layout, each record is taken as
 * the run of text belonging to one email address and the fields are picked out of it. A column
 * order that shifts, or a report with the names filled in, then costs nothing.
 */
export function parseGoFanPaste(text: string): TicketPurchase[] {
  const starts: { email: string; at: number }[] = []
  for (const match of text.matchAll(EMAIL)) {
    starts.push({ email: match[0].toLowerCase(), at: match.index ?? 0 })
  }

  const byOrder = new Map<string, TicketPurchase>()
  starts.forEach((start, i) => {
    const chunk = text.slice(start.at, i + 1 < starts.length ? starts[i + 1].at : undefined)

    // Anything long enough to be an order number, ignoring the year inside the date.
    const withoutDate = chunk.replace(/[A-Za-z]{3}-\d{1,2}-\d{4}/g, " ")
    const orderId = withoutDate.match(/\b(\d{6,12})\b/)?.[1] ?? null
    if (!orderId) return

    // Two shapes: "Aug-27-2026" in the pasted order report, "2026-08-27" in the CSV export. The
    // first date in the record is the purchase; the event's own dates come later in the row.
    const date = chunk.match(/(\d{4})-(\d{2})-(\d{2})|([A-Za-z]{3})-(\d{1,2})-(\d{4})/)
    let purchasedAt: string | null = null
    if (date?.[1]) {
      purchasedAt = `${date[1]}-${date[2]}-${date[3]}`
    } else if (date?.[4]) {
      const month = MONTHS[date[4].toLowerCase()]
      if (month) purchasedAt = `${date[6]}-${month}-${date[5].padStart(2, "0")}`
    }

    /**
     * The two cells between the email and the date are first and last name. Empty cells arrive as
     * "--", so anything that is not a placeholder, a date, a time or a number is taken as a name.
     */
    const beforeDate = chunk.split(/(?:\d{4}-\d{2}-\d{2})|(?:[A-Za-z]{3}-\d{1,2}-\d{4})/)[0] ?? ""
    const nameCells = beforeDate
      .split(/[\t,]/)
      .slice(1)
      .map((cell) => cell.trim().replace(/^"|"$/g, ""))
      .filter((cell) => cell && cell !== "--" && !/^\d/.test(cell) && /^[A-Za-z][A-Za-z'’.\- ]*$/.test(cell))
    const firstName = nameCells[0] ?? null
    const lastName = nameCells[1] ?? null

    const status = chunk.match(/\b(Active|Refunded|Cancell?ed|Pending|Transferred)\b/i)?.[1] ?? null
    // Anywhere in the record, not anchored to the start of a line: the order report pastes with
    // the type on its own line, while the CSV export puts it quoted mid-row after the email.
    const ticketType = chunk.match(/([A-Za-z][A-Za-z0-9 ]*(?:Credential|Pass|Ticket))/)?.[1]?.trim() ?? null

    /*
     * Keyed on the order *and* the attendee, not the order alone.
     *
     * "One row per order" was true until a family bought two credentials in one checkout. The
     * Worricks bought order 170196395 for both Chad Lewis and Josh Stanley — two of Carson's
     * coaches — and keying on the order number alone kept whichever came last and dropped the
     * other silently. A coach who was paid for shows up at the door uncredentialed, and nothing
     * anywhere reports that a row went missing.
     *
     * A genuine re-paste of the same row still collapses, because the same order and the same
     * attendee produce the same key.
     */
    const attendee = [firstName, lastName].filter(Boolean).join(" ").toLowerCase()
    byOrder.set(`${orderId}|${attendee}`, {
      email: start.email,
      orderId,
      firstName,
      lastName,
      purchasedAt,
      ticketType,
      status,
    })
  })

  return suffixSharedOrders([...byOrder.values()])
}

/**
 * Give the second and later attendee on one order their own id.
 *
 * `toc_coach_ticket_purchases` is keyed on `order_id`, so two people sharing a real order number
 * cannot both be stored under it. Rather than change the key the night before a tournament, the
 * extra attendees get a deterministic suffix — `170196395-2` — so the row is stable across every
 * future import instead of flipping between the two coaches.
 *
 * Sorted by name so the suffix never moves: the same export always produces the same ids.
 */
function suffixSharedOrders(rows: TicketPurchase[]): TicketPurchase[] {
  const byOrderNumber = new Map<string, TicketPurchase[]>()
  for (const row of rows) {
    const list = byOrderNumber.get(row.orderId) ?? []
    list.push(row)
    byOrderNumber.set(row.orderId, list)
  }

  const out: TicketPurchase[] = []
  for (const [, group] of byOrderNumber) {
    if (group.length === 1) {
      out.push(group[0]!)
      continue
    }
    const sorted = [...group].sort((a, b) =>
      `${a.lastName ?? ""} ${a.firstName ?? ""}`.localeCompare(`${b.lastName ?? ""} ${b.firstName ?? ""}`),
    )
    sorted.forEach((row, index) => {
      out.push(index === 0 ? row : { ...row, orderId: `${row.orderId}-${index + 1}` })
    })
  }
  return out
}

export type PurchaseCoachMatch = {
  /** How the purchase reached the coach, for a reader deciding whether to trust it. */
  via: "email" | "account" | "phone" | "linked"
  coachKey: string
}

export type DirectoryPerson = { userId: string; email: string | null; phone: string | null }

/**
 * Matches purchases onto coaches, exactly, by every route we hold.
 *
 * `emailsByCoach` and `phonesByCoach` are what each coach is known by after identity resolution,
 * `directory` is the accounts those addresses belong to, and `linked` is what an admin has
 * joined up by hand. Returns the match per order id; anything absent is genuinely unmatched.
 */
export function matchPurchases(input: {
  purchases: readonly TicketPurchase[]
  emailsByCoach: ReadonlyMap<string, ReadonlySet<string>>
  phonesByCoach: ReadonlyMap<string, ReadonlySet<string>>
  directory: readonly DirectoryPerson[]
  linked: ReadonlyMap<string, string>
}): Map<string, PurchaseCoachMatch> {
  const { purchases, emailsByCoach, phonesByCoach, directory, linked } = input

  const coachByEmail = new Map<string, string>()
  for (const [coachKey, emails] of emailsByCoach) {
    for (const email of emails) if (!coachByEmail.has(email)) coachByEmail.set(email, coachKey)
  }
  const coachByPhone = new Map<string, string>()
  for (const [coachKey, phones] of phonesByCoach) {
    for (const phone of phones) if (!coachByPhone.has(phone)) coachByPhone.set(phone, coachKey)
  }
  const personByEmail = new Map<string, DirectoryPerson>()
  for (const person of directory) {
    const email = (person.email ?? "").trim().toLowerCase()
    if (email) personByEmail.set(email, person)
  }

  const matches = new Map<string, PurchaseCoachMatch>()
  for (const purchase of purchases) {
    const email = purchase.email.trim().toLowerCase()

    // An admin's own decision outranks anything worked out here.
    const byHand = linked.get(purchase.orderId)
    if (byHand) { matches.set(purchase.orderId, { via: "linked", coachKey: byHand }); continue }

    const direct = coachByEmail.get(email)
    if (direct) { matches.set(purchase.orderId, { via: "email", coachKey: direct }); continue }

    // The address they checked out with may be the one on their account rather than the one a
    // family gave us — Tom Puckett was designated by mobile and bought under his account email.
    const person = personByEmail.get(email)
    if (!person) continue

    const byAccount = coachByEmail.get(`user:${person.userId}`) ?? findKey(emailsByCoach, `user:${person.userId}`)
    if (byAccount) { matches.set(purchase.orderId, { via: "account", coachKey: byAccount }); continue }

    const phone = digits(person.phone)
    const byPhone = phone ? coachByPhone.get(phone) : undefined
    if (byPhone) matches.set(purchase.orderId, { via: "phone", coachKey: byPhone })
  }
  return matches
}

function findKey(emailsByCoach: ReadonlyMap<string, ReadonlySet<string>>, coachKey: string): string | undefined {
  return emailsByCoach.has(coachKey) ? coachKey : undefined
}

/** Ten digits, or eleven with a US country code — the same rule the designations use. */
export function digits(phone: string | null | undefined): string | null {
  const only = String(phone ?? "").replace(/\D/g, "")
  if (only.length === 10) return only
  if (only.length === 11 && only.startsWith("1")) return only.slice(1)
  return null
}

/**
 * Coaches whose name shows up in an unmatched buyer's address.
 *
 * Offered to an admin to confirm, never applied. Aaron Gunning was designated by mobile and
 * bought as agunning9@, Justin Shuffler as shuff_78@ — obvious to a person, and not something
 * to act on without one.
 */
export function suggestCoaches(
  email: string,
  coaches: readonly { coachKey: string; coachName: string }[],
): { coachKey: string; coachName: string }[] {
  const local = email.split("@")[0].toLowerCase().replace(/[^a-z]/g, "")
  if (local.length < 4) return []

  return coaches
    .filter((coach) => {
      const parts = coach.coachName.toLowerCase().split(/\s+/).map((p) => p.replace(/[^a-z]/g, "")).filter((p) => p.length >= 4)
      return parts.some((part) => local.includes(part) || part.startsWith(local))
    })
    .map((coach) => ({ coachKey: coach.coachKey, coachName: coach.coachName }))
}

/**
 * Whether a row is a coach credential rather than a spectator ticket.
 *
 * The CSV export carries the whole event — 232 weekend passes alongside 17 credentials — and
 * importing all of it would mark every parent in the building as a coach who had collected a
 * lanyard, and bury the coaches page under two hundred buyers matching nobody.
 */
export function isCoachCredential(purchase: TicketPurchase): boolean {
  const type = purchase.ticketType ?? ""
  // A "TOC College Coach Pass" is a recruiter's admission, not a corner credential — different
  // product, different table, and crediting one as the other puts a college coach on the
  // coaches page holding a lanyard nobody issued them.
  if (/college/i.test(type)) return false
  return /coach/i.test(type)
}

/**
 * Whether this order still puts a credential in the buyer's hand.
 *
 * GoFan keeps a transferred order against the person who bought it, with the status changed — Jeff
 * Piercy bought one and passed it to Evan Worland, who has his own order. Crediting Jeff would
 * show him a green card for a ticket he no longer holds, and turn him away at the door.
 */
export function isHeldCredential(purchase: TicketPurchase): boolean {
  const status = (purchase.status ?? "").trim().toLowerCase()
  return status === "active" || status === ""
}
