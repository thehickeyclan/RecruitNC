import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, Users, Target, Award, TrendingUp } from "lucide-react"
import Image from "next/image"
import { HardLink } from "@/components/hard-link"
import {
  RANKINGS_BODY,
  RANKINGS_PANEL,
} from "@/lib/public-rankings-theme"
import { redirectIfSignedOut } from "@/lib/server-auth-redirect"

export const dynamic = "force-dynamic"

export default async function PublicRankingsHomepage() {
  await redirectIfSignedOut("/public-rankings")

  return (
    <main className="min-h-screen bg-[#0A1628] text-white">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0">
          <Image
            src="/hero-banner-nchsaa-2026-arena.png"
            alt="NCHSAA Wrestling Championship arena"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A1628]/95 via-[#0A1628]/85 to-[#0A1628]/70" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A1628] via-transparent to-transparent" />
        </div>

        <div className="container relative mx-auto px-4 py-16 md:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[#D3B574]">
              RecruitNC
            </p>
            <h1 className="text-4xl font-bold md:text-5xl mb-4 text-balance">
              College Prospect Rankings
            </h1>
            <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto">
              Official prospect rankings for North Carolina wrestling from a college recruiting
              perspective
            </p>
          </div>
        </div>
      </section>

      {/* Class links */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">Current Rankings</h2>
          <p className={`${RANKINGS_BODY} max-w-2xl mx-auto`}>
            Select a graduation class to view detailed prospect rankings with filters for men&apos;s
            and women&apos;s wrestling
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <HardLink href="/public-rankings/2027" className="block group">
            <Card
              className={`${RANKINGS_PANEL} h-full transition-colors hover:border-[#D3B574]/50 cursor-pointer`}
            >
              <CardHeader className="text-center">
                <CardTitle className="text-2xl text-white group-hover:text-[#D3B574] transition-colors">
                  Class of 2027
                </CardTitle>
                <CardDescription className="text-base text-white/60">
                  Juniors climbing the ranks and preparing for the next recruiting stage.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="flex items-center justify-center gap-2 text-[#D3B574] font-semibold">
                  View Rankings
                  <ArrowRight className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </HardLink>

          <HardLink href="/public-rankings/2028" className="block group">
            <Card
              className={`${RANKINGS_PANEL} h-full transition-colors hover:border-[#D3B574]/50 cursor-pointer`}
            >
              <CardHeader className="text-center">
                <CardTitle className="text-2xl text-white group-hover:text-[#D3B574] transition-colors">
                  Class of 2028
                </CardTitle>
                <CardDescription className="text-base text-white/60">
                  Sophomores building national credentials and early college recruiting interest.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="flex items-center justify-center gap-2 text-[#D3B574] font-semibold">
                  View Rankings
                  <ArrowRight className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </HardLink>
        </div>

        <div className="mt-8 text-center">
          <HardLink
            href="/public-rankings/2026"
            className="text-sm text-white/50 hover:text-[#D3B574] transition-colors underline underline-offset-4"
          >
            Archived: Class of 2026 rankings
          </HardLink>
        </div>
      </section>

      {/* Our approach */}
      <section className="border-t border-white/10 bg-[#0f1c2e]/50">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">Our Approach</h2>
            <p className={`${RANKINGS_BODY} text-center mb-12 max-w-3xl mx-auto`}>
              Our rankings are designed from a college recruiting perspective. They are not just a
              reflection of local results, but an evaluation of how athletes perform against the
              highest levels of national competition.
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
              {[
                {
                  icon: Target,
                  title: "Quality of Wins",
                  body: "Victories against nationally ranked opponents carry the greatest weight",
                },
                {
                  icon: Award,
                  title: "Elite Tournaments",
                  body: "Performance at Super 32, Journeymen, NHSCA Nationals, and other top events",
                },
                {
                  icon: TrendingUp,
                  title: "College Opens",
                  body: "Results at NCAA-sanctioned opens provide insight into college readiness",
                },
                {
                  icon: Users,
                  title: "In-State Results",
                  body: "Emphasis on matches against elite in-state opponents with national credentials",
                },
              ].map(({ icon: Icon, title, body }) => (
                <Card key={title} className={`${RANKINGS_PANEL} text-center`}>
                  <CardHeader>
                    <Icon className="h-8 w-8 text-[#D3B574] mx-auto mb-2" />
                    <CardTitle className="text-lg text-white">{title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-white/60">{body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="rounded-xl border border-[#D3B574]/30 bg-[#D3B574]/10 p-8 text-center">
              <h3 className="text-xl font-semibold text-[#D3B574] mb-4">Our Goal</h3>
              <p className="text-white/80 leading-relaxed text-lg">
                To highlight athletes whose achievements best translate to success at the college
                level, ensuring that rankings reflect both accomplishment and projection.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
