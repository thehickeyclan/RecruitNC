"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  SCOUTING_REPORT_PRICES,
  annualSavingCents,
  formatPrice,
} from "@/lib/scouting-report-entitlement"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Award, Check, ExternalLink, Instagram, Mail, Medal, Target, TrendingUp, Trophy, UserRound, Users } from "lucide-react"
import { tocDisplayClass } from "@/components/toc/toc-theme"
import { MapDots } from "@/components/portal/map-dots"
import type { MapPreview } from "@/lib/college-programs/map-preview"
import { RankingsTableView } from "@/components/rankings-table-view"
import { useAuth } from "@/contexts/auth-context"
import { RankingsCardView } from "@/components/rankings-card-view"
import { PUBLISHED_PUBLIC_RANKINGS_YEARS, WOMENS_PUBLIC_RELEASED_YEARS } from "@/lib/public-rankings-cap"
import type { PlatformStats } from "@/lib/platform-stats"

interface Athlete {
  id: string
  name: string
  highschool: string
  weight_display: string
  nhsca_record_display: string | null
  nhsca_results?: any[]
  super_32_record_display: string | null
  super_32_results?: any[]
  state_championship_summary: string
  state_results?: any[]
  has_ranked_win: boolean
  academic_gpa: number | null
  prospect_ranking: number
  photourl?: string
  nationally_ranked_wins?: string | number
}

/** The published class boards, read from the release list so the copy moves when a class is released. */
const CLASS_RANGE =
  PUBLISHED_PUBLIC_RANKINGS_YEARS.length > 1
    ? `${PUBLISHED_PUBLIC_RANKINGS_YEARS[0]}–${PUBLISHED_PUBLIC_RANKINGS_YEARS[PUBLISHED_PUBLIC_RANKINGS_YEARS.length - 1]}`
    : String(PUBLISHED_PUBLIC_RANKINGS_YEARS[0] ?? "")

const yearRange = (years: readonly number[]) =>
  years.length > 1 ? `${years[0]}–${years[years.length - 1]}` : String(years[0] ?? "")
/** The women's boards released so far, from the same release list the pages read. */
const WOMENS_RANGE = yearRange([...WOMENS_PUBLIC_RELEASED_YEARS].sort((a, b) => a - b))

type RankingsSubscription = {
  status: string
  nextBillingAt: string | null
  cancelAtPeriodEnd: boolean
  interval: "month" | "year" | null
  canManage: boolean
}

