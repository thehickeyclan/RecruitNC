// NOTE: This homepage is intentionally PUBLIC and accessible without authentication.
// Do NOT wrap this page with AuthGuard - it must be accessible to all users, including mobile.
//
// Server component on purpose. It used to be "use client" with six no-store fetches on mount,
// which meant a blank shell, "Loading..." text, and layout shift on every visit. Data now loads
// on the server via lib/home-data (admin client, no cookies) so `revalidate` below is real.

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowLeftRight, ArrowRight, FileText, MapPin, Star, Target, TrendingUp, UserRound } from "lucide-react"
import { ProfessionalCommitmentCard } from "@/components/professional-commitment-card"
import { normalizeAthleteList } from "@/lib/professional-athlete"
import { getCurrentSigningClass } from "@/lib/commit-class-year"
import { PUBLISHED_PUBLIC_RANKINGS_YEARS } from "@/lib/public-rankings-cap"
import { StoreProductPromotion } from "@/components/store-product-promotion"
import { HomeNewsHighlightsCarousel } from "@/components/home-news-highlights-carousel"
import {
  loadFeaturedStoreProducts,
  loadCommitCountsByClass,
  loadLatestCommits,
} from "@/lib/home-data"
import { TOC_2026_AWARDS, TOC_FLO_URL, TOC_GOFAN_TICKETS_URL } from "@/lib/toc/constants"
import { tocEventIsOver, tocTicketsOnSale } from "@/lib/toc/ticket-sale"

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
  const [commitsByClass, latestCommitsRaw, storeProducts] = await Promise.all([
    loadCommitCountsByClass(STATS_CLASS_YEARS),
    loadLatestCommits(3),
    loadFeaturedStoreProducts(6),
  ])

  /*
   * Commitment cards carry the athlete's whole record, including their ranking, and the card
   * back prints it. On a page that is public and statically cached there is no viewer to check,
   * so the field is removed rather than hidden - it was in the payload too, readable by anyone
   * who opened the page source whether the card was ever flipped or not.
   */
  const latestCommits = normalizeAthleteList(latestCommitsRaw).map((athlete) => ({
    ...athlete,
    prospect_ranking: undefined,
    rankings: undefined,
  }))

  return (
    <main className="min-h-screen bg-rnc-ink">
      {/* The Tournament of Champions. On sale it leads - a ticket is on a clock. Once wrestled, it
          is one line: the results are worth a link, not the top of a recruiting homepage weeks
          later (Matt, 9 October 2026). Before sales open, the field announcement strip. */}
      {tocEventIsOver() ? (
        <section className="border-b border-rnc-gold/25 bg-[#0B1D3A]">
          <div className="container mx-auto px-4">
            <Link href="/tournament-of-champions/results" className="group flex items-center justify-between gap-3 py-2.5">
              <p className="min-w-0 truncate text-sm text-white/80">
                <span className="font-bold text-rnc-gold">Tournament of Champions 2026</span>
                <span className="hidden sm:inline"> · ten champions crowned · {TOC_2026_AWARDS.mostOutstandingWrestler.name}, Most Outstanding Wrestler</span>
              </p>
              <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-white/70 transition-colors group-hover:text-rnc-gold">
                Results <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          </div>
        </section>
      ) : tocTicketsOnSale() ? (
        <section className="border-b-2 border-[#D3B574] bg-gradient-to-r from-[#0B1D3A] via-[#13294B] to-[#0B1D3A]">
          <div className="container mx-auto px-4 py-5 sm:py-6">
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-2 rounded-full bg-[#CC0000] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                  Tickets on sale now
                </p>
                <h2 className="mt-2 text-2xl font-extrabold leading-tight text-white sm:text-3xl">Tournament of Champions</h2>
                <p className="mt-1 text-sm text-white/75 sm:text-base">September 18–19 · Hope Community Church, Apex · limited seating</p>
                <a href={TOC_FLO_URL} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-[#D3B574]">
                  <Image src="/images/flo-logo.png" alt="FloWrestling" width={20} height={20} className="h-5 w-5 rounded" />
                  <span>Streaming live on FloWrestling · commentary by Ryan Mitchell, The NC Mat</span>
                </a>
              </div>
              <div className="flex shrink-0 flex-col items-center gap-2 sm:items-end">
                <a href={TOC_GOFAN_TICKETS_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-[#D3B574] px-7 py-4 text-base font-extrabold text-[#0A1628] transition-colors hover:bg-[#c4a665] sm:text-lg">
                  Buy tickets
                  <ArrowRight className="h-5 w-5" />
                </a>
                <Link href="/tournament-of-champions" className="text-xs font-semibold text-white/70 hover:text-white">About the tournament</Link>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="border-b border-[#CC0000]/60 bg-[#0B1D3A]">
          <div className="container mx-auto px-4">
            <Link href="/tournament-of-champions/field" className="group flex items-center justify-between gap-3 py-3">
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <span className="inline-flex shrink-0 items-center rounded-full bg-[#CC0000] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white sm:px-2.5 sm:py-1 sm:text-[11px]">Live</span>
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

      {/* Hero - a recruiting site, said in the first line, with a door for each of the two people
          it serves: the college coach looking for talent and the family who wants to be found. */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image src={HERO_BACKGROUND_IMAGE} alt="" fill sizes="100vw" className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-r from-rnc-ink via-rnc-ink/90 to-rnc-ink/55" />
          <div className="absolute inset-0 bg-gradient-to-t from-rnc-ink via-transparent to-transparent" />
        </div>
        <div className="container relative mx-auto px-4 py-14 md:py-20">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-rnc-gold">
            Recruit<span className="text-white">NC</span> · North Carolina wrestling
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl">
            Where North Carolina wrestling gets <span className="text-rnc-gold">recruited.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/80">
            Every NC wrestler&apos;s results, rankings and commitments in one place, built for the college coaches looking
            and the families who want to be found.
          </p>
          <div className="mt-8 grid max-w-3xl gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-rnc-gold/50 bg-rnc-ink/80 p-5 backdrop-blur-sm">
              <p className="text-[11px] font-bold uppercase tracking-widest text-rnc-gold">College coaches</p>
              <p className="mt-1.5 text-sm text-white/75">Scouting reports, rankings and side-by-side comparisons. Free.</p>
              <Link
                href="/auth/signup?type=college-coach"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-rnc-gold px-5 py-2.5 text-sm font-extrabold text-rnc-ink transition-colors hover:bg-[#c4a665]"
              >
                Get free access <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="rounded-xl border border-white/15 bg-rnc-ink/80 p-5 backdrop-blur-sm">
              <p className="text-[11px] font-bold uppercase tracking-widest text-white/60">Athletes &amp; families</p>
              <p className="mt-1.5 text-sm text-white/75">Your results are probably already here. Claim your profile and get seen.</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Link
                  href="/prospects/all"
                  className="inline-flex items-center gap-2 rounded-lg border-2 border-rnc-gold px-5 py-2 text-sm font-bold text-rnc-gold transition-colors hover:bg-rnc-gold/10"
                >
                  Find your profile <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/create-profile" className="text-sm font-semibold text-white/70 hover:text-white">
                  Not listed? Create one
                </Link>
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
            <Link href="/athletes" className="text-white/70 hover:text-rnc-gold">Commitments <ArrowRight className="inline h-3.5 w-3.5" /></Link>
            <Link href="/public-rankings" className="text-white/70 hover:text-rnc-gold">Prospect rankings <ArrowRight className="inline h-3.5 w-3.5" /></Link>
            <Link href="/clubs" className="inline-flex items-center gap-1 text-white/70 hover:text-rnc-gold">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> Find a club
            </Link>
          </div>
        </div>
      </section>

      {/* Built for college coaches: every tool a coach gets, in one place. The coach is the reader
          the database exists for, and none of these is findable by browsing - reports sit inside a
          profile, the comparison and rankings behind a sign-in. One button: the coach sign-up,
          which grants access on submit. */}
      <section className="border-y border-rnc-gold/25 bg-gradient-to-b from-[#0B1D3A] to-rnc-ink">
        <div className="container mx-auto px-4 py-12 sm:py-16">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:gap-14">
            <div className="lg:w-[55%]">
              <p className="inline-flex items-center gap-2 rounded-full border border-rnc-gold/50 bg-rnc-gold/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-rnc-gold">
                Free for college coaches
              </p>
              <h2 className="mt-3 text-3xl font-extrabold leading-tight text-white sm:text-4xl">Built for college coaches</h2>
              <p className="mt-3 text-base leading-relaxed text-white/70 sm:text-lg">
                A complete, objective look at North Carolina talent, from first look to the staff meeting.
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {[
                  { icon: FileText, title: "Scouting reports", body: "One page per athlete: evaluation, academics, best wins. PDF-ready." },
                  { icon: ArrowLeftRight, title: "Compare wrestlers", body: "Head to head, common opponents, best wins, national results, and our read.", isNew: true },
                  { icon: TrendingUp, title: "Prospect rankings", body: "Every published class, ranked on results." },
                  { icon: UserRound, title: "Full athlete profiles", body: "Results, academics, contact details and film." },
                  { icon: Star, title: "My Recruits", body: "A watch list your whole staff shares, with who's gone quiet." },
                  { icon: Target, title: "Your perfect recruit", body: "Set your needs once; every comparison reads against them." },
                ].map(({ icon: Icon, title, body, isNew }) => (
                  <div key={title} className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-rnc-gold" aria-hidden="true" />
                    <div>
                      <p className="font-bold text-white">
                        {title}
                        {isNew ? (
                          <span className="ml-2 rounded-full bg-rnc-gold px-1.5 py-px align-middle text-[9px] font-black uppercase tracking-wider text-rnc-ink">
                            New
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-sm leading-snug text-white/60">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row">
                <Link
                  href="/auth/signup?type=college-coach"
                  className="inline-flex items-center gap-2 rounded-xl bg-rnc-gold px-8 py-4 text-base font-extrabold text-rnc-ink transition-colors hover:bg-[#c4a665] sm:text-lg"
                >
                  College coaches: get free access
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link href="/compare?src=home" className="text-sm font-semibold text-white/70 hover:text-white">
                  See the comparison tool
                </Link>
              </div>
              <p className="mt-3 text-center text-xs text-white/45 sm:text-left">
                Name, email, cell and college. Access is immediate.
              </p>
            </div>
            <div className="w-full lg:w-[45%]">
              <Image
                src="/scouting-report-sample.jpg"
                alt="A sample NC United prospect scouting report: evaluation, academics, star rating, competition record, significant wins, strength of competition and notable losses"
                width={1222}
                height={885}
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="h-auto w-full rounded-xl border border-white/10 shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* The app, as a strip. It had a block as large as the coaches' one; on a recruiting homepage
          it is a supporting line. /download sends an iPhone straight to the App Store listing. */}
      <section className="border-b border-rnc-line bg-rnc-surface">
        <div className="container mx-auto px-4">
          <Link href="/download" className="group flex items-center justify-between gap-3 py-3">
            <span className="flex min-w-0 items-center gap-3">
              <Image src="/icon-192.png" alt="" width={32} height={32} className="h-8 w-8 shrink-0 rounded-lg" />
              <span className="min-w-0 text-sm text-white/80">
                <span className="font-bold text-white">NC United app for iPhone</span>
                <span className="hidden sm:inline"> · commitments as they happen, alerts you choose, rankings and results</span>
              </span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-rnc-gold/60 px-3 py-1.5 text-xs font-bold text-rnc-gold transition-colors group-hover:bg-rnc-gold/10">
              Download <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
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
        {/* The scholarship moved out of the hero, which now says one thing - recruiting - but it
            stays on the front page. */}
        <div className="rounded-xl border border-rnc-gold/35 bg-rnc-surface p-4 sm:flex sm:items-center sm:justify-between sm:gap-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-rnc-gold">Caden Perry Warrior Scholarship</p>
            <p className="mt-1.5 text-sm leading-relaxed text-white/75">
              A $1,300 wrestling-support award, presented to {TOC_2026_AWARDS.cadenPerryScholarship.name} at the 2026
              Tournament of Champions.
            </p>
          </div>
          <Link
            href="/fundraising/scholarships/caden-perry"
            className="mt-4 inline-flex min-h-11 shrink-0 items-center justify-center rounded-md bg-rnc-red px-5 text-sm font-bold text-white transition-colors hover:bg-rnc-red-hover sm:mt-0"
          >
            Learn More
          </Link>
        </div>

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

        {/*
          * Rankings are sold, so they cannot be given away here.
          *
          * This section printed the top three of every published class, by name and by number,
          * to anybody who loaded the homepage - and this page is public and statically cached
          * on purpose, so there is no viewer to check and no way to show a number safely. The
          * promo does the job the section was really doing: sending people to the rankings.
          */}
        <section>
          <SectionHeader
            title="Prospect Rankings"
            href="/rankings"
            linkLabel="See what is included"
            icon={<TrendingUp className="h-5 w-5 text-rnc-gold" />}
          />
          <div className="rounded-xl border border-rnc-gold/30 bg-rnc-raised p-6 text-center">
            <p className="text-lg font-medium text-white">
              North Carolina&apos;s top college prospects, ranked on results.
            </p>
            <p className="mx-auto mt-2 max-w-xl text-sm text-white/60">
              Free for NC United Blue members and verified college coaches.
            </p>
            <Link
              href="/rankings"
              className="mt-5 inline-block rounded-lg bg-rnc-gold px-5 py-2.5 text-sm font-semibold text-rnc-ink hover:opacity-90"
            >
              See what is included
            </Link>
          </div>
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
