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
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Trophy,
  Medal,
  TrendingUp,
  Users,
  Target,
  Award,
  ExternalLink,
  Instagram,
  GraduationCap,
  Phone,
  Mail,
  Bell,
  Lock,
  BarChart,
} from "lucide-react"
import { RankingsTableView } from "@/components/rankings-table-view"
import { RankingsCardView } from "@/components/rankings-card-view"

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

type RankingsSubscription = {
  status: string
  nextBillingAt: string | null
  cancelAtPeriodEnd: boolean
  interval: "month" | "year" | null
  canManage: boolean
}

export default function ClassOf2027RankingsPage() {
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
  const [checkingOut, setCheckingOut] = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [requestedPlan, setRequestedPlan] = useState<"subscription" | "subscription_annual" | null>(null)
  const [checkoutReturned, setCheckoutReturned] = useState<"purchased" | "canceled" | null>(null)
  const [subscription, setSubscription] = useState<RankingsSubscription | null>(null)
  const [managingSubscription, setManagingSubscription] = useState(false)
  const autoCheckoutStarted = useRef(false)

  const startCheckout = async (kind: "subscription" | "subscription_annual") => {
    // Stripe needs an account to attach the subscription to, so signing in comes first —
    // but only once they have chosen, and the plan rides along so the choice is not lost.
    if (locked === "anonymous") {
      window.location.href = `/auth/signin?returnTo=${encodeURIComponent(`/rankings?plan=${kind}`)}`
      return
    }
    setCheckingOut(kind)
    setCheckoutError(null)
    try {
      const response = await fetch("/api/scouting-report/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, returnTo: "/rankings" }),
      })
      const payload = await response.json()
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
    if (plan === "subscription" || plan === "subscription_annual") setRequestedPlan(plan)
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
    if (locked !== "unentitled" || !requestedPlan || autoCheckoutStarted.current) return
    autoCheckoutStarted.current = true
    void startCheckout(requestedPlan)
  }, [locked, requestedPlan])

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

  if (!loadingAthletes && locked) {
    /*
     * A pricing page, not a leaflet.
     *
     * The first version explained the model in four paragraphs on a pale background and put
     * the price underneath as an afterthought. Nobody reads a page to be convinced a ranking
     * is rigorous; they look for what it costs, what they get, and whether they already have
     * it. So: dark, three plans on one row, the claims cut to a line each, and the product
     * shown rather than described.
     */
    const plans = [
      {
        kind: "subscription" as const,
        name: "Monthly",
        price: formatPrice(SCOUTING_REPORT_PRICES.subscription),
        cadence: "per month",
        note: "Cancel any time",
        featured: false,
      },
      {
        kind: "subscription_annual" as const,
        name: "Annual",
        price: formatPrice(SCOUTING_REPORT_PRICES.subscription_annual),
        cadence: "per year",
        note: `Save ${formatPrice(annualSavingCents())}`,
        featured: true,
      },
    ]

    return (
      <div className="profile-surface min-h-screen bg-background">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
          <div className="text-center">
            <Badge className="mb-4 bg-primary text-primary-foreground hover:bg-primary">
              NC United · RecruitNC
            </Badge>
            <h1 className="text-4xl font-light tracking-tight sm:text-5xl">
              North Carolina Prospect Rankings
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
              Built to help college programs evaluate North Carolina wrestlers and their readiness
              to compete at the next level.
            </p>
          </div>

          {checkoutReturned === "canceled" && (
            <div className="mx-auto mt-6 max-w-2xl rounded-xl border border-border bg-card p-4 text-center text-sm text-muted-foreground">
              Checkout was canceled. You were not charged and can choose a plan whenever you are ready.
            </div>
          )}
          {checkoutReturned === "purchased" && (
            <div className="mx-auto mt-6 max-w-2xl rounded-xl border border-primary/40 bg-primary/10 p-4 text-center text-sm text-foreground">
              Payment was received, but access is still activating. Refresh in a moment; if it remains locked, contact support.
            </div>
          )}

          {/* Four claims, one line each. The detail belongs in the product, not the pitch. */}
          <div className="mx-auto mt-10 grid max-w-3xl gap-x-8 gap-y-3 text-sm text-foreground sm:grid-cols-2">
            {[
              "National results, individual and dual competition",
              "Strength of competition, and quality wins",
              "Head-to-head results",
              "In-season performance",
              "How consistently a wrestler seeks out the best",
              "Top 70 college prospects across all three classes",
              "College commitment alerts, pushed to your phone",
            ].map((claim) => (
              <div key={claim} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{claim}</span>
              </div>
            ))}
          </div>

          <p className="mx-auto mt-8 max-w-2xl text-base text-foreground">
            Big wins matter. Strength of schedule matters. Competing against the best matters.
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
            Anyone can subscribe. You get every ranking, the Top 70 college prospects, and scouting reports — major
            tournament results, significant wins and strength of competition — updated as results
            and athlete-provided information come in, with every North Carolina college commitment
            pushed to your phone.
          </p>
          {/*
            * The one thing a subscription does not buy, said plainly and in its own panel.
            *
            * The line before this listed GPA and contact details next to what a subscriber gets
            * and qualified it at the end, which is the kind of sentence people read the first
            * half of. These are minors' personal details; scoutingAccessTier releases them only
            * to an admin or a human-verified college coach, so no amount of paying reaches them
            * and the page should not leave that in any doubt.
            */}
          <div className="mx-auto mt-6 max-w-2xl rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-semibold text-foreground">
              What a subscription never includes
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Athlete contact details, GPA, SAT and ACT scores, and academic information are shown
              only to college coaches we have verified by hand. They are not part of any
              subscription, at any price, and they are never sold.
            </p>
          </div>

          {/*
            * College coaches get their own band, above the prices.
            *
            * They are the audience the rankings exist to serve and the reason they are worth
            * buying to anybody else, and their ask is different: register and be verified, not
            * pay. Sitting as one card in a row of three prices, the free tier read as the
            * cheapest thing to buy rather than an invitation.
            */}
          <div className="mt-12 rounded-2xl border-2 border-primary bg-card p-6 text-left">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                  College coaches
                </p>
                <h2 className="mt-1 text-2xl font-light tracking-tight text-foreground">
                  Free, always. Register and we verify you.
                </h2>
                {/*
                  * Why it is a recruiting tool, not a list.
                  *
                  * A coach does not need another ranking; they need to know which wrestlers in
                  * a state they cannot visit every weekend are worth a phone call. That is what
                  * the ordering is built to answer, so the page should say so rather than leave
                  * them to infer it from a methodology list.
                  */}
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Built for recruiting, not for argument. The order is reasoned from how a
                  wrestler performs against real competition — nationally, at the TOC, and
                  head-to-head with the wrestlers around them — so it answers the question you
                  are actually asking: who in North Carolina is ready to wrestle for you, and who
                  is worth the call first.
                </p>
              </div>
              <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Link href="/auth/coach-signup">Register free</Link>
              </Button>
            </div>
            <div className="mt-5 grid gap-x-8 gap-y-2 text-sm text-muted-foreground sm:grid-cols-2">
              {[
                "Every class ranked, 2027 through 2029",
                "Top 70 college prospects — one list across every class",
                "Full scouting reports on every ranked wrestler",
                "Contact details, GPA, SAT and ACT — coaches only",
                "Academic interests and intended majors",
                "Updated as results and athlete information come in",
              ].map((line) => (
                <div key={line} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{line}</span>
                </div>
              ))}
            </div>
          </div>

          {/*
            * Three tiers, cheapest first, because the cheapest is free and that is the point.
            *
            * A college coach pays nothing on purpose: their reading is what makes the rankings
            * worth having to everyone else. Blue costs the most and includes the most, since it
            * is a wrestling programme with the platform attached rather than the other way
            * round. The subscription exists for the people who cannot join Blue and should not
            * have to - an out-of-state parent, a recruiting service, a coach's colleague.
            *
            * Blue's price comes from the billing constant, not a number typed here: it is
            * $55 for new signups and the $50 people remember is the legacy WrestlingIQ rate.
            */}
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Verified college coaches
              </p>
              <p className="mt-3 text-4xl font-semibold">Free</p>
              <p className="mt-1 text-sm text-muted-foreground">Always</p>
              <p className="mt-4 text-sm text-muted-foreground">
                A 360-degree view: everything above, plus athlete contact details, GPA, test
                scores, academic interests and intended majors. The only tier that reaches them.
              </p>
              <Button
                asChild
                variant="outline"
                className="mt-6 w-full border-border bg-transparent text-foreground hover:bg-accent"
              >
                <Link href="/auth/coach-signup">Verify your program</Link>
              </Button>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                NC United Blue
              </p>
              {/* No price: Blue is invitation only, and a figure here asks people to buy
                  something they cannot, which costs a reply rather than earns a signup. */}
              <p className="mt-3 text-4xl font-semibold">Included</p>
              <p className="mt-1 text-sm text-muted-foreground">By invitation</p>
              <p className="mt-4 text-sm text-foreground">
                Rankings come with membership, for the whole family.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Nothing further to buy — everything on this page is already yours.
              </p>
              {/*
                * The top of the Blue page, not the form at the bottom of it.
                *
                * Blue is invitation only and expressing interest does not equal acceptance, so
                * somebody arriving from a rankings paywall needs to read what the programme is
                * before deciding to ask. A deep link to the form would also be unreliable: that
                * page renders its content client-side, so the hash target does not exist when
                * the browser tries to scroll to it.
                */}
              <Button
                asChild
                variant="outline"
                className="mt-6 w-full border-border bg-transparent text-foreground hover:bg-accent"
              >
                <Link href="/blue">Interested in Blue?</Link>
              </Button>
            </div>

            <div className="relative rounded-2xl border-2 border-primary bg-card p-6 shadow-xl">
              <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-0.5 text-xs font-bold text-primary-foreground">
                Open to everyone
              </span>
              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Rankings
              </p>
              <p className="mt-3 text-4xl font-semibold">{formatPrice(SCOUTING_REPORT_PRICES.subscription)}</p>
              <p className="mt-1 text-sm text-muted-foreground">per month</p>
              <p className="mt-4 text-sm text-muted-foreground">
                All three classes and the Top 70 across them, updated as results come in. Scouting reports,
                commitment alerts, and who has viewed your profile.
              </p>
              <Button
                disabled={checkingOut !== null}
                onClick={() => { void startCheckout("subscription") }}
                className="mt-6 w-full bg-secondary text-secondary-foreground hover:bg-accent"
              >
                {checkingOut === "subscription" ? "Starting…" : "Subscribe"}
              </Button>
              {/* The annual sits under the monthly rather than as a fourth column: it is the
                  same tier, paid differently, and a column of its own implied otherwise. */}
              <button
                type="button"
                disabled={checkingOut !== null}
                onClick={() => { void startCheckout("subscription_annual") }}
                className="mt-3 w-full text-sm text-primary underline disabled:opacity-50"
              >
                {checkingOut === "subscription_annual"
                  ? "Starting…"
                  : `or ${formatPrice(SCOUTING_REPORT_PRICES.subscription_annual)} a year — save ${formatPrice(annualSavingCents())}`}
              </button>
            </div>
          </div>

          {/*
            * Said next to the price, because a large share of the people who land here already
            * have access — they followed the nav's "Rankings" link, which sends anybody without
            * an entitlement to this page. Leaving sign-in to the footnote makes a Blue family
            * read a sales pitch and conclude they have to pay again.
            */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already a Blue family, a subscriber, or a verified college coach?{" "}
            <Link href="/auth/signin?returnTo=/public-rankings" className="text-primary underline">
              Sign in
            </Link>{" "}
            to see the rankings.
          </p>

          {checkoutError && (
            <p className="mt-4 text-center text-sm text-destructive">{checkoutError}</p>
          )}

          {/*
            * The product itself. Names are blurred rather than invented: the layout is the real
            * one, so the shape sells it, while the names stay withheld because they are the
            * product and because they belong to minors.
            */}
          <div className="mt-16 grid gap-4 lg:grid-cols-2">
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="border-b border-border px-5 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Class rankings · top 30
                </p>
              </div>
              <div className="divide-y divide-border">
                {[
                  { rank: 1, chips: ["State champ", "TOC champ", "NHSCA 4th", "45-0"] },
                  { rank: 2, chips: ["State champ", "TOC champ", "NHSCA 5th", "43-0"] },
                  { rank: 3, chips: ["State champ", "TOC champ", "37-0"] },
                  { rank: 4, chips: ["State 2nd", "TOC champ", "49-6"] },
                ].map((row) => (
                  <div key={row.rank} className="flex items-start gap-3 px-5 py-3">
                    <span className="w-5 shrink-0 text-lg font-semibold text-primary">{row.rank}</span>
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 h-3.5 w-32 rounded bg-muted-foreground/40 blur-[3px]" />
                      <div className="flex flex-wrap gap-1">
                        {row.chips.map((chip) => (
                          <span
                            key={chip}
                            className="rounded bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-secondary-foreground"
                          >
                            {chip}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="border-b border-border px-5 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Scouting report
                </p>
              </div>
              <div className="space-y-3 p-5">
                {[
                  { label: "In-season record", widths: ["w-24"] },
                  { label: "Wins over ranked opponents", widths: ["w-full", "w-4/5", "w-3/5"] },
                  { label: "Losses to ranked opponents", widths: ["w-3/4", "w-1/2"] },
                ].map((section) => (
                  <div key={section.label}>
                    <p className="text-xs font-semibold text-foreground">{section.label}</p>
                    <div className="mt-1.5 space-y-1.5">
                      {section.widths.map((w, i) => (
                        <div key={i} className={`h-3 ${w} rounded bg-muted-foreground/40 blur-[3px]`} />
                      ))}
                    </div>
                  </div>
                ))}
                <div>
                  <p className="text-xs font-semibold text-foreground">Competed at</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {["NCHSAA", "Tournament of Champions", "NHSCA", "Super 32"].map((event) => (
                      <span
                        key={event}
                        className="rounded bg-secondary px-1.5 py-0.5 text-[11px] text-secondary-foreground"
                      >
                        {event}
                      </span>
                    ))}
                  </div>
                </div>
                {/* The part people assume is for sale, and is not. */}
                <p className="border-t border-border pt-3 text-[11px] text-muted-foreground">
                  Contact details, GPA and test scores: verified college coaches only. Not part of
                  any subscription, at any price.
                </p>
              </div>
            </div>
          </div>

          {/* The closing statement, not fine print: it is the sentence the whole page argues for. */}
          <p className="mx-auto mt-12 max-w-2xl text-center text-base text-foreground">
            The goal is simple: a comprehensive, current resource for identifying and evaluating
            North Carolina wrestlers with the ability and potential to compete at the next level.
          </p>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already a Blue family or a college coach?{" "}
            <Link
              href={locked === "anonymous" ? "/auth/signin?returnTo=/rankings" : "/auth/coach-signup"}
              className="text-primary underline"
            >
              {locked === "anonymous" ? "Sign in" : "Verify your account"}
            </Link>
            . Behind all of it: 26 years of NC wrestling history, free to ask Data Dawg about.
          </p>
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
            <h1 className="mb-3 text-balance text-5xl font-light tracking-tight text-foreground">
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

          <Card className="mb-12 border-border bg-card text-foreground">
            <CardHeader>
              <CardTitle className="text-3xl flex items-center gap-3">
                <GraduationCap className="h-8 w-8" />
                College Coaches — What to Expect
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                <GraduationCap className="h-6 w-6 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-lg mb-1">Athlete Academic Profiles</h3>
                  <p className="text-muted-foreground">GPA, SAT, ACT, transcripts (where available)</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Phone className="h-6 w-6 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-lg mb-1">Direct Contact Details</h3>
                  <p className="text-muted-foreground">Athlete e-mail, phone, social profiles</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Bell className="h-6 w-6 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-lg mb-1">Frequent Updates</h3>
                  <p className="text-muted-foreground">Automatic alerts after major tournaments, wins, and rankings changes</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Lock className="h-6 w-6 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-lg mb-1">Coaches Portal Access</h3>
                  <p className="text-muted-foreground">Secure dashboard to browse, sort, and manage North Carolina recruits</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <BarChart className="h-6 w-6 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-lg mb-1">Comprehensive Recruiting Data</h3>
                  <p className="text-muted-foreground">
                    Athletic results, progress metrics, highlight videos, and academic info in one place
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

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
