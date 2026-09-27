import { ArrowRight, Award, ListOrdered, Users } from "lucide-react"
import { redirect } from "next/navigation"

import { HardLink } from "@/components/hard-link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { resolveRankingViewer } from "@/lib/ranking-access"
import { canSeeProspectRanking } from "@/lib/ranking-visibility"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

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
    href: "/public-rankings/prospects",
    eyebrow: "Across all classes",
    title: "Top 70 College Prospects",
    description: "One pound-for-pound list across North Carolina.",
    icon: Award,
  },
]

export default async function PublicRankingsHomepage() {
  const { viewer } = await resolveRankingViewer({
    supabase: await createClient(),
    admin: createAdminClient(),
  })
  if (!canSeeProspectRanking(viewer)) redirect("/rankings")

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
          <p className="mx-auto mt-4 max-w-2xl text-xl font-semibold text-white">
            North Carolina wrestling rankings that stay current.
          </p>
          <p className="mx-auto mt-2 max-w-2xl text-base text-white/65">
            Class rankings, the Top 70 college prospects and scouting reports informed by results,
            quality wins and strength of competition.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
        <div className="grid gap-4 md:grid-cols-3">
          {rankingLinks.map(({ href, eyebrow, title, description, icon: Icon }) => (
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

        <p className="mx-auto mt-10 max-w-2xl text-center text-sm leading-relaxed text-white/55">
          Rankings are updated as new results and verified athlete information become available.
        </p>
      </section>
    </main>
  )
}
