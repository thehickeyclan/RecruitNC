/**
 * Clubs where a Blue membership is worth a free session.
 *
 * Held on the server and sent to the app with the card, so adding a partner is a deploy rather
 * than an App Store release — the screen renders whatever list it is given. If this grows past a
 * handful, or staff need to add one without a developer, it wants to become a table.
 *
 * `id` is what check-in rows are keyed on and must never change once a club has visits recorded
 * against it; `name` is only what a coach reads on the card.
 */
export type PartnerClub = {
  id: string
  name: string
}

export const PARTNER_CLUBS: readonly PartnerClub[] = [
  { id: "darkhorse", name: "Darkhorse Wrestling Club" },
]

export function partnerClubById(id: string): PartnerClub | null {
  return PARTNER_CLUBS.find((club) => club.id === id) ?? null
}
