/** NC United Tournament of Champions — shared constants (Phase 1 marketing).
 * Public copy on `/tournament-of-champions` is fan/athlete marketing only — no P&L, capacity caps,
 * inventory, or internal ops language on the landing page. See `.cursorrules` TOC section. */

export const TOC_EVENT_DATE = new Date("2026-09-04T09:00:00-04:00")

export const TOC_WEIGHT_CLASSES = [
  117, 125, 133, 141, 149, 157, 165, 174, 184, 197, 285,
] as const

export const TOC_WEIGH_IN_LINE = "Single weigh-in · No weight allowances" as const

export const TOC_AI_RENDERING_CAPTION =
  "AI rendering of the existing facility for illustration; actual setup and presentation may vary." as const

export const TOC_CONTACT_EMAIL = "info@ncwrestlingunited.com" as const

/** Canonical mats copy — use site-wide wherever two-mat → finals format is described. */
export const TOC_MATS_LINE = "Two mats all weekend. One mat under the lights for finals." as const

export const TOC_TICKET_SALE_MONTH = "August 2026" as const

export const TOC_NC_UNITED_ABOUT = {
  headline: "About NC United",
  body:
    "NC United is a 501(c)(3) nonprofit building North Carolina's premier wrestling ecosystem — from the RecruitNC recruiting platform to youth development, college coaching access, and signature events. Co-founded by Matt Hickey, Michael Macchiavello, and Colton Palmer.",
  href: "https://ncwrestlingunited.com",
  linkLabel: "Learn more at ncwrestlingunited.com",
} as const

export const TOC_SPECTATORS = {
  eyebrow: "For families and fans",
  headline: "You're welcome in the building",
  lead:
    "The Tournament of Champions is built for the big stage — and it's also a family-friendly weekend in a comfortable, modern venue. Everything you'd want for a wrestling weekend, in one building.",
  expectations: [
    "Free on-site parking",
    "Comfortable stadium seating with back rests — plus bleacher and floor options",
    "Air-conditioned facility, easy accessibility",
    "Family-friendly atmosphere — no alcohol, kid-appropriate",
    "College coaches recruiting in the building — credentialed lounge with live mat feeds (D1 / D2 / D3 / NAIA programs)",
  ],
  concessions: {
    headline: "Health-first concessions",
    lead:
      "We put health first for wrestlers and fans. Concessions are built around good nutrition, real food, and choices that accelerate recovery — while giving families the energy to support our athletes all weekend.",
    highlights: [
      "Real food — not typical tournament fare",
      "Recovery-focused options for elite athletes between matches",
      "Fan-friendly nutrition that keeps the crowd going for every bout",
    ],
    venuePolicy:
      "Venue-wide policy: no soda, chips, candy, or junk food sold or available anywhere in the building.",
  },
  ticketOptions: [
    {
      title: "Single-day ticket",
      description: "Friday opening round, or Saturday placement bouts + finals",
    },
    {
      title: "Weekend pass",
      description: "Both days, including championship finals under the lights",
    },
  ],
} as const

export const TOC_FOUNDING_PARTNERS = {
  eyebrow: "Founding Partners",
  lead: "Brands helping build the foundation of NC's premier wrestling stage in its inaugural year.",
  urgency: "Inaugural year — limited founding partner slots remaining.",
  ctaLabel: "Request sponsorship info",
  ctaHref: "#sponsor-inquiry",
  partners: [
    {
      name: "The Wrestling Guild",
      href: "https://www.wrestlingguild.com/",
      logoUrl: "/images/toc/sponsors/the-guild.png",
      logoTheme: "dark" as const,
      ecosystemNote: "Part of the NC United ecosystem.",
      tagline:
        "Youth wrestling coaching marketplace connecting NCAA athletes with North Carolina families for private and small-group training.",
    },
    {
      name: "Cama Meal",
      href: "https://www.camameal.com/",
      logoUrl: "/images/toc/sponsors/cama-meal.png",
      logoTheme: "light" as const,
      tagline:
        "The world's best protein powder, built for wrestlers and combat athletes. Grass-fed whey, real flavors, recovery you can feel.",
    },
  ],
} as const

