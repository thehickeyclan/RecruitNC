import Link from "next/link"
import Image from "next/image"
import { unstable_noStore } from "next/cache"
import { Card, CardContent } from "@/components/ui/card"
import type { Metadata } from "next"
import { Star } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getBlueContent } from "@/lib/blue-content"
import { BlueAlumniTable } from "./blue-alumni-table"
import { getBlueAlumni } from "@/lib/blue-alumni"
import { BlueExpressInterestForm } from "./blue-express-interest-form"
import { BackToTop } from "./back-to-top"
import { CoachCard } from "./coach-card"
import { NextStepsCTA } from "./next-steps-cta"

const NAVY = "#03154C"
const GOLD = "#D3B574"

// National Team hub = about + schedule; interest form = expressions of interest
const NATIONAL_TEAM_ABOUT_URL = "/national-team"
const NATIONAL_TEAM_SCHEDULE_URL = "/national-team"
const NATIONAL_TEAM_INTEREST_FORM_URL = "/national-team/interest-form"
const COMPETITION_CALENDAR_URL = "/national-team"
// Practice schedule & drop-in sign-up
const NC_UNITED_CALENDAR_URL = "https://calendar.ncwrestlingunited.com/"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "NC United Blue | NC Wrestling United",
  description:
    "Creating Opportunity. Setting the Standard. Representing North Carolina. NC United Blue is the flagship development program for elite high school wrestlers.",
}

