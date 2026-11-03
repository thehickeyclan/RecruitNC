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
import { ArrowRight, Eye, Map as MapIcon, MessageSquare, Search, ShieldCheck } from "lucide-react"
import { RwLogo } from "@/components/recruiting/rw-mark"
import { NATIONAL_BRAND, RECRUITING_BRAND, liveStates } from "@/lib/recruiting/brand"
import { inStates } from "@/lib/recruiting/states"
import { currentClassYears } from "@/lib/class-years"
import { loadPlatformStats } from "@/lib/platform-stats"
import { createAdminClient } from "@/lib/supabase/admin"
import { ANNOUNCED_PROGRAMS } from "@/lib/college-programs/announced"
import { PREVIEW, buildMapPreview } from "@/lib/college-programs/map-preview"
import collegeMapData from "@/lib/college-programs/programs-2026-27.json"
import type { CollegeMapSchool } from "@/lib/college-programs/types"
import { NationalHeader } from "@/components/recruiting/national-frame"

export const revalidate = 3600

const SHARE_TITLE = "RecruitWrestlers | The college recruiting platform for high school wrestlers"
const SHARE_DESCRIPTION =
  "The recruiting platform where high school wrestlers and college coaches meet. Families get a plan, a college list and see which programs are watching. Coaches find, evaluate and reach recruits, free."

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
    images: [{ url: "/recruitwrestlers/share.jpg", width: 1200, height: 630, alt: "RecruitWrestlers: the college recruiting platform for high school wrestlers" }],
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
const PRIMARY = `${BTN} bg-[#A3E635] text-[#0B1426] hover:bg-[#BEF264]`
const OUTLINE = `${BTN} border-2 border-[#A3E635] text-[#A3E635] hover:bg-[#A3E635]/10`

