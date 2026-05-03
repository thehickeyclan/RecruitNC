/**
 * Corporate / brand partners spotlight on the fundraising hub.
 * Add rows as assets land under `public/images/sponsors/`.
 * Prefer wide horizontal logo files (~3:1) for the spotlight layout; full brand sheets work but may appear small.
 */
export type CorporateSponsor = {
  id: string
  /** Short label for captions /aria */
  name: string
  logoSrc: string
  logoAlt: string
  href: string
}

export const CORPORATE_SPONSORS: readonly CorporateSponsor[] = [
  {
    id: "the-guild",
    name: "The Guild",
    logoSrc: "/images/sponsors/the-guild-brand.jpg",
    logoAlt: "The Guild — train with Division I wrestlers",
    href: "https://theguildwrestling.com",
  },
] as const
