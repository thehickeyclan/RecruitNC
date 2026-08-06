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
import { StoreProductPromotion } from "@/components/store-product-promotion"
import { HomeNewsHighlightsCarousel } from "@/components/home-news-highlights-carousel"
import {
  loadFeaturedRankings,
  loadFeaturedStoreProducts,
  loadHomeStats,
  loadLatestCommits,
  type HomeRankedProspect,
} from "@/lib/home-data"

export const revalidate = 120

const HERO_BACKGROUND_IMAGE = "/hero-banner-nchsaa-2026-arena.png"

/** Stats bar reflects the current signing class. */
const STATS_GRAD_YEAR = 2026
const RANKING_CLASSES = [2027, 2028] as const

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
  const [stats, rankings, latestCommitsRaw, storeProducts] = await Promise.all([
    loadHomeStats(STATS_GRAD_YEAR),
    loadFeaturedRankings([...RANKING_CLASSES], 3),
    loadLatestCommits(3),
    loadFeaturedStoreProducts(6),
  ])

  const latestCommits = normalizeAthleteList(latestCommitsRaw)

  return (
    <main className="min-h-screen bg-rnc-ink">
      {/* Tournament of Champions — launch announcement bar, first thing on the page.
          Deliberately TOC-branded navy/red (not rnc gold); originally placed below the
          stats bar, where the owner couldn't find it. */}
      <section className="border-b border-[#CC0000]/60 bg-[#0B1D3A]">
        <div className="container mx-auto px-4">
          <Link
            href="/tournament-of-champions"
            className="group flex items-center justify-between gap-3 py-3"
          >
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <span className="inline-flex shrink-0 items-center rounded-full bg-[#CC0000] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white sm:px-2.5 sm:py-1 sm:text-[11px]">
                New
              </span>
              {/* The event name must never truncate — only the trailing detail may be dropped. */}
              <p className="min-w-0 text-sm text-white sm:text-base">
                <span className="font-bold">Tournament of Champions</span>
                <span className="hidden text-white/70 md:inline"> — Sept 18–19 · Apex · Invite-only · 11 weights, 88 wrestlers</span>
                <span className="hidden text-white/70 sm:inline md:hidden"> — Sept 18–19 · Apex</span>
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-[#CC0000] transition-colors group-hover:text-white">
              <span className="hidden sm:inline">See the event</span>
              <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
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
              <StatCard value={stats.total} label={`Class of ${STATS_GRAD_YEAR} Commits`} tone="white" />
            </div>
            <div className="sm:border-r sm:border-rnc-line">
              <StatCard value={stats.male} label="Male Athletes" tone="gold" />
            </div>
            <div className="col-span-2 border-t border-rnc-line sm:col-span-1 sm:border-t-0">
              <StatCard value={stats.female} label="Female Athletes" tone="red" />
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
