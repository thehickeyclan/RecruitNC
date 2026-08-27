import { partnersSupporting } from "@/lib/partners"

/**
 * Corporate / brand partners spotlight on the fundraising hub.
 *
 * Kept as a view over the single partner list rather than its own copy: this and the tournament's
 * Giving Hour section each held their own, and The Guild sat in both under two different names.
 * Add partners in `lib/partners.ts`.
 */
export type CorporateSponsor = {
  id: string
  /** Short label for captions / aria */
  name: string
  logoSrc: string
  logoAlt: string
  href: string
}

export const CORPORATE_SPONSORS: readonly CorporateSponsor[] = partnersSupporting("corporate")
  // The spotlight links every logo, so a partner with no site is not shown here.
  .filter((p): p is typeof p & { href: string } => Boolean(p.href))
  .map((p) => ({ id: p.id, name: p.name, logoSrc: p.logoSrc, logoAlt: p.logoAlt, href: p.href }))
