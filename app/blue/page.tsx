"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Star } from "lucide-react"
import { BLUE_IMAGE_KEYS, type BlueContent } from "@/lib/blue-content"
import type { BlueAlumnus } from "@/lib/blue-alumni"
import { BlueAlumniTable } from "./blue-alumni-table"
import { BlueExpressInterestForm } from "./blue-express-interest-form"
import { BackToTop } from "./back-to-top"
import { CoachCard } from "./coach-card"
import { NextStepsCTA } from "./next-steps-cta"

const GOLD = "#D3B574"
const NATIONAL_TEAM_ABOUT_URL = "/national-team"
const NATIONAL_TEAM_SCHEDULE_URL = "/national-team"
const NATIONAL_TEAM_INTEREST_FORM_URL = "/national-team/interest-form"
const COMPETITION_CALENDAR_URL = "/national-team"
const NC_UNITED_CALENDAR_URL = "/calendar"

export default function BluePage() {
  const [images, setImages] = useState<BlueContent | null>(null)
  const [alumni, setAlumni] = useState<BlueAlumnus[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch("/api/blue/content", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/blue/alumni", { cache: "no-store" }).then(async (r) => {
        const data = await r.json()
        return data?.ok ? data.alumni ?? [] : []
      }),
    ])
      .then(([content, alumniList]) => {
        if (cancelled) return
        setImages(content && typeof content === "object" ? content as BlueContent : BLUE_IMAGE_KEYS as unknown as BlueContent)
        setAlumni(Array.isArray(alumniList) ? alumniList : [])
      })
      .catch(() => {
        if (!cancelled) {
          setImages(BLUE_IMAGE_KEYS as unknown as BlueContent)
          setAlumni([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  if (loading || !images) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-[#003366]/80">Loading Blue...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto max-w-3xl px-4 py-10 md:px-6">
        <figure className="mb-12">
          <div className="overflow-hidden rounded-xl border-4 border-[#D3B574]/50 bg-white shadow-lg">
            <Image
              src={images.blue_banner_url}
              alt="NC United Blue"
              width={1200}
              height={600}
              className="h-auto w-full object-contain"
              unoptimized
              priority
            />
          </div>
        </figure>

        <div className="mb-10 rounded-xl border-2 border-[#B31B1B] bg-[#B31B1B] px-5 py-4 text-center text-white">
          <p className="font-semibold">
            All 2026 State Qualifiers: fill out the form below to express interest in Blue.
          </p>
          <Link
            href="#state-qualifier"
            className="mt-2 inline-block text-sm font-medium text-white hover:underline"
          >
            Go to form →
          </Link>
        </div>

        <article className="space-y-16">
          <section id="what-is">
            <h2 className="mb-4 text-2xl font-bold text-[#003366]">What Is NC United Blue</h2>
            <p className="leading-relaxed text-[#003366]/90 mb-4">
              NC United Blue is the premier training and competition program for North Carolina&apos;s top high school wrestlers. Blue brings the state&apos;s best athletes together for high-level sparring, situational wrestling, and live matches with different partners and styles.
            </p>
            <p className="leading-relaxed text-[#003366]/90">
              Blue is built on a simple idea: elite wrestlers grow faster when they train with other elite wrestlers. Two concentrated practices each month allow us to assemble stronger rooms, set shared expectations, demand accountability, and create a culture where North Carolina&apos;s best sharpen each other.
            </p>
          </section>

          <section id="next-steps" className="my-10">
            <NextStepsCTA />
          </section>

          <section id="mission">
            <h2 className="mb-4 text-2xl font-bold text-[#003366]">Mission & Vision</h2>
            <p className="leading-relaxed text-[#003366]/90">
              Our mission is to create opportunities for North Carolina wrestlers to train with
              the best coaches, compete against the best competition, and build a pipeline from
              high school to college and beyond. We aim to set the standard for what a state
              wrestling program can be—inclusively elite, transparent, and driven by results.
            </p>
          </section>

          <section id="format">
            <h2 className="mb-4 text-2xl font-bold text-[#003366]">Sparring &amp; Live Wrestling</h2>
            <p className="mb-6 leading-relaxed text-[#003366]/90">
              Blue is centered on learning through wrestling. Coaches watch rounds, identify opportunities, give real-time feedback, and help athletes make adjustments while they compete.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="mb-2 font-semibold text-[#003366]">Every Blue Session</h3>
                  <p className="text-sm leading-relaxed text-[#003366]/90">
                    Sparring, situational wrestling, live matches, varied partners, and high-level competition across folkstyle, freestyle, and Greco-Roman.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-t-4 border-t-[#D3B574]" style={{ borderTopColor: GOLD }}>
                <CardContent className="pt-6">
                  <h3 className="mb-2 font-semibold text-[#003366]">Additional Development</h3>
                  <p className="text-sm leading-relaxed text-[#003366]/90">
                    Optional NC United Match Days will provide organized matches with singlets, officials, and scoring. Athletes seeking individual technical work may also book training through{" "}
                    <a href="https://www.wrestlingguild.com" target="_blank" rel="noreferrer" className="font-medium text-[#003366] hover:text-[#B31B1B] hover:underline">
                      The Wrestling Guild
                    </a>
                    .
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          <section id="what-makes-different">
            <h2 className="mb-4 text-2xl font-bold text-[#003366]">What Makes Blue Different</h2>
            <ul className="space-y-4 text-[#003366]/90">
              <li>
                <strong className="text-[#003366]">Train With the Best</strong> — Blue practices feature high school
                standouts alongside current NCAA wrestlers. You are in the room with people
                who have been where you want to go.
              </li>
              <li>
                <strong className="text-[#003366]">College coaches in the room</strong> — Regularly, college coaches from
                UNC, NC State, Mount Olive, Roanoke, Greensboro, Lynchburg, Belmont Abbey, and more lead or support
                practices so kids see a college-style cadence and environment.
              </li>
              <li>
                <strong className="text-[#003366]">A Room Built on Commitment</strong> — Fewer, more concentrated sessions only work when the best partners commit to being there. We build the opportunity; athletes build the room.
              </li>
            </ul>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="overflow-hidden rounded-lg border-2 border-[#D3B574]/50 bg-white shadow-md">
                <Image src={images.blue_what_makes_1} alt="NC United Blue training" width={400} height={300} className="h-auto w-full object-contain" unoptimized />
              </div>
              <div className="overflow-hidden rounded-lg border-2 border-[#D3B574]/50 bg-white shadow-md">
                <Image src={images.blue_what_makes_2} alt="NC United Blue in action" width={400} height={300} className="h-auto w-full object-contain" unoptimized />
              </div>
            </div>
          </section>

          <section id="opportunity">
            <h2 className="mb-4 text-2xl font-bold text-[#003366]">Opportunity & Obligation</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="mb-2 font-semibold">Opportunity</h3>
                  <p className="text-sm text-[#003366]/90">
                    Blue members gain access to training with college coaches, NCAA wrestlers,
                    and peers who push them in every session.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-t-4 border-t-[#D3B574]" style={{ borderTopColor: GOLD }}>
                <CardContent className="pt-6">
                  <h3 className="mb-2 font-semibold">Obligation</h3>
                  <p className="text-sm text-[#003366]/90">
                    With opportunity comes responsibility. Blue members represent North Carolina
                    and NC United.
                  </p>
                </CardContent>
              </Card>
            </div>
            <p className="mt-6 leading-relaxed text-[#003366]/90">
              For all Blue members, national competition is the path to achieving the highest goals.
            </p>
          </section>

          <section id="training">
            <h2 className="mb-4 text-2xl font-bold text-[#003366]">Training Environment & College Partnerships</h2>
            <div className="mb-6 overflow-hidden rounded-lg border-2 border-[#D3B574]/50 bg-white shadow-md">
              <Image src={images.blue_training_env} alt="NC United Blue training environment" width={700} height={400} className="h-auto w-full object-contain" unoptimized />
            </div>
            <p className="mb-4 leading-relaxed text-[#003366]/90">
              Blue meets twice each month so we can concentrate the best possible partners into fewer, higher-level sessions. UNC serves as our primary Sunday home, with additional college-room opportunities when available. Exact dates, times, and locations are published on the{" "}
              <Link href={NC_UNITED_CALENDAR_URL} className="font-medium text-[#003366] hover:text-[#D3B574] hover:underline">
                NC United calendar
              </Link>
              .
            </p>
            <div className="my-6 grid gap-4 md:grid-cols-2">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="mb-2 font-semibold text-[#003366]">Our Commitment</h3>
                  <p className="text-sm leading-relaxed text-[#003366]/90">
                    Publish schedules two months in advance, work around major competitions, secure elite environments, and continue investing in college coaches, collegiate athletes, and opportunities.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-t-4 border-t-[#D3B574]" style={{ borderTopColor: GOLD }}>
                <CardContent className="pt-6">
                  <h3 className="mb-2 font-semibold text-[#003366]">Your Commitment</h3>
                  <p className="text-sm leading-relaxed text-[#003366]/90">
                    Be in the room. Training partners traveling from across North Carolina—and the college programs investing their time—need a room filled with serious athletes.
                  </p>
                </CardContent>
              </Card>
            </div>
            <div id="drop-ins" className="rounded-xl border border-[#D3B574]/60 bg-[#F8F5EC] p-6">
              <h3 className="mb-2 text-lg font-semibold text-[#003366]">How Blue Drop-Ins Work</h3>
              <p className="leading-relaxed text-[#003366]/90">
                Drop-ins are available only for practices marked <strong>Drop-in available</strong> on the calendar. Select the practice, choose <strong>Secure Drop-in</strong>, enter the wrestler and parent or guardian information, accept the waiver, and complete the secure $25 payment. A drop-in reserves one athlete&apos;s place for that session only; availability is limited by the capacity of each event and is open to middle and high school wrestlers.
              </p>
              <Link href={NC_UNITED_CALENDAR_URL} className="mt-4 inline-flex rounded-md bg-[#003366] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#B31B1B]">
                View Blue practices &amp; drop-in availability →
              </Link>
            </div>
          </section>

          <section id="national-team">
            <h2 className="mb-4 text-2xl font-bold text-[#003366]">National Team Pipeline & Competition</h2>
            <p className="mb-4 leading-relaxed text-[#003366]/90">
              The NC United National Team competes in <strong className="text-[#003366]">dual</strong> format and is among the most successful NC-based teams in state history.
            </p>
            <div className="my-6 overflow-hidden rounded-xl border-2 border-[#D3B574]/50 bg-white shadow-md">
              <Image
                src={images.blue_pipeline}
                alt="NC United National Team"
                width={900}
                height={500}
                className="h-auto w-full object-contain"
                unoptimized
              />
            </div>
            <p className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
              <Link href={NATIONAL_TEAM_SCHEDULE_URL} className="font-medium text-[#003366] hover:text-[#B31B1B] hover:underline">About our National Team →</Link>
              <Link href={COMPETITION_CALENDAR_URL} className="font-medium text-[#003366] hover:text-[#B31B1B] hover:underline">Competition Calendar →</Link>
              <Link href={NATIONAL_TEAM_INTEREST_FORM_URL} className="font-medium text-[#003366] hover:text-[#B31B1B] hover:underline">National Team Interest Form →</Link>
            </p>
          </section>

          <figure className="my-10">
            <div className="overflow-hidden rounded-xl border-4 border-[#D3B574]/50 bg-white shadow-lg">
              <Image
                src={images.blue_national_team_kids}
                alt="NC United National Team"
                width={900}
                height={600}
                className="h-auto w-full object-contain"
                unoptimized
              />
            </div>
          </figure>

          <section id="recruiting">
            <h2 className="mb-4 text-2xl font-bold text-[#003366]">Recruiting Support & Exposure</h2>
            <p className="mb-6 leading-relaxed text-[#003366]/90">
              Blue creates meaningful recruiting exposure both in the room and through each athlete&apos;s NC United profile. College coaches can evaluate athletes in high-level environments while athlete profiles give them a central place to review accomplishments, results, and recruiting information.
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="mb-2 font-semibold text-[#003366]">In the Room</h3>
                  <p className="text-sm leading-relaxed text-[#003366]/90">
                    College coaches and collegiate wrestlers may attend or support sessions, creating opportunities for evaluation, relationships, and real conversations.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <h3 className="mb-2 font-semibold text-[#003366]">Athlete Profiles</h3>
                  <p className="text-sm leading-relaxed text-[#003366]/90">
                    A complete, current athlete profile helps coaches find and evaluate North Carolina wrestlers beyond a single practice or tournament.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-t-4 border-t-[#D3B574]" style={{ borderTopColor: GOLD }}>
                <CardContent className="pt-6">
                  <h3 className="mb-2 font-semibold text-[#003366]">Measurable Interest</h3>
                  <p className="text-sm leading-relaxed text-[#003366]/90">
                    Athletes and linked parents can privately see profile-view totals, including views and distinct visitors from college-coach accounts. Coach names remain private.
                  </p>
                </CardContent>
              </Card>
            </div>
            <p className="mt-5 text-sm leading-relaxed text-[#003366]/75">
              Exposure creates opportunity, but it does not guarantee recruitment, contact, an offer, or a roster spot.
            </p>
            <p className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              <Link href="/profile" className="font-medium text-[#003366] hover:text-[#B31B1B] hover:underline">Create or update an athlete profile →</Link>
              <Link href="/athletes" className="font-medium text-[#003366] hover:text-[#B31B1B] hover:underline">Explore athlete profiles →</Link>
            </p>
          </section>

          <section id="roster">
            <h2 className="mb-4 text-2xl font-bold text-[#003366]">Blue Roster (Current Members)</h2>
            <p className="mb-6 leading-relaxed text-[#003366]/90">
              The current squad includes 40+ state titles, 70+ state qualifiers, and commits across D1, D2, D3, NAIA, and Juco.
            </p>
            <div className="overflow-hidden rounded-xl border-2 border-[#D3B574]/50 bg-white shadow-md">
              <Image src={images.blue_team_photo} alt="NC United Blue Team" width={900} height={600} className="h-auto w-full object-contain" unoptimized />
            </div>
          </section>

          <section id="alumni">
            <h2 className="mb-4 text-2xl font-bold text-[#003366]">Blue Alumni</h2>
            <p className="mb-6 leading-relaxed text-[#003366]/90">
              Alumni matter. They return during breaks and summer, scrap live with current members, and mentor the next generation.
            </p>
            <BlueAlumniTable alumni={alumni} />
          </section>

          <section id="coaching-excellence">
            <h2 className="mb-4 text-2xl font-bold text-[#003366]">Coaching Excellence</h2>
            <p className="mb-6 text-[#003366]/90">Led by Coach Macchiavello, Coach Palmer, and Coach Fisher.</p>
            <div className="grid gap-8 md:grid-cols-3">
              <CoachCard imageSrc={images.blue_coach_colton_palmer} imageAlt="Colton Palmer" name="Colton Palmer" shortBio="Colton Palmer is a former NC State wrestler, four-year letter winner, team co-captain, and NCAA Tournament qualifier." longBio="A two-time NCHSAA state champion and former national record holder in career wins." />
              <CoachCard imageSrc={images.blue_coach_mike_macchiavello} imageAlt="Mike Macchiavello" name="Mike Macchiavello" shortBio="Mike Macchiavello is a North Carolina native, NCAA Division I National Champion at NC State, and Co-Founder of NC United." longBio="A former NC high school state champion and U.S. National Team member." />
              <CoachCard imageSrc={images.blue_coach_araad_fischer} imageAlt="Araad Fisher" name="Araad Fisher" shortBio="Araad Fisher is a former Duke wrestler and four-year starter." longBio="A North Carolina state finalist and High School All-American." />
            </div>
          </section>

          <section id="testimonials">
            <h2 className="mb-4 text-2xl font-bold text-[#003366]">Testimonials</h2>
            <div className="space-y-6">
              <Card className="border-2 border-[#D3B574]/40 overflow-hidden">
                <CardContent className="p-0">
                  <div className="md:flex md:items-stretch">
                    <div className="md:w-1/2 aspect-video md:min-h-[280px] bg-[#003366]/5">
                      <iframe src="https://www.youtube.com/embed/0gfFU6hkpY4?start=1181" title="UNC Associate Head Coach Testimonial" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full min-h-[220px]" />
                    </div>
                    <div className="md:w-1/2 p-6 flex flex-col justify-center">
                      <div className="flex text-[#D3B574] mb-3">{[1, 2, 3, 4, 5].map((i) => <Star key={i} className="h-5 w-5 fill-current" />)}</div>
                      <blockquote className="text-[#003366]/90 italic mb-4">
                        &ldquo;NC United is doing an incredible job of bringing together the best talent in North Carolina.&rdquo;
                      </blockquote>
                      <div className="font-semibold text-[#003366]">Tony Ramos</div>
                      <div className="text-sm text-[#003366]/80">Associate Head Coach, UNC Wrestling</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          <section id="qualification">
            <h2 className="mb-4 text-2xl font-bold text-[#003366]">Qualification & Selection</h2>
            <p className="leading-relaxed text-[#003366]/90">
              Blue is invite-led with structured pathways for consideration. We look for athletes who demonstrate they love the sport—competing year-round and actively seeking the best training partners and competition.
            </p>
            <p className="font-medium text-[#003366]/90 mt-4">
              Important: Expressing interest does not equal acceptance. Invites are extended based on merit, fit, and program capacity.
            </p>
          </section>

          <section id="state-qualifier">
            <h2 className="mb-4 text-2xl font-bold text-[#003366]">State Qualifier Interest & Blue Membership</h2>
            <p className="mb-6 leading-relaxed text-[#003366]/90">
              State qualifiers are determined the weekend before States. We will review submissions and extend invites to those who fit the program.
            </p>
            <div className="flex flex-col md:flex-row md:items-start gap-6 md:gap-8" id="membership">
              <div className="flex-shrink-0 w-full md:w-[280px] overflow-hidden rounded-xl border-2 border-[#D3B574]/50 bg-white shadow-md">
                <Image src={images.blue_shirt} alt="NC United Blue shirt" width={280} height={320} className="h-auto w-full object-contain" unoptimized />
              </div>
              <Card className="flex-1 min-w-0 border-t-4 border-t-[#D3B574]" style={{ borderTopColor: GOLD }}>
                <CardContent className="pt-6">
                  <p className="leading-relaxed text-[#003366]/90">
                    Blue membership represents inclusion in a year-round training and development environment built on shared standards, accountability, and long-term growth. Membership is invite-led, not automatic.
                  </p>
                  <p className="mt-4 leading-relaxed text-[#003366]/90">
                    After you register and pay online, pick up your Blue shirt at your first scheduled practice. Check the{" "}
                    <Link href={NC_UNITED_CALENDAR_URL} className="font-medium text-[#003366] hover:text-[#B31B1B] hover:underline">
                      NC United calendar
                    </Link>{" "}
                    for the exact date, time, and location.
                  </p>
                </CardContent>
              </Card>
            </div>
            <div className="mt-10 max-w-xl">
              <h3 className="mb-3 text-lg font-semibold text-[#003366]">Express interest in Blue</h3>
              <p className="mb-4 text-sm text-[#003366]/90">If you qualified for states and want to express interest, submit the form below.</p>
              <BlueExpressInterestForm />
            </div>
          </section>
        </article>

        <footer className="mt-16 border-t border-[#D3B574]/40 pt-8 text-center text-[#003366]/80 space-y-3">
          <p>
            <Link href="#state-qualifier" className="font-medium text-[#003366] hover:text-[#D3B574] hover:underline">Express interest in Blue →</Link>
          </p>
          <p>
            <Link href={NC_UNITED_CALENDAR_URL} className="font-medium text-[#003366] hover:text-[#D3B574] hover:underline">View the NC United calendar →</Link>
          </p>
          <BackToTop />
        </footer>
      </div>
    </div>
  )
}
