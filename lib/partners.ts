/**
 * Everyone supporting North Carolina wrestling, in one list.
 *
 * There were two: six Giving Hour partners hardcoded in the tournament page and a separate
 * corporate list on the fundraising hub. The Guild sat in both under different names, so adding
 * a partner to one left them invisible on the other. Both read from here now.
 *
 * Logos live under `public/images/` or in blob storage; either is fine, and the blob host is
 * already allowed for next/image. Wide horizontal files (~3:1) sit best in the spotlight rows.
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
  /** A photograph of the gift itself, for the gifts worth showing rather than describing. */
  photoSrc?: string
  photoAlt?: string
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
    logoSrc: "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/DCEzMmwaWr3rh4whHxE4R-Pathos.png",
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
    // photoSrc: "…", photoAlt: "The Resilite mats donated by the Hickey family",
    support: ["major-gift"],
  },
  {
    id: "farina",
    name: "Farina",
    href: "https://farinaraleigh.com/",
    logoSrc: "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/reGHXoSFTnC-X6Gn1epmn-Ferina.png",
    logoAlt: "Farina, Raleigh",
    gift: "Food for the VIP lounge",
    support: ["in-kind"],
  },
  {
    id: "ny-bagel-and-deli",
    name: "New York Bagel & Deli",
    href: "https://www.newyorkbagelanddeliraleigh.com/",
    logoSrc: "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/HTEiGhQGr2XWMEl-b2L3Z-NY%20Bagel.png",
    logoAlt: "New York Bagel & Deli, Raleigh",
    gift: "Breakfast bagels for the VIP lounge",
    support: ["in-kind"],
  },
  {
    id: "defense-soap",
    name: "Defense Soap",
    href: "https://defensesoap.com/",
    logoSrc: "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/St0U5IBN5JdPkOoJQN1_Z-Defense%20Soap.jpeg",
    logoAlt: "Defense Soap",
    gift: "Supplies to keep the mats clean and the athletes and officials healthy",
    support: ["in-kind"],
  },
  {
    id: "wegmans",
    name: "Wegmans",
    href: null,
    logoSrc: "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/us3HD3BM8HIJ5hc4v-CtM-Wegmans.jpeg",
    logoAlt: "Wegmans",
    gift: "Gift cards toward food and drink",
    support: ["in-kind"],
  },
  {
    id: "costco",
    name: "Costco Wholesale",
    href: null,
    logoSrc: "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/X8HOuaIGXkAWvH0Bm5pLo-Costco.png",
    logoAlt: "Costco Wholesale",
    gift: "Gift cards toward food and drink",
    support: ["in-kind"],
  },
  {
    id: "food-lion",
    name: "Food Lion",
    href: null,
    logoSrc: "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/E_P6OvLA6EnFHbpC3sHeK-Food%20Lion.png",
    logoAlt: "Food Lion",
    gift: "Gift cards toward food and drink",
    support: ["in-kind"],
  },
  {
    id: "cove",
    name: "Cove",
    href: null,
    logoSrc: "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/sOrarzMWUKO7IYHEYcxtQ-Cove.jpeg",
    logoAlt: "Cove probiotic soda",
    gift: "Twelve cases of probiotic soda",
    support: ["in-kind"],
  },
  {
    id: "state-farm",
    name: "State Farm",
    href: null,
    logoSrc: "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/FD8FI3AmsMBy1gFT_-uYQ-State%20Farm%20.png",
    logoAlt: "State Farm",
    gift: "Food for the VIP lounge",
    support: ["in-kind"],
  },
  {
    id: "adidas-wrestling",
    name: "adidas Wrestling",
    href: "https://www.adidas.com/us/wrestling",
    logoSrc: "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/UjkxNwsDDBTlvuxQtt2_N-Adidas.png",
    logoAlt: "adidas Wrestling",
    gift: "Gear for the free raffle",
    support: ["giving-hour"],
  },
] as const

export function partnersSupporting(kind: SupportKind): readonly Partner[] {
  return PARTNERS.filter((p) => p.support.includes(kind))
}

/** Only those we can actually show a logo for — a grid of names is a list, not a grid. */
export function partnersWithLogos(kind: SupportKind): readonly (Partner & { logoSrc: string })[] {
  return partnersSupporting(kind).filter((p): p is Partner & { logoSrc: string } => Boolean(p.logoSrc))
}