export const TOC_VENUE = {
  name: "Hope Community Church",
  campus: "Apex Campus",
  city: "Apex, NC",
  address: "2080 East Williams Street, Apex, NC 27539",
  mapsUrl: "https://maps.google.com/?q=2080+East+Williams+Street+Apex+NC+27539",
  seatingLabel: "Seating for up to 1,000",
} as const

export const TOC_VENUE_FEATURES = [
  {
    title: "Two competition mats",
    description: TOC_MATS_LINE,
  },
  {
    title: "Up to 1,000 fans",
    description:
      "Comfortable stadium seating with back rests, bleachers, and floor sightlines — families on top of every match.",
  },
  {
    title: "Pro lighting & production",
    description: "State-of-the-art lighting, video boards, and arena production — built for the moment, not just brackets.",
  },
  {
    title: "Finals presentation",
    description:
      "Championship finals get full production — intros, awards, and the jacket moment under the lights.",
  },
] as const

/** Public marketing copy — two separate Hope atrium rooms; ops detail in docs/toc-venue-ops.md */
export const TOC_VENUE_LOUNGES = {
  eyebrow: "Dedicated lounges",
  headline: "College coaches and officials — separate rooms",
  lead:
    "Two of Hope Apex's atrium rooms are reserved for credentialed college coaches and tournament officials — never combined. Coaches recruit; officials adjudicate. Keeping them apart is intentional.",
  coaches: {
    title: "College Coaches Lounge",
    description:
      "Credentialed college staffs only (lanyard at check-in). Comfortable seating, work tables, charging and Wi-Fi, live feeds from both mats plus bracket updates, hospitality all weekend, print station for brackets and athlete profiles, and a quiet phone-booth area for calls.",
  },
  officials: {
    title: "Officials Lounge",
    description:
      "Separate room away from coaches and athletes — locking gear storage, casual seating, and a table for meals. Water, snacks, and light meals for officials and clinic staff to rest and regroup between sessions.",
  },
} as const

export const TOC_FINALS_MAT = {
  eyebrow: "Championship finals",
  headline: "One mat under the lights",
  lead:
    "Saturday evening the arena narrows to a single mat — finalist introductions, live announcements, and all eleven championship bouts with spotlight production and video boards.",
  bullets: [
    "Parade of finalists before each weight",
    "Live PA announcements and title-bout presentation",
    "One mat — every eye in the building on the championship match",
  ],
} as const

export const TOC_GRADUATION_YEARS = ["2026", "2027", "2028", "2029", "2030"] as const

export const TOC_NOMINATION_RELATIONSHIPS = [
  { value: "coach", label: "Coach" },
  { value: "parent", label: "Parent / guardian" },
  { value: "athlete", label: "Athlete (self)" },
  { value: "other", label: "Other" },
] as const

export const TOC_SPONSOR_TIERS = [
  {
    value: "title",
    label: "Title",
    description: "Naming rights, top billing, mat-side branding, video board prime, sponsor announcement Saturday night, hospitality",
  },
  {
    value: "champion",
    label: "Champion",
    description: "Co-branding event materials, video board placement, mat branding, College Coaches Lounge naming rights, social inclusion, hospitality",
  },
  {
    value: "partner",
    label: "Partner",
    description: "Logo on event materials, on-site signage, social media",
  },
  {
    value: "community",
    label: "Community",
    description: "Website logo, program recognition",
  },
] as const

