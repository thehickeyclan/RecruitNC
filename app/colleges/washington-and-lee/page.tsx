"use client"

import Link from "next/link"
import { ArrowRight, MapPin, GraduationCap, Users, Sparkles, Calendar, Trophy, Building2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const PRIMARY_BLUE = "#0057B8"
const ACCENT_BLUE = "#0A3E89"
const LIGHT_BLUE = "#E3F2FF"

const timeline = [
  {
    title: "Initial Evaluation",
    description: "Share film, academic transcript, and recruiting questionnaire to start a personal evaluation.",
    icon: <Sparkles className="h-5 w-5" aria-hidden="true" />,
    step: "Step 1",
  },
  {
    title: "Program Fit Call",
    description: "Discuss academic pathways, leadership expectations, and the Generals training model with the coaching staff.",
    icon: <Users className="h-5 w-5" aria-hidden="true" />,
    step: "Step 2",
  },
  {
    title: "On-Campus Experience",
    description: "Plan an official or unofficial visit to meet the team, tour campus, and experience the Colonnade.",
    icon: <Calendar className="h-5 w-5" aria-hidden="true" />,
    step: "Step 3",
  },
  {
    title: "Commit to the Generals",
    description: "Finalize admissions steps, financial aid, and pre-season onboarding to join the ODAC title chase.",
    icon: <Trophy className="h-5 w-5" aria-hidden="true" />,
    step: "Step 4",
  },
]

const quickFacts = [
  {
    title: "Location",
    value: "Lexington, Virginia",
    icon: <MapPin className="h-5 w-5" aria-hidden="true" />,
  },
  {
    title: "Division",
    value: "NCAA Division III",
    icon: <GraduationCap className="h-5 w-5" aria-hidden="true" />,
  },
  {
    title: "Conference",
    value: "Old Dominion Athletic Conference",
    icon: <Building2 className="h-5 w-5" aria-hidden="true" />,
  },
  {
    title: "Academic Profile",
    value: "Top 10 National Liberal Arts",
    icon: <Sparkles className="h-5 w-5" aria-hidden="true" />,
  },
]

const focusAreas = [
  {
    title: "Holistic Development",
    description:
      "Washington & Lee pairs elite academics with championship wrestling. Generals athletes average a 3.3+ team GPA while training in a data-driven room engineered for technical growth.",
  },
  {
    title: "Leadership Culture",
    description:
      "The Generals program is built on accountability and servant leadership. Wrestlers lead community engagement initiatives across Rockbridge County and mentor the next wave of student-athletes.",
  },
  {
    title: "Virginia & Mid-Atlantic Recruiting",
    description:
      "Priority targets include high-academic wrestlers across Virginia, North Carolina, Pennsylvania, and the Northeast who embrace the dual commitment to discipline and scholarship.",
  },
]

const academicHighlights = [
  "98% of graduates employed or in graduate school within 6 months",
  "Student-to-faculty ratio of 8:1 with personalized advising",
  "Access to the Connolly Center for Entrepreneurship and the Shepherd Program for Public Service",
  "Generals Lead initiative pairs captains with alumni mentors throughout the academic year",
]

export default function WashingtonAndLeeCollegePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div
        className="relative overflow-hidden border-b border-slate-800"
        style={{
          background: `radial-gradient(circle at top left, ${ACCENT_BLUE} 0%, rgba(15,23,42,0.85) 45%)`,
        }}
      >
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div
            className="absolute -top-20 -right-10 h-64 w-64 rounded-full blur-3xl"
            style={{ backgroundColor: PRIMARY_BLUE }}
          />
        </div>

        <section className="relative container mx-auto px-4 py-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <Badge className="bg-white/10 text-slate-100 border-white/20 uppercase tracking-[0.3em]">
                Washington & Lee Generals Wrestling
              </Badge>
              <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
                Develop as a Scholar, Leader, and Competitor in Lexington, VA
              </h1>
              <p className="text-slate-300 text-lg leading-relaxed">
                Washington & Lee Wrestling embraces the challenge of NCAA Division III competition while upholding a
                nationally ranked liberal arts education. Positioned in the heart of the Shenandoah Valley, the Generals
                program recruits high-character wrestlers ready to elevate the ODAC and national podium.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button
                  size="lg"
                  className="bg-white text-slate-900 hover:bg-slate-200 transition-colors"
                  asChild
                >
                  <Link href="https://generalssports.com/sports/wrestling" target="_blank" rel="noreferrer">
                    Explore Generals Wrestling
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/40 text-white hover:bg-white/10"
                  asChild
                >
                  <Link href="mailto:wrestling@wlu.edu">Connect with Generals Staff</Link>
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-white/0 blur-3xl" />
              <div className="relative rounded-2xl border border-white/10 bg-slate-900/60 shadow-2xl p-8 space-y-8">
                <div className="flex items-center justify-center rounded-xl bg-white/10 border border-white/20 py-10">
                  <div
                    className="text-6xl font-serif tracking-tight"
                    style={{ color: PRIMARY_BLUE }}
                    aria-label="Washington and Lee Monogram"
                  >
                    W&L
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {quickFacts.map((fact) => (
                    <Card
                      key={fact.title}
                      className="bg-slate-900/50 border border-white/10 shadow-none text-left"
                    >
                      <CardContent className="p-4 space-y-2">
                        <div className="inline-flex items-center justify-center rounded-lg bg-white/10 text-white w-10 h-10">
                          {fact.icon}
                        </div>
                        <p className="text-xs uppercase tracking-wide text-slate-400">{fact.title}</p>
                        <p className="text-sm font-semibold text-white leading-snug">{fact.value}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="container mx-auto px-4 py-16 space-y-12">
        <div className="grid lg:grid-cols-3 gap-6">
          {focusAreas.map((focus) => (
            <Card
              key={focus.title}
              className="bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors duration-200"
            >
              <CardHeader>
                <CardTitle className="text-xl text-white">{focus.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-300 leading-relaxed">{focus.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-900/40 border border-slate-800">
          <CardHeader className="pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-2xl text-white">Academic Edge at Washington & Lee</CardTitle>
                <p className="text-slate-300 mt-2">
                  The liberal arts core unlocks pathways in commerce, law, politics, engineering, and the sciences—backed
                  by alumni who champion the Generals tradition.
                </p>
              </div>
              <Badge className="bg-white/10 text-white border-white/20">#21 National Liberal Arts (U.S. News)</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {academicHighlights.map((highlight) => (
                <div
                  key={highlight}
                  className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3"
                >
                  <div className="mt-1 h-2 w-2 rounded-full" style={{ backgroundColor: LIGHT_BLUE }} />
                  <p className="text-sm text-slate-200 leading-relaxed">{highlight}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="bg-slate-900/40 border-y border-slate-800">
        <div className="container mx-auto px-4 py-16 space-y-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-3">
              <Badge className="bg-white/10 text-white border-white/20 uppercase tracking-[0.3em]">
                Recruiting Journey
              </Badge>
              <h2 className="text-3xl font-semibold text-white">Your Path to Becoming a General</h2>
              <p className="text-slate-300">
                From first conversation to the Lee Chapel signing ceremony, the Washington & Lee staff guides every
                prospect through a personalized experience.
              </p>
            </div>
            <Button
              size="lg"
              className="bg-white text-slate-900 hover:bg-slate-200 transition-colors"
              asChild
            >
              <Link href="https://wlu.edu/admissions" target="_blank" rel="noreferrer">
                Start Application
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {timeline.map((item) => (
              <Card
                key={item.title}
                className="relative overflow-hidden border border-white/10 bg-slate-950/60 hover:border-white/20 transition-colors"
              >
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-1"
                  style={{ background: `linear-gradient(90deg, ${PRIMARY_BLUE}, ${LIGHT_BLUE})` }}
                />
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-white/10 text-white border-white/20">{item.step}</Badge>
                    <div className="text-blue-200">{item.icon}</div>
                  </div>
                  <CardTitle className="text-lg text-white mt-4">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-300 leading-relaxed">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 space-y-10">
        <div className="grid lg:grid-cols-2 gap-6 items-center">
          <div className="space-y-4">
            <Badge className="bg-white/10 text-white border-white/20 uppercase tracking-[0.3em]">
              Why the Generals
            </Badge>
            <h2 className="text-3xl font-semibold text-white">More Than a Wrestling Room</h2>
            <p className="text-slate-300 leading-relaxed">
              The Washington & Lee wrestling program calls the Richard L. Duchossois Athletics & Recreation Center home.
              Wrestlers benefit from a full-time strength and conditioning staff, athletic trainers, and sports
              performance specialists who are invested in every weight class.
            </p>
            <p className="text-slate-300 leading-relaxed">
              Generals athletes leverage the Johnson Scholarship, the Williams School of Commerce, the Engineering
              Community Scholars program, and a storied alumni network that spans law, finance, policy, and medicine.
            </p>
          </div>

          <div className="grid gap-4">
            <Card className="bg-slate-900/60 border border-slate-800">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Generals Commitments—What We Value</h3>
                <ul className="space-y-2 text-slate-300 text-sm leading-relaxed">
                  <li>• Excellent academic track record with AP or dual-enrollment rigor</li>
                  <li>• Multi-sport or multi-discipline competitors embracing leadership roles</li>
                  <li>• Demonstrated service or campus engagement beyond the mat</li>
                  <li>• Families eager to participate in W&L’s honor system and community traditions</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/60 border border-slate-800">
              <CardContent className="p-6 space-y-3">
                <h3 className="text-lg font-semibold text-white">Key Recruiting Windows</h3>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-white/10 text-white border-white/20">Summer Prospect Day</Badge>
                  <Badge className="bg-white/10 text-white border-white/20">Fall Overnight Visit</Badge>
                  <Badge className="bg-white/10 text-white border-white/20">January ODAC Duals</Badge>
                  <Badge className="bg-white/10 text-white border-white/20">March Championship Cycle</Badge>
                </div>
                <p className="text-sm text-slate-300">
                  Reach out early to secure visit dates. The Generals staff coordinates with admissions to align official
                  visit itineraries, class shadowing, and interview opportunities.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <footer className="bg-slate-950 border-t border-slate-900">
        <div className="container mx-auto px-4 py-12 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <h3 className="text-2xl font-semibold text-white">Ready to talk Generals Wrestling?</h3>
              <p className="text-slate-300">
                A dedicated Washington & Lee coach will review your film, academics, and goals to determine the best fit
                within the DIII landscape.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                className="bg-white text-slate-900 hover:bg-slate-200 transition-colors"
                asChild
              >
                <Link href="mailto:wrestling@wlu.edu">Email W&L Wrestling</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
                asChild
              >
                <Link href="/colleges">View All Colleges</Link>
              </Button>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Washington & Lee University · 204 W. Washington Street · Lexington, VA 24450 · NCAA Division III · Old Dominion
            Athletic Conference
          </p>
        </div>
      </footer>
    </div>
  )
}
