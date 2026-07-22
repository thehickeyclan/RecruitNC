/** NC United Tournament of Champions — shared constants (Phase 1 marketing).
 * Public copy on `/tournament-of-champions` is fan/athlete marketing only — no P&L, capacity caps,
 * inventory, or internal ops language on the landing page. See `.cursorrules` TOC section. */

export const TOC_EVENT_DATE = new Date("2026-09-18T16:00:00-04:00")

/** Public date lines — single source for landing page, emails, FAQ, and schema. */
export const TOC_EVENT_DATES_RANGE = "September 18–19, 2026" as const
export const TOC_FRIDAY_EVENT_DATE = "Friday, September 18, 2026" as const
export const TOC_SATURDAY_COMPETITION_DATE = "Saturday, September 19, 2026" as const
export const TOC_EVENT_DATES_DISPLAY =
  `${TOC_EVENT_DATES_RANGE} · one weigh-in Friday night · first round after` as const

/** Single official weigh-in — fan-facing copy for landing, schedule, and athlete comms. */
export const TOC_WEIGH_IN = {
  headline: "One weigh-in — Friday night only",
  time: "4:00 PM Friday, September 18",
  detail:
    "There is no second weigh-in on Saturday. College weights on a flat scale — no allowance. Singlet required; skin check at the scale; USA Wrestling card required.",
} as const

/** Hero — large date stack at top of landing page. */
export const TOC_HERO_DATES = {
  headline: "Sept 18 & 19, 2026",
  subline: "One weigh-in Friday night · First round after · Brackets finish Saturday",
} as const

export const TOC_EVENT_LOGO = {
  src: "/images/toc/tournament-of-champions-share-card.png",
  alt: "North Carolina Wrestling Tournament of Champions — invite only, 2026",
  width: 1200,
  height: 630,
} as const

/** Champion jacket product shots — front/back on TOC navy in the section shell. */
export const TOC_CHAMPION_JACKET = {
  front: {
    src: "/images/toc/champion-jacket-front.png",
    alt: "NC United Tournament of Champions jacket — front with NORTH CAROLINA across the chest and red-white sleeve stripes",
    width: 891,
    height: 1024,
  },
  back: {
    src: "/images/toc/champion-jacket-back.png",
    alt: "NC United Tournament of Champions jacket — back with 2026 and CHAMPION",
    width: 891,
    height: 1024,
  },
} as const

/** Champion and placer awards — shown with the champion jacket section. */
export const TOC_TROPHIES_AND_AWARDS = {
  bracket: {
    src: "/images/toc/tournament-of-champions-bracket-award.png",
    alt: "Tournament of Champions 24 by 36 hard-copy champion bracket award",
    width: 1536,
    height: 1024,
  },
  items: [
    "Every champion receives a 24×36 hard-copy bracket.",
    "All three placers receive custom Tournament of Champions medals — gold, silver, and bronze.",
    "The champion jacket remains winner-only: one wrestler per weight earns it.",
  ],
} as const

export const TOC_COMPETITION_MATS = {
  eyebrow: "Competition surface",
  headline: "Purpose-built Resilite mats ordered for Tournament of Champions.",
  partnerLabel: "Mats by Resilite",
  rendering: {
    src: "/images/toc/resilite-nc-united-mat-rendering.png",
    alt: "Rendering of the NC United navy blue 42 by 42 Resilite wrestling mat with white NC United logo at center",
    width: 642,
    height: 602,
  },
  resiliteLogo: {
    src: "/images/toc/resilite-logo.png",
    alt: "Resilite — The Mat Company",
    width: 2992,
    height: 751,
  },
  items: [
    "Two 42×42 Resilite Flex 3 mats have been purpose-built and ordered specifically for the NC United Tournament of Champions.",
    "Navy Blue mat surface with a prominent white NC United logo at center.",
    "Flex 3 delivers lightweight, portable performance with custom UltraPrint graphics and a durable top-coat.",
    "Manufactured in North America using reinforced vinyl scrim heat-laminated to the foam core.",
    "Smooth, scuff-resistant, easy-to-clean surface built for competition and practice.",
  ],
} as const