export const TOC_SPONSORSHIP = {
  eyebrow: "Sponsorship",
  headline: "North Carolina's #1 wrestling stage",
  lead: `The Tournament of Champions is invite-only, college-weight, and built for the big stage — not another bracket grind. ${TOC_MATS_LINE} When the best 88 wrestlers in the state converge in Apex, your brand sits on the biggest all-NC tournament of the year by far.`,
  bullets: [
    "Up to 1,000 fans in the building — families, clubs, and programs from every corner of the state",
    "Live stream and video boards — exposure beyond the arena all weekend long",
    "College Coaches Lounge — Champion-tier naming rights and face time with programs recruiting all weekend",
    "Single-mat finals under the lights — championship presentation, jacket moments, and peak attention",
    "Patriotic NC United brand — red, white, and navy athletics with statewide reach through RecruitNC",
  ],
  formHeadline: "Request sponsorship info",
  formLead: "Tell us about your company and we'll follow up with tier benefits and customization options.",
} as const

/** @deprecated use TOC_FOUNDING_PARTNERS */
export const TOC_ACTIVE_SPONSORS = TOC_FOUNDING_PARTNERS.partners

export const TOC_ATHLETE_QUOTES = {
  eyebrow: "In their words",
  headline: "What the state's best are saying",
  lead: "Four of NC's top wrestlers — on the bracket, the atmosphere, and the jacket.",
  quotes: [
    {
      name: "Carson Worrick",
      credentials: "Davie HS • All-American • #1 Ranked NC Class of 2027 • Binghamton Commit",
      quote:
        "People always debate who the best wrestler in the state is. Tournament of Champions gives us a chance to settle it on the mat. The best guys, one bracket, no excuses. That's what competition is supposed to be.",
    },
    {
      name: "Tobin McNair",
      credentials: "Wakefield HS • 2× All-American • #2 Ranked on RecruitNC • Binghamton Commit",
      quote:
        "What excites me most is the chance to wrestle the actual best NC has at my weight — and finally get clarity on who the best in the state really is. New Jersey and California have that. North Carolina deserves it too. When you're going against seven other elite guys with everything on the line, every match matters.",
    },
    {
      name: "Mac Johnson",
      credentials: "Cape Fear HS • 2026 NCHSAA State Champion • App State Commit",
      quote:
        "The atmosphere is going to be incredible. The introductions, the spotlight finals, the crowd, the energy—it's the kind of stage every wrestler wants to compete on. North Carolina wrestling deserves an event like this.",
    },
    {
      name: "Tye Johnson",
      credentials: "Cape Fear HS • 3× NCHSAA State Champion • App State Commit",
      quote:
        "The champion jacket is what stands out to me. Anybody can buy gear, but you can't buy that jacket. You have to earn it by beating the best wrestlers in the state. That's what makes it special.",
    },
  ],
} as const

export const TOC_BRAND = {
  navy: "#0B1D3A",
  navyDeep: "#060f1f",
  red: "#CC0000",
  redHover: "#a80000",
  white: "#FFFFFF",
} as const

/** Confirmed recruiting-fair programs — explicit logos for the TOC landing page. */
export const TOC_CONFIRMED_COLLEGES_DEFAULT = [
  {
    name: "UNC",
    logoUrl:
      "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/Uigu95m8-1745952038636.png",
  },
  {
    name: "NC State",
    logoUrl:
      "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/fe5ixmej-1745958547259.png",
  },
  {
    name: "Lynchburg",
    logoUrl:
      "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/SmHkZ3IPPB6ayHiOYue4Y-Lynchburg.jpg",
  },
  {
    name: "Roanoke",
    logoUrl:
      "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/-i2rnrys-1745958901725.png",
  },
] as const

/** Program names only — used when `toc_event_config.confirmed_colleges` is empty. */
export const TOC_CONFIRMED_COLLEGES = TOC_CONFIRMED_COLLEGES_DEFAULT.map((c) => c.name)

export const TOC_DEFAULT_CONFIG = {
  phase: "phase_1" as const,
  event_dates: "September 4–5, 2026",
  venue_name: TOC_VENUE.name,
  venue_address: TOC_VENUE.address,
  hero_primary_cta_label: "Get Notified",
  hero_primary_cta_href: "#email-signup",
} as const

export const TOC_STREAMING = {
  headline: "Live streaming",
  teaser: "The event will be live streamed. Details coming soon.",
  notifyHint: "Sign up below and we'll send the watch link when broadcast details are announced.",
} as const
