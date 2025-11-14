"use client"

import Link from "next/link"
import { ArrowRight, MapPin, GraduationCap, Users, Flame, Calendar, Trophy, Building2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const PRIMARY_CRIMSON = "#A6192E"
const ACCENT_CRIMSON = "#750019"
const STONE_WHITE = "#F4EDE6"

const timeline = [
  {
    title: "Raise Your Hand",
    description: "Send film, academic profile, and the Crusaders questionnaire to open an honest evaluation with Belmont Abbey staff.",
    icon: <Flame className="h-5 w-5" aria-hidden="true" />,
    step: "Step 1",
  },
  {
    title: "Culture Conversation",
    description: "Walk through the Abbey standard, leadership expectations, and how you fit into the Conference Carolinas mission.",
    icon: <Users className="h-5 w-5" aria-hidden="true" />,
    step: "Step 2",
  },
  {
    title: "Visit the Basilica & Room",
    description: "Tour campus, experience the Basilica of Mary Help of Christians, and train with current Crusaders inside the DII facility.",
    icon: <Calendar className="h-5 w-5" aria-hidden="true" />,
    step: "Step 3",
  },
  {
    title: "Sign with the Crusaders",
    description: "Finalize admissions, financial aid, and strength plans so you arrive ready to score bonus points in Conference Carolinas competition.",
    icon: <Trophy className="h-5 w-5" aria-hidden="true" />,
    step: "Step 4",
  },
]

const quickFacts = [
  {
    title: "Location",
    value: "Belmont, North Carolina",
    icon: <MapPin className="h-5 w-5" aria-hidden="true" />,
  },
  {
    title: "Division",
    value: "NCAA Division II",
    icon: <GraduationCap className="h-5 w-5" aria-hidden="true" />,
  },
  {
    title: "Conference",
    value: "Conference Carolinas",
    icon: <Building2 className="h-5 w-5" aria-hidden="true" />,
  },
  {
    title: "Academic Focus",
    value: "Catholic Benedictine liberal arts tradition",
    icon: <Users className="h-5 w-5" aria-hidden="true" />,
  },
]

const focusAreas = [
  {
    title: "Faith, Formation, Fight",
    description:
      "Belmont Abbey Wrestling blends Catholic Benedictine values with a relentless, bonus-point style. Crusaders are expected to grow spiritually, academically, and competitively every semester.",
  },
  {
    title: "Carolinas & Southeast Recruiting",
    description:
      "The staff targets physical, high-upside wrestlers across North Carolina, South Carolina, Georgia, and the Midwest who embrace servant leadership and a small-college environment.",
  },
  {
    title: "Development Inside the Abbey Arms Race",
    description:
      "Athletes leverage individualized strength cycles, the Crusaders Sports Performance Center, and a coaching staff obsessed with hand fighting, mat returns, and NCAA Championship berths.",
  },
]

const academicHighlights = [
  "11:1 student-to-faculty ratio with professors who invest in personal vocation",
  "Top majors include Business Management, Sport Management, Education, Theology, and Health Sciences",
  "Charlotte metro internships within finance, sport, healthcare, and non-profit leadership",
  "Habits of Excellence program pairs Crusaders with alumni mentors and campus ministry opportunities",
]

export default function BelmontAbbeyCollegePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div
        className="relative overflow-hidden border-b border-slate-900"
        style={{
          background: `radial-gradient(circle at top left, ${ACCENT_CRIMSON} 0%, rgba(15,23,42,0.88) 45%)`,
        }}
      >
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div
            className="absolute -top-24 -right-12 h-72 w-72 rounded-full blur-3xl"
            style={{ backgroundColor: PRIMARY_CRIMSON }}
          />
        </div>

        <section className="relative container mx-auto px-4 py-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <Badge className="bg-white/10 text-slate-100 border-white/20 uppercase tracking-[0.3em]">
                Belmont Abbey Crusaders Wrestling
              </Badge>
              <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
                Compete for the Abbey. Impact the Carolinas. Live the Crusader code.
              </h1>
              <p className="text-slate-300 text-lg leading-relaxed">
                Belmont Abbey Wrestling chases NCAA Division II titles while forming men of virtue. Located ten minutes from
                Charlotte, the Abbey pairs elite wrestling development with a Catholic liberal arts education rooted in community,
                mission, and excellence.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button
                  size="lg"
                  className="bg-white text-slate-900 hover:bg-slate-200 transition-colors"
                  asChild
                >
                  <Link
                    href="https://abbeyathletics.com/sports/wrestling"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Visit Crusaders Wrestling
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/40 text-white hover:bg-white/10"
                  asChild
                >
                  <Link href="mailto:wrestling@bac.edu">Connect with the Coaching Staff</Link>
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-white/0 blur-3xl" />
              <div className="relative rounded-2xl border border-white/10 bg-slate-900/60 shadow-2xl p-8 space-y-8">
                <div className="flex items-center justify-center rounded-xl bg-white/10 border border-white/20 py-10">
                  <div
                    className="text-5xl font-serif tracking-tight"
                    style={{ color: PRIMARY_CRIMSON }}
                    aria-label="Belmont Abbey monogram crest"
                  >
                    BA
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
                <CardTitle className="text-2xl text-white">Academics Anchored in Faith</CardTitle>
                <p className="text-slate-300 mt-2">
                  Crusaders discover their vocation through the Benedictine hallmarks of community, discipline, and stewardship.
                  Wrestlers graduate equipped for careers, graduate school, and servant leadership.
                </p>
              </div>
              <Badge className="bg-white/10 text-white border-white/20">Charlotte Metro Advantage</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {academicHighlights.map((highlight) => (
                <div
                  key={highlight}
                  className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3"
                >
                  <div className="mt-1 h-2 w-2 rounded-full" style={{ backgroundColor: STONE_WHITE }} />
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
                Recruiting Blueprint
              </Badge>
              <h2 className="text-3xl font-semibold text-white">#CrusaderNation Journey</h2>
              <p className="text-slate-300">
                The Belmont Abbey staff builds a personalized roadmap for each prospect—aligning academics, faith formation, and
                Division II podium goals.
              </p>
            </div>
            <Button
              size="lg"
              className="bg-white text-slate-900 hover:bg-slate-200 transition-colors"
              asChild
            >
              <Link href="https://belmontabbeycollege.edu/admissions" target="_blank" rel="noreferrer">
                Begin Abbey Admissions
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
                  style={{ background: `linear-gradient(90deg, ${PRIMARY_CRIMSON}, ${STONE_WHITE})` }}
                />
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-white/10 text-white border-white/20">{item.step}</Badge>
                    <div className="text-rose-200">{item.icon}</div>
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
              Why Belmont Abbey
            </Badge>
            <h2 className="text-3xl font-semibold text-white">Live, Train, and Serve 10 Minutes from Charlotte</h2>
            <p className="text-slate-300 leading-relaxed">
              Belmont Abbey College delivers a peaceful campus, Catholic community, and access to one of the fastest-growing job
              markets in the country. Crusaders train in a renovated facility focused on hand fighting, top work, and bonus-point
              production—all while leveraging sports performance, nutrition, and recovery resources built for Division II success.
            </p>
            <p className="text-slate-300 leading-relaxed">
              Wrestlers invest in Abbey Athletics service projects, campus ministry retreats, and the Abbey Crusader Club network.
              The result? A culture of humility, ferocity, and brotherhood that shows up every postseason in the Southeast Region.
            </p>
          </div>

          <div className="grid gap-4">
            <Card className="bg-slate-900/60 border border-slate-800">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white mb-2">What the Staff Looks For</h3>
                <ul className="space-y-2 text-slate-300 text-sm leading-relaxed">
                  <li>• Athletes who embrace discipline, faith, and academic accountability</li>
                  <li>• Attack-minded wrestlers with strong mat returns and ride time</li>
                  <li>• Multi-sport leaders or captains committed to culture-building</li>
                  <li>• Families seeking a Christ-centered college experience in the Carolinas</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/60 border border-slate-800">
              <CardContent className="p-6 space-y-3">
                <h3 className="text-lg font-semibold text-white">Recruiting Windows</h3>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-white/10 text-white border-white/20">Summer Crusader Camps</Badge>
                  <Badge className="bg-white/10 text-white border-white/20">Fall Official Visits</Badge>
                  <Badge className="bg-white/10 text-white border-white/20">Conference Carolinas Duals</Badge>
                  <Badge className="bg-white/10 text-white border-white/20">Southeast Super Regional</Badge>
                </div>
                <p className="text-sm text-slate-300">
                  Schedule early to lock in overnights and meeting slots with admissions, campus ministry, and academics. The staff
                  coordinates financial aid reviews and NCAA eligibility benchmarks for every prospect.
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
              <h3 className="text-2xl font-semibold text-white">Ready to become a Crusader?</h3>
              <p className="text-slate-300">
                Belmont Abbey coaches will guide you through the recruiting process and help you discover how your gifts elevate
                the program.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                className="bg-white text-slate-900 hover:bg-slate-200 transition-colors"
                asChild
              >
                <Link href="mailto:wrestling@bac.edu">Email Belmont Abbey Wrestling</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
                asChild
              >
                <Link href="/colleges">Browse All Colleges</Link>
              </Button>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Belmont Abbey College · 100 Belmont-Mt. Holly Road · Belmont, NC 28012 · NCAA Division II · Conference Carolinas
          </p>
        </div>
      </footer>
    </div>
  )
}
