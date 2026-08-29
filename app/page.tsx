// NOTE: This homepage is intentionally PUBLIC and accessible without authentication.
// Do NOT wrap this page with AuthGuard - it must be accessible to all users, including mobile.
//
// Server component on purpose. It used to be "use client" with six no-store fetches on mount,
// which meant a blank shell, "Loading..." text, and layout shift on every visit. Data now loads
// on the server via lib/home-data (admin client, no cookies) so `revalidate` below is real.

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowRight, MapPin, TrendingUp } from "lucide-react"
import { ProfessionalCommitmentCard } from "@/components/professional-commitment-card"
import { normalizeAthleteList } from "@/lib/professional-athlete"
import { getCurrentSigningClass } from "@/lib/commit-class-year"
import { PUBLISHED_PUBLIC_RANKINGS_YEARS } from "@/lib/public-rankings-cap"
import { StoreProductPromotion } from "@/components/store-product-promotion"
import { HomeNewsHighlightsCarousel } from "@/components/home-news-highlights-carousel"
import {
  loadFeaturedRankings,
  loadFeaturedStoreProducts,
  loadCommitCountsByClass,
  loadLatestCommits,
  type HomeRankedProspect,
} from "@/lib/home-data"
import { TOC_GOFAN_TICKETS_URL } from "@/lib/toc/constants"
import { tocTicketsOnSale } from "@/lib/toc/ticket-sale"

export const revalidate = 120

const HERO_BACKGROUND_IMAGE = "/hero-banner-nchsaa-2026-arena.png"

/**
 * Stats bar reflects the current signing class, which rolls over each July rather than
 * being edited by hand — this sat on 2026 for months after that class had graduated.
 */
const STATS_GRAD_YEAR = getCurrentSigningClass()

/**
 * The stats bar reports commitments per class, oldest to current.
 *
 * It used to show a profile count split by boys and girls, which answers "how big is your
 * database" — not a question a parent or coach is asking. Commits per class shows how deep
 * each North Carolina class went, and the current one filling up as its season runs.
 *
 * Derived from the signing class, so the window walks forward on its own each July.
 */
const STATS_CLASS_YEARS = [STATS_GRAD_YEAR - 2, STATS_GRAD_YEAR - 1, STATS_GRAD_YEAR] as const
/**
 * Which classes appear in the rankings strip is a publishing decision, not a calendar one —
 * PUBLISHED_PUBLIC_RANKINGS_YEARS is the list you control. Deriving it from the date would
 * put an unpublished class on the home page the moment the cycle rolled over, since
 * getPublicRankingsMax falls back to the default cap for any year not in that map.
 */
const RANKING_CLASSES = PUBLISHED_PUBLIC_RANKINGS_YEARS

function StatCard({ value, label, tone }: { value: number; label: string; tone: "white" | "gold" | "red" }) {
  const toneClass = tone === "gold" ? "text-rnc-gold" : tone === "red" ? "text-rnc-red" : "text-white"
  return (
    <div className="px-3 py-6 text-center sm:py-8">
      <div className={`text-2xl font-black tabular-nums sm:text-3xl md:text-4xl ${toneClass}`}>{value}</div>
      <div className="mt-1 text-[11px] uppercase tracking-wider text-white/50 sm:text-sm">{label}</div>
    </div>
  )
}

