/**
 * Everyone supporting North Carolina wrestling, in one list.
 *
 * There were two: six Giving Hour partners hardcoded in the tournament page and a separate
 * corporate list on the fundraising hub. The Guild sat in both under different names, so adding
 * a partner to one left them invisible on the other. Both read from here now.
 *
 * Logos live under `public/images/`. Wide horizontal files (~3:1) sit best in the spotlight rows.
 */

export type Partner = {
  id: string
  name: string
  /** Null when a partner has no site to send people to. */
  href: string | null
  logoSrc: string
  logoAlt: string
  /**
   * `giving-hour` partners fund the raffle prizes given away before the finals.
   * `corporate` partners support the wider programme. A partner can be both.
   */
  support: ReadonlyArray<"giving-hour" | "corporate">
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
] as const

export function partnersSupporting(kind: "giving-hour" | "corporate"): readonly Partner[] {
  return PARTNERS.filter((p) => p.support.includes(kind))
}