export const TOC_WEIGHT_CLASSES = [
  117, 125, 133, 141, 149, 157, 165, 174, 184, 197, 285,
] as const

export const TOC_WEIGH_IN_LINE =
  `${TOC_WEIGH_IN.headline} · ${TOC_WEIGH_IN.time} · No allowance` as const

/** Public schedule — Friday weigh-in + first round; Saturday finishes brackets through finals. */
export const TOC_SCHEDULE = {
  headline: "When to be there",
  lead:
    "One official weigh-in only — 4:00 PM Friday night. No Saturday weigh-in. First-round bouts follow that evening; brackets play out Saturday with single-mat championship finals.",
  athleteNote:
    "Invited wrestlers: one weigh-in Friday at 4:00 PM only — then first round Friday night. There is no second weigh-in Saturday.",
  friday: {
    title: "Friday · September 18",
    subtitle: "One weigh-in at 4:00 PM · first round Friday night — two mats live",
    rows: [
      { time: "2:00 PM", activity: "Crew load-in — mats, scoring tables, PA, and production setup" },
      {
        time: "4:00 PM",
        activity: "One official weigh-in & skin check (invited wrestlers only — no Saturday weigh-in)",
      },
      { time: "~6:30 PM", activity: "First round — all brackets on two mats" },
    ],
  },
  saturday: {
    title: "Saturday · September 19",
    subtitle: "Brackets resume — placement bouts, then championship finals on one mat",
    rows: [
      { time: "7:30 AM", activity: "Doors open (athletes, coaches, ticket holders)" },
      { time: "8:45 AM", activity: "National anthem & invocation" },
      { time: "9:00 AM", activity: "Brackets resume — two mats through placement bouts" },
      { time: "~3:30 PM", activity: "Placement bouts complete (estimate)" },
      { time: "4:00–5:00 PM", activity: "Break — championship mat setup" },
      { time: "5:00 PM", activity: "Parade of finalists & introductions" },
      { time: "5:15 PM", activity: "Championship finals — one mat, all 11 weights" },
      { time: "~7:30 PM", activity: "Awards & event concludes" },
    ],
  },
} as const

export const TOC_AI_RENDERING_CAPTION =
  "AI rendering of the existing facility for illustration; actual setup and presentation may vary." as const

export const TOC_CONTACT_EMAIL = "info@ncwrestlingunited.com" as const

/** Canonical mats copy — use site-wide wherever two-mat → finals format is described. */
export const TOC_MATS_LINE = "Two mats all weekend. One mat for all eleven championship finals." as const

export const TOC_TICKET_SALE_MONTH = "August 2026" as const
export const TOC_GOFAN_TICKETS_URL = "https://gofan.co/app/school/NC101846" as const

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
    "The Tournament of Champions is built for families — comfortable seating, free parking, and a kid-friendly atmosphere in a modern Apex venue.",
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
  concessionsHours: "Open Saturday · wrestlers & fans",
  ticketOptions: [
    {
      title: "Saturday ticket",
      description:
        "Full tournament — all brackets on two mats through placement, plus single-mat championship finals",
    },
  ],
  ticketSectionTitle: "How to attend",
  ticketCtaLabel: "Buy tickets on GoFan",
  ticketProviderLabel: "Secure ticketing powered by GoFan",
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
      "Championship finals get full production — intros, awards, and the jacket moment on one mat.",
  },
] as const

/** Public marketing copy — one Hope atrium lounge; ops detail in docs/toc-venue-ops.md */
export const TOC_VENUE_LOUNGES = {
  eyebrow: "Dedicated lounge",
  headline: "Credentialed coaches and officials — one room",
  lead:
    "One atrium room at Hope Apex is reserved for credentialed college coaches, credentialed high school coaches, and tournament officials — credentials required, not open to general spectators.",
  title: "Coaches & Officials Lounge",
  description:
    "Check in at credentials for your lanyard. Comfortable seating and work tables, charging and Wi-Fi, live feeds from both mats with bracket updates, hospitality on Saturday, recruiting guides for college coaches (sent in advance and available as hard copy in the lounge on event day), a print station for profiles and notes, and space for officials to store gear and regroup between sessions.",
} as const