export default async function BluePage() {
  unstable_noStore()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let isAdmin = false
  if (user) {
    const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
    isAdmin = !!profile?.is_admin
  }
  const [images, alumni] = await Promise.all([
    getBlueContent(),
    getBlueAlumni(),
  ])
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto max-w-3xl px-4 py-10 md:px-6">
        {/* Banner — Admin → Blue to upload/replace */}
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

        {/* Call-out: 2026 State Qualifiers */}
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

        {/* Main Content — Identity → Standards → Experience → Proof → Access → Action */}
        <article className="space-y-16">
          {/* 1. Hero + What Is NC United Blue */}
          <section id="what-is">
            <h2 className="mb-4 text-2xl font-bold text-[#03154C]">What Is NC United Blue</h2>
            <p className="leading-relaxed text-[#03154C]/90 mb-4">
              NC United Blue is the premier training and competition program for North Carolina&apos;s top high school wrestlers. It brings the state&apos;s best athletes together in one environment—training under common standards, pushing each other daily, and competing as a unified group on the biggest stages.
            </p>
            <p className="leading-relaxed text-[#03154C]/90">
              Blue is built on a simple idea: elite wrestlers grow faster when they train with other elite wrestlers. By setting shared expectations, demanding accountability, and competing together, NC United Blue creates a culture where North Carolina&apos;s best sharpen each other and represent the state with pride.
            </p>
          </section>

          {/* Next Steps — Choose how you want to explore Blue (Learn / Train / Join) */}
          <section id="next-steps" className="my-10">
            <NextStepsCTA />
          </section>

          {/* 2. Mission & Vision */}
          <section id="mission">
            <h2 className="mb-4 text-2xl font-bold text-[#03154C]">Mission & Vision</h2>
            <p className="leading-relaxed text-[#03154C]/90">
              Our mission is to create opportunities for North Carolina wrestlers to train with
              the best coaches, compete against the best competition, and build a pipeline from
              high school to college and beyond. We aim to set the standard for what a state
              wrestling program can be—inclusively elite, transparent, and driven by results.
            </p>
          </section>

          {/* 3. What Makes Blue Different */}
          <section id="what-makes-different">
            <h2 className="mb-4 text-2xl font-bold text-[#03154C]">What Makes Blue Different</h2>
            <ul className="space-y-4 text-[#03154C]/90">
              <li>
                <strong className="text-[#03154C]">Train With the Best</strong> — Blue practices feature high school
                standouts alongside current NCAA wrestlers. You are in the room with people
                who have been where you want to go.
              </li>
              <li>
                <strong className="text-[#03154C]">College coaches in the room</strong> — Regularly, college coaches from
                UNC, NC State, Mount Olive, Roanoke, Greensboro, Lynchburg, Belmont Abbey, and more lead or support
                practices so kids see a college-style cadence and environment. Coaches get to know athletes and huddle
                with them for Q&A on recruiting, college transitions, expectations, and more.
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

          {/* 4. Opportunity & Obligation */}
          <section id="opportunity">
            <h2 className="mb-4 text-2xl font-bold text-[#03154C]">Opportunity & Obligation</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="mb-2 font-semibold">Opportunity</h3>
                  <p className="text-sm text-[#03154C]/90">
                    Blue members gain access to training with college coaches, NCAA wrestlers,
                    and peers who push them every day. They compete at national events, build
                    relationships with recruiters, and develop skills that translate to the next
                    level.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-t-4 border-t-[#D3B574]" style={{ borderTopColor: GOLD }}>
                <CardContent className="pt-6">
                  <h3 className="mb-2 font-semibold">Obligation</h3>
                  <p className="text-sm text-[#03154C]/90">
                    With opportunity comes responsibility. Blue members represent North Carolina
                    and NC United. They are expected to show up, work hard, support teammates,
                    and carry themselves with integrity on and off the mat.
                  </p>
                </CardContent>
              </Card>
            </div>
            <p className="mt-6 leading-relaxed text-[#03154C]/90">
              For all Blue members, national competition is the path to achieving the highest goals. The expectation is participation in tournaments at the caliber of NHSCA, Super32, Journeymen, Beast of the East, Ironman, and—where appropriate for age and weight—college opens.
            </p>
          </section>

          {/* 5. Training Environment & College Partnerships */}
          <section id="training">
            <h2 className="mb-4 text-2xl font-bold text-[#03154C]">
              Training Environment & College Partnerships
            </h2>
            <div className="mb-6 overflow-hidden rounded-lg border-2 border-[#D3B574]/50 bg-white shadow-md">
              <Image src={images.blue_training_env} alt="NC United Blue training environment" width={700} height={400} className="h-auto w-full object-contain" unoptimized />
            </div>
            <p className="mb-4 leading-relaxed text-[#03154C]/90">
              Blue practices are <strong className="text-[#03154C]">Sundays 1–3pm</strong> at the UNC wrestling room in
              Fetzer Hall—every other Sunday in season, every Sunday post season.{" "}
              <a href={NC_UNITED_CALENDAR_URL} target="_blank" rel="noopener noreferrer" className="font-medium text-[#03154C] hover:text-[#D3B574] hover:underline">
                View the NC United calendar →
              </a>
            </p>
            <ul className="space-y-3 leading-relaxed text-[#03154C]/90">
              <li>
                <strong className="text-[#03154C]">UNC</strong> serves as the primary home for
                Blue practices, giving members consistent access to Chapel Hill and the Tar Heel
                program.
              </li>
              <li>
                <strong className="text-[#03154C]">NC State</strong> provides additional support
                and access, reinforcing the depth of college partnerships.
              </li>
              <li>
                <strong className="text-[#03154C]">Partnerships across the Southeast</strong> —
                Our most elite groups sometimes train with other colleges (e.g., UVA) to
                maximize exposure and development.
              </li>
            </ul>
            <div className="mt-6 rounded-lg border-2 border-[#D3B574]/40 bg-[#03154C]/5 p-5">
              <h3 className="text-lg font-semibold text-[#03154C] mb-2">Drop-ins</h3>
              <p className="text-[#03154C]/90 text-sm leading-relaxed mb-2">
                Drop-ins are welcome. We have limited availability per practice. To attend, sign up on the{" "}
                <a href={NC_UNITED_CALENDAR_URL} target="_blank" rel="noopener noreferrer" className="font-medium text-[#03154C] hover:text-[#D3B574] hover:underline">
                  NC United calendar
                </a>
                {" "}by clicking on the practice and completing the registration form.
              </p>
            </div>
          </section>

          {/* 6. National Team Pipeline & Competition (schedule links inside) */}
          <section id="national-team">
            <h2 className="mb-4 text-2xl font-bold text-[#03154C]">National Team Pipeline & Competition</h2>
            <p className="mb-4 leading-relaxed text-[#03154C]/90">
              The NC United National Team competes in <strong className="text-[#03154C]">dual</strong> format and is among the most successful NC-based teams in state
              history. Last year, the National Team went 7–1 at NHSCA Duals and reached the
              Round of 16 before losing to a multi-state all-star team.
            </p>
            <div className="my-6 overflow-hidden rounded-xl border-2 border-[#D3B574]/50 bg-white shadow-md">
              <Image
                src={images.blue_pipeline}
                alt="NC United National Team — NHSCA Duals 2025, Virginia Beach, VA"
                width={900}
                height={500}
                className="h-auto w-full object-contain"
                unoptimized
              />
            </div>
            <p className="mb-4 text-sm text-[#03154C]/90">
              <Link href={NATIONAL_TEAM_ABOUT_URL} className="font-medium text-[#03154C] hover:text-[#D3B574] hover:underline">
                Learn more about the National Team →
              </Link>
            </p>
            <div id="schedule">
              <p className="mb-4 leading-relaxed text-[#03154C]/90">
                Blue competes at national events throughout the year. The National Team schedule
                and competition calendar are linked below.
              </p>
              <p className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                <Link
                  href={NATIONAL_TEAM_SCHEDULE_URL}
                  className="font-medium text-[#03154C] hover:text-[#B31B1B] hover:underline"
                >
                  About our National Team →
                </Link>
                <Link
                  href={COMPETITION_CALENDAR_URL}
                  className="font-medium text-[#03154C] hover:text-[#B31B1B] hover:underline"
                >
                  Competition Calendar →
                </Link>
                <Link
                  href={NATIONAL_TEAM_INTEREST_FORM_URL}
                  className="font-medium text-[#03154C] hover:text-[#B31B1B] hover:underline"
                >
                  National Team Interest Form →
                </Link>
              </p>
            </div>
          </section>

          {/* National Team Kids — Admin → Blue to upload/replace */}
          <figure className="my-10">
            <div className="overflow-hidden rounded-xl border-4 border-[#D3B574]/50 bg-white shadow-lg">
              <Image
                src={images.blue_national_team_kids}
                alt="Tobin McNair, Mac Johnson, and Bentley Sly representing NC United National Team"
                width={900}
                height={600}
                className="h-auto w-full object-contain"
                unoptimized
              />
            </div>
            <figcaption className="mt-2 text-center text-sm text-[#03154C]/80">
              Tobin McNair, Mac Johnson, and Bentley Sly (left to right) — NC United National Team
            </figcaption>
          </figure>

          {/* 7. Recruiting Support & Exposure */}
          <section id="recruiting">
            <h2 className="mb-4 text-2xl font-bold text-[#03154C]">Recruiting Support & Exposure</h2>
            <p className="leading-relaxed text-[#03154C]/90 mb-4">
              College coaches want to see athletes <span className="font-medium text-[#03154C]">training with the best, competing against the best, and beating the best</span>. NC United is built to facilitate exactly that: Blue members train in a high-accountability environment, compete at national events, and build a résumé that speaks for itself. We bring clarity and real opportunity to the recruiting process by understanding each athlete&apos;s goals—academically, athletically, and personally—and by connecting college coaches with our athletes through RecruitNC and regular updates.
            </p>
            <p className="leading-relaxed text-[#03154C]/90 mb-4">
              Our ecosystem raises the level for everyone. We host an annual College Coaches Lounge at the state championships, offer internship assistance and career planning programs, and celebrate commitments through signing announcements and our Signing Day podcast. Local college programs are deeply engaged with NC United and get to know our athletes long before recruiting decisions are made—so when it&apos;s time to commit, our wrestlers are ready.
            </p>
          </section>

          {/* 8. Blue Roster (Current Members) */}
          <section id="roster">
            <h2 className="mb-4 text-2xl font-bold text-[#03154C]">Blue Roster (Current Members)</h2>
            <p className="mb-6 leading-relaxed text-[#03154C]/90">
              The current squad includes 40+ state titles, 70+ state qualifiers, 15 NHSCA /
              Super32 / Ironman All-Americans, and commits across D1, D2, D3, NAIA, and Juco.
            </p>
            <div className="overflow-hidden rounded-xl border-2 border-[#D3B574]/50 bg-white shadow-md">
              <Image
                src={images.blue_team_photo}
                alt="NC United Blue Team"
                width={900}
                height={600}
                className="h-auto w-full object-contain"
                unoptimized
              />
            </div>
          </section>

          {/* 9. Blue Alumni */}
          <section id="alumni">
            <h2 className="mb-4 text-2xl font-bold text-[#03154C]">Blue Alumni</h2>
            <p className="mb-6 leading-relaxed text-[#03154C]/90">
              Alumni matter. They return during breaks and summer, scrap live with current
              members, and mentor the next generation. Blue is a program, not a one-time
              experience—alumni stay connected and give back.
            </p>
            <BlueAlumniTable alumni={alumni} />
          </section>

          {/* 10. Coaching Excellence */}
          <section id="coaching-excellence">
            <h2 className="mb-4 text-2xl font-bold text-[#03154C]">Coaching Excellence</h2>
            <p className="mb-6 text-[#03154C]/90">
              Led by Coach Macchiavello, Coach Palmer, and Coach Fisher.
            </p>
            <div className="grid gap-8 md:grid-cols-3">
              <CoachCard
                imageSrc={images.blue_coach_colton_palmer}
                imageAlt="Colton Palmer"
                name="Colton Palmer"
                shortBio="Colton Palmer is a former NC State wrestler, four-year letter winner, team co-captain, and NCAA Tournament qualifier."
                longBio="A two-time NCHSAA state champion and former national record holder in career wins, he now serves as VP of Enterprise Strategy & Development at Strategic Executives Agency and continues to give back as founder of NC Wrestling United, a volunteer coach, and a board member of NC USA Wrestling."
              />
              <CoachCard
                imageSrc={images.blue_coach_mike_macchiavello}
                imageAlt="Mike Macchiavello"
                name="Mike Macchiavello"
                shortBio="Mike Macchiavello is a North Carolina native, NCAA Division I National Champion at NC State, and Co-Founder of NC United."
                longBio="A former NC high school state champion and U.S. National Team member, he has represented Team USA internationally and served in leadership roles with USA Wrestling, including the Board of Directors and Executive Committee. He holds undergraduate and graduate degrees from NC State and remains deeply connected to North Carolina wrestling."
              />
              <CoachCard
                imageSrc={images.blue_coach_araad_fischer}
                imageAlt="Araad Fisher"
                name="Araad Fisher"
                shortBio="Araad Fisher is a former Duke wrestler and four-year starter who competed at 184, 197, and heavyweight."
                longBio="A North Carolina state finalist and High School All-American, he has built a successful career in high tech while continuing to give back to the wrestling community."
              />
            </div>
          </section>

          {/* 11. Testimonials */}
          <section id="testimonials">
            <h2 className="mb-4 text-2xl font-bold text-[#03154C]">Testimonials</h2>
            <p className="mb-6 text-[#03154C]/90">
              What coaches, parents, and wrestlers are saying about NC United.
            </p>
            <div className="space-y-6">
              <Card className="border-2 border-[#D3B574]/40 overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row md:items-stretch">
                    <div className="md:w-1/2 aspect-video md:aspect-auto md:min-h-[280px] bg-[#03154C]/5">
                      <iframe
                        src="https://www.youtube.com/embed/0gfFU6hkpY4?start=1181"
                        title="UNC Associate Head Coach Testimonial"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full min-h-[220px] md:min-h-[280px]"
                      />
                    </div>
                    <div className="md:w-1/2 p-6 flex flex-col justify-center">
                      <div className="flex text-[#D3B574] mb-3">
                        {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="h-5 w-5 fill-current" />)}
                      </div>
                      <blockquote className="text-[#03154C]/90 italic mb-4">
                        &ldquo;NC United is doing an incredible job of bringing together the best talent in North Carolina and
                        creating opportunities for these wrestlers to compete at the highest level. The program is producing
                        college-ready athletes who understand what it takes to succeed.&rdquo;
                      </blockquote>
                      <div className="font-semibold text-[#03154C]">Tony Ramos</div>
                      <div className="text-sm text-[#03154C]/80">Associate Head Coach, UNC Wrestling</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="border-2 border-[#D3B574]/40">
                  <CardContent className="p-6">
                    <div className="flex text-[#D3B574] mb-3">
                      {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="h-5 w-5 fill-current" />)}
                    </div>
                    <blockquote className="text-[#03154C]/90 italic mb-4 text-sm">
                      &ldquo;The experience my son had with NC United at the NHSCA Duals was incredible. The coaching,
                      organization, and level of competition were all top-notch. This program is truly developing
                      champions both on and off the mat.&rdquo;
                    </blockquote>
                    <div className="font-semibold text-[#03154C] text-sm">Kenneth Ouellette</div>
                    <div className="text-xs text-[#03154C]/80">Parent of NHSCA Duals Wrestler</div>
                  </CardContent>
                </Card>
                <Card className="border-2 border-[#D3B574]/40">
                  <CardContent className="p-6">
                    <div className="flex text-[#D3B574] mb-3">
                      {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="h-5 w-5 fill-current" />)}
                    </div>
                    <blockquote className="text-[#03154C]/90 italic mb-4 text-sm">
                      &ldquo;Being part of NC United has been the <span className="bg-[#D3B574]/25 px-1 rounded not-italic font-medium text-[#03154C]">highlight</span> of my wrestling career. The coaching, the
                      competition, and the camaraderie with teammates from across the state have all helped me improve
                      tremendously.&rdquo;
                    </blockquote>
                    <div className="font-semibold text-[#03154C] text-sm">Tye Johnson</div>
                    <div className="text-xs text-[#03154C]/80">NHSCA Duals Wrestler</div>
                  </CardContent>
                </Card>
              </div>
              <Card className="border-2 border-[#D3B574]/40">
                <CardContent className="p-6">
                  <div className="flex text-[#D3B574] mb-3">
                    {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="h-5 w-5 fill-current" />)}
                  </div>
                  <blockquote className="text-[#03154C]/90 italic mb-4">
                    &ldquo;The level of professionalism and organization that NC United brings to their national team program
                    is impressive. They&apos;re raising the bar for wrestling in our state and creating a model that others
                    should follow.&rdquo;
                  </blockquote>
                  <div className="font-semibold text-[#03154C]">Marcus Jackson</div>
                  <div className="text-sm text-[#03154C]/80">Director, Charlotte Wrestling Academy</div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* 12. Qualification & Selection */}
          <section id="qualification">
            <h2 className="mb-4 text-2xl font-bold text-[#03154C]">Qualification & Selection</h2>
            <p className="mb-4 leading-relaxed text-[#03154C]/90">
              Blue is invite-led with structured pathways for consideration. A critical piece: we look for athletes who <span className="font-medium text-[#03154C]">demonstrate they love the sport</span>—competing year-round and actively seeking the best training partners and competition. Typically, that includes elite high school athletes who have qualified for states and want to wrestle at the next level.
            </p>
            <p className="mb-4 leading-relaxed text-[#03154C]/90">
              We also consider edge cases: injuries that affected state qualification, athletes
              new to North Carolina, and standout middle school wrestlers when appropriate. We
              aim to be fair and inclusive while maintaining high standards.
            </p>
            <p className="font-medium text-[#03154C]/90">
              Important: Expressing interest does not equal acceptance. Invites are extended
              based on merit, fit, and program capacity.
            </p>
          </section>

          {/* 13. State Qualifier Interest & Blue Membership (consolidated) */}
          <section id="state-qualifier">
            <h2 className="mb-4 text-2xl font-bold text-[#03154C]">State Qualifier Interest & Blue Membership</h2>
            <p className="mb-6 leading-relaxed text-[#03154C]/90">
              State qualifiers are determined the weekend before States. We will review submissions and extend invites to those who fit the program.
            </p>
            <div className="flex flex-col md:flex-row md:items-start gap-6 md:gap-8" id="membership">
              <div className="flex-shrink-0 w-full md:w-[280px] overflow-hidden rounded-xl border-2 border-[#D3B574]/50 bg-white shadow-md">
                <Image
                  src={images.blue_shirt}
                  alt="NC United Blue shirt — symbol of membership"
                  width={280}
                  height={320}
                  className="h-auto w-full object-contain"
                  unoptimized
                />
              </div>
              <Card className="flex-1 min-w-0 border-t-4 border-t-[#D3B574]" style={{ borderTopColor: GOLD }}>
                <CardContent className="pt-6">
                  <p className="leading-relaxed text-[#03154C]/90">
                    Blue membership represents inclusion in a year-round training and development environment built on shared standards, accountability, and long-term growth. Membership is invite-led, not automatic, and is not defined by a single tournament. Invitations are extended throughout the year based on an athlete&apos;s body of work, commitment to improvement, and alignment with the culture of NC United Blue.
                  </p>
                  <p className="mt-4 leading-relaxed text-[#03154C]/90">
                    In addition to year-round invitations, a wave of invitations will be extended to select 2026 State Qualifiers, with official registration and Blue shirt pickup taking place at the State Championships. Invited athletes are asked to stop by Suite 109 at States to complete registration and receive their Blue shirt, which serves as a symbol of membership in the program.
                  </p>
                </CardContent>
              </Card>
            </div>
            <div className="mt-10 max-w-xl">
              <h3 className="mb-3 text-lg font-semibold text-[#03154C]">Express interest in Blue</h3>
              <p className="mb-4 text-sm text-[#03154C]/90">
                If you qualified for states and want to express interest, submit the form below.
              </p>
              <BlueExpressInterestForm />
            </div>
          </section>
        </article>

        {/* Back to top + link to form */}
        <footer className="mt-16 border-t border-[#D3B574]/40 pt-8 text-center text-[#03154C]/80 space-y-3">
          <p>
            <Link href="#state-qualifier" className="font-medium text-[#03154C] hover:text-[#D3B574] hover:underline">
              Express interest in Blue →
            </Link>
          </p>
          <BackToTop />
        </footer>
      </div>
    </div>
  )
}
