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

    const date = chunk.match(/([A-Za-z]{3})-(\d{1,2})-(\d{4})/)
    const month = date ? MONTHS[date[1].toLowerCase()] : null
    const purchasedAt = date && month ? `${date[3]}-${month}-${date[2].padStart(2, "0")}` : null

    const status = chunk.match(/\b(Active|Refunded|Cancell?ed|Pending)\b/i)?.[1] ?? null
    const ticketType = chunk.match(/^[ \t]*([A-Za-z][^\t\n]*?(?:Credential|Ticket|Pass))[ \t]*(?:\t|$)/m)?.[1]?.trim() ?? null

    // One row per order: a paste that overlaps a previous one must not double up.
    byOrder.set(orderId, { email: start.email, orderId, purchasedAt, ticketType, status })
  })

  return [...byOrder.values()]
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
