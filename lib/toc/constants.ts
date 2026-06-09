/** NC United Tournament of Champions — shared constants (Phase 1 marketing).
 * Public copy on `/tournament-of-champions` is fan/athlete marketing only — no P&L, capacity caps,
 * inventory, or internal ops language on the landing page. See `.cursorrules` TOC section. */

export const TOC_EVENT_DATE = new Date("2026-09-04T09:00:00-04:00")

export const TOC_WEIGHT_CLASSES = [
  117, 125, 133, 141, 149, 157, 165, 174, 184, 197, 285,
] as const

export const TOC_AI_RENDERING_CAPTION =
  "AI rendering of the existing facility for illustration; actual setup and presentation may vary." as const

export const TOC_CONTACT_EMAIL = "info@ncwrestlingunited.com" as const

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
    description:
      "Dual mats for opening rounds and placement bouts — then one mat dedicated for championship finals under the lights.",
  },
  {
    title: "Dedicated college coaches section",
    description: "Reserved seating and sightlines for college staffs watching the brackets live.",
  },
  {
    title: "Up to 1,000 fans",
    description: "Bleacher seating wraps the floor so families and fans are on top of every match.",
  },
  {
    title: "Pro lighting & production",
    description: "State-of-the-art lighting, video boards, and show production — built for entertainment, not just brackets.",
  },
  {
    title: "Finals presentation",
    description:
      "Championship finals get full production — intros, awards, and the jacket moment under the lights.",
  },
] as const

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
  { value: "title", label: "Title", description: "Premier naming and top billing across the event" },
  { value: "champion", label: "Champion", description: "High-visibility placement tied to championship moments" },
  { value: "partner", label: "Partner", description: "Strong brand presence on-site and in event materials" },
  { value: "community", label: "Community", description: "Support NC wrestling and reach families in the building" },
] as const

export const TOC_SPONSORSHIP = {
  eyebrow: "Sponsorship",
  headline: "North Carolina's #1 wrestling stage",
  lead:
    "The Tournament of Champions is invite-only, college-weight, and built like a show — not another bracket grind. When the best 88 wrestlers in the state converge in Apex, your brand sits on the biggest all-NC tournament of the year by far.",
  bullets: [
    "Up to 1,000 fans in the building — families, clubs, and programs from every corner of the state",
    "Live stream and video boards — exposure beyond the arena all weekend long",
    "Dedicated college coaches section — your logo in front of programs watching the brackets",
    "Single-mat finals under the lights — championship presentation, jacket moments, and peak attention",
    "Patriotic NC United brand — red, white, and navy athletics with statewide reach through RecruitNC",
  ],
  formHeadline: "Request sponsorship info",
  formLead: "Tell us about your company and we'll send tier options and follow up directly.",
} as const

export const TOC_ATHLETE_QUOTES = {
  eyebrow: "In their words",
  headline: "Committed wrestlers on the field",
  lead: "The best in the state — already committed to college programs — on why this weekend matters.",
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
        "What excites me most is the bracket. There aren't any easy rounds when you're wrestling seven other elite guys. Every match matters, and that's what makes winning something like this mean so much.",
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

export const TOC_ACTIVE_SPONSORS = [
  {
    name: "The Wrestling Guild",
    href: "https://www.wrestlingguild.com/",
    logoUrl: "/images/toc/sponsors/the-guild.png",
    logoTheme: "dark",
    tagline:
      "Youth wrestling coaching for all levels — book elite coaches for private training or join open partner and small-group sessions across North Carolina.",
  },
  {
    name: "Cama Meal",
    href: "https://www.camameal.com/",
    logoUrl: "/images/toc/sponsors/cama-meal.png",
    logoTheme: "light",
    tagline:
      "The world's best protein powder — built for wrestlers and MMA athletes. Grass-fed whey, real flavors, and recovery you can feel.",
  },
] as const

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
