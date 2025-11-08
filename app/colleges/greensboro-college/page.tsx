"use client"

import Link from "next/link"
import { ArrowRight, MapPin, GraduationCap, Users, Flame, Calendar, Trophy, Building2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const PRIMARY_GREEN = "#006746"
const ACCENT_GREEN = "#00402A"
const LIGHT_MINT = "#E6F6EB"

const timeline = [
  {
    title: "Start the Conversation",
    description: "Share film, academics, and your Pride recruiting questionnaire to open a direct evaluation with Greensboro staff.",
    icon: <Flame className="h-5 w-5" aria-hidden="true" />,
    step: "Step 1",
  },
  {
    title: "Culture Call",
    description: "Talk with the coaching staff about the Pride mentality, roster needs, and how you fit into the DIII national picture.",
    icon: <Users className="h-5 w-5" aria-hidden="true" />,
    step: "Step 2",
  },
  {
    title: "Visit Greensboro",
    description: "Experience campus, tour the wrestling room inside the Pride Sports Performance Center, and connect with current leaders.",
    icon: <Calendar className="h-5 w-5" aria-hidden="true" />,
    step: "Step 3",
  },
  {
    title: "Join the Pride",
    description: "Complete admissions steps, financial aid, and preseason onboarding to chase Southeast Regional and national podiums.",
    icon: <Trophy className="h-5 w-5" aria-hidden="true" />,
    step: "Step 4",
  },
]

const quickFacts = [
  {
    title: "Location",
    value: "Greensboro, North Carolina",
    icon: <MapPin className="h-5 w-5" aria-hidden="true" />,
  },
  {
    title: "Division",
    value: "NCAA Division III",
    icon: <GraduationCap className="h-5 w-5" aria-hidden="true" />,
  },
  {
    title: "Conference",
    value: "USA South / SEWC",
    icon: <Building2 className="h-5 w-5" aria-hidden="true" />,
  },
  {
    title: "Academic Profile",
    value: "Personalized classrooms • Career-ready majors",
    icon: <Users className="h-5 w-5" aria-hidden="true" />,
  },
]

const focusAreas = [
  {
    title: "Hustle & Heart Identity",
    description:
      "Pride wrestlers bring relentless pressure, mat-savvy tactics, and North Carolina toughness to every dual. The program values multi-sport competitors who embrace a family-first culture.",
  },
  {
    title: "Carolina Recruiting Pipeline",
    description:
      "Greensboro College targets Tar Heel standouts plus emerging prospects across the Mid-Atlantic and Southeast searching for a DIII platform with immediate impact potential.",
  },
  {
    title: "Individualized Development",
    description:
      "Athletes receive custom strength cycles, sports performance support, and position-specific coaching delivered inside a tight-knit roster where every rep is tracked.",
  },
]

const academicHighlights = [
  "12:1 student-to-faculty ratio and professors who know wrestlers by name",
  "Internship-rich majors in Business Administration, Exercise & Sport Studies, Education, and the Arts",
  "Center for Innovation & Entrepreneurship connects athletes with regional business mentors",
  "Pride 360 Leadership curriculum blends character development with community engagement projects",
]

export default function GreensboroCollegePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div
        className="relative overflow-hidden border-b border-slate-800"
        style={{
          background: `radial-gradient(circle at top left, ${ACCENT_GREEN} 0%, rgba(15,23,42,0.88) 45%)`,
        }}
      >
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div
            className="absolute -top-24 -right-16 h-72 w-72 rounded-full blur-3xl"
            style={{ backgroundColor: PRIMARY_GREEN }}
          />
        </div>

        <section className="relative container mx-auto px-4 py-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <Badge className="bg-white/10 text-slate-100 border-white/20 uppercase tracking-[0.3em]">
                Greensboro College Pride Wrestling
              </Badge>
              <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
                Build Your Legacy with the Pride in the Heart of the Triad
              </h1>
              <p className="text-slate-300 text-lg leading-relaxed">
                Greensboro College Wrestling brings an attacking, blue-collar style to NCAA Division III competition. The Pride
                embraces North Carolina roots, a growing Southeast recruiting footprint, and a campus community committed to
                student-athlete success on the mat, in the classroom, and across the community.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button
                  size="lg"
                  className="bg-white text-slate-900 hover:bg-slate-200 transition-colors"
                  asChild
                >
                  <Link href="https://greensborocollegesports.com/sports/mens-wrestling" target="_blank" rel="noreferrer">
                    Explore Pride Wrestling
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/40 text-white hover:bg-white/10"
                  asChild
                >
                  <Link href="mailto:wrestling@greensboro.edu">Contact the Coaching Staff</Link>
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-white/0 blur-3xl" />
              <div className="relative rounded-2xl border border-white/10 bg-slate-900/60 shadow-2xl p-8 space-y-8">
                <div className="flex items-center justify-center rounded-xl bg-white/10 border border-white/20 py-10">
                  <div
                    className="text-5xl font-serif tracking-tight"
                    style={{ color: PRIMARY_GREEN }}
                    aria-label="Greensboro College Pride logo script"
                  >
                    GC Pride
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
                <CardTitle className="text-2xl text-white">Academic + Athletic Balance</CardTitle>
                <p className="text-slate-300 mt-2">
                  Greensboro College blends DIII flexibility with professional-ready academics. Wrestlers explore majors that
                  translate into internships, graduate programs, and leadership roles in the Triad and beyond.
                </p>
              </div>
              <Badge className="bg-white/10 text-white border-white/20">Greensboro, NC • Pride Nation</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {academicHighlights.map((highlight) => (
                <div
                  key={highlight}
                  className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3"
                >
                  <div className="mt-1 h-2 w-2 rounded-full" style={{ backgroundColor: LIGHT_MINT }} />
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
                Recruiting Plan
              </Badge>
              <h2 className="text-3xl font-semibold text-white">Your Greensboro Pride Journey</h2>
              <p className="text-slate-300">
                The Greensboro staff builds custom recruiting plans that connect elite student-athletes with the resources and
                culture of the Pride Wrestling program.
              </p>
            </div>
            <Button
              size="lg"
              className="bg-white text-slate-900 hover:bg-slate-200 transition-colors"
              asChild
            >
              <Link href="https://greensboro.edu/admissions" target="_blank" rel="noreferrer">
                Begin Admissions Steps
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
                  style={{ background: `linear-gradient(90deg, ${PRIMARY_GREEN}, ${LIGHT_MINT})` }}
                />
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-white/10 text-white border-white/20">{item.step}</Badge>
                    <div className="text-green-200">{item.icon}</div>
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
              Inside the Pride
            </Badge>
            <h2 className="text-3xl font-semibold text-white">Compete in the Gate City</h2>
            <p className="text-slate-300 leading-relaxed">
              Greensboro College sits minutes from the Greensboro Coliseum and downtown innovation hubs. Wrestlers train in a
              renovated facility emphasizing mat speed, pressure drilling, and film review while benefiting from athletic
              training, nutrition advising, and strength coaches committed to small-roster focus.
            </p>
            <p className="text-slate-300 leading-relaxed">
              Pride Wrestling is woven into the Greensboro community—from youth clinics to service projects across the Triad.
              Graduates build networks that stretch through education, business, sport management, and the public sector.
            </p>
          </div>

          <div className="grid gap-4">
            <Card className="bg-slate-900/60 border border-slate-800">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white mb-2">What Coaches Prioritize</h3>
                <ul className="space-y-2 text-slate-300 text-sm leading-relaxed">
                  <li>• High-motor competitors who thrive in scramble positions</li>
                  <li>• Strong academic record with a growth mindset in the classroom</li>
                  <li>• Multi-sport or leadership experiences that show team-first mentality</li>
                  <li>• Families eager to engage with Pride alumni and Greensboro community service</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/60 border border-slate-800">
              <CardContent className="p-6 space-y-3">
                <h3 className="text-lg font-semibold text-white">Key Recruiting Windows</h3>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-white/10 text-white border-white/20">Fall Prospect Camps</Badge>
                  <Badge className="bg-white/10 text-white border-white/20">Winter Dual Visits</Badge>
                  <Badge className="bg-white/10 text-white border-white/20">Southeast Regional</Badge>
                  <Badge className="bg-white/10 text-white border-white/20">National Qualifier Cycle</Badge>
                </div>
                <p className="text-sm text-slate-300">
                  Submit your info early to lock in campus visits. The coaching staff works closely with admissions and financial
                  aid to build a clear roadmap for every committed wrestler.
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
              <h3 className="text-2xl font-semibold text-white">Ready to rep the Greensboro Pride?</h3>
              <p className="text-slate-300">
                A Greensboro College coach will help you map out the next steps, from academic fit to training expectations inside
                Hanes Gym.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                className="bg-white text-slate-900 hover:bg-slate-200 transition-colors"
                asChild
              >
                <Link href="mailto:wrestling@greensboro.edu">Email Pride Wrestling</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
                asChild
              >
                <Link href="/colleges">Return to Colleges</Link>
              </Button>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Greensboro College · 815 W. Market Street · Greensboro, NC 27401 · NCAA Division III · USA South Athletic Conference
          </p>
        </div>
      </footer>
    </div>
  )
}