export const TOC_ELITE_OFFICIALS = {
  eyebrow: "Elite officials",
  headline: "Led by Jonathan Sutton",
  role: "Chief of officials · NC United Tournament of Champions",
  lead:
    "The Tournament of Champions is judged by an elite crew hand-picked for this event. Jonathan Sutton and NWOA Officials lead the table with experienced officials who understand college weights, high-stakes brackets, and the pace this card demands.",
  confirmedCrewHeadline: "Elite Officiating Crew Confirmed",
  confirmedCrew: [
    {
      name: "Jonathan Sutton",
      credential: "NCAA Division I / Big 12 official with extensive national championship experience.",
    },
    {
      name: "Titus Godbolt",
      credential: "NCAA Division I / Big 12 official who has worked numerous premier collegiate events.",
    },
    {
      name: "Paul Crouse",
      credential: "Veteran collegiate official with experience across major NCAA conferences and championship tournaments.",
    },
    {
      name: "J.R. Powell",
      credential: "Respected NCAA official with years of collegiate and postseason assignments.",
    },
  ],
  bullets: [
    "Chief of officials: Jonathan Sutton",
    "Event officiating supported by NWOA Officials",
    "Experienced crew across both competition mats all day",
    "Consistent standards from first bout through championship finals",
  ],
} as const

export const TOC_MEDIA_REQUEST_TYPES = [
  { value: "print", label: "Print / newspaper" },
  { value: "broadcast", label: "TV / broadcast" },
  { value: "digital", label: "Digital / online" },
  { value: "podcast", label: "Podcast / radio" },
  { value: "photo", label: "Photography" },
  { value: "video", label: "Video / documentary" },
  { value: "other", label: "Other" },
] as const

export const TOC_MEDIA = {
  eyebrow: "Media",
  headline: "Media requests",
  lead:
    "Covering the Tournament of Champions? Submit a media request for credentials, access guidelines, and interview coordination. All requests are reviewed by NC United staff — approval is required before event-day access.",
  bullets: [
    "Press credentials for Saturday competition at Hope Apex",
    "Interview requests with athletes, coaches, and NC United staff",
    "Photo and video guidelines provided on approval",
    "Single-mat championship finals — broadcast-quality production environment",
  ],
  formHeadline: "Request media access",
  formLead: "Tell us your outlet and what you need. We'll follow up with credentials details and coverage guidelines.",
  responseNote: "Typical response within 2–3 business days. For urgent requests, email",
} as const

export const TOC_FINALS_MAT = {
  eyebrow: "Championship finals",
  headline: "One mat for the titles",
  lead:
    "Saturday evening the arena narrows to a single mat — finalist introductions, live announcements, and all eleven championship bouts with professional arena lighting and video boards.",
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
    description: "Co-branding event materials, video board placement, mat branding, Coaches & Officials Lounge naming rights, social inclusion, hospitality",
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
    "Coaches & Officials Lounge — Champion-tier naming rights and face time with credentialed coaches all weekend",
    "Single-mat championship finals — presentation, jacket moments, and peak attention",
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
  lead: "Four of NC's top recruits on why this event matters.",
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
        "The atmosphere is going to be incredible. The introductions, the championship finals, the crowd, the energy—it's the kind of stage every wrestler wants to compete on. North Carolina wrestling deserves an event like this.",
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

/** Confirmed recruiting-fair programs — SINGLE SOURCE OF TRUTH for landing + confirm logos.
 * Add new schools here only; Supabase `toc_event_config.confirmed_colleges` cannot remove these. */
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
    name: "Roanoke",
    logoUrl:
      "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/-i2rnrys-1745958901725.png",
  },
  {
    name: "Greensboro College",
    logoUrl:
      "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/o6LgFYqZjYR2MnZou4ydo-Greensboro%20College.png",
  },
  {
    name: "Montreat",
    logoUrl:
      "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/QS-jExE_V4gnRb3SrkmUP-Montreat.png",
  },
  {
    name: "UMO",
    logoUrl:
      "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/cwjgktar-1745958885613.png",
  },
  {
    name: "Lynchburg",
    logoUrl:
      "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/SmHkZ3IPPB6ayHiOYue4Y-Lynchburg.jpg",
  },
  {
    name: "Army West Point",
    logoUrl:
      "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/rTLFBwYxfKzHEmiET86Sk-Army%20West%20Point.jpg",
  },
  {
    name: "Averett",
    logoUrl:
      "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/XpGp9iaWUS2oENhX2XALE-Averett.png",
  },
  {
    name: "Campbell",
    logoUrl:
      "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/hQ12r1UqPiFiiEG_7lrvU-Campbell.png",
  },
  {
    name: "Lander",
    logoUrl:
      "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/college/hohbgwxg-1745968850197.png",
  },
  {
    name: "Washington & Lee",
    logoUrl:
      "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/bi-_P2AfNJKAJTz7hWXHv-Washington%20%26%20Lee.png",
  },
] as const

