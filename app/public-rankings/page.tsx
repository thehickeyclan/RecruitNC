import { ArrowRight, GraduationCap, ListOrdered, Users } from "lucide-react"
import { redirect } from "next/navigation"

import { HardLink } from "@/components/hard-link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { resolveRankingViewer } from "@/lib/ranking-access"
import { canSeeProspectRanking } from "@/lib/ranking-visibility"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import {
  PUBLISHED_PUBLIC_RANKINGS_YEARS,
  PUBLIC_TOP_75_COLLEGE_RELEASED,
} from "@/lib/public-rankings-cap"

export const dynamic = "force-dynamic"

const rankingLinks = [
  {
    href: "/public-rankings/2027",
    eyebrow: "Class rankings",
    title: "Class of 2027",
    description: "The published Top 30.",
    icon: ListOrdered,
  },
  {
    href: "/public-rankings/2028",
    eyebrow: "Class rankings",
    title: "Class of 2028",
    description: "The published Top 30.",
    icon: Users,
  },
  {
    href: "/public-rankings/2029",
    eyebrow: "Class rankings",
    title: "Class of 2029",
    description: "The published Top 15.",
    icon: Users,
  },
  {
    href: "/public-rankings/college-prospects",
    eyebrow: "Classes of 2027 & 2028",
    title: "Top 75 College Prospects",
    description: "Class of 2027 and 2028 Top College Prospects.",
    icon: GraduationCap,
  },
]

export default async function PublicRankingsHomepage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { viewer } = await resolveRankingViewer({
    supabase: await createClient(),
    admin: createAdminClient(),
  })
  if (!canSeeProspectRanking(viewer)) {
    /*
     * Stripe sends a paying customer here, and the webhook that grants access may not have
     * landed yet. Carrying the flag back means they see "payment received, access activating"
     * rather than the page that sold them the thing they just bought - which reads as a
     * failed purchase.
     */
    const params = (await searchParams) ?? {}
    /* The coach welcome flag rides along too, for the same reason: a redirect that drops it
       swallows the one message a new coach was meant to see. */
    const carried = new URLSearchParams()
    if (params.purchased) carried.set("purchased", "1")
    if (params.welcome === "coach") carried.set("welcome", "coach")
    const query = carried.toString()
    redirect(query ? `/rankings?${query}` : "/rankings")
  }

  // Staff read the boards before the announcement, on the same page customers will use.
  const isAdmin = viewer.isAdmin === true
  const releasedLinks = rankingLinks.filter(({ href }) => {
    if (isAdmin) return true
    if (href === "/public-rankings/college-prospects") return PUBLIC_TOP_75_COLLEGE_RELEASED
    const year = Number(href.split("/").at(-1))
    return PUBLISHED_PUBLIC_RANKINGS_YEARS.includes(year)
  })

  /*
   * Somebody who tried to buy what they already have.
   *
   * The checkout refuses a Blue member or verified coach rather than billing them, and sends
   * them here. Arriving on the boards with no explanation looks like the purchase silently
   * failed, so say plainly what happened: nothing was charged, and this is already yours.
   */
  const alreadyIncluded = Boolean(((await searchParams) ?? {}).included)

  return (
    <main className="min-h-screen bg-[#0A1628] text-white">
      <section className="border-b border-white/10">
        <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:py-20">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-[#D3B574]">
            RecruitNC Rankings
          </p>
          <h1 className="text-balance text-4xl font-black tracking-tight text-white sm:text-6xl">
            College Prospect Rankings
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-white/65">
            Class rankings and the Top 75 College Prospects, informed by results, quality wins
            and strength of competition.
          </p>
          {/*
            * The other half of the job. A verified coach lands here when he signs in; the boards
            * say who is good and the profiles say what they did, and neither page mentioned the
            * other. Shown to coaches only - a family browsing their own class board does not
            * need pointing at a directory of other people's children.
            */}
          {viewer.isVerifiedCoach === true ? (
            <HardLink
              href="/athletes"
              className="mx-auto mt-8 flex max-w-2xl items-center gap-3 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 transition-colors hover:bg-white/[0.08]"
            >
              <Users className="h-5 w-5 shrink-0 text-[#D3B574]" aria-hidden />
              <span className="min-w-0 flex-1 text-sm text-white">
                <span className="font-semibold">Every North Carolina wrestler, ranked or not</span>
                <span className="ml-2 text-white/60">
                  Full profiles — results, film, academics and contact details.
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-[#D3B574]" aria-hidden />
            </HardLink>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
        {alreadyIncluded ? (
          <div className="mx-auto mb-8 max-w-2xl rounded-xl border border-[#D3B574]/50 bg-[#D3B574]/10 px-6 py-4 text-center">
            <p className="text-sm font-semibold text-[#D3B574]">
              You already have the rankings &mdash; no payment needed.
            </p>
            <p className="mt-1 text-sm text-white/65">
              They are included with your NC United Blue membership. You have not been charged.
            </p>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {releasedLinks.map(({ href, eyebrow, title, description, icon: Icon }) => (
            <HardLink key={href} href={href} className="group block h-full">
              <Card className="h-full border-white/10 bg-[#13294B] text-white transition hover:-translate-y-0.5 hover:border-[#D3B574]/70">
                <CardHeader>
                  <Icon className="mb-3 h-6 w-6 text-[#D3B574]" />
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/50">{eyebrow}</p>
                  <CardTitle className="text-2xl font-bold text-white">{title}</CardTitle>
                  <CardDescription className="text-sm text-white/65">{description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#D3B574]">
                    View rankings
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </CardContent>
              </Card>
            </HardLink>
          ))}
        </div>

        {isAdmin && PUBLISHED_PUBLIC_RANKINGS_YEARS.length === 0 ? (
          <div className="mx-auto mb-8 max-w-xl rounded-xl border border-[#D3B574]/50 bg-[#D3B574]/10 px-6 py-4 text-center">
            <p className="text-sm font-semibold text-[#D3B574]">Admin preview — not yet released</p>
            <p className="mt-1 text-sm text-white/60">Only admins can open these boards right now.</p>
          </div>
        ) : null}

        {releasedLinks.length === 0 ? (
          <div className="mx-auto max-w-xl rounded-xl border border-white/10 bg-white/[0.03] px-6 py-10 text-center">
            <p className="text-lg font-semibold text-white">New rankings are coming soon.</p>
            <p className="mt-2 text-sm text-white/55">We will publish each board after its official release.</p>
          </div>
        ) : null}

        <p className="mx-auto mt-10 max-w-2xl text-center text-sm leading-relaxed text-white/55">
          Rankings are updated as new results and verified athlete information become available.
        </p>
      </section>
    </main>
  )
}
