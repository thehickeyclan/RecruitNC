/**
 * Unified news feed: NCHSAA articles, announcements, and updates.
 * Single source of truth for the news index page and home carousel.
 * Newest first; home carousel uses first N items.
 */

import { AAU_SCHOLASTIC_DUALS_2026_BANNER } from "@/lib/aau-scholastic-duals-2026-content"
import { RECRUITING_AWARDS_CARD_IMAGE } from "@/lib/content/recruiting-awards-2026"

const NCHSAA_YEAR = "2026"

export interface NewsItem {
  id: string
  slug: string
  title: string
  summary: string
  href: string
  /** ISO date (YYYY-MM-DD) for sorting; newest first */
  date: string
  category?: string
  categoryBadgeClass?: string
  readTime?: string
  /** Optional deck line on /news/[slug] under the title */
  subtitle?: string
  /** Optional byline, e.g. "Jim Bernthal" */
  author?: string
  /**
   * Article hero / list banner image.
   * For social-first publishing, also plan 1080×1920 Story art (shareStoryImage).
   */
  image?: string
  /** Optional artwork used only by the homepage news carousel. */
  homeImage?: string
  imagePosition?: "top" | "center"
  /** Use "contain" to show full image (e.g. product shots); default "cover" fills the card. */
  imageFit?: "cover" | "contain"
  /** With cover: scale up slightly so logo-style PNGs fill the banner. */
  imageBannerZoom?: boolean
  /**
   * When imageFit is "contain", background behind the image (default slate-100).
   * Use a dark class for campaign art so headline numbers read clearly.
   */
  imageBannerBgClass?: string
  /** On /news index: full-width image banner above text (hero-style). */
  newsListBanner?: boolean
  /** If true, this is an announcement (lives under /news/[slug]). If false, href is external (e.g. NCHSAA). */
  isAnnouncement?: boolean
  /** Omit from home carousel when the story is already promoted in the homepage hero banner. */
  excludeFromHomeCarousel?: boolean
  /**
   * Share-image API: crop hero art only (no title overlay).
   * Use when the banner already includes headline typography.
   * Also inferred when newsListBanner + imageFit contain.
   */
  shareHeroCropOnly?: boolean
  /**
   * Optional dedicated IG Story / portrait share art (1080×1920 or 1080×1350).
   * Use when the list banner is landscape but Story should be full-screen vertical.
   */
  shareStoryImage?: string
  /** Force important launch news above newer items on /news and the homepage carousel. */
  pinToTop?: boolean
}

import type { NewsShareFormatId } from "@/lib/news-share-formats"

/** Article slugs whose hero art already includes headline typography (any imageFit). */
const DESIGNED_SHARE_BANNER_SLUGS = new Set([
  "jumping-levels-what-drives-rapid-improvement",
  "aau-scholastic-duals-2026-florida",
  "nc-united-recruiting-awards-2026",
  "real-cost-elite-wrestling-nc-smarter-build",
  "class-of-2026-senior-sendoff",
  "caden-perry-warrior-scholarship-announced",
])

/** Designed list banners already include headline art — don't overlay title on share images. */
export function newsShareUsesHeroCropOnly(
  item: NewsItem,
  format?: NewsShareFormatId,
): boolean {
  if (
    format &&
    (format === "ig-story" || format === "ig-portrait") &&
    item.shareStoryImage
  ) {
    return true
  }
  if (item.shareHeroCropOnly === true) return true
  if (DESIGNED_SHARE_BANNER_SLUGS.has(item.slug)) return true
  return Boolean(item.newsListBanner && item.imageFit === "contain")
}

/** All news items, newest first. Add new items here; they appear on /news and in home carousel by order. */
/**
 * Image checklist for new articles:
 * 1. shareStoryImage — 1080×1920 vertical (IG Story; most common share)
 * 2. image — list/article banner (landscape OK for /news cards)
 * 3. Square/portrait/Facebook assets are auto-generated from the above when missing
 */
