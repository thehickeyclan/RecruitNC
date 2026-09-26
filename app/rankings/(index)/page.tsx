"use client"

import { useEffect, useState } from "react"
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
    const fetchAthletes = async () => {
      try {
        const response = await fetch("/api/public-rankings?year=2027&gender=Male")
        if (response.status === 401) {
          setLocked("anonymous")
        } else if (response.status === 403) {
          setLocked("unentitled")
        } else if (response.ok) {
          const data = await response.json()
          setAthletes(data.rankings || [])
        }
      } catch (error) {
        console.error("Error fetching athletes:", error)
      } finally {
        setLoadingAthletes(false)
      }
    }

    fetchAthletes()
  }, [])

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
      <div className="min-h-screen bg-[#04112b] text-white">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
          <div className="text-center">
            <Badge className="mb-4 bg-[#d6b75d] text-slate-950 hover:bg-[#d6b75d]">
              NC United · RecruitNC
            </Badge>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
              North Carolina Prospect Rankings
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-blue-200">
              See what college coaches see.
            </p>
          </div>

          {/* Four claims, one line each. The detail belongs in the product, not the pitch. */}
          <div className="mx-auto mt-10 grid max-w-3xl gap-x-8 gap-y-3 text-sm text-blue-100 sm:grid-cols-2">
            {[
              "41,000+ bouts scored, weighted to this season",
              "NHSCA, Super 32, Fargo and Journeymen all count",
              "Head-to-head inside 12 months settles it",
              "Every win graded by who it was over",
              "NHSCA scored by grade division, not one flat podium",
            ].map((claim) => (
              <div key={claim} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#d6b75d]" />
                <span>{claim}</span>
              </div>
            ))}
          </div>

          {/* Three ways to have it, and one of them is free — said before the price, not after. */}
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-blue-800/70 bg-[#071f4a]/60 p-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-300">
                Blue members
              </p>
              <p className="mt-3 text-4xl font-black">Free</p>
              <p className="mt-1 text-sm text-blue-300">Included in your membership</p>
              <p className="mt-4 text-sm text-blue-200">
                For the whole family. Verified college coaches free too, and every wrestler always
                sees their own ranking.
              </p>
              <Button
                asChild
                variant="outline"
                className="mt-6 w-full border-blue-600 bg-transparent text-white hover:bg-blue-900"
              >
                <Link href="/blue">About NC United Blue</Link>
              </Button>
            </div>

            {plans.map((plan) => (
              <div
                key={plan.kind}
                className={
                  plan.featured
                    ? "relative rounded-2xl border-2 border-[#d6b75d] bg-[#071f4a] p-6 shadow-xl"
                    : "rounded-2xl border border-blue-800/70 bg-[#071f4a]/60 p-6"
                }
              >
                {plan.featured && (
                  <span className="absolute -top-3 left-6 rounded-full bg-[#d6b75d] px-3 py-0.5 text-xs font-bold text-slate-950">
                    Best value
                  </span>
                )}
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-300">
                  {plan.name}
                </p>
                <p className="mt-3 text-4xl font-black">{plan.price}</p>
                <p className="mt-1 text-sm text-blue-300">{plan.cadence}</p>
                <p className="mt-4 text-sm text-blue-200">{plan.note}</p>
                <p className="mt-1 text-sm text-blue-200">Unlimited scouting reports included</p>
                <Button
                  disabled={checkingOut !== null}
                  onClick={() => { void startCheckout(plan.kind) }}
                  className={
                    plan.featured
                      ? "mt-6 w-full bg-[#d6b75d] text-slate-950 hover:bg-[#c5a84d]"
                      : "mt-6 w-full bg-blue-600 text-white hover:bg-blue-500"
                  }
                >
                  {checkingOut === plan.kind ? "Starting…" : "Subscribe"}
                </Button>
              </div>
            ))}
          </div>

          {checkoutError && (
            <p className="mt-4 text-center text-sm text-red-300">{checkoutError}</p>
          )}

          {/*
            * The product itself. Names are blurred rather than invented: the layout is the real
            * one, so the shape sells it, while the names stay withheld because they are the
            * product and because they belong to minors.
            */}
          <div className="mt-16 grid gap-4 lg:grid-cols-2">
            <div className="overflow-hidden rounded-2xl border border-blue-800/70 bg-[#071f4a]/60">
              <div className="border-b border-blue-800/70 px-5 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">
                  Class rankings · top 30
                </p>
              </div>
              <div className="divide-y divide-blue-900/60">
                {[
                  { rank: 1, chips: ["State champ", "TOC champ", "NHSCA 4th", "45-0"] },
                  { rank: 2, chips: ["State champ", "TOC champ", "NHSCA 5th", "43-0"] },
                  { rank: 3, chips: ["State champ", "TOC champ", "37-0"] },
                  { rank: 4, chips: ["State 2nd", "TOC champ", "49-6"] },
                ].map((row) => (
                  <div key={row.rank} className="flex items-start gap-3 px-5 py-3">
                    <span className="w-5 shrink-0 text-lg font-black text-[#d6b75d]">{row.rank}</span>
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 h-3.5 w-32 rounded bg-blue-200/30 blur-[3px]" />
                      <div className="flex flex-wrap gap-1">
                        {row.chips.map((chip) => (
                          <span
                            key={chip}
                            className="rounded bg-blue-900/70 px-1.5 py-0.5 text-[11px] font-medium text-blue-200"
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

            <div className="overflow-hidden rounded-2xl border border-blue-800/70 bg-[#071f4a]/60">
              <div className="border-b border-blue-800/70 px-5 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">
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
                    <p className="text-xs font-semibold text-blue-200">{section.label}</p>
                    <div className="mt-1.5 space-y-1.5">
                      {section.widths.map((w, i) => (
                        <div key={i} className={`h-3 ${w} rounded bg-blue-200/30 blur-[3px]`} />
                      ))}
                    </div>
                  </div>
                ))}
                <div>
                  <p className="text-xs font-semibold text-blue-200">Competed at</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {["NCHSAA", "Tournament of Champions", "NHSCA", "Super 32"].map((event) => (
                      <span
                        key={event}
                        className="rounded bg-blue-900/70 px-1.5 py-0.5 text-[11px] text-blue-200"
                      >
                        {event}
                      </span>
                    ))}
                  </div>
                </div>
                {/* The part people assume is for sale, and is not. */}
                <p className="border-t border-blue-900/60 pt-3 text-[11px] text-blue-300">
                  Contact details and academics go to verified college coaches only — never sold.
                </p>
              </div>
            </div>
          </div>

          <p className="mt-10 text-center text-sm text-blue-300">
            Already a Blue family or a college coach?{" "}
            <Link
              href={locked === "anonymous" ? "/auth/signin?returnTo=/rankings" : "/auth/coach-signup"}
              className="text-[#d6b75d] underline"
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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-red-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="relative mx-auto w-24 h-24 mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-red-600 rounded-full animate-pulse"></div>
              <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                <Trophy className="h-12 w-12 text-blue-600" />
              </div>
            </div>

            <h1 className="text-5xl font-bold text-gray-900 mb-2 text-balance">
              North Carolina College Prospect Rankings
            </h1>
            <p className="text-2xl font-semibold text-blue-600 mb-6">Class of 2027 Dropping this Saturday</p>

            <div className="flex flex-wrap justify-center gap-4 mb-6 text-lg font-semibold">
              <Badge variant="secondary" className="text-lg px-4 py-2 bg-blue-100 text-blue-800">
                <Trophy className="h-4 w-4 mr-2" />
                10 State Champions
              </Badge>
              <Badge variant="secondary" className="text-lg px-4 py-2 bg-red-100 text-red-800">
                <Medal className="h-4 w-4 mr-2" />
                34 State Placements
              </Badge>
              <Badge variant="secondary" className="text-lg px-4 py-2 bg-yellow-100 text-yellow-800">
                <Award className="h-4 w-4 mr-2" />7 NHSCA All-Americans
              </Badge>
            </div>
          </div>

          <Card className="mb-12 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
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
                  <h3 className="font-semibold text-lg mb-1">Athlete Academic Profiles</h3>
                  <p className="text-blue-100">GPA, SAT, ACT, transcripts (where available)</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Phone className="h-6 w-6 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-lg mb-1">Direct Contact Details</h3>
                  <p className="text-blue-100">Athlete e-mail, phone, social profiles</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Bell className="h-6 w-6 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-lg mb-1">Frequent Updates</h3>
                  <p className="text-blue-100">Automatic alerts after major tournaments, wins, and rankings changes</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Lock className="h-6 w-6 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-lg mb-1">Coaches Portal Access</h3>
                  <p className="text-blue-100">Secure dashboard to browse, sort, and manage North Carolina recruits</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <BarChart className="h-6 w-6 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-lg mb-1">Comprehensive Recruiting Data</h3>
                  <p className="text-blue-100">
                    Athletic results, progress metrics, highlight videos, and academic info in one place
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-12 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-red-600 text-white">
              <CardTitle className="text-2xl">Class of 2027 Overview</CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="prose prose-lg max-w-none">
                <p className="text-xl text-gray-700 mb-6 leading-relaxed">
                  The North Carolina Class of 2027 has quickly established itself as one of the most accomplished
                  sophomore groups in state history. With 10 state championships, 34 total state placements, and 7 NHSCA
                  All-American honors, this class is already setting a new standard for success. Their performance at
                  the 2025 NHSCA Nationals, where they produced six All-Americans (tied for the second-highest total in
                  state history), confirmed their place among the nation's elite.
                </p>

                <div className="grid md:grid-cols-3 gap-6 my-8">
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-6 text-center">
                      <div className="text-3xl font-bold text-blue-600 mb-2">10</div>
                      <div className="text-sm font-medium text-blue-800">State Champions</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-red-50 border-red-200">
                    <CardContent className="p-6 text-center">
                      <div className="text-3xl font-bold text-red-600 mb-2">7</div>
                      <div className="text-sm font-medium text-red-800">NHSCA All-Americans</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-yellow-50 border-yellow-200">
                    <CardContent className="p-6 text-center">
                      <div className="text-3xl font-bold text-yellow-600 mb-2">22/25</div>
                      <div className="text-sm font-medium text-yellow-800">Top 25 are NC United Blue</div>
                    </CardContent>
                  </Card>
                </div>

                <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="h-6 w-6 text-blue-600" />
                  NC United Pipeline
                </h3>
                <p className="mb-4">The Class of 2027 is deeply tied to the NC United Blue program:</p>
                <ul className="list-disc list-inside mb-6 space-y-2 text-gray-700">
                  <li>All of the Top 10 ranked wrestlers are members of NC United Blue.</li>
                  <li>22 of the Top 25 actively train and compete as part of Blue.</li>
                  <li>9 of the Top 25 have already represented North Carolina on the NC United National Team.</li>
                </ul>
                <p className="mb-6">
                  This integration has fueled both individual and team success, giving athletes opportunities to sharpen
                  their skills against the nation's best.
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
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

                <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
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

                <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
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

          <Card className="mb-12 bg-gradient-to-r from-gray-50 to-blue-50 border-l-4 border-l-blue-600">
            <CardContent className="p-8">
              <blockquote className="text-2xl font-medium text-gray-900 italic text-center mb-4">
                "Exposure to the nation's top-ranked athletes and elite training opportunities is fueling unprecedented
                college recruiting interest in North Carolina's Class of 2027."
              </blockquote>
              <div className="text-center">
                <p className="text-lg font-semibold text-blue-600">Mike Macchiavello</p>
                <p className="text-gray-600">Co-Founder, NC United</p>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardContent className="p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">Class of 2027 Rankings</h2>
              <p className="text-lg text-gray-700 text-center max-w-4xl mx-auto leading-relaxed">
                Below you'll find the full list of North Carolina's Top 25 sophomores for 2027. This class has already
                combined for 10 state titles, 34 total state placements, and 7 NHSCA All-American finishes — making it
                one of the most accomplished groups in state history. These rankings reflect state and national
                performance, quality of wins, and exposure against elite competition.
              </p>
            </CardContent>
          </Card>

          <div className="flex justify-center mb-6">
            <div className="bg-white rounded-lg p-1 shadow-sm border">
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
            <CardHeader className="bg-gradient-to-r from-blue-600 to-red-600 text-white">
              <CardTitle className="text-2xl">Academic & Recruiting Profiles</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        High School
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        GPA
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Weight
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loadingAthletes ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <div className="flex justify-center">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
                          </div>
                        </td>
                      </tr>
                    ) : athletes.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                          No athletes found
                        </td>
                      </tr>
                    ) : (
                      athletes.map((athlete) => (
                        <tr key={athlete.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                #{athlete.prospect_ranking}
                              </Badge>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {athlete.id ? (
                                <a
                                  href={`/view-profile?id=${encodeURIComponent(athlete.id)}`}
                                  className="text-blue-600 hover:text-blue-800 hover:underline"
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
                            <div className="text-sm text-gray-500">{athlete.highschool}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {athlete.academic_gpa ? athlete.academic_gpa.toFixed(2) : "N/A"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{athlete.weight_display}</div>
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
            <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <CardContent className="p-8 text-center">
                <Instagram className="h-12 w-12 mx-auto mb-4 opacity-90" />
                <h3 className="text-2xl font-bold mb-4">Follow Our Journey</h3>
                <p className="mb-6 opacity-90">
                  Stay updated with the latest rankings, tournament results, and recruiting news.
                </p>
                <Button variant="secondary" size="lg" className="bg-white text-blue-600 hover:bg-gray-100" asChild>
                  <a href="https://www.instagram.com/ncwrestlingunited/" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Follow NC United on Instagram
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-red-600 to-red-700 text-white">
              <CardContent className="p-8 text-center">
                <Trophy className="h-12 w-12 mx-auto mb-4 opacity-90" />
                <h3 className="text-2xl font-bold mb-4">Join NC United Blue</h3>
                <p className="mb-6 opacity-90">Train with the best and develop your skills in our elite program.</p>
                <Button variant="secondary" size="lg" className="bg-white text-red-600 hover:bg-gray-100">
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
