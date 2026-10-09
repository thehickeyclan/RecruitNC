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
import { Award, Check, ExternalLink, Instagram, Mail, Medal, Target, TrendingUp, Trophy, Users } from "lucide-react"
import { RankingsTableView } from "@/components/rankings-table-view"
import { useAuth } from "@/contexts/auth-context"
import { RankingsCardView } from "@/components/rankings-card-view"
import { PUBLISHED_PUBLIC_RANKINGS_YEARS } from "@/lib/public-rankings-cap"

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
}: {
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
  const [requestedPlan, setRequestedPlan] = useState<"subscription" | "subscription_annual" | null>(null)
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
    if (!loadingAthletes && locked === null) window.location.replace("/public-rankings")
  }, [loadingAthletes, locked])

  if (!loadingAthletes && locked === null) return null

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
    return (
      <div className="profile-surface min-h-screen bg-background">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
          <div className="text-center">
            <Badge className="mb-4 bg-primary text-primary-foreground hover:bg-primary">
              NC United · RecruitNC
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              College Prospect Rankings
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Classes of {CLASS_RANGE}, and the Top 75 College Ready Prospects
              {topFrom ? ` from ${topFrom}` : ""}.
            </p>
          </div>

          {/* The headline a parent buys on: real, counted, recent. Hidden if there is nothing to say. */}
          {collegeViews && collegeViews.profilesViewed > 0 ? (
            <div className="mx-auto mt-8 max-w-2xl rounded-xl border-2 border-primary/50 bg-primary/10 p-5 text-center">
              <p className="text-2xl font-bold text-foreground sm:text-3xl">
                College coaches viewed{" "}
                <span className="text-primary">{collegeViews.profilesViewed.toLocaleString()}</span> NC wrestler
                profiles in the last 30 days.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {collegeViews.coaches > 1 ? `${collegeViews.coaches} college coaches, all looking at North Carolina. ` : ""}
                Subscribe and see which programs are viewing yours.
              </p>
            </div>
          ) : null}

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

          <div className="mx-auto mt-10 grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Profile activity", "Which college programs are viewing you"],
              [CLASS_RANGE, "Frequently updated class rankings"],
              ["Top 75", topFrom ? `College Ready Prospects from ${topFrom}` : "College Ready Prospects"],
              ["Head-to-head", "Who beat whom, and when"],
            ].map((claim) => (
              <div key={claim[0]} className="rounded-xl border border-border bg-card p-4 text-left">
                <p className="text-xl font-semibold text-primary">{claim[0]}</p>
                <p className="mt-1 text-sm text-muted-foreground">{claim[1]}</p>
              </div>
            ))}
          </div>

          {/*
            * How the order is arrived at, before the price.
            *
            * The page said what you get and what it costs and never what it rests on, which is
            * the first question a coach or a parent asks and the only one that decides whether
            * the rest is worth anything. Six lines, because the detail belongs in the product.
            */}
          <div className="mx-auto mt-10 max-w-4xl rounded-2xl border border-border bg-card p-6 text-left">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              How we rank
            </p>
            <p className="mt-2 text-lg text-foreground">
              Big wins matter. Strength of schedule matters. Competing against the best matters.
            </p>
            <div className="mt-5 grid gap-x-8 gap-y-2 text-sm text-muted-foreground sm:grid-cols-2">
              {[
                "National results, individual and dual competition",
                "Every major tournament, in state and out",
                "Strength of competition, and quality wins",
                "Head-to-head results between ranked wrestlers",
                "Every match on record, not only the podium finishes",
                "How consistently a wrestler seeks out the best",
              ].map((line) => (
                <div key={line} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{line}</span>
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              Every place is reasoned from results on the mat — not reputation, and not a poll.
            </p>
          </div>

          <div className="mx-auto mt-10 grid max-w-3xl gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Blue families</p>
              <p className="mt-3 text-4xl font-semibold">Included</p>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Blue athletes and parents get full rankings access, profile views, and the recruiting portal (coming soon) with their Blue membership.
              </p>
              <Button asChild variant="outline" className="mt-6 w-full border-border bg-transparent text-foreground hover:bg-accent">
                <Link href="/blue">Learn about Blue</Link>
              </Button>
              {signedInWithoutAccess ? null : (
                <Link href="/auth/signin?returnTo=/rankings" className="mt-3 block text-center text-sm text-primary underline">
                  Blue family sign in
                </Link>
              )}
            </div>

            <div className="relative rounded-2xl border-2 border-primary bg-card p-6 shadow-lg">
              <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-0.5 text-xs font-bold text-primary-foreground">
                Open to everyone
              </span>
              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Full access</p>
              <p className="mt-3 text-4xl font-semibold">{formatPrice(SCOUTING_REPORT_PRICES.subscription)}</p>
              <p className="mt-1 text-sm text-muted-foreground">per month</p>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                All class rankings and the Top 75 College Ready Prospects board. Full profile
                management, and see which college programs are viewing your profile. Cancel
                anytime.
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

          {checkoutError && (
            <p className="mt-4 text-center text-sm text-destructive">{checkoutError}</p>
          )}

          {/*
            * Said at the moment of purchase, not buried in terms.
            *
            * A ranking is the whole product in one screenshot. Fine print stops nobody and
            * earns no goodwill; a plain sentence with the reason attached does better, and
            * naming which half of sharing is welcome makes it a rule people follow rather than
            * one they resent. A parent posting "my son is fourth in North Carolina" is the best
            * advertising this has.
            */}
          <p className="mx-auto mt-6 max-w-xl text-center text-xs leading-relaxed text-muted-foreground">
            Your subscription is for you and your family. Share your own wrestler&apos;s ranking
            anywhere &mdash; please don&apos;t repost the full boards or screenshots of them.
            That&apos;s what keeps these rankings going.
          </p>

          {signedInWithoutAccess ? (
            <div className="mx-auto mt-8 max-w-xl rounded-lg border border-border bg-card px-4 py-4 text-center text-sm text-muted-foreground">
              <p>
                You&apos;re signed in{user?.email ? <> as <strong className="text-foreground">{user.email}</strong></> : null}.
              </p>
              <p className="mt-2">
                Blue family and still seeing this? This account isn&apos;t linked to your wrestler yet. Open your
                wrestler&apos;s profile and tap{" "}
                <strong className="text-foreground">&ldquo;I&apos;m [their name]&apos;s parent&rdquo;</strong> to link it,
                or{" "}
                <a href="mailto:info@ncwrestlingunited.com?subject=Rankings%20access" className="text-primary underline">
                  email us
                </a>{" "}
                and we&apos;ll link it for you.
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-3">
                <Link href="/prospects/all" className="text-primary underline">
                  Find your wrestler
                </Link>
                <button type="button" onClick={() => void switchAccount()} className="text-primary underline">
                  Use a different account
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-8 text-center text-sm text-muted-foreground">
              Already a Blue family or subscriber?{" "}
              <Link href="/auth/signin?returnTo=/rankings" className="text-primary underline">Sign in</Link>
              .
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