function RankingCard({ athlete }: { athlete: HomeRankedProspect }) {
  return (
    <Link href={`/view-profile?id=${encodeURIComponent(athlete.id)}`} className="group block">
      <div className="flex items-center gap-4 rounded-xl border border-rnc-line bg-rnc-surface p-4 transition-colors hover:border-rnc-gold/40">
        {athlete.photourl ? (
          <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg ring-1 ring-rnc-gold/30">
            <Image
              src={athlete.photourl}
              alt=""
              fill
              sizes="56px"
              className="object-cover object-top"
            />
          </div>
        ) : (
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-rnc-raised ring-1 ring-rnc-gold/30">
            <span className="text-lg font-bold text-white/50">{athlete.name?.charAt(0)}</span>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center gap-2">
            {athlete.prospect_ranking != null && (
              <span className="flex-shrink-0 rounded bg-rnc-gold px-1.5 py-0.5 text-xs font-bold tabular-nums text-rnc-ink">
                #{athlete.prospect_ranking}
              </span>
            )}
            <h3 className="truncate font-semibold text-white">{athlete.name}</h3>
          </div>
          <p className="truncate text-sm text-white/60">{athlete.highschool}</p>
          {athlete.weightclass && <p className="text-xs text-rnc-gold">{athlete.weightclass} lbs</p>}
        </div>

        <ArrowRight className="h-5 w-5 flex-shrink-0 text-white/25 transition-transform group-hover:translate-x-0.5 group-hover:text-rnc-gold" />
      </div>
    </Link>
  )
}

function SectionHeader({
  title,
  href,
  linkLabel,
  icon,
}: {
  title: string
  href: string
  linkLabel: string
  icon?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {icon}
        <h2 className="text-xl font-bold text-white sm:text-2xl">{title}</h2>
      </div>
      <Link
        href={href}
        className="flex-shrink-0 text-sm font-medium text-white/60 transition-colors hover:text-rnc-gold"
      >
        {linkLabel} <ArrowRight className="ml-1 inline h-4 w-4" />
      </Link>
    </div>
  )
}

export default async function HomePage() {
  // One parallel server-side load instead of six client round-trips. Each loader degrades to
  // an empty result rather than throwing, so a slow table can't take down the front door.
  const [commitsByClass, rankings, latestCommitsRaw, storeProducts] = await Promise.all([
    loadCommitCountsByClass(STATS_CLASS_YEARS),
    loadFeaturedRankings([...RANKING_CLASSES], 3),
    loadLatestCommits(3),
    loadFeaturedStoreProducts(6),
  ])

  const latestCommits = normalizeAthleteList(latestCommitsRaw)

  return (
    <main className="min-h-screen bg-rnc-ink">
      {/* Tickets are the one thing a visitor might have come to do today, so they lead — above
          the hero, before anything asks them to browse. Behind the same clock every other ticket
          link uses, and it falls back to the field announcement when sales are shut. */}
      {tocTicketsOnSale() ? (
        <section className="border-b-2 border-[#D3B574] bg-gradient-to-r from-[#0B1D3A] via-[#13294B] to-[#0B1D3A]">
          <div className="container mx-auto px-4 py-5 sm:py-6">
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-2 rounded-full bg-[#CC0000] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                  </span>
                  Tickets on sale now
                </p>
                <h2 className="mt-2 text-2xl font-extrabold leading-tight text-white sm:text-3xl">
                  Tournament of Champions
                </h2>
                <p className="mt-1 text-sm text-white/75 sm:text-base">
                  September 18–19 · Hope Community Church, Apex · limited seating
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-center gap-2 sm:items-end">
                <a
                  href={TOC_GOFAN_TICKETS_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#D3B574] px-7 py-4 text-base font-extrabold text-[#0A1628] transition-colors hover:bg-[#c4a665] sm:text-lg"
                >
                  Buy tickets
                  <ArrowRight className="h-5 w-5" />
                </a>
                <Link href="/tournament-of-champions" className="text-xs font-semibold text-white/70 hover:text-white">
                  About the tournament
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="border-b border-[#CC0000]/60 bg-[#0B1D3A]">
          <div className="container mx-auto px-4">
            <Link
              href="/tournament-of-champions/field"
              className="group flex items-center justify-between gap-3 py-3"
            >
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <span className="inline-flex shrink-0 items-center rounded-full bg-[#CC0000] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white sm:px-2.5 sm:py-1 sm:text-[11px]">
                  Live
                </span>
                <p className="min-w-0 text-sm text-white sm:text-base">
                  <span className="hidden font-bold sm:inline">Tournament of Champions · </span>
                  <span className="font-bold">Athlete announcements</span>
                </p>
              </div>
              <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-[#CC0000] transition-colors group-hover:text-white">
                <span className="hidden sm:inline">View the field</span>
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          </div>
        </section>
      )}

      {/* The app is the newest thing here and the one a visitor cannot discover by browsing, so
          it gets a full-width block of its own rather than a strip. It sits under the tickets bar
          because that sale is on a clock and this is not.

          It links to /download rather than the App Store: an iPhone gets a 307 straight to the
          listing from middleware, and everybody else gets told it is iPhone-only instead of
          landing somewhere they cannot act on. The printed QR codes point at the same place. */}
      <section className="border-b border-rnc-gold/25 bg-gradient-to-b from-[#0B1D3A] to-rnc-ink">
        <div className="container mx-auto px-4 py-10 sm:py-14">
          <div className="flex flex-col items-center gap-8 md:flex-row md:items-center md:justify-center md:gap-14">
            <div className="max-w-xl text-center md:text-left">
              <p className="inline-flex items-center gap-2 rounded-full border border-rnc-gold/50 bg-rnc-gold/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-rnc-gold">
                New · Free
              </p>
              <h2 className="mt-3 text-3xl font-extrabold leading-tight text-white sm:text-4xl lg:text-5xl">
                The NC United app is here
              </h2>
              <p className="mt-3 text-base leading-relaxed text-white/75 sm:text-lg">
                Every North Carolina commitment, the prospect rankings, the club map and the whole
                Tournament of Champions — the field, your own bracket, and the leaderboard — on your
                phone.
              </p>
              {/* Chips rather than middot separators: the list wraps, and a separator stranded at
                  the end of a line reads as a missing item. */}
              <ul className="mt-5 flex flex-wrap justify-center gap-2 md:justify-start">
                {["Seed every weight yourself", "Alerts when a field goes live", "Rankings and results"].map(
                  (item) => (
                    <li
                      key={item}
                      className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm font-semibold text-white/70"
                    >
                      {item}
                    </li>
                  ),
                )}
              </ul>
              <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row md:items-start">
                <Link
                  href="/download"
                  className="inline-flex items-center gap-2 rounded-xl bg-rnc-gold px-8 py-4 text-base font-extrabold text-rnc-ink transition-colors hover:bg-[#c4a665] sm:text-lg"
                >
                  Download for iPhone
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <p className="text-xs text-white/55">
                  Free on the App Store. Android is not out yet.
                </p>
              </div>
            </div>

            <div className="shrink-0">
              <Image
                src="/nc-united-app-home.png"
                alt="The NC United app showing Tournament of Champions, upcoming events and the latest commitments"
                width={349}
                height={760}
                className="h-auto w-[210px] rounded-[1.75rem] border border-white/15 shadow-2xl sm:w-[240px]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={HERO_BACKGROUND_IMAGE}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-rnc-ink via-rnc-ink/85 to-rnc-ink/50" />
          <div className="absolute inset-0 bg-gradient-to-t from-rnc-ink via-transparent to-transparent" />
        </div>

        <div className="container relative mx-auto px-4 py-16 md:py-28">
          <div className="max-w-2xl">
            <h1 className="mb-5 text-5xl font-black tracking-tight text-white md:text-6xl lg:text-7xl">
              Recruit<span className="text-rnc-gold">NC</span>
            </h1>
            <p className="mb-8 max-w-xl text-lg leading-relaxed text-white/80">
              Every North Carolina wrestling commitment, prospect ranking, and result — in one place.
            </p>
            {/* Two doors, not three. /prospects/all and /colleges live in the navbar. */}
            <div className="flex flex-wrap gap-3">
              <Link href="/athletes">
                <Button className="h-12 bg-rnc-red px-6 text-base font-semibold text-white hover:bg-rnc-red-hover">
                  View Commitments
                </Button>
              </Link>
              <Link href="/public-rankings">
                <Button
                  variant="outline"
                  className="h-12 border-2 border-rnc-gold bg-transparent px-6 text-base font-semibold text-rnc-gold hover:bg-rnc-gold/10 hover:text-rnc-gold"
                >
                  Prospect Rankings
                </Button>
              </Link>
            </div>
            <Link
              href="/clubs"
              className="mt-4 inline-flex min-h-9 items-center gap-2 rounded-full border border-rnc-gold/55 bg-rnc-ink/65 px-4 py-2 text-sm font-semibold text-white/85 shadow-lg backdrop-blur-sm transition-colors hover:border-rnc-gold hover:bg-rnc-gold/10 hover:text-rnc-gold"
            >
              <MapPin className="h-4 w-4 text-rnc-gold" aria-hidden="true" />
              Find a Wrestling Club
              <ArrowRight className="h-3.5 w-3.5 text-rnc-gold" aria-hidden="true" />
            </Link>

            <div className="mt-7 max-w-xl rounded-xl border border-rnc-gold/35 bg-rnc-ink/80 p-4 shadow-xl backdrop-blur-sm sm:flex sm:items-center sm:justify-between sm:gap-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-rnc-gold">
                  Caden Perry Warrior Scholarship
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-white/75">
                  Nominate a North Carolina wrestler for a $1,000 wrestling-support award. Nominations close August 30.
                </p>
              </div>
              <Link
                href="/fundraising/scholarships/caden-perry"
                className="mt-4 inline-flex min-h-11 shrink-0 items-center justify-center rounded-md bg-rnc-red px-5 text-sm font-bold text-white transition-colors hover:bg-rnc-red-hover sm:mt-0"
              >
                Learn More &amp; Nominate
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats — 2-up on phones (three text-3xl numbers don't fit at 375px), 3-up from sm.
          Borders are per-cell rather than divide-x, which would draw a stray edge on the
          full-width third cell. */}
      <section className="border-y border-rnc-line bg-rnc-surface">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 sm:grid-cols-3">
            <div className="border-r border-rnc-line">
              <StatCard
                value={commitsByClass[STATS_CLASS_YEARS[0]] ?? 0}
                label={`Class of ${STATS_CLASS_YEARS[0]} Commits`}
                tone="white"
              />
            </div>
            <div className="sm:border-r sm:border-rnc-line">
              <StatCard
                value={commitsByClass[STATS_CLASS_YEARS[1]] ?? 0}
                label={`Class of ${STATS_CLASS_YEARS[1]} Commits`}
                tone="gold"
              />
            </div>
            {/* Full width on phones, so the class being followed reads as the headline. */}
            <div className="col-span-2 border-t border-rnc-line sm:col-span-1 sm:border-t-0">
              <StatCard
                value={commitsByClass[STATS_GRAD_YEAR] ?? 0}
                label={`Class of ${STATS_GRAD_YEAR} Commits`}
                tone="red"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto space-y-16 px-4 py-12">
        {/* Latest Commits — the reason people come, so it leads */}
        <section>
          <SectionHeader title="Latest Commits" href="/athletes" linkLabel="All commits" />
          {latestCommits.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {/* listMode defers each card's logo/record/honor fetches until it's flipped —
                  the same thing /athletes does. Three cards were firing ~15 requests on load
                  for data only the card back shows. */}
              {latestCommits.map((athlete) => (
                <ProfessionalCommitmentCard key={athlete.id} athlete={athlete} listMode />
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-white/50">No recent commits available.</p>
          )}

          {/*
            The growth loop had no front door: the only CTA on the home page was "Submit
            commitment", so an athlete who wanted to be listed had nowhere to start. It sits
            directly under the latest commits because seeing peers commit is the moment
            someone wants their own profile up.

            The button says "free account" because /create-profile is behind sign-up — a
            bare "Create your profile" promises a form and delivers a wall.
          */}
          <div className="mt-8 rounded-md border border-rnc-gold/25 bg-rnc-gold/[0.06] p-6 sm:flex sm:items-center sm:justify-between sm:gap-6">
            <div className="max-w-xl">
              <h3 className="text-xl font-black text-white sm:text-2xl">Are you a North Carolina wrestler?</h3>
              <p className="mt-2 leading-7 text-white/70">
                Put your record, results and academics where college coaches are already looking. Coaches search
                RecruitNC by class, weight, GPA and test scores.
              </p>
            </div>
            <div className="mt-5 flex flex-shrink-0 flex-col gap-2 sm:mt-0 sm:items-end">
              <Link href="/create-profile">
                <Button className="w-full bg-rnc-red px-6 py-5 text-base font-bold text-white hover:bg-rnc-red-hover sm:w-auto">
                  Create your athlete profile
                </Button>
              </Link>
              <span className="text-xs text-white/45">Free account · about 3 minutes</span>
            </div>
          </div>
        </section>

        {/* Featured Rankings */}
        <section>
          <SectionHeader
            title="Featured Rankings"
            href="/public-rankings"
            linkLabel="All rankings"
            icon={<TrendingUp className="h-5 w-5 text-rnc-gold" />}
          />
          {rankings.length > 0 ? (
            <div className="space-y-8">
              {RANKING_CLASSES.map((year) => {
                const forYear = rankings.filter((a) => a.graduationyear === year)
                if (!forYear.length) return null
                return (
                  <div key={year}>
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/50">
                      Class of {year}
                    </h3>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      {forYear.map((athlete) => (
                        <RankingCard key={athlete.id} athlete={athlete} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="py-8 text-center text-white/50">No ranked prospects available.</p>
          )}
        </section>

        {/* News */}
        <HomeNewsHighlightsCarousel />

        {/* Store */}
        <StoreProductPromotion initialProducts={storeProducts} />

        {/* Submit / edit — the only entry point to these routes; they aren't in the navbar */}
        <section>
          <div className="relative overflow-hidden rounded-2xl border border-rnc-line bg-rnc-raised p-8 md:p-10">
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
            <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="mb-1.5 text-xl font-bold text-white sm:text-2xl">Submit or update information</h2>
                <p className="max-w-lg text-white/70">
                  Help keep the database current by submitting a new commitment or requesting an update to an
                  existing profile.
                </p>
              </div>
              <div className="flex flex-shrink-0 flex-wrap gap-3">
                <Link href="/submit-commitment">
                  <Button className="bg-rnc-red text-white hover:bg-rnc-red-hover">Submit commitment</Button>
                </Link>
                <Link href="/request-edit">
                  <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 hover:text-white">
                    Request edit
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
