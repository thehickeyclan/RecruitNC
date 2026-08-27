/**
 * Everyone supporting North Carolina wrestling, in one list.
 *
 * There were two: six Giving Hour partners hardcoded in the tournament page and a separate
 * corporate list on the fundraising hub. The Guild sat in both under different names, so adding
 * a partner to one left them invisible on the other. Both read from here now.
 *
 * Logos live under `public/images/`. Wide horizontal files (~3:1) sit best in the spotlight rows.
 */

/**
 * `giving-hour` funds the raffle prizes given away before the finals.
 * `corporate` supports the wider programme through the year.
 * `in-kind` gave goods or services to the event rather than money.
 * `major-gift` gave something large enough to name on its own.
 * A supporter can be more than one.
 */
export type SupportKind = "giving-hour" | "corporate" | "in-kind" | "major-gift"

export type Partner = {
  id: string
  name: string
  /** Null when there is no site to send people to. */
  href: string | null
  /** Null when we have no logo file. The name carries it instead of a broken image. */
  logoSrc: string | null
  logoAlt: string
  /** What they actually gave. Shown for in-kind and major gifts, where the gift is the point. */
  gift?: string
  support: ReadonlyArray<SupportKind>
}

export const PARTNERS: readonly Partner[] = [
  {
    id: "the-guild",
    name: "The Guild",
    href: "https://www.wrestlingguild.com",
    logoSrc: "/images/sponsors/the-guild-logo.jpg",
    logoAlt: "The Guild — train with Division I wrestlers",
    support: ["giving-hour", "corporate"],
  },
  {
    id: "submission-solutions",
    name: "Submission Solutions",
    href: "https://submission-solutions.com",
    logoSrc: "/images/sponsors/submission-solutions-logo.png",
    logoAlt: "Submission Solutions — athlete hygiene and training care",
    support: ["corporate"],
  },
  {
    id: "cronin-customs",
    name: "Cronin Customs",
    href: "https://www.cronincustoms.com/",
    logoSrc: "/images/united-ascent/2026-08-24-partner-cronin-customs.png",
    logoAlt: "Cronin Customs",
    support: ["giving-hour"],
  },
  {
    id: "funky-flickr-boyz",
    name: "Funky Flickr Boyz",
    href: "https://funkyflickrboyzgear.com/",
    logoSrc: "/images/united-ascent/2026-08-24-partner-funky-flickr-boyz.png",
    logoAlt: "Funky Flickr Boyz",
    support: ["giving-hour"],
  },
  {
    id: "wrestling-mindset",
    name: "Wrestling Mindset",
    href: "https://www.wrestlingmindset.com/",
    logoSrc: "/images/united-ascent/2026-08-24-partner-wrestling-mindset.png",
    logoAlt: "Wrestling Mindset",
    support: ["giving-hour"],
  },
  {
    id: "triangle-wrestling-academy",
    name: "Triangle Wrestling Academy",
    href: "https://trianglewrestlingacademy.com/",
    logoSrc: "/images/united-ascent/2026-08-24-partner-triangle-wrestling-academy.jpg",
    logoAlt: "Triangle Wrestling Academy",
    support: ["giving-hour"],
  },
  {
    id: "v1g1l-wrestling",
    name: "V1G1L Wrestling",
    href: null,
    logoSrc: "/images/united-ascent/2026-08-24-partner-v1g1l-wrestling.png",
    logoAlt: "V1G1L Wrestling",
    support: ["giving-hour"],
  },
  {
    id: "pathos",
    name: "Pathos",
    href: null,
    logoSrc: null,
    logoAlt: "Pathos — Live the Light",
    gift: "Socks for every Giving Hour winner",
    support: ["giving-hour"],
  },
  {
    id: "hickey-family",
    name: "The Hickey Family",
    href: null,
    logoSrc: null,
    logoAlt: "The Hickey Family",
    gift: "Two Resilite mats — a $24,000 donation to NC United",
    support: ["major-gift"],
  },
  {
    id: "farina",
    name: "Farina",
    href: "https://farinaraleigh.com/",
    logoSrc: null,
    logoAlt: "Farina, Raleigh",
    gift: "Food for the VIP lounge",
    support: ["in-kind"],
  },
  {
    id: "ny-bagel-and-deli",
    name: "New York Bagel & Deli",
    href: "https://www.newyorkbagelanddeliraleigh.com/",
    logoSrc: null,
    logoAlt: "New York Bagel & Deli, Raleigh",
    gift: "Breakfast bagels for the VIP lounge",
    support: ["in-kind"],
  },
  {
    id: "defense-soap",
    name: "Defense Soap",
    href: "https://defensesoap.com/",
    logoSrc: null,
    logoAlt: "Defense Soap",
    gift: "Supplies to keep the mats clean and the athletes and officials healthy",
    support: ["in-kind"],
  },
  {
    id: "wegmans",
    name: "Wegmans",
    href: null,
    logoSrc: null,
    logoAlt: "Wegmans",
    gift: "Gift cards toward food and drink",
    support: ["in-kind"],
  },
  {
    id: "costco",
    name: "Costco Wholesale",
    href: null,
    logoSrc: null,
    logoAlt: "Costco Wholesale",
    gift: "Gift cards toward food and drink",
    support: ["in-kind"],
  },
  {
    id: "food-lion",
    name: "Food Lion",
    href: null,
    logoSrc: null,
    logoAlt: "Food Lion",
    gift: "Gift cards toward food and drink",
    support: ["in-kind"],
  },
  {
    id: "cove",
    name: "Cove",
    href: null,
    logoSrc: null,
    logoAlt: "Cove probiotic soda",
    gift: "Twelve cases of probiotic soda",
    support: ["in-kind"],
  },
] as const

export function partnersSupporting(kind: SupportKind): readonly Partner[] {
  return PARTNERS.filter((p) => p.support.includes(kind))
}

/** Only those we can actually show a logo for — a grid of names is a list, not a grid. */
export function partnersWithLogos(kind: SupportKind): readonly (Partner & { logoSrc: string })[] {
  return partnersSupporting(kind).filter((p): p is Partner & { logoSrc: string } => Boolean(p.logoSrc))
}
