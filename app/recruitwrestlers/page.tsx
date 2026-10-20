/**
 * www.recruitwrestlers.com's front door (middleware rewrites "/" here). Rebuilt on 20 Oct 2026 on
 * the layout of NC United's own homepage, which Matt pointed to as "what we had": a hero with a
 * door for the college coach and one for the family, the Command Center with live numbers and the
 * college map, the coaches' tools beside a real scouting report, and the states. Navy and lime
 * with Scout's head (components/recruiting/rw-mark.tsx). NC United's news, store and events are
 * NC United's and stay on app.ncwrestlingunited.com.
 */
import type { Metadata } from "next"
import Image from "next/image"
import { ArrowLeftRight, ArrowRight, FileText, Map as MapIcon, Star, Target, TrendingUp, UserRound } from "lucide-react"
import { RwLogo } from "@/components/recruiting/rw-mark"
import { NATIONAL_BRAND, RECRUITING_BRAND } from "@/lib/recruiting/brand"
import { loadPlatformStats } from "@/lib/platform-stats"
import { createAdminClient } from "@/lib/supabase/admin"
import { ANNOUNCED_PROGRAMS } from "@/lib/college-programs/announced"
import { PREVIEW, buildMapPreview } from "@/lib/college-programs/map-preview"
import collegeMapData from "@/lib/college-programs/programs-2026-27.json"
import type { CollegeMapSchool } from "@/lib/college-programs/types"

export const revalidate = 3600

const SHARE_TITLE = "RecruitWrestlers | College wrestling recruiting, built on verified results"
const SHARE_DESCRIPTION =
  "The recruiting platform where college wrestling coaches and families meet: verified results, a Command Center for families, and a free recruiting portal for college coaches."

/*
 * Every field the site-wide metadata sets (app/layout.tsx) is replaced here. Left alone, a link to
 * recruitwrestlers.com previewed as "NC United Wrestling" with the NC United logo, and the tab
 * showed NC United's icon.
 */