export function RankingsSalesClient({
  collegeViews = null,
  topClasses = [],
  platform = null,
  alwaysShowPlans = false,
  commandCenterOnSale = false,
  mapPreview = null,
}: {
  /** The real college map, drawn on the Command Center card. */
  mapPreview?: MapPreview | null
  /** False until the database can record a Command Center subscription; the card says "coming soon". */
  commandCenterOnSale?: boolean
  /** /plans: show the plans even to someone who already has the rankings (to upgrade). */
  alwaysShowPlans?: boolean
  /** Coaches, programs and all-time coach profile views, counted (lib/platform-stats.ts). */
  platform?: PlatformStats | null
  /** NC wrestler profiles college coaches viewed in the last 30 days, and by how many coaches. */
  collegeViews?: { profilesViewed: number; coaches: number } | null
  /** The classes on the published Top 75 College Ready Prospects board. */
  topClasses?: number[]
} = {}) {
  const topFrom = topClasses.length
    ? `the Class${topClasses.length > 1 ? "es" : ""} of ${topClasses.length > 1 ? `${topClasses.slice(0, -1).join(", ")} and ${topClasses[topClasses.length - 1]}` : topClasses[0]}`
    : null
  const [viewMode, setViewMode] = useState<"table" | "cards">("table")
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loadingAthletes, setLoadingAthletes] = useState(true)
  /*
   * Locked is a state, not an error.
   *
   * The fetch swallowed everything that was not a 200, so once the API started charging for
   * this board a visitor without a membership got the page furniture and an empty table —
   * looking like a ranking we had failed to load rather than one they could buy.
   */
  const [locked, setLocked] = useState<"anonymous" | "unentitled" | null>(null)
  const { user, signOut } = useAuth()
  /*
   * Signed in without access. The sign-in links below only loop such a person - the sign-in page
   * sees they are already signed in and returns them here - which is how families ended up
   * bouncing between this page and /auth/signin. They get their account and the real way forward.
   */
  const signedInWithoutAccess = locked === "unentitled"
  const switchAccount = async () => {
    try {
      await signOut()
    } finally {
      window.location.href = "/auth/signin?returnTo=%2Fpublic-rankings"
    }
  }
  const [checkingOut, setCheckingOut] = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [requestedPlan, setRequestedPlan] = useState<"subscription" | "subscription_annual" | "command_center" | null>(null)
  const [checkoutReturned, setCheckoutReturned] = useState<"purchased" | "canceled" | null>(null)
  const [subscription, setSubscription] = useState<RankingsSubscription | null>(null)
  const [managingSubscription, setManagingSubscription] = useState(false)
  const autoCheckoutStarted = useRef(false)

  /*
   * Where checkout comes back to. A family paying from the college-views panel came to see which
   * programs viewed their wrestler, so they go back to that profile (?return=/view-profile?id=...),
   * not to the rankings. Anything that is not a plain relative path falls back to the rankings.
   */
  const checkoutReturnTo = () => {
    if (typeof window === "undefined") return "/public-rankings"
    const ret = new URLSearchParams(window.location.search).get("return") ?? ""
    return ret.startsWith("/") && !ret.startsWith("//") ? ret : "/public-rankings"
  }

  const startCheckout = async (kind: "subscription" | "subscription_annual" | "command_center") => {
    // Stripe needs an account to attach the subscription to, so signing in comes first —
    // but only once they have chosen, and the plan rides along so the choice is not lost.
    if (locked === "anonymous") {
      window.location.href = `/auth/signin?returnTo=${encodeURIComponent(`${kind === "command_center" ? "/plans" : "/rankings"}?plan=${kind}`)}`
      return
    }
    setCheckingOut(kind)
    setCheckoutError(null)
    try {
      const response = await fetch("/api/scouting-report/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Straight to the boards. Landing back on the sales page after paying reads as a
        // failed purchase, and the index is what they just bought.
        body: JSON.stringify({ kind, returnTo: checkoutReturnTo() }),
      })
      const payload = await response.json()

      /*
       * Already included, so take them to it rather than charging them for it.
       *
       * The server refuses this with a 409 - a Blue family or verified coach must never be
       * billed $9.99 for what their membership already covers. Showing that refusal as a red
       * error reads as a failed purchase, when the true answer is better news than the one
       * they came for: you have this already, here it is.
       */
      if (response.status === 409 && payload?.reason === "already_entitled_portal") {
        window.location.href = "/my-recruiting"
        return
      }
      if (response.status === 409 && payload?.reason === "already_entitled") {
        window.location.href = "/public-rankings?included=1"
        return
      }

      if (!response.ok || !payload?.url) throw new Error(payload?.error || "Could not start checkout")
      window.location.href = payload.url
    } catch (caught) {
      setCheckoutError(caught instanceof Error ? caught.message : "Could not start checkout")
      setCheckingOut(null)
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const plan = params.get("plan")
    if (plan === "subscription" || plan === "subscription_annual" || plan === "command_center") setRequestedPlan(plan)
    if (params.get("purchased") === "1") setCheckoutReturned("purchased")
    if (params.get("canceled") === "1") setCheckoutReturned("canceled")

    const fetchAthletes = async () => {
      try {
        const activating = params.get("purchased") === "1"
        const attempts = activating ? 12 : 1
        for (let attempt = 0; attempt < attempts; attempt += 1) {
          const response = await fetch("/api/public-rankings?year=2027&gender=Male", { cache: "no-store" })
          if (response.status === 403 && activating && attempt < attempts - 1) {
            await new Promise((resolve) => window.setTimeout(resolve, 1000))
            continue
          }
          if (response.status === 401) {
            setLocked("anonymous")
          } else if (response.status === 403) {
            setLocked("unentitled")
          } else if (response.ok) {
            const data = await response.json()
            setAthletes(data.rankings || [])
            setLocked(null)
          }
          break
        }
      } catch (error) {
        console.error("Error fetching athletes:", error)
      } finally {
        setLoadingAthletes(false)
      }
    }

    fetchAthletes()
  }, [])

  useEffect(() => {
    // Signed in and choosing a plan: start checkout. A Rankings subscriber upgrading has no lock.
    const signedIn = locked === "unentitled" || (locked === null && !loadingAthletes)
    if (!signedIn || !requestedPlan || autoCheckoutStarted.current) return
    autoCheckoutStarted.current = true
    void startCheckout(requestedPlan)
  }, [locked, requestedPlan, loadingAthletes])

  useEffect(() => {
    if (loadingAthletes || locked) return
    void fetch("/api/scouting-report/subscription", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => setSubscription(payload?.subscription ?? null))
      .catch(() => setSubscription(null))
  }, [loadingAthletes, locked])

  const openSubscriptionPortal = async () => {
    setManagingSubscription(true)
    setCheckoutError(null)
    try {
      const response = await fetch("/api/scouting-report/subscription", { method: "POST" })
      const payload = await response.json()
      if (!response.ok || !payload?.url) throw new Error(payload?.error || "Could not open subscription management")
      window.location.href = payload.url
    } catch (caught) {
      setCheckoutError(caught instanceof Error ? caught.message : "Could not open subscription management")
      setManagingSubscription(false)
    }
  }

  /*
   * Entitled viewers belong on /public-rankings, which lists every board.
   *
   * This page used to render a single Class of 2027 table for anyone with access - it only
   * ever fetched year=2027 - so /rankings and /public-rankings showed different things and
   * people following two links from the same announcement saw two different products. The
   * server redirects first; this covers the case where access activates while the page is
   * open, just after a purchase.
   */
  useEffect(() => {
    if (!alwaysShowPlans && !requestedPlan && !loadingAthletes && locked === null) window.location.replace("/public-rankings")
  }, [loadingAthletes, locked, alwaysShowPlans, requestedPlan])

  if (!alwaysShowPlans && !loadingAthletes && locked === null) return null

  if (!loadingAthletes && (locked || alwaysShowPlans)) {
    /*
     * The subscriptions page (rebuilt 15 Oct 2026: "it's horrible").
     *
     * It sells the one thing no recruiting service has - college coaches on the platform, counted -
     * then three plans side by side: Free (claim the profile), Rankings ($9.99) and Blue (everything,
     * including the Recruiting Command Center). Cards, big numbers, short lines; the method and the
     * fine print sit behind a tap. Every number is live; a tile with nothing to show is left out.
     */
    const gold = "#D3B574"
    const stats = platform
      ? ([
          [platform.coaches, "College coaches on RecruitNC"],
          [platform.programs, "College programs"],
          [platform.profilesViewed, "NC wrestlers viewed by coaches"],
          [platform.coachViews, "Profile views by coaches"],
        ] as Array<[number, string]>).filter(([n]) => Number(n) > 0)
      : []
    /** Free, Rankings, Command Center, Blue (Matt, 15 Oct 2026). */
    const PLAN_ROWS: Array<[string, boolean, boolean, boolean, boolean]> = [
      ["Your profile, with every result already on it", true, true, true, true],
      ["Messages from verified college coaches, with parents seeing every one", true, true, true, true],
      ["Academics and contact info, seen only by verified college coaches", true, true, true, true],
      ["How many college coaches viewed your profile", true, true, true, true],
      ["Which college programs viewed your profile", false, true, true, true],
      [`Class rankings${WOMENS_RANGE ? ", men's and women's" : ""} and the Top 75`, false, true, true, true],
      ["Head-to-head: who beat whom, and when", false, true, true, true],
      ["Recruiting plan, college list, compare and full costs", false, false, true, true],
      ["Every coach conversation tied to its college and your list", false, false, true, true],
      ["Your recruiting assistant: next steps for every stage, 8th grade to signing", false, false, true, true],
      ["Learn: rules, timeline and costs, men's and women's", false, false, true, true],
      ["Practices run by college coaches, with the state's best partners", false, false, false, true],
      ["The NC United national team pathway", false, false, false, true],
      ["A drop-in each month at Darkhorse or RAW", false, false, false, true],
    ]
    const FAQ: Array<[string, string]> = [
      ["Can I cancel?", "Yes, anytime, from your account. The yearly plan runs to the end of the year you paid for."],
      ["Who sees my wrestler's contact information?", "Only college coaches we have verified. Never the public, and never other families."],
      ["What's the difference between the plans?", "Rankings is the boards and who is viewing your profile. The Recruiting Command Center is your recruiting assistant from 8th grade through signing: your plan, college list, full costs and every coach conversation in one place. Blue is NC United's program: everything in the Recruiting Command Center plus practices run by college coaches, the state's best training partners, the national team pathway and a monthly drop-in at Darkhorse or RAW."],
      ["Can I share the rankings?", "Share your own wrestler's ranking anywhere. Please don't repost the full boards or screenshots of them; that is what keeps them going."],
    ]
    const check = (on: boolean) =>
      on ? <Check className="mx-auto h-5 w-5" style={{ color: gold }} aria-label="Included" /> : <span className="text-white/25" aria-label="Not included">—</span>

    return (
      <div className="min-h-screen bg-[#060f1f] text-white">
        {/* Hero: two-tone display headline, the three promises, and a wrestler */}
        <section className="relative overflow-hidden border-b border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hero-banner-nchsaa-2026-arena.png" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-20" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/toc-finals-north-carolina-bw.jpg" alt="" aria-hidden className="absolute inset-y-0 right-0 hidden h-full w-[50%] object-cover object-[55%_30%] opacity-90 lg:block" style={{ maskImage: "linear-gradient(to right, transparent, black 35%)", WebkitMaskImage: "linear-gradient(to right, transparent, black 35%)" }} />
          <div className="absolute inset-0 bg-gradient-to-r from-[#060f1f] via-[#060f1f]/90 to-[#060f1f]/10" aria-hidden />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#060f1f] to-transparent" aria-hidden />
          <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-12 sm:pt-16">
            <p className="text-[11px] font-bold uppercase leading-5 tracking-[0.3em] text-white/70">
              Wrestling · People · Opportunity
            </p>
            <h1 className={`mt-5 text-6xl leading-[0.9] sm:text-8xl ${tocDisplayClass()}`}>
              More than a ranking.
              <span className="block" style={{ color: gold }}>
                A higher future.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-white/75 sm:text-lg">
              {collegeViews && collegeViews.profilesViewed > 0
                ? `College coaches viewed ${collegeViews.profilesViewed.toLocaleString()} NC wrestlers in the last 30 days. Tools, guidance and real exposure to get yours recruited.`
                : "Tools, guidance and real exposure to help North Carolina wrestlers get recruited."}
            </p>
            <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-xs font-bold uppercase tracking-widest text-white/85">
              {[
                { icon: TrendingUp, label: "Verified data" },
                { icon: Users, label: "College exposure" },
                { icon: Trophy, label: "Real opportunity" },
              ].map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2">
                  <Icon className="h-5 w-5" style={{ color: gold }} aria-hidden /> {label}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#plans" className="rounded-xl px-7 py-3.5 text-base font-black text-[#0A1628] shadow-lg transition hover:brightness-110" style={{ backgroundColor: gold }}>
                See plans
              </a>
              <Link href="/create-profile" className="rounded-xl border border-white/25 bg-[#060f1f]/40 px-7 py-3.5 text-base font-bold text-white backdrop-blur transition hover:bg-white/10">
                Claim your profile, free
              </Link>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-4 py-12">
          {checkoutReturned === "canceled" ? (
            <div className="mx-auto mb-8 max-w-2xl rounded-xl border border-white/15 bg-white/[0.04] p-4 text-center text-sm text-white/70">
              Checkout was canceled. You were not charged and can choose a plan whenever you are ready.
            </div>
          ) : null}
          {checkoutReturned === "purchased" ? (
            <div className="mx-auto mb-8 max-w-2xl rounded-xl border border-[#D3B574]/50 bg-[#D3B574]/10 p-4 text-center text-sm">
              Payment received. Access is activating; refresh in a moment, and if it stays locked, contact support.
            </div>
          ) : null}

          {/* Plans */}
          <section id="plans" className="scroll-mt-20">
            <div className="flex flex-wrap items-center gap-4">
              <h2 className={`text-4xl sm:text-5xl ${tocDisplayClass()}`}>NC United subscriptions</h2>
              <span className="hidden h-px flex-1 sm:block" style={{ backgroundColor: gold, opacity: 0.6 }} aria-hidden />
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-white/60">Same data. More opportunity.</span>
            </div>

            <div className="mt-8 grid gap-5 lg:grid-cols-3">
              {/* Rankings */}
              <div className="relative flex flex-col rounded-2xl border-2 bg-[#0b1a33] p-6" style={{ borderColor: gold }}>
                <div className="flex items-start justify-between">
                  <TrendingUp className="h-9 w-9" style={{ color: gold }} aria-hidden />
                  <span className="rounded-md px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-[#0A1628]" style={{ backgroundColor: gold }}>
                    Most popular
                  </span>
                </div>
                <p className="mt-4 text-3xl font-black">Rankings</p>
                <p className="mt-1 text-sm text-white/60">For families who want to know where their wrestler stands, and who&apos;s watching.</p>
                <p className="mt-5 text-5xl font-black">
                  {formatPrice(SCOUTING_REPORT_PRICES.subscription)}
                  <span className="text-lg font-semibold text-white/60"> / month</span>
                </p>
                <p className="mt-1 text-sm font-bold" style={{ color: gold }}>
                  or {formatPrice(SCOUTING_REPORT_PRICES.subscription_annual)}/year (save {formatPrice(annualSavingCents())})
                </p>
                <ul className="mt-5 space-y-2.5 text-sm text-white/85">
                  {[`All class rankings${WOMENS_RANGE ? ", men's and women's" : ""}`, "Top 75 College Ready Prospects board", "Head-to-head: who beat whom, and when", "Which college programs viewed your profile, and when", "Full profile management"].map((l) => (
                    <li key={l} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: gold }} aria-hidden /> {l}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={checkingOut !== null}
                  onClick={() => { void startCheckout("subscription") }}
                  className="mt-6 rounded-xl px-4 py-3 text-base font-black text-[#0A1628] transition hover:brightness-110 disabled:opacity-60"
                  style={{ backgroundColor: gold }}
                >
                  {checkingOut === "subscription" ? "Starting…" : "Get Rankings →"}
                </button>
                <button
                  type="button"
                  disabled={checkingOut !== null}
                  onClick={() => { void startCheckout("subscription_annual") }}
                  className="mt-2 text-sm font-semibold underline-offset-2 hover:underline disabled:opacity-60"
                  style={{ color: gold }}
                >
                  {checkingOut === "subscription_annual" ? "Starting…" : `Or pay yearly, ${formatPrice(SCOUTING_REPORT_PRICES.subscription_annual)}`}
                </button>
                {/* The board, blurred: what you buy, without giving it away or inventing anyone. */}
                <div className="relative mt-6 overflow-hidden rounded-xl border border-white/10 bg-[#060f1f]">
                  <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-[11px] font-bold">
                    <span className="italic" style={{ color: gold }}>RANKINGS</span>
                    <span className="text-white/50">Class of {PUBLISHED_PUBLIC_RANKINGS_YEARS[0] ?? ""}</span>
                  </div>
                  <ul className="space-y-0 px-3 py-1 blur-[3px]" aria-hidden>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <li key={n} className="flex items-center gap-2 border-b border-white/5 py-2 text-[11px] last:border-0">
                        <span className="w-3 text-white/50">{n}</span>
                        <span className="h-5 w-5 rounded-full bg-white/20" />
                        <span className="h-2 flex-1 rounded bg-white/25" />
                        <span className="h-2 w-12 rounded bg-white/15" />
                        <span className="h-2 w-8 rounded bg-white/15" />
                      </li>
                    ))}
                  </ul>
                  <p className="absolute inset-x-0 bottom-2 text-center text-xs font-bold text-white">See how you compare</p>
                </div>
              </div>

              {/* Command Center */}
              <div className="relative flex flex-col rounded-2xl border-2 border-sky-400/70 bg-[#0b1a33] p-6">
                <Target className="h-9 w-9 text-sky-400" aria-hidden />
                <p className="mt-4 text-3xl font-black leading-tight">Recruiting Command Center</p>
                <p className="mt-1 text-sm text-white/60">Your recruiting assistant, from 8th grade through signing day.</p>
                <p className="mt-5 text-5xl font-black">
                  {formatPrice(SCOUTING_REPORT_PRICES.command_center)}
                  <span className="text-lg font-semibold text-white/60"> / month</span>
                </p>
                <p className="mt-4 text-xs font-black uppercase tracking-widest text-sky-300">Everything in Rankings, plus:</p>
                <ul className="mt-3 space-y-2.5 text-sm text-white/85">
                  {["Next steps for every stage, 8th grade to signing", "My College List: your stage, next step and verified coach activity", "Compare fit, with full yearly cost", "College pages: cost, ranking, roster, coaches", "Coach conversations tied to each college", "Learn: rules, timeline and costs, men's and women's"].map((l) => (
                    <li key={l} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: gold }} aria-hidden /> {l}</li>
                  ))}
                </ul>
                {commandCenterOnSale ? (
                  <>
                    <button
                      type="button"
                      disabled={checkingOut !== null}
                      onClick={() => { void startCheckout("command_center") }}
                      className="mt-6 rounded-xl bg-sky-400 px-4 py-3 text-base font-black text-[#0A1628] transition hover:brightness-110 disabled:opacity-60"
                    >
                      {checkingOut === "command_center" ? "Starting…" : "Get the Recruiting Command Center →"}
                    </button>
                    <p className="mt-2 text-center text-xs text-white/45">On Rankings already? It replaces your $9.99 plan.</p>
                  </>
                ) : (
                  <p className="mt-6 rounded-xl border border-white/15 px-4 py-3 text-center text-sm font-semibold text-white/60">Coming soon · included in Blue today</p>
                )}
                {/* The real map: every college wrestling program, by level. */}
                {mapPreview ? (
                  <a href="/command-center" className="mt-6 block overflow-hidden rounded-xl border border-white/10 bg-[#060f1f] transition hover:border-sky-400/60">
                    <div className="flex items-center justify-between px-3 pt-2 text-[11px] font-bold">
                      <span>College program map</span>
                      <span className="text-white/50">{mapPreview.total} colleges</span>
                    </div>
                    <MapDots preview={mapPreview} className="mt-1" />
                  </a>
                ) : null}
                <a href="/command-center" className="mt-3 text-center text-sm font-semibold text-sky-300 hover:underline">
                  See everything it does →
                </a>
              </div>

              {/* Blue */}
              <div className="relative flex flex-col overflow-hidden rounded-2xl border-2 border-sky-300/50 bg-[#0b1a33]">
                <div className="flex flex-1 flex-col p-6">
                  <Users className="h-9 w-9 text-sky-300" aria-hidden />
                  <p className="mt-4 text-3xl font-black">NC United Blue</p>
                  <p className="mt-1 text-sm text-white/60">For NC families who want to train, compete and get recruited.</p>
                  <p className="mt-5 text-5xl font-black">
                    $55<span className="text-lg font-semibold text-white/60"> / month</span>
                  </p>
                  <p className="mt-4 text-xs font-black uppercase tracking-widest" style={{ color: gold }}>Everything in the Recruiting Command Center, plus:</p>
                  <ul className="mt-3 space-y-2.5 text-sm text-white/85">
                    {["Practices run by college coaches", "The state's best training partners", "The NC United national team pathway", "One drop-in each month at Darkhorse or RAW"].map((l) => (
                      <li key={l} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: gold }} aria-hidden /> {l}</li>
                    ))}
                  </ul>
                  <Link href="/blue" className="mt-6 block rounded-xl bg-sky-300 px-4 py-3 text-center text-base font-black text-[#0A1628] hover:brightness-110">
                    Join Blue →
                  </Link>
                  {signedInWithoutAccess ? null : (
                    <Link href="/auth/signin?returnTo=/rankings" className="mt-2 block text-center text-sm text-white/60 underline hover:text-white">
                      Blue family? Sign in
                    </Link>
                  )}
                </div>
                <div className="relative h-48 lg:h-56">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/toc-finals-attack.jpg" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover object-[35%_45%]" />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#0b1a33] via-[#0b1a33]/50 to-transparent" aria-hidden />
                  <p className={`absolute bottom-4 left-5 text-3xl leading-[0.95] ${tocDisplayClass()}`}>
                    Train.<br />Compete.<br />Get recruited.
                  </p>
                </div>
              </div>
            </div>
            {checkoutError ? <p className="mt-4 text-center text-sm text-red-300">{checkoutError}</p> : null}
          </section>

          {/* Free profile, full width */}
          <section className="mt-6 grid items-center gap-6 rounded-2xl border border-white/15 bg-[#0b1a33] p-6 md:grid-cols-[auto_1fr_auto_auto]">
            <UserRound className="h-14 w-14 text-sky-400" aria-hidden />
            <div>
              <p className="text-2xl font-black">Free profile</p>
              <p className="text-sm text-white/60">Everyone starts here.</p>
              <ul className="mt-2 space-y-1 text-sm text-white/80">
                {["Claim the profile; every result is already on it", "Academics and contact, seen only by verified college coaches", "See how many college coaches viewed it"].map((l) => (
                  <li key={l} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: gold }} aria-hidden /> {l}</li>
                ))}
              </ul>
            </div>
            <p className="text-5xl font-black md:border-l md:border-white/10 md:pl-6">$0</p>
            <Link href="/create-profile" className="rounded-xl bg-white px-6 py-3 text-center text-base font-black text-[#0A1628] hover:bg-white/90">
              Claim your profile →
            </Link>
          </section>

          {/* Counted, not claimed */}
          {stats.length ? (
            <div className="mt-10 grid grid-cols-2 border-y border-white/10 py-6 lg:grid-cols-4">
              {stats.map(([n, label], i) => (
                <div key={label} className={`px-4 text-center ${i > 0 ? "lg:border-l lg:border-white/10" : ""}`}>
                  <p className={`text-5xl ${tocDisplayClass()}`} style={{ color: gold }}>{Number(n).toLocaleString()}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-white/60">{label}</p>
                </div>
              ))}
            </div>
          ) : null}

          {/* Compare plans */}
          <section className="pt-16">
            <h2 className="text-center text-2xl font-black tracking-tight">Compare plans</h2>
            <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-[#0d1d36]/80">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs font-bold uppercase tracking-wider text-white/55">
                    <th className="p-4 text-left font-bold" />
                    <th className="p-4 text-center">Free</th>
                    <th className="p-4 text-center" style={{ color: gold }}>Rankings</th>
                    <th className="p-4 text-center text-sky-400">Recruiting Command Center</th>
                    <th className="p-4 text-center text-sky-300">Blue</th>
                  </tr>
                </thead>
                <tbody>
                  {PLAN_ROWS.map(([label, free, rank, cc, blue]) => (
                    <tr key={label} className="border-t border-white/5">
                      <td className="p-4 text-white/80">{label}</td>
                      <td className="p-4 text-center">{check(free)}</td>
                      <td className="p-4 text-center">{check(rank)}</td>
                      <td className="p-4 text-center">{check(cc)}</td>
                      <td className="p-4 text-center">{check(blue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* How we rank, behind a tap */}
          <section className="grid gap-4 pt-16 md:grid-cols-2">
            {[
              { title: "Men's rankings", lines: ["National results, individual and duals", "Every major tournament, in state and out", "Strength of competition and quality wins", "Head-to-head between ranked wrestlers", "Every match on record, not only podiums", "How consistently a wrestler seeks out the best"] },
              { title: "Women's rankings", lines: ["Built on freestyle, the style women wrestle in college", "Fargo, Women's Nationals, U.S. Open, Journeymen and national duals first", "Wins over nationally ranked opponents count most", "Freestyle head-to-head between NC girls", "Folkstyle state results as supporting evidence", "The last 12 months, not a career"] },
            ].map((g) => (
              <details key={g.title} className="group rounded-2xl border border-white/10 bg-[#0d1d36]/80 p-6">
                <summary className="flex cursor-pointer list-none items-center justify-between [&::-webkit-details-marker]:hidden">
                  <span>
                    <span className="block text-xs font-bold uppercase tracking-widest" style={{ color: gold }}>How we rank</span>
                    <span className="mt-1 block text-lg font-bold">{g.title}</span>
                  </span>
                  <span className="text-white/40 transition group-open:rotate-45">+</span>
                </summary>
                <ul className="mt-4 space-y-2 text-sm text-white/70">
                  {g.lines.map((l) => (
                    <li key={l} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: gold }} aria-hidden /> {l}</li>
                  ))}
                </ul>
                <p className="mt-4 text-xs text-white/45">Every place is reasoned from results on the mat, not reputation and not a poll.</p>
              </details>
            ))}
          </section>

          {/* FAQ */}
          <section className="mx-auto max-w-3xl pt-16">
            <h2 className="text-center text-2xl font-black tracking-tight">Questions</h2>
            <div className="mt-6 divide-y divide-white/10 rounded-2xl border border-white/10 bg-[#0d1d36]/80">
              {FAQ.map(([q, a]) => (
                <details key={q} className="group p-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
                    {q}
                    <span className="text-white/40 transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-2 text-sm leading-6 text-white/65">{a}</p>
                </details>
              ))}
            </div>
          </section>

          {signedInWithoutAccess ? (
            <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-white/10 bg-[#0d1d36]/80 px-5 py-5 text-center text-sm text-white/65">
              <p>
                You&apos;re signed in{user?.email ? <> as <strong className="text-white">{user.email}</strong></> : null}.
              </p>
              <p className="mt-2">
                Blue family and still seeing this? This account isn&apos;t linked to your wrestler yet. Open your
                wrestler&apos;s profile and tap{" "}
                <strong className="text-white">&ldquo;I&apos;m [their name]&apos;s parent&rdquo;</strong> to link it, or{" "}
                <a href="mailto:info@ncwrestlingunited.com?subject=Rankings%20access" className="underline" style={{ color: gold }}>
                  email us
                </a>{" "}
                and we&apos;ll link it for you.
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-4">
                <Link href="/prospects/all" className="underline" style={{ color: gold }}>Find your wrestler</Link>
                <button type="button" onClick={() => void switchAccount()} className="underline" style={{ color: gold }}>
                  Use a different account
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-10 text-center text-sm text-white/55">
              Already a Blue family or subscriber?{" "}
              <Link href="/auth/signin?returnTo=/rankings" className="underline" style={{ color: gold }}>Sign in</Link>
            </p>
          )}
        </div>
      </div>
    )
  }

  if (loadingAthletes) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-border border-t-blue-600"></div>
          {checkoutReturned === "purchased" && (
            <p className="mt-4 text-sm text-muted-foreground">Activating your rankings subscription…</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen profile-surface bg-background">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            {/*
              * No medallion.
              *
              * A pulsing trophy graphic above the headline is clip-art, and it was the first
              * thing a college coach saw on a page selling a data product. The eyebrow does the
              * same orienting job in a line of text and takes none of the screen.
              */}
            <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-primary">
              RecruitNC Rankings
            </p>
            {/*
              * Lighter on navy.
              *
              * Heavy weights that read as confident on white go muddy on a dark ground - the
              * strokes bloom and the counters close up. Light at display size with wider
              * tracking holds its shape, and the gold subhead carries the emphasis instead.
              */}
            <h1 className="mb-3 text-balance text-5xl font-bold tracking-tight text-foreground">
              North Carolina College Prospect Rankings
            </h1>
            <p className="mb-6 text-xl font-normal text-primary">Class of 2027 · published rankings</p>

            <div className="flex flex-wrap justify-center gap-4 mb-6 text-lg font-normal">
              <Badge variant="secondary" className="text-lg px-4 py-2 bg-secondary text-foreground">
                <Trophy className="h-4 w-4 mr-2" />
                10 State Champions
              </Badge>
              <Badge variant="secondary" className="text-lg px-4 py-2 bg-secondary text-foreground">
                <Medal className="h-4 w-4 mr-2" />
                34 State Placements
              </Badge>
              <Badge variant="secondary" className="text-lg px-4 py-2 bg-secondary text-primary">
                <Award className="h-4 w-4 mr-2" />7 NHSCA All-Americans
              </Badge>
            </div>
            {checkoutReturned === "purchased" && (
              <p className="mx-auto mb-5 max-w-xl rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-foreground">
                Your subscription is active. Welcome to RecruitNC Rankings.
              </p>
            )}
            {subscription && (
              <div className="mx-auto mb-6 max-w-xl rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
                  <span>
                    Rankings subscription: <strong className="text-foreground">{subscription.status}</strong>
                    {subscription.interval ? ` · billed ${subscription.interval === "year" ? "annually" : "monthly"}` : ""}
                    {subscription.nextBillingAt
                      ? ` · ${subscription.cancelAtPeriodEnd ? "access through" : "next bill"} ${new Date(subscription.nextBillingAt).toLocaleDateString()}`
                      : ""}
                  </span>
                  {subscription.canManage && (
                    <Button type="button" variant="outline" size="sm" disabled={managingSubscription} onClick={() => { void openSubscriptionPortal() }}>
                      {managingSubscription ? "Opening…" : "Manage subscription"}
                    </Button>
                  )}
                </div>
              </div>
            )}
            {checkoutError && !locked && (
              <p className="mx-auto mb-5 max-w-xl text-sm text-destructive">{checkoutError}</p>
            )}
          </div>

          <Card className="mb-12 overflow-hidden">
            <CardHeader className="border-b border-border bg-secondary text-foreground">
              <CardTitle className="text-2xl">Class of 2027 Overview</CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="prose prose-lg max-w-none">
                <p className="text-xl text-muted-foreground mb-6 leading-relaxed">
                  The North Carolina Class of 2027 has quickly established itself as one of the most accomplished
                  groups in state history. With 10 state championships, 34 total state placements, and 7 NHSCA
                  All-American honors, this class is already setting a new standard for success. Their performance at
                  the 2025 NHSCA Nationals, where they produced six All-Americans (tied for the second-highest total in
                  state history), confirmed their place among the nation's elite.
                </p>

                <div className="grid md:grid-cols-3 gap-6 my-8">
                  <Card className="bg-secondary border-blue-200">
                    <CardContent className="p-6 text-center">
                      <div className="text-3xl font-light text-primary mb-2">10</div>
                      <div className="text-sm font-medium text-foreground">State Champions</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-secondary border-red-200">
                    <CardContent className="p-6 text-center">
                      <div className="text-3xl font-light text-red-600 mb-2">7</div>
                      <div className="text-sm font-medium text-foreground">NHSCA All-Americans</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-secondary border-yellow-200">
                    <CardContent className="p-6 text-center">
                      <div className="text-3xl font-light text-yellow-600 mb-2">22/30</div>
                      <div className="text-sm font-medium text-primary">Top 30 are NC United Blue</div>
                    </CardContent>
                  </Card>
                </div>

                <h3 className="text-2xl font-light text-foreground mb-4 flex items-center gap-2">
                  <Users className="h-6 w-6 text-primary" />
                  NC United Pipeline
                </h3>
                <p className="mb-4">The Class of 2027 is deeply tied to the NC United Blue program:</p>
                <ul className="list-disc list-inside mb-6 space-y-2 text-muted-foreground">
                  <li>All of the Top 10 ranked wrestlers are members of NC United Blue.</li>
                  <li>22 of the Top 30 actively train and compete as part of Blue.</li>
                  <li>9 of the Top 30 have already represented North Carolina on the NC United National Team.</li>
                </ul>
                <p className="mb-6">
                  This integration has fueled both individual and team success, giving athletes opportunities to sharpen
                  their skills against the nation's best.
                </p>

                <h3 className="text-2xl font-light text-foreground mb-4 flex items-center gap-2">
                  <Trophy className="h-6 w-6 text-red-600" />
                  Making History Together
                </h3>
                <p className="mb-4">
                  Tye Johnson, Mac Johnson, Jekai Sedgwick, and Aiden White competed on the 2025 NC United NHSCA Duals
                  Team, which advanced further than any all-North Carolina squad in history. Johnson added to his resume
                  with a ranked win at NHSCA Duals, underscoring his place as one of the state's premier lightweights.
                </p>
                <p className="mb-6">
                  Tobin McNair, Mac Johnson, Holt Quincy, and Jack Harty were part of the inaugural NC United National
                  Team at Ultimate Club Duals (2024, State College PA), reaching the Gold Pool finalist round. In 2025,
                  Jaxon Thomas, Jekai Sedgwick, Mac Johnson, Tobin McNair, Aiden White, Jack Harty, and Gavin Lopez all
                  competed on the NC United team at Ultimate Club Duals, cementing North Carolina's national presence.
                </p>

                <h3 className="text-2xl font-light text-foreground mb-4 flex items-center gap-2">
                  <Target className="h-6 w-6 text-green-600" />
                  Highly Recruited Nationwide
                </h3>
                <p className="mb-4">
                  When the NCAA contact period opened, this group's phones lit up. College coaches from across the
                  country and all divisions immediately reached out — from local programs like UNC, NC State,
                  Gardner-Webb, Appalachian State, UMO, Greensboro, and Pembroke to national powers including Stanford,
                  Virginia, Brown, Northwestern, and Bucknell.
                </p>
                <p className="mb-6">
                  Through NC United, the Class of 2027 has gained exposure to the nation's top-ranked athletes and
                  consistent access to elite training opportunities, positioning them for maximum visibility with
                  college programs. By competing at national-level events and sharpening their skills in
                  high-performance environments, these athletes are building the résumés and relationships that
                  translate directly into college recruiting success.
                </p>

                <h3 className="text-2xl font-light text-foreground mb-4 flex items-center gap-2">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                  The Road Ahead
                </h3>
                <p className="mb-6">
                  With Blue program training, national team competition, and unprecedented college recruiting attention,
                  the Class of 2027 is on pace to become one of the most impactful groups in North Carolina wrestling
                  history. Their mix of state dominance, national success, and program-driven development marks them as
                  the future of the sport in our state.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-12 border-border border-l-4 border-l-primary bg-card">
            <CardContent className="p-8">
              <blockquote className="text-2xl font-medium text-foreground italic text-center mb-4">
                "Exposure to the nation's top-ranked athletes and elite training opportunities is fueling unprecedented
                college recruiting interest in North Carolina's Class of 2027."
              </blockquote>
              <div className="text-center">
                <p className="text-lg font-semibold text-primary">Mike Macchiavello</p>
                <p className="text-muted-foreground">Co-Founder, NC United</p>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardContent className="p-8">
              <h2 className="text-3xl font-light text-foreground mb-4 text-center">Class of 2027 Rankings</h2>
              <p className="text-lg text-muted-foreground text-center max-w-4xl mx-auto leading-relaxed">
                Below is the published top 30 for North Carolina's Class of 2027. This class has already
                combined for 10 state titles, 34 total state placements, and 7 NHSCA All-American finishes — making it
                one of the most accomplished groups in state history. These rankings reflect state and national
                performance, quality of wins, and exposure against elite competition.
              </p>
            </CardContent>
          </Card>

          <div className="flex justify-center mb-6">
            <div className="bg-card rounded-lg p-1 shadow-sm border">
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="mr-1"
              >
                Table View
              </Button>
              <Button
                variant={viewMode === "cards" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("cards")}
              >
                Card View
              </Button>
            </div>
          </div>

          <div className="mb-12">
            {viewMode === "table" ? (
              <RankingsTableView athletes={athletes} loading={loadingAthletes} />
            ) : (
              <RankingsCardView athletes={athletes} loading={loadingAthletes} />
            )}
          </div>

          <Card className="mb-12">
            <CardHeader className="border-b border-border bg-secondary text-foreground">
              <CardTitle className="text-2xl">Academic & Recruiting Profiles</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-card border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        High School
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        GPA
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Weight
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Contact
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {loadingAthletes ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <div className="flex justify-center">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-blue-600"></div>
                          </div>
                        </td>
                      </tr>
                    ) : athletes.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                          No athletes found
                        </td>
                      </tr>
                    ) : (
                      athletes.map((athlete) => (
                        <tr key={athlete.id} className="hover:bg-card">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Badge variant="secondary" className="bg-secondary text-foreground">
                                #{athlete.prospect_ranking}
                              </Badge>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-foreground">
                              {athlete.id ? (
                                <a
                                  href={`/view-profile?id=${encodeURIComponent(athlete.id)}`}
                                  className="text-primary hover:text-foreground hover:underline"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    window.location.href = `/view-profile?id=${encodeURIComponent(athlete.id)}`
                                  }}
                                >
                                  {athlete.name}
                                </a>
                              ) : (
                                athlete.name
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-muted-foreground">{athlete.highschool}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-foreground">
                              {athlete.academic_gpa ? athlete.academic_gpa.toFixed(2) : "N/A"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-muted-foreground">{athlete.weight_display}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Button variant="outline" size="sm">
                              <Mail className="h-4 w-4 mr-2" />
                              Contact
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-border bg-card text-foreground">
              <CardContent className="p-8 text-center">
                <Instagram className="h-12 w-12 mx-auto mb-4 opacity-90" />
                <h3 className="text-2xl font-light mb-4">Follow Our Journey</h3>
                <p className="mb-6 opacity-90">
                  Stay updated with the latest rankings, tournament results, and recruiting news.
                </p>
                <Button variant="secondary" size="lg" className="bg-card text-primary hover:bg-secondary" asChild>
                  <a href="https://www.instagram.com/ncwrestlingunited/" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Follow NC United on Instagram
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border bg-card text-foreground">
              <CardContent className="p-8 text-center">
                <Trophy className="h-12 w-12 mx-auto mb-4 opacity-90" />
                <h3 className="text-2xl font-light mb-4">Join NC United Blue</h3>
                <p className="mb-6 opacity-90">Train with the best and develop your skills in our elite program.</p>
                <Button variant="secondary" size="lg" className="bg-card text-red-600 hover:bg-secondary">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Learn About NC United Blue
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  )
}