/** Program names from code defaults — not a Supabase-only list. */
export const TOC_CONFIRMED_COLLEGES = TOC_CONFIRMED_COLLEGES_DEFAULT.map((c) => c.name)

/** Sticky section nav — grouped for mobile sheet; flat list for desktop scroll. */
export const TOC_SECTION_NAV_GROUPS = [
  {
    label: "The event",
    links: [
      { href: "#weights", label: "Weight classes" },
      { href: "#champion-jacket", label: "Champion jacket" },
      { href: "#venue", label: "Venue" },
      { href: "#schedule", label: "Schedule" },
      { href: "#families", label: "Tickets & families" },
      { href: "#streaming", label: "Watch live" },
    ],
  },
  {
    label: "Get involved",
    links: [
      { href: "#volunteer", label: "Volunteer" },
      { href: "#email-signup", label: "Event updates" },
      { href: "#athlete-interest", label: "Athlete interest" },
      { href: "#sponsors", label: "Sponsorship" },
      { href: "#media", label: "Media" },
    ],
  },
  {
    label: "More",
    links: [
      { href: "#faq", label: "FAQ" },
      { href: "#about-nc-united", label: "About NC United" },
    ],
  },
] as const

/** Quick jumps shown as pills on mobile sticky bar. */
export const TOC_SECTION_NAV_QUICK = [
  { href: "#schedule", label: "Schedule" },
  { href: "#families", label: "Tickets" },
  { href: "#trophies-awards", label: "Awards" },
  { href: "#volunteer", label: "Volunteer" },
  { href: "#athlete-interest", label: "Athletes" },
] as const

export const TOC_VOLUNTEER_ROLES = [
  { value: "lounge", label: "Coaches & Officials Lounge" },
  { value: "registration", label: "Registration & credentials" },
  { value: "concessions", label: "Concessions & hospitality" },
  { value: "scoring", label: "Scoring table / mat support" },
  { value: "trophies_awards", label: "Trophies & awards" },
  { value: "photography", label: "Photography" },
  { value: "setup", label: "Load-in & setup (Friday)" },
  { value: "general", label: "General event support" },
  { value: "other", label: "Other — tell us below" },
] as const

export const TOC_VOLUNTEER_AVAILABILITY = [
  { value: "fri_pm", label: "Friday evening" },
  { value: "sat_am", label: "Saturday morning" },
  { value: "sat_pm", label: "Saturday afternoon / finals" },
  { value: "either", label: "Flexible either day" },
] as const

export const TOC_VOLUNTEER = {
  eyebrow: "Volunteer",
  headline: "Help us run championship weekend",
  lead:
    "The Tournament of Champions takes a crew — lounge hospitality, registration, concessions, and mat-side support. If you love NC wrestling and want to be part of the biggest all-state stage of the year, sign up below.",
  bullets: [
    "Friday load-in through Saturday finals — shifts for every schedule",
    "Coaches & Officials Lounge check-in and hospitality",
    "Family-friendly venue — no experience required for many roles",
    "NC United staff will match you to a role and send shift details",
  ],
  formHeadline: "Volunteer interest form",
  formLead: "Tell us how you'd like to help. We'll follow up with roles and shift options — signing up does not guarantee a specific assignment.",
} as const

export const TOC_DEFAULT_CONFIG = {
  phase: "phase_1" as const,
  event_dates: TOC_EVENT_DATES_DISPLAY,
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