const ALL_NEWS: NewsItem[] = [
  {
    id: "caleb-smith-gives-back",
    slug: "caleb-smith-gives-back",
    title: "Beyond the Podium: Caleb Smith's Impact at Home",
    subtitle:
      "Two-time NCAA Division I All-American Caleb Smith spent part of his time home in North Carolina leading a Greensboro RTC practice—offering young wrestlers a chance to learn from one of the state's most accomplished active competitors.",
    summary:
      "Caleb Smith returned home and used part of his limited downtime to lead Greensboro RTC practice, work directly with young wrestlers and give back to the North Carolina wrestling community.",
    href: "/news/caleb-smith-gives-back",
    date: "2026-08-14",
    image: "/images/news/caleb-smith-gives-back/greensboro-rtc-group.jpeg",
    homeImage: "/images/news/caleb-smith-gives-back/greensboro-rtc-group.jpeg",
    imagePosition: "center",
    imageFit: "cover",
    newsListBanner: true,
    category: "COMMUNITY",
    categoryBadgeClass: "bg-[#187348]",
    readTime: "5 min read",
    author: "NC United",
    isAnnouncement: true,
  },
  {
    id: "nc-united-wrestling-guild-premier-partner",
    slug: "nc-united-wrestling-guild-premier-partner",
    title: "NC United Announces The Wrestling Guild as Premier Partner of 2026 Tournament of Champions",
    subtitle:
      "Partnership will put $1,000 directly back into North Carolina wrestlers through ten $100 training awards.",
    summary:
      "Ten wrestlers who create free Wrestling Guild accounts from August 9 through September 15 will receive $100 training credits through the Tournament of Champions partnership.",
    href: "/news/nc-united-wrestling-guild-premier-partner",
    date: "2026-08-09",
    image: "/images/news/wrestling-guild-toc-premier-partner.png",
    homeImage: "/images/news/wrestling-guild-toc-premier-partner.png",
    imagePosition: "center",
    imageFit: "contain",
    imageBannerBgClass: "bg-black",
    newsListBanner: true,
    category: "PARTNERSHIP",
    categoryBadgeClass: "bg-[#D3B574]",
    readTime: "5 min read",
    author: "NC United",
    shareHeroCropOnly: true,
    shareStoryImage: "/images/news/wrestling-guild-toc-premier-partner.png",
    isAnnouncement: true,
  },
  {
    id: "united-ascent-2026-08-08",
    slug: "united-ascent-2026-08-08",
    title: "United Ascent: NC Clubs Win Big, Club Locator Launches & the TOC Stage Takes Shape",
    subtitle: "Vol. 1, No. 4 of North Carolina wrestling news.",
    summary:
      "Two North Carolina teams place Top 10 at Deep South, School of Hard Knocks wins in Hershey, Club Locator launches, and Super 32 opportunities open.",
    href: "/news/united-ascent-2026-08-08",
    date: "2026-08-08",
    image: "/images/united-ascent/2026-08-08-wide.png",
    homeImage: "/images/united-ascent/2026-08-08-wide.png",
    imagePosition: "center",
    imageFit: "contain",
    imageBannerBgClass: "bg-[#e8ddc8]",
    newsListBanner: true,
    category: "UNITED ASCENT",
    categoryBadgeClass: "bg-[#1a1a1a]",
    readTime: "8 min read",
    author: "United Ascent Staff",
    shareHeroCropOnly: true,
    shareStoryImage: "/images/united-ascent/2026-08-08-wide.png",
    isAnnouncement: true,
  },
  {
    id: "nc-united-nc-mat-official-media-partner",
    slug: "nc-united-nc-mat-official-media-partner",
    title: "NC United Partners with The NC Mat as Official Media Partner for Tournament of Champions",
    subtitle:
      "Rhett Hoy and Ryan Mitchell will help lead athlete announcements, seeding collaboration, event coverage and live commentary.",
    summary:
      "The NC Mat will serve as the official media partner of the 2026 Tournament of Champions, bringing trusted statewide coverage and live commentary to the September 18–19 event in Apex.",
    href: "/news/nc-united-nc-mat-official-media-partner",
    date: "2026-08-05",
    image: "/images/news/nc-mat-media-partnership/home-news-card.png",
    homeImage: "/images/news/nc-mat-media-partnership/home-news-card.png",
    imagePosition: "center",
    imageFit: "contain",
    imageBannerBgClass: "bg-[#03070c]",
    newsListBanner: true,
    category: "PARTNERSHIP",
    categoryBadgeClass: "bg-[#D3B574]",
    readTime: "3 min read",
    author: "NC United",
    shareHeroCropOnly: true,
    isAnnouncement: true,
  },
  {
    id: "tournament-of-champions-announced",
    slug: "tournament-of-champions-announced",
    title: "North Carolina’s Elite Set to Meet at Inaugural NC United Tournament of Champions",
    subtitle: "Invite-only event will unite elite wrestlers and college coaches September 18\u201319 in Apex.",
    summary:
      "The inaugural NC United Tournament of Champions will bring 88 invited wrestlers, college-weight brackets and a College Recruiting Expo to Apex on September 18–19.",
    href: "/news/tournament-of-champions-announced",
    date: "2026-07-24",
    image: "/images/toc/tournament-of-champions-share-card.png",
    imagePosition: "center",
    imageFit: "contain",
    imageBannerBgClass: "bg-[#071529]",
    newsListBanner: true,
    category: "PRESS RELEASE",
    categoryBadgeClass: "bg-[#C20017]",
    readTime: "7 min read",
    author: "NC United",
    shareHeroCropOnly: true,
    pinToTop: true,
    isAnnouncement: true,
  },
  {
    id: "recruitnc-interactive-wrestling-club-map",
    slug: "recruitnc-interactive-wrestling-club-map",
    title: "RecruitNC Launches North Carolina’s First Interactive Wrestling Club Map",
    subtitle:
      "New platform helps families discover clubs, explore accomplishments, and connect with wrestling programs across the state.",
    summary:
      "RecruitNC’s new statewide club map helps families find wrestling programs, get directions, explore club details, and see the athletes and accomplishments connected to each room.",
    href: "/news/recruitnc-interactive-wrestling-club-map",
    date: "2026-08-04",
    image: "/images/news/recruitnc-club-map-launch.png",
    imagePosition: "center",
    imageFit: "cover",
    newsListBanner: true,
    category: "PLATFORM LAUNCH",
    categoryBadgeClass: "bg-[#13294B]",
    readTime: "5 min read",
    author: "RecruitNC",
    isAnnouncement: true,
  },
  {
    id: "caden-perry-warrior-scholarship-announced",
    slug: "caden-perry-warrior-scholarship-announced",
    title: "NC United Announces The Caden Perry Warrior Scholarship",
    subtitle: "A $1,000 wrestling-support award honoring courage, resilience and the refusal to quit.",
    summary:
      "Presented annually at the Tournament of Champions, The Caden Perry Warrior Scholarship will recognize a North Carolina wrestler whose response to genuine adversity reflects Caden’s warrior spirit.",
    href: "/news/caden-perry-warrior-scholarship-announced",
    date: "2026-07-28",
    image: "/scholarships/caden-perry/warrior-scholarship-share-card-wide.png",
    imagePosition: "center",
    imageFit: "contain",
    imageBannerBgClass: "bg-[#061224]",
    newsListBanner: true,
    category: "SCHOLARSHIP",
    categoryBadgeClass: "bg-[#C8A94A]",
    readTime: "4 min read",
    author: "NC United",
    shareHeroCropOnly: true,
    shareStoryImage: "/scholarships/caden-perry/warrior-scholarship-share-card.png",
    isAnnouncement: true,
  },
  {
    id: "united-ascent-2026-08-01",
    slug: "united-ascent-2026-08-01",
    title: "United Ascent: Wrestling’s Scale, Caden Perry Scholarship & TOC Awards",
    subtitle: "Vol. 1, No. 3 of North Carolina wrestling news.",
    summary:
      "This week: weight cutting and athlete development, The Caden Perry Warrior Scholarship, Tournament of Champions hammer awards, championship brackets and medals, Mason Hocker to Duke, and UNC’s home schedule.",
    href: "/news/united-ascent-2026-08-01",
    date: "2026-08-01",
    image: "/images/united-ascent/2026-08-01-wide.png",
    imagePosition: "top",
    imageFit: "contain",
    imageBannerBgClass: "bg-[#e8ddc8]",
    newsListBanner: true,
    category: "UNITED ASCENT",
    categoryBadgeClass: "bg-[#1a1a1a]",
    readTime: "10 min read",
    author: "United Ascent Staff",
    shareHeroCropOnly: true,
    shareStoryImage: "/images/united-ascent/2026-08-01-cover.png",
    isAnnouncement: true,
  },
  {
    id: "united-ascent-2026-07-25",
    slug: "united-ascent-2026-07-25",
    title: "United Ascent: Tournament of Champions, Pan-Am Gold & Guild Growth",
    subtitle: "Vol. 1, No. 2 of North Carolina wrestling news.",
    summary:
      "Tournament of Champions launches, Lauren Samuel wins Pan-American gold, Journeymen applications open, The Wrestling Guild passes 350 bookings, and WIN Magazine prepares to feature Jerry Winterton.",
    href: "/news/united-ascent-2026-07-25",
    date: "2026-07-25",
    image: "/images/united-ascent/2026-07-25-wide.png",
    imagePosition: "top",
    imageFit: "contain",
    imageBannerBgClass: "bg-[#e8ddc8]",
    newsListBanner: true,
    category: "UNITED ASCENT",
    categoryBadgeClass: "bg-[#1a1a1a]",
    readTime: "8 min read",
    author: "United Ascent Staff",
    shareHeroCropOnly: true,
    shareStoryImage: "/images/united-ascent/2026-07-25-cover.png",
    isAnnouncement: true,
  },
  {
    id: "the-weight-of-the-scale",
    slug: "the-weight-of-the-scale",
    title: "The Weight of the Scale",
    subtitle: "Exploring the costs, benefits, and risks of weight cutting in wrestling.",
    summary:
      "James Bernthal, PhD, examines when cutting weight creates a competitive edge, when it begins to steal that edge away, and why growth, health, performance, and joy in the sport must remain part of the conversation.",
    href: "/news/the-weight-of-the-scale",
    date: "2026-07-25",
    image: "/images/news/the-weight-of-the-scale-wide.png",
    imagePosition: "center",
    imageFit: "contain",
    imageBannerBgClass: "bg-black",
    newsListBanner: true,
    category: "ATHLETE DEVELOPMENT",
    categoryBadgeClass: "bg-[#003366]",
    readTime: "16 min read",
    author: "James Bernthal, PhD",
    shareHeroCropOnly: true,
    shareStoryImage: "/images/news/the-weight-of-the-scale-story.png",
    isAnnouncement: true,
  },
  {
    id: "united-ascent-2026-07-18",
    slug: "united-ascent-2026-07-18",
    title: "United Ascent: Fargo All-Americans, Eli Horton Commits & RecruitNC Upgrades",
    subtitle: "The first edition of RecruitNC’s weekly North Carolina wrestling news report.",
    summary:
      "Seven NC wrestlers reach the Fargo podium, Eli Horton commits to Roanoke, Data Dawg 2.0 makes wrestling history searchable, and athletes gain private profile-view analytics.",
    href: "/news/united-ascent-2026-07-18",
    date: "2026-07-18",
    image: "/images/united-ascent/2026-07-18-wide.png",
    imagePosition: "top",
    imageFit: "contain",
    imageBannerBgClass: "bg-[#e8ddc8]",
    newsListBanner: true,
    category: "UNITED ASCENT",
    categoryBadgeClass: "bg-[#1a1a1a]",
    readTime: "9 min read",
    author: "United Ascent Staff",
    shareHeroCropOnly: true,
    shareStoryImage: "/images/united-ascent/2026-07-18-cover.webp",
    isAnnouncement: true,
  },
  {
    id: "jumping-levels-what-drives-rapid-improvement",
    slug: "jumping-levels-what-drives-rapid-improvement",
    title: "Jumping Levels",
    subtitle: "What Drives Rapid Improvement in Wrestling?",
    summary:
      "The JUMPS Assessment asked athletes, parents, and coaches what accelerates development — consistency, training partners, individualized coaching, and why breakthroughs look sudden when they aren't.",
    href: "/news/jumping-levels-what-drives-rapid-improvement",
    date: "2026-07-09",
    image: "/images/jumping-levels-hero.png",
    imagePosition: "center",
    imageFit: "contain",
    imageBannerBgClass: "bg-black",
    newsListBanner: true,
    category: "MINDSET",
    categoryBadgeClass: "bg-[#003366]",
    readTime: "12 min read",
    author: "Jim Bernthal, Ph.D.",
    shareHeroCropOnly: true,
    isAnnouncement: true,
  },
  {
    id: "aau-scholastic-duals-2026-florida",
    slug: "aau-scholastic-duals-2026-florida",
    title: "NC United National Team Heads to Florida for AAU Scholastic Duals",
    subtitle: "Fort Lauderdale, June 24–26 — a statewide Blue roster with NHSCA honors, state titles, and three D-I commits.",
    summary:
      "Fresh off NHSCA National Duals, NC United travels to the Broward County Convention Center with 15 weight classes, 12 high schools represented, and a coaching staff led by Liam Hickey and Jake Dailey.",
    href: "/news/aau-scholastic-duals-2026-florida",
    date: "2026-06-10",
    image: AAU_SCHOLASTIC_DUALS_2026_BANNER,
    imagePosition: "center",
    imageFit: "contain",
    imageBannerBgClass: "bg-[#0A1628]",
    newsListBanner: true,
    category: "RECRUITNC NEWS",
    categoryBadgeClass: "bg-[#003366]",
    readTime: "8 min read",
    author: "NC United",
    isAnnouncement: true,
  },
  {
    id: "nc-united-recruiting-awards-2026",
    slug: "nc-united-recruiting-awards-2026",
    title: "NC United Recruiting Awards: The Top Colleges Recruiting North Carolina's Class of 2026",
    subtitle: "Four awards for the programs that won volume, ceiling, value, and a new path into the state.",
    summary:
      "Forty-nine verified male commits — UNC Pembroke's top haul, App State's Bentley Sly, Lynchburg's debut class, and The Citadel's emerging Carolinas footprint, with charts by college and division.",
    href: "/news/nc-united-recruiting-awards-2026",
    date: "2026-05-31",
    image: RECRUITING_AWARDS_CARD_IMAGE,
    imagePosition: "center",
    imageFit: "contain",
    imageBannerBgClass: "bg-stone-100",
    newsListBanner: true,
    category: "RECRUITING",
    categoryBadgeClass: "bg-[#003366]",
    readTime: "12 min read",
    author: "NC United",
    isAnnouncement: true,
  },
  {
    id: "finding-flow-on-the-mat",
    slug: "finding-flow-on-the-mat",
    title: "Finding Flow on the Mat",
    subtitle: 'How Wrestlers Experience "The Zone"',
    summary:
      "Elite NC United wrestlers describe trust, instinct, and full immersion — and how flow theory from Mihaly Csikszentmihalyi maps to what they feel in big matches, plus what breaks the zone and what helps get there before competition.",
    href: "/news/finding-flow-on-the-mat",
    date: "2026-04-16",
    image: "/images/finding-flow-on-the-mat-hero.png",
    imagePosition: "center",
    imageFit: "cover",
    /** Dark landscape art — use black frame on /news/[slug] hero */
    imageBannerBgClass: "bg-black",
    newsListBanner: true,
    category: "MINDSET",
    categoryBadgeClass: "bg-[#003366]",
    readTime: "14 min read",
    author: "Jim Bernthal",
    isAnnouncement: true,
  },
  {
    id: "real-cost-elite-wrestling-nc-smarter-build",
    slug: "real-cost-elite-wrestling-nc-smarter-build",
    title: "What Elite Wrestling Really Costs — And When the Bill Rivals College",
    summary:
      "Headline numbers: about $15,000–$25,000 per year and $70,000–$100,000+ over a high school career — plus the full cost table, tax reality, roster caps, two levers (community + 529), and the Spartan × NC United model.",
    href: "/news/real-cost-elite-wrestling-nc-smarter-build",
    date: "2026-04-14",
    image: "/images/real-cost-elite-wrestling-nc-hero.png",
    imagePosition: "center",
    /** Landscape hero: fills home + /news cards; article body uses the same file (see real-cost content). */
    imageFit: "cover",
    newsListBanner: true,
    category: "NC UNITED",
    categoryBadgeClass: "bg-[#003366]",
    readTime: "18 min read",
    isAnnouncement: true,
  },
  {
    id: "lynchburg-building-a-program-with-intention",
    slug: "lynchburg-building-a-program-with-intention",
    title: "Building a Program with Intention: Lynchburg’s NC Pipeline and Class of 2026",
    summary:
      "Class of ’26 NC board: Lynchburg leads (~2× the next) — new DIII program, 13,000+ sq ft facility, NC United ties, more names expected; Vincent Barber & Sammy Hillegas.",
    href: "/news/lynchburg-building-a-program-with-intention",
    date: "2026-04-13",
    image: "/images/lynchburg-hornets-facility-hero.png",
    imagePosition: "center",
    imageFit: "cover",
    newsListBanner: true,
    category: "RECRUITING",
    categoryBadgeClass: "bg-[#003366]",
    readTime: "8 min read",
    isAnnouncement: true,
  },
  {
    id: "class-of-2026-senior-sendoff",
    slug: "class-of-2026-senior-sendoff",
    title: "Final Class of 2026 Rankings: A Senior Sendoff",
    summary:
      "Celebrating North Carolina's Class of 2026 as they close their high school careers — NHSCA, Super 32, IronMan, four-time state champions, college opens, and 24 commits across NCAA and NAIA.",
    href: "/news/class-of-2026-senior-sendoff",
    date: "2026-04-02",
    image: "/images/class-of-2026-senior-sendoff-hero.png",
    imageFit: "contain",
    newsListBanner: true,
    category: "CLASS OF 2026",
    categoryBadgeClass: "bg-[#003366]",
    readTime: "7 min read",
    isAnnouncement: true,
  },
  {
    id: "nhsca-mow-award-2026",
    slug: "nhsca-most-outstanding-wrestler-award-2026",
    title: "NC United Launches the NHSCA Most Outstanding Wrestler Award",
    summary:
      "A new annual award honoring North Carolina's top performer in each NHSCA division at the tournament that matters most for recruiting futures.",
    href: "/news/nhsca-most-outstanding-wrestler-award-2026",
    date: "2026-03-31",
    image: "/images/nhsca-mow-award-2026-news-card.png",
    imagePosition: "top",
    imageFit: "contain",
    newsListBanner: true,
    category: "OFFICIAL ANNOUNCEMENT",
    categoryBadgeClass: "bg-[#C20017]",
    readTime: "9 min read",
    isAnnouncement: true,
  },
  {
    id: "nhsca-nationals-recap-2026",
    slug: "nhsca-nationals-recap-2026",
    title: "North Carolina Puts 18 on the Podium at 2026 NHSCA Nationals",
    summary:
      "North Carolina finished with 18 All-Americans across four divisions at the 2026 NHSCA Nationals, ranking eighth nationally and fourth in state history.",
    href: "/news/nhsca-nationals-recap-2026",
    date: "2026-03-31",
    image: "/images/nhsca-nationals-recap-2026-team-photo.png",
    imagePosition: "center",
    imageFit: "cover",
    newsListBanner: true,
    category: "NATIONALS RECAP",
    categoryBadgeClass: "bg-[#003366]",
    readTime: "11 min read",
    isAnnouncement: true,
  },
  {
    id: "nhsca-nationals-preview-2026",
    slug: "nhsca-nationals-preview-2026",
    title: "The Biggest Weekend in NC Wrestling Starts Thursday",
    summary:
      "Over 300 NC wrestlers head to NHSCA Nationals in Virginia Beach; MatScout’s Wednesday, March 25 seeding lists 29 with seeds. Ten returning All-Americans are seeded — the weekend is the state’s top recruiting showcase.",
    href: `/nchsaa/${NCHSAA_YEAR}/news/nhsca-nationals-preview-2026`,
    date: "2026-03-26",
    image: "/images/nchsaa-2026-nhsca-nationals-preview.png",
    imagePosition: "center",
    imageFit: "contain",
    newsListBanner: true,
    category: "NATIONALS",
    categoryBadgeClass: "bg-[#003366]",
    readTime: "18 min read",
    isAnnouncement: false,
  },
  {
    id: "5-impactful-tournaments",
    slug: "5-impactful-tournaments",
    title: "The 5 Most Impactful Tournaments for NC College Recruiting",
    summary: "Which ones made the list? Data from 86 NC commits (Classes of 2025–2026) on NHSCA Nationals, Super32, College Opens, NHSCA Duals, Journeymen, plus Fargo and Junior National Duals.",
    href: "/recruiting/tournaments",
    date: "2026-03-10",
    image: "/images/recruiting-tournaments-hero.png",
    imagePosition: "center",
    imageFit: "cover",
    category: "RECRUITING",
    categoryBadgeClass: "bg-[#003366]",
    readTime: "12 min read",
    isAnnouncement: false,
  },
  {
    id: "first-flight-2026",
    slug: "first-flight-2026-nc-united-shoe",
    title: "First Flight: The Official 2026 NC United Shoe",
    summary: "The wrestling community has spoken. After 726 visits and 344 votes, First Flight is the inaugural 2026 NC United custom wrestling shoe — in partnership with Classified Creations. Limited to 25 pairs.",
    href: "/news/first-flight-2026-nc-united-shoe",
    date: "2026-03-01",
    category: "ANNOUNCEMENT",
    categoryBadgeClass: "bg-[#C20017]",
    readTime: "5 min read",
    image: "/images/first-flight-2026-nc-united-shoe.png",
    imagePosition: "center",
    imageFit: "contain",
    isAnnouncement: true,
  },
  {
    id: "three-join-the-immortals",
    slug: "three-join-the-immortals-2026",
    title: "Three Join the Immortals: North Carolina's Historic 2026 Four-Time State Champions",
    summary: "For the first time in nearly four decades, three four-time state champions were crowned in a single year — Cael Dunn, Lorenzo Alston, and Bentley Sly.",
    href: `/nchsaa/${NCHSAA_YEAR}/news/three-join-the-immortals-2026`,
    date: "2026-02-26",
    image: "/images/nchsaa-2026-four-time-champions.png",
    imagePosition: "top",
    category: "CELEBRATION",
    categoryBadgeClass: "bg-[#1a2332]",
    readTime: "14 min read",
    isAnnouncement: false,
  },
  {
    id: "bracket-depth",
    slug: "article-2",
    title: "Bracket Depth by the Numbers: What 98 Brackets Reveal",
    summary: "How bracket strength is measured and where ranked talent concentrated.",
    href: `/nchsaa/${NCHSAA_YEAR}/news/article-2`,
    date: "2026-02-25",
    image: "/images/nchsaa-2026-7a-138-podium.png",
    imagePosition: "top",
    category: "DATA & RANKINGS",
    categoryBadgeClass: "bg-[#1a2332]",
    readTime: "10 min read",
    isAnnouncement: false,
  },
  {
    id: "seven-divisions",
    slug: "seven-divisions-98-brackets-784-qualifiers",
    title: "Did North Carolina Wrestling Expand Divisions—But Shrink Our Future?",
    summary: "When Structure Shapes Value — Part I: Diagnosis. A two-part conversation about North Carolina's classification system.",
    href: "/article/seven-divisions-98-brackets-784-qualifiers",
    date: "2026-02-25",
    image: "/images/nchsaa-2026-seven-divisions.png",
    category: "ANALYSIS",
    categoryBadgeClass: "bg-[#1a2332]",
    readTime: "12 min read",
    isAnnouncement: false,
  },
  {
    id: "class-of-2027-top-sophomores-to-watch",
    slug: "class-of-2027-top-sophomores-to-watch",
    title: "North Carolina Wrestling Class of 2027: Top Sophomores to Watch",
    subtitle:
      "NC United highlighted North Carolina's top Class of 2027 sophomores based on national performances, key victories and college-level potential.",
    summary:
      "Ten rising Class of 2027 wrestlers earned recognition as North Carolina sophomores to watch for their state and national performances.",
    href: "/news/class-of-2027-top-sophomores-to-watch",
    date: "2025-02-10",
    image: "/images/news/legacy/class-of-2027-top-sophomores/top-sophomores.png",
    imagePosition: "center",
    imageFit: "contain",
    imageBannerBgClass: "bg-[#070a10]",
    newsListBanner: true,
    category: "TOP PROSPECTS",
    categoryBadgeClass: "bg-[#D3B574]",
    readTime: "4 min read",
    author: "NC United",
    isAnnouncement: true,
    excludeFromHomeCarousel: true,
    shareHeroCropOnly: true,
  },
  {
    id: "class-of-2026-top-20-college-prospects",
    slug: "class-of-2026-top-20-college-prospects",
    title: "North Carolina Wrestling Class of 2026 Top 20 College Prospects",
    subtitle:
      "NC United's Top 20 Class of 2026 rankings highlighted North Carolina wrestlers for their skills, achievements and collegiate potential.",
    summary:
      "The Class of 2026 Top 20 College Prospect Rankings served as a resource for college coaches and wrestling fans across North Carolina.",
    href: "/news/class-of-2026-top-20-college-prospects",
    date: "2025-02-01",
    image: "/images/news/legacy/class-of-2026-top-20-prospects/top-20-prospects.png",
    imagePosition: "center",
    imageFit: "contain",
    imageBannerBgClass: "bg-[#070a10]",
    newsListBanner: true,
    category: "RECRUITING",
    categoryBadgeClass: "bg-[#C20017]",
    readTime: "7 min read",
    author: "NC United",
    isAnnouncement: true,
    excludeFromHomeCarousel: true,
    shareHeroCropOnly: true,
  },
  {
    id: "class-of-2025-top-25-college-prospects",
    slug: "class-of-2025-top-25-college-prospects",
    title: "Top 25 College Prospects: Class of 2025 North Carolina High School Wrestling",
    subtitle:
      "NC United's inaugural Class of 2025 rankings recognized North Carolina wrestlers for their skill, achievements and collegiate potential.",
    summary:
      "The inaugural Top 25 College Prospect Rankings highlighted the Class of 2025 wrestlers shaping the future of North Carolina wrestling.",
    href: "/news/class-of-2025-top-25-college-prospects",
    date: "2025-01-25",
    image: "/images/news/legacy/class-of-2025-top-25-prospects/top-25-prospects.png",
    imagePosition: "center",
    imageFit: "contain",
    imageBannerBgClass: "bg-[#070a10]",
    newsListBanner: true,
    category: "RECRUITING",
    categoryBadgeClass: "bg-[#003366]",
    readTime: "8 min read",
    author: "NC United",
    isAnnouncement: true,
    excludeFromHomeCarousel: true,
    shareHeroCropOnly: true,
  },
  {
    id: "josh-wilson-defending-national-title-hodge-trophy",
    slug: "josh-wilson-defending-national-title-hodge-trophy",
    title: "Josh Wilson: Sights Set on Defending National Title & Winning Prestigious Hodge Trophy",
    subtitle:
      "Josh Wilson, defending national champion at 141 pounds, pursued a second title and the prestigious Hodge Trophy while representing Greensboro College and North Carolina.",
    summary:
      "Defending Division III national champion Josh Wilson entered the second half of his senior season chasing a repeat title and wrestling's most prestigious individual award.",
    href: "/news/josh-wilson-defending-national-title-hodge-trophy",
    date: "2025-01-24",
    image: "/images/news/legacy/josh-wilson-hodge-trophy/josh-wilson.png",
    imagePosition: "center",
    imageFit: "cover",
    newsListBanner: true,
    category: "ATHLETE SPOTLIGHT",
    categoryBadgeClass: "bg-[#1f6b3a]",
    readTime: "5 min read",
    author: "Colton Palmer",
    isAnnouncement: true,
    excludeFromHomeCarousel: true,
  },
  {
    id: "ethan-oakley-mission-acc-ncaa-championships",
    slug: "ethan-oakley-mission-acc-ncaa-championships",
    title: "Ethan Oakley: On a Mission to the ACC & NCAA Championships",
    subtitle:
      "Ethan Oakley, ranked No. 18 nationally at 133 pounds, represented North Carolina and UNC with pride while chasing ACC and NCAA championships.",
    summary:
      "North Carolina native Ethan Oakley entered the second half of his senior season at UNC focused on the ACC Championships and NCAA Tournament.",
    href: "/news/ethan-oakley-mission-acc-ncaa-championships",
    date: "2025-01-23",
    image: "/images/news/legacy/ethan-oakley-acc-ncaa/ethan-oakley.png",
    imagePosition: "center",
    imageFit: "cover",
    newsListBanner: true,
    category: "COLLEGE WRESTLING",
    categoryBadgeClass: "bg-[#7BAFD4]",
    readTime: "5 min read",
    author: "Colton Palmer",
    isAnnouncement: true,
    excludeFromHomeCarousel: true,
  },
]

/** All news, newest first. Use for /news index page. */
export function getAllNews(): NewsItem[] {
  return [...ALL_NEWS].sort((a, b) => {
    if (a.pinToTop !== b.pinToTop) return a.pinToTop ? -1 : 1
    return b.date > a.date ? 1 : -1
  })
}

/** First N items for home carousel (main story + others). Scalable: add to ALL_NEWS and it appears automatically. */
export function getFeaturedForHome(limit: number = 4): NewsItem[] {
  return getAllNews()
    .filter((item) => !item.excludeFromHomeCarousel)
    .slice(0, limit)
}

/** Get a single announcement by slug (for /news/[slug] page). */
export function getAnnouncementBySlug(slug: string): NewsItem | undefined {
  return ALL_NEWS.find((item) => item.isAnnouncement && item.slug === slug)
}

/** Slugs that are announcement pages (for generateStaticParams). */
export function getAnnouncementSlugs(): string[] {
  return ALL_NEWS.filter((item) => item.isAnnouncement).map((item) => item.slug)
}

/** Permanent weekly archive, newest first. */
export function getUnitedAscentIssues(): NewsItem[] {
  return getAllNews().filter((item) => item.category === "UNITED ASCENT")
}