export const metadata: Metadata = {
  metadataBase: new URL(`https://${NATIONAL_BRAND.domain}`),
  // Absolute: the site-wide template would append "| NC United Wrestling".
  title: { absolute: SHARE_TITLE },
  description: SHARE_DESCRIPTION,
  applicationName: NATIONAL_BRAND.name,
  manifest: null,
  alternates: { canonical: "/" },
  openGraph: {
    title: SHARE_TITLE,
    description: SHARE_DESCRIPTION,
    url: "/",
    siteName: NATIONAL_BRAND.name,
    type: "website",
    images: [{ url: "/recruitwrestlers/share.jpg", width: 1200, height: 630, alt: "RecruitWrestlers: get recruited on verified results" }],
  },
  twitter: {
    card: "summary_large_image",
    title: SHARE_TITLE,
    description: SHARE_DESCRIPTION,
    images: ["/recruitwrestlers/share.jpg"],
  },
  appleWebApp: { capable: true, statusBarStyle: "default", title: NATIONAL_BRAND.name },
  icons: {
    icon: [
      { url: "/recruitwrestlers/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/recruitwrestlers/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/recruitwrestlers/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/recruitwrestlers/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
}

const LIME = "#A3E635"
const BTN = "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-extrabold transition-colors"
const PRIMARY = `${BTN} bg-[#A3E635] text-[#0A1628] hover:bg-[#BEF264]`
const OUTLINE = `${BTN} border-2 border-[#A3E635] text-[#A3E635] hover:bg-[#A3E635]/10`

const COACH_TOOLS = [
  { icon: FileText, title: "Scouting reports", body: "One page per athlete: evaluation, academics, best wins. PDF-ready." },
  { icon: ArrowLeftRight, title: "Compare wrestlers", body: "Head to head, common opponents, best wins, national results, and our read." },
  { icon: TrendingUp, title: "Prospect rankings", body: "Every published class, ranked on results." },
  { icon: UserRound, title: "Full athlete profiles", body: "Results, academics, contact details and film." },
  { icon: Star, title: "My Recruits", body: "A watch list your whole staff shares, with who's gone quiet." },
  { icon: Target, title: "Your perfect recruit", body: "Set your needs once; every comparison reads against them." },
]

export default async function RecruitWrestlersHome() {
  const platform = await loadPlatformStats(createAdminClient()).catch(() => null)
  // A picture of the college map, not the live map: the front page stays fast.
  const mapPreview = (() => {
    try {
      return buildMapPreview([...(collegeMapData.schools as CollegeMapSchool[]), ...ANNOUNCED_PROGRAMS], { accessToken: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN })
    } catch {
      return null
    }
  })()
  const proof = [
    { n: mapPreview?.dots.length ?? null, label: "colleges on the map" },
    { n: platform?.coaches ?? null, label: "college coaches on it" },
    { n: platform?.programs ?? null, label: "college programs" },
  ].filter((t) => t.n != null && t.n > 0)

  return (
    <div className="min-h-screen bg-[#0A1628] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0A1628]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <a href="/" aria-label={NATIONAL_BRAND.name}>
            <RwLogo className="h-8 w-auto sm:h-9" />
          </a>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-white/75 lg:flex">
            <a href="/prospects/all" className="hover:text-white">Athletes</a>
            <a href="/public-rankings" className="hover:text-white">Rankings</a>
            <a href="/recruiting/college-map" className="hover:text-white">Colleges</a>
            <a href="/command-center" className="hover:text-white">Command Center</a>
            <a href="/recruiting/learn" className="hover:text-white">Learn</a>
          </nav>
          <div className="flex items-center gap-3">
            <a href="/auth/signin" className="hidden text-sm font-semibold text-white/80 hover:text-white sm:inline">Sign in</a>
            <a href="/create-profile" className={`${PRIMARY} px-4 py-2`}>Get started</a>
          </div>
        </div>
      </header>

      <main>
        {/* Hero: a recruiting site, said in the first line, with a door for each of the two people it serves. */}
        <section className="relative overflow-hidden border-b border-white/10">
          {mapPreview ? (
            <svg viewBox={`0 0 ${PREVIEW.width} ${PREVIEW.height}`} className="pointer-events-none absolute -right-24 top-6 hidden h-[115%] opacity-35 lg:block" aria-hidden>
              {mapPreview.dots.map((d) => (
                <circle key={d.id} cx={d.x} cy={d.y} r={3} fill={LIME} opacity={0.55} />
              ))}
            </svg>
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A1628] via-[#0A1628]/90 to-transparent" />
          <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 md:py-20">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A3E635]">
              Recruit<span className="text-white">Wrestlers</span> · College wrestling recruiting
            </p>
            <h1 className="mt-3 max-w-3xl text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
              Where wrestlers get <span className="text-[#A3E635]">recruited.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/80">
              Verified results, rankings and commitments in one place, built for the college coaches looking and the families
              who want to be found.
            </p>
            <div className="mt-8 grid max-w-3xl gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-[#A3E635]/50 bg-[#0A1628]/80 p-5 backdrop-blur-sm">
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#A3E635]">College coaches</p>
                <p className="mt-1.5 text-sm text-white/75">Scouting reports, rankings and side-by-side comparisons. Free.</p>
                <a href="/auth/signup?type=college-coach" className={`mt-4 ${PRIMARY}`}>
                  Get free access <ArrowRight className="h-4 w-4" />
                </a>
              </div>
              <div className="rounded-xl border border-white/15 bg-[#0A1628]/80 p-5 backdrop-blur-sm">
                <p className="text-[11px] font-bold uppercase tracking-widest text-white/60">Athletes &amp; families</p>
                <p className="mt-1.5 text-sm text-white/75">Your results are probably already here. Claim your profile and get seen.</p>
                {/* /create-profile searches for the existing profile first and only creates one when there is no match. */}
                <a href="/create-profile" className={`mt-4 ${OUTLINE} py-2`}>
                  Claim your profile <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
              <a href="/public-rankings" className="text-white/70 hover:text-[#A3E635]">Prospect rankings <ArrowRight className="inline h-3.5 w-3.5" /></a>
              <a href="/recruiting/college-map" className="inline-flex items-center gap-1 text-white/70 hover:text-[#A3E635]">
                <MapIcon className="h-3.5 w-3.5" aria-hidden /> College map
              </a>
              <a href="/recruiting/learn" className="text-white/70 hover:text-[#A3E635]">How recruiting works <ArrowRight className="inline h-3.5 w-3.5" /></a>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6">
          {/* The Recruiting Command Center: proof, Scout and a picture of the college map. */}
          <section className="overflow-hidden rounded-2xl border border-[#A3E635]/40 bg-gradient-to-br from-[#13294B] to-[#0f1c2e]">
            <div className="grid gap-0 md:grid-cols-[1.05fr_1fr]">
              <div className="p-6 sm:p-8">
                <span className="inline-flex items-center rounded-full bg-[#A3E635] px-2.5 py-0.5 text-[11px] font-black uppercase tracking-widest text-[#0A1628]">For families</span>
                <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">The Recruiting Command Center</h2>
                <p className="mt-2 text-sm text-white/75 sm:text-base">
                  Your family&apos;s recruiting plan, from 8th grade through signing day, on the same platform college coaches use to recruit.
                </p>
                {proof.length ? (
                  <div className="mt-5 grid grid-cols-3 gap-2">
                    {proof.map((t) => (
                      <div key={t.label} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                        <p className="text-2xl font-black sm:text-3xl">{t.n}</p>
                        <p className="text-[11px] leading-4 text-white/60">{t.label}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
                <ul className="mt-4 space-y-1.5 text-sm text-white/80">
                  <li>Every college: coaches, full cost after aid, roster and alumni</li>
                  <li>A roadmap that adapts to your wrestler, and every recruiting rule</li>
                  <li>See which college programs viewed your profile, and log who reached out</li>
                  <li>
                    <span className="font-semibold text-[#A3E635]">Scout</span>, your AI recruiting assistant
                  </li>
                </ul>
                <div className="mt-5">
                  <a href="/command-center" className={PRIMARY}>Learn more</a>
                </div>
              </div>
              {mapPreview ? (
                <a href="/recruiting/college-map" aria-label="Open the college map" className="group relative flex items-center bg-[#0a1528]">
                  <div className="relative w-full" style={{ aspectRatio: `${PREVIEW.width} / ${PREVIEW.height}` }}>
                    {mapPreview.backdropUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mapPreview.backdropUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover brightness-150" />
                    ) : null}
                    <svg viewBox={`0 0 ${PREVIEW.width} ${PREVIEW.height}`} className="absolute inset-0 h-full w-full" role="img" aria-label={`Map of ${mapPreview.dots.length} college wrestling programs`}>
                      {mapPreview.dots.map((d) => (
                        <circle key={d.id} cx={d.x} cy={d.y} r={3.4} fill={d.color} stroke="#0a1528" strokeWidth={0.8} opacity={0.95} />
                      ))}
                    </svg>
                  </div>
                  <span className="absolute bottom-3 right-3 rounded-lg bg-[#A3E635] px-3 py-1.5 text-xs font-bold text-[#0A1628] shadow-lg group-hover:opacity-90">
                    Explore the map →
                  </span>
                </a>
              ) : null}
            </div>
          </section>

          {/* Every college, one page: what a family sees when they open a program. */}
          <section className="grid items-center gap-8 lg:grid-cols-[1fr_1.15fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A3E635]">Every college program</p>
              <h2 className="mt-2 text-3xl font-extrabold">One page per college, everything a family needs.</h2>
              <p className="mt-3 text-white/70">
                Division, conference, team ranking and roster; what a year really costs and what families like yours paid after
                aid; the coaching staff; and whether the program&apos;s coaches are already on RecruitWrestlers.
              </p>
              <a href="/recruiting/college-map" className={`mt-5 ${OUTLINE} py-2`}>
                Browse the colleges <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            <Image
              src="/recruitwrestlers/college-page-lime.jpg"
              alt="A college page on RecruitWrestlers: North Carolina State University's program snapshot, costs and coaching staff"
              width={928}
              height={780}
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="h-auto w-full rounded-xl border border-white/10 shadow-2xl"
            />
          </section>
        </div>

        {/* Built for college coaches: every tool a coach gets. */}
        <section className="border-y border-[#A3E635]/25 bg-gradient-to-b from-[#0B1D3A] to-[#0A1628]">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
            <div>
              <div>
                <p className="inline-flex items-center gap-2 rounded-full border border-[#A3E635]/50 bg-[#A3E635]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#A3E635]">
                  Free for college coaches
                </p>
                <h2 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">Built for college coaches</h2>
                <p className="mt-3 text-base leading-relaxed text-white/70 sm:text-lg">
                  A complete, objective look at the wrestlers you recruit, from first look to the staff meeting.
                </p>
                <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {COACH_TOOLS.map(({ icon: Icon, title, body }) => (
                    <div key={title} className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#A3E635]" aria-hidden />
                      <div>
                        <p className="font-bold">{title}</p>
                        <p className="mt-0.5 text-sm leading-snug text-white/60">{body}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row">
                  <a href="/auth/signup?type=college-coach" className="inline-flex items-center gap-2 rounded-xl bg-[#A3E635] px-8 py-4 text-base font-extrabold text-[#0A1628] hover:bg-[#BEF264] sm:text-lg">
                    College coaches: get free access <ArrowRight className="h-5 w-5" />
                  </a>
                  <a href="/compare" className="text-sm font-semibold text-white/70 hover:text-white">See the comparison tool</a>
                </div>
                <p className="mt-3 text-center text-xs text-white/45 sm:text-left">Name, email, cell and college. Access is immediate.</p>
              </div>
            </div>
          </div>
        </section>

        {/* State by state: every state is a RecruitWrestlers state, under its own name. */}
        <section id="states" className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A3E635]">State by state</p>
          <h2 className="mt-2 text-3xl font-extrabold">Opening one state at a time, done right.</h2>
          <p className="mt-2 max-w-2xl text-white/65">Every state placer gets a profile before a state opens, built from verified results.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {RECRUITING_BRAND.states.map((s) => (
              <a
                key={s.code}
                href={s.live ? `/prospects/all?state=${s.code}` : undefined}
                className={`rounded-2xl border p-5 ${s.live ? "border-[#A3E635]/40 bg-white/[0.03] hover:border-[#A3E635]" : "border-white/10 bg-white/[0.02]"}`}
              >
                <p className="text-2xl font-black tracking-tight">
                  RECRUIT<span className="text-[#A3E635]">{s.code}</span>
                </p>
                <p className="mt-1 text-sm text-white/65">{s.name}</p>
                <p className={`mt-3 text-xs font-bold uppercase tracking-widest ${s.live ? "text-[#A3E635]" : "text-white/40"}`}>
                  {s.live ? "Live · browse athletes →" : "Coming soon"}
                </p>
              </a>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <RwLogo className="h-8 w-auto" />
            <p className="mt-2 text-sm text-white/45">The future of college wrestling recruiting.</p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/60">
            <a href="/prospects/all" className="hover:text-white">Athletes</a>
            <a href="/public-rankings" className="hover:text-white">Rankings</a>
            <a href="/recruiting/college-map" className="hover:text-white">Colleges</a>
            <a href="/recruiting/learn" className="hover:text-white">Learn</a>
            <a href="/privacy" className="hover:text-white">Privacy</a>
            <a href="mailto:info@recruitwrestlers.com" className="hover:text-white">info@recruitwrestlers.com</a>
          </nav>
        </div>
        <p className="pb-8 text-center text-xs text-white/35">© {new Date().getFullYear()} {NATIONAL_BRAND.name} · A Guild Ventures company</p>
      </footer>
    </div>
  )
}