export default async function RecruitWrestlersHome() {
  const admin = createAdminClient()
  const [platform, profileCount] = await Promise.all([
    loadPlatformStats(admin).catch(() => null),
    // Wrestlers with a profile in the open states and current classes, counted, never typed.
    (async () => {
      const { count } = await inStates(
        admin.from("athletes").select("id", { count: "exact", head: true }).in("graduationyear", currentClassYears()),
        liveStates(true).map((st) => st.code),
      )
      return count ?? null
    })().catch(() => null),
  ])
  const fmt = (n: number | null | undefined) => (n && n > 0 ? n.toLocaleString() : null)
  /*
   * The loop the page exists to explain (Matt, 2 Nov 2026: the page read as two product brochures,
   * one per audience, and never said what problem it solves). Each step names who does it.
   */
  const loop = [
    { icon: ShieldCheck, n: fmt(profileCount), unit: "verified profiles", title: "Every state placer has a profile", body: "Built from state and national tournament results, before anyone signs up." },
    { icon: Search, n: fmt(platform?.coaches), unit: "college coaches", title: "Coaches search, star and follow", body: "On the same profiles your family claims and keeps up to date." },
    { icon: Eye, n: fmt(platform?.coachViews), unit: "coach profile views", title: "Families see who's looking", body: "When a college program views your wrestler, you know, and you reach out to the right ones." },
    { icon: MessageSquare, n: null, unit: null, title: "Coaches message families directly", body: "Approved college coaches only, and parents see every message." },
  ]
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
    // Coaches are counted in the band above; here, what they have done (Matt, 2 Nov 2026).
    { n: platform?.programs ?? null, label: "college programs" },
    { n: platform?.profilesViewed ?? null, label: "wrestlers viewed by coaches" },
  ].filter((t) => t.n != null && t.n > 0)

  return (
    <div className="min-h-screen bg-[#0B1426] text-white">
      {/* The site header: same product menu as every page, with the phone menu. */}
      <NationalHeader />

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
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B1426] via-[#0B1426]/90 to-transparent" />
          <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 md:py-20">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A3E635]">
              Recruit<span className="text-white">Wrestlers</span> · College wrestling recruiting
            </p>
            <h1 className="mt-3 max-w-3xl text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
              Where wrestlers get <span className="text-[#A3E635]">recruited.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/80">
              High school families and college coaches on one recruiting platform. Families know who is watching and what to do
              next; coaches find, evaluate and reach their next recruits.
            </p>
            <div className="mt-8 grid max-w-3xl gap-4 sm:grid-cols-2">
              {/* Families first, with the search right here (Matt, 1 Nov 2026): on a phone the coaches'
                  card filled the first screen, and 111 people landed here while 35 reached the claim
                  page. The name goes to /create-profile, which asks wrestler or parent and has already
                  searched. */}
              <div className="rounded-xl border border-[#A3E635]/50 bg-[#0B1426]/80 p-5 backdrop-blur-sm">
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#A3E635]">Athletes &amp; families</p>
                <p className="mt-1.5 text-sm text-white/75">Your results are probably already here. Find your profile and claim it, free.</p>
                <form action="/create-profile" method="get" className="mt-4 flex gap-2">
                  <label htmlFor="home-find" className="sr-only">Wrestler&apos;s name</label>
                  <input
                    id="home-find"
                    name="look"
                    required
                    minLength={2}
                    autoComplete="off"
                    placeholder="Wrestler's name"
                    className="min-h-[44px] min-w-0 flex-1 rounded-lg border border-white/20 bg-white/5 px-3 text-base text-white placeholder:text-white/40 focus:border-[#A3E635] focus:outline-none"
                  />
                  <button type="submit" className={`${PRIMARY} min-h-[44px] shrink-0 px-4`}>
                    Find <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              </div>
              <div className="rounded-xl border border-white/15 bg-[#0B1426]/80 p-5 backdrop-blur-sm">
                <p className="text-[11px] font-bold uppercase tracking-widest text-white/60">College coaches</p>
                <p className="mt-1.5 text-sm text-white/75">Scouting reports, rankings and side-by-side comparisons. Free.</p>
                <a href="/auth/signup?type=college-coach" className={`mt-4 ${OUTLINE} py-2`}>
                  Get free access <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
              <a href="/rankings" className="text-white/70 hover:text-[#A3E635]">Prospect rankings <ArrowRight className="inline h-3.5 w-3.5" /></a>
              <a href="/recruiting/college-map" className="inline-flex items-center gap-1 text-white/70 hover:text-[#A3E635]">
                <MapIcon className="h-3.5 w-3.5" aria-hidden /> College map
              </a>
              <a href="/recruiting/learn" className="text-white/70 hover:text-[#A3E635]">How recruiting works <ArrowRight className="inline h-3.5 w-3.5" /></a>
            </div>
          </div>
        </section>

        {/* The problem, then the loop (Matt, 2 Nov 2026): recruiting done in the dark on both sides, and the one place both sides meet. */}
        <section className="border-b border-white/10 bg-[#0E1A30]">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
            <h2 className="max-w-3xl text-3xl font-black leading-tight tracking-tight sm:text-4xl">
              Recruiting shouldn&apos;t happen <span className="text-[#A3E635]">in the dark.</span>
            </h2>
            <div className="mt-7 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-white/50">Families today</p>
                <p className="mt-2 text-base leading-relaxed text-white/80">
                  Guess which colleges fit, email coaches who may never open it, and wait for a call with no idea who&apos;s looking.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-white/50">College coaches today</p>
                <p className="mt-2 text-base leading-relaxed text-white/80">
                  Piece together results from a dozen sites, can&apos;t check what&apos;s real, and miss wrestlers outside their circle.
                </p>
              </div>
            </div>
            <p className="mt-10 text-xs font-bold uppercase tracking-[0.2em] text-[#A3E635]">On RecruitWrestlers, both sides are in the same place</p>
            <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {loop.map(({ icon: Icon, n, unit, title, body }, i) => (
                <li key={title} className="relative rounded-xl border border-[#A3E635]/25 bg-[#15243B] p-5">
                  <div className="flex items-center justify-between">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#A3E635] text-sm font-black text-[#0B1426]">{i + 1}</span>
                    <Icon className="h-5 w-5 text-[#A3E635]" aria-hidden />
                  </div>
                  {n ? (
                    <p className="mt-4 text-3xl font-black tabular-nums">
                      {n} <span className="block text-xs font-semibold uppercase tracking-wide text-white/50">{unit}</span>
                    </p>
                  ) : null}
                  <p className={`${n ? "mt-3" : "mt-4"} font-bold`}>{title}</p>
                  <p className="mt-1 text-sm leading-snug text-white/60">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <div className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6">
          {/* The Recruiting Command Center: proof, Scout and a picture of the college map. */}
          <section className="overflow-hidden rounded-2xl border border-[#A3E635]/40 bg-gradient-to-br from-[#15243B] to-[#15243B]">
            <div className="grid gap-0 md:grid-cols-[1.05fr_1fr]">
              <div className="p-6 sm:p-8">
                <span className="inline-flex items-center rounded-full bg-[#A3E635] px-2.5 py-0.5 text-[11px] font-black uppercase tracking-widest text-[#0B1426]">For families</span>
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
                <a href="/recruiting/college-map" aria-label="Open the college map" className="group relative flex items-center bg-[#0B1426]">
                  <div className="relative w-full" style={{ aspectRatio: `${PREVIEW.width} / ${PREVIEW.height}` }}>
                    {mapPreview.backdropUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mapPreview.backdropUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover brightness-150" />
                    ) : null}
                    <svg viewBox={`0 0 ${PREVIEW.width} ${PREVIEW.height}`} className="absolute inset-0 h-full w-full" role="img" aria-label={`Map of ${mapPreview.dots.length} college wrestling programs`}>
                      {mapPreview.dots.map((d) => (
                        <circle key={d.id} cx={d.x} cy={d.y} r={3.4} fill={d.color} stroke="#0B1426" strokeWidth={0.8} opacity={0.95} />
                      ))}
                    </svg>
                  </div>
                  <span className="absolute bottom-3 right-3 rounded-lg bg-[#A3E635] px-3 py-1.5 text-xs font-bold text-[#0B1426] shadow-lg group-hover:opacity-90">
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
                Division, conference, team ranking and roster; what a year really costs and what families paid after
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

        {/* College coaches: one card on the families' front door, the full tool list on /for-coaches (Matt, 2 Nov 2026). */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col gap-5 rounded-2xl border border-[#A3E635]/30 bg-gradient-to-br from-[#15243B] to-[#0B1426] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#A3E635]">Free for college coaches</p>
              <h2 className="mt-2 text-2xl font-extrabold">Find your next recruits.</h2>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-white/65">
                Scouting reports, side-by-side comparisons, rankings and a shared watch list for your staff. Access is immediate.
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
              <a href="/auth/signup?type=college-coach" className={`${PRIMARY} px-6 py-3`}>
                Get free access <ArrowRight className="h-4 w-4" />
              </a>
              <a href="/for-coaches" className="text-sm font-semibold text-white/70 hover:text-white">See every coach tool →</a>
            </div>
          </div>
        </section>

        {/* State by state: every state is a RecruitWrestlers state, under its own name. */}
        <section id="states" className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A3E635]">State by state</p>
          <h2 className="mt-2 text-3xl font-extrabold">Opening one state at a time, done right.</h2>
          <p className="mt-2 max-w-2xl text-white/65">Every state placer has a profile waiting before a state opens.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {RECRUITING_BRAND.states.map((s) => (
              <a
                key={s.code}
                href={s.live ? `/prospects/all?state=${s.code}` : undefined}
                className={`rounded-2xl border p-5 ${s.live ? "border-[#A3E635]/40 bg-white/[0.03] hover:border-[#A3E635]" : "border-white/10 bg-white/[0.02]"}`}
              >
                <p className="text-2xl font-black tracking-tight">
                  {s.code}
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
            <a href="/rankings" className="hover:text-white">Rankings</a>
            <a href="/recruiting/college-map" className="hover:text-white">Colleges</a>
            <a href="/for-coaches" className="hover:text-white">For coaches</a>
            <a href="/privacy" className="hover:text-white">Privacy</a>
            <a href="/terms" className="hover:text-white">Terms</a>
            <a href="mailto:info@recruitwrestlers.com" className="hover:text-white">info@recruitwrestlers.com</a>
          </nav>
        </div>
        <p className="pb-8 text-center text-xs text-white/35">© {new Date().getFullYear()} {NATIONAL_BRAND.name} · A Guild Ventures company</p>
      </footer>
    </div>
  )
}
