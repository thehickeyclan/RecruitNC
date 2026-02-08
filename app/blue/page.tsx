import Link from "next/link"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import type { Metadata } from "next"
import { Star } from "lucide-react"
import { getBlueContent } from "@/lib/blue-content"
import { BlueRosterPlaceholder } from "./blue-roster-placeholder"
import { BlueAlumniPlaceholder } from "./blue-alumni-placeholder"
import { StateQualifierInterestCTA } from "./state-qualifier-interest-cta"
import { BackToTop } from "./back-to-top"

const NAVY = "#03154C"
const GOLD = "#D3B574"

// TODO: Replace with actual URLs when supplied
const NATIONAL_TEAM_URL = "#"
const NATIONAL_TEAM_SCHEDULE_URL = "#"
const COMPETITION_CALENDAR_URL = "#"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "NC United Blue | NC Wrestling United",
  description:
    "Creating Opportunity. Setting the Standard. Representing North Carolina. NC United Blue is the flagship development program for elite high school wrestlers.",
}

const QUICK_LINKS = [
  { href: "#what-is", label: "What Is NC United Blue" },
  { href: "#mission", label: "Mission & Vision" },
  { href: "#opportunity", label: "Opportunity & Obligation" },
  { href: "#what-makes-different", label: "What Makes Blue Different" },
  { href: "#training", label: "Training & College Partnerships" },
  { href: "#from-self-to-state", label: "From Self to State" },
  { href: "#national-team", label: "National Team Pipeline" },
  { href: "#recognition", label: "Recognition" },
  { href: "#testimonials", label: "Testimonials" },
  { href: "#qualification", label: "Qualification & Selection" },
  { href: "#membership", label: "Blue Membership & Registration" },
  { href: "#roster", label: "Blue Roster" },
  { href: "#alumni", label: "Blue Alumni" },
  { href: "#schedule", label: "Competition & Schedule" },
  { href: "#state-qualifier", label: "State Qualifier Interest" },
]

export default async function BluePage() {
  const images = await getBlueContent()
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

        {/* National Team Kids — Admin → Blue to upload/replace */}
        <figure className="mb-12">
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

        {/* Quick Links — on-brand */}
        <nav
          className="sticky top-0 z-10 mb-12 rounded-lg border-2 border-[#D3B574]/50 bg-white py-4 shadow-md"
          aria-label="Quick links"
          style={{ borderColor: GOLD }}
        >
          <h2 className="mb-3 px-4 text-sm font-semibold text-[#03154C]">
            Quick Links
          </h2>
          <ul className="flex flex-wrap gap-x-4 gap-y-2 px-4">
            {QUICK_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm font-medium text-[#03154C] hover:text-[#D3B574] hover:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Main Content */}
        <article className="space-y-16">
          {/* 1. What Is NC United Blue */}
          <section id="what-is">
            <h2 className="mb-4 text-2xl font-bold text-[#03154C]">What Is NC United Blue</h2>
            <p className="leading-relaxed text-[#03154C]/90">
              NC United Blue is the flagship development program of NC Wrestling United—a select
              group of elite high school wrestlers who train together, compete together, and
              represent North Carolina at the highest levels. Blue is built on the belief that
              North Carolina has the talent to compete with any state in the nation; our job is
              to create the environment where that talent is developed and showcased.
            </p>
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

          {/* 3. Opportunity & Obligation */}
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
          </section>

          {/* 4. What Makes Blue Different */}
          <section id="what-makes-different">
            <h2 className="mb-4 text-2xl font-bold text-[#03154C]">What Makes Blue Different</h2>
            <ul className="space-y-4 text-[#03154C]/90">
              <li>
                <strong className="text-[#03154C]">Train With the Best</strong> — Blue practices feature high school
                standouts alongside current NCAA wrestlers. You are in the room with people
                who have been where you want to go.
              </li>
              <li>
                <strong className="text-[#03154C]">College Coaches Run Practices</strong> — Coaches from UNC, NC State,
                UNC Pembroke, Roanoke, Greensboro, Lynchburg, Belmont Abbey, and more lead
                sessions. You train in a college environment, across divisions (D1, D2, D3,
                NAIA), and learn what it takes to compete at the next level.
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

          {/* 5. Training Environment & College Partnerships */}
          <section id="training">
            <h2 className="mb-4 text-2xl font-bold text-[#03154C]">
              Training Environment & College Partnerships
            </h2>
            <div className="mb-6 overflow-hidden rounded-lg border-2 border-[#D3B574]/50 bg-white shadow-md">
              <Image src={images.blue_training_env} alt="NC United Blue training environment" width={700} height={400} className="h-auto w-full object-contain" unoptimized />
            </div>
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
                Age-appropriate groups sometimes train with other colleges (e.g., UVA) to
                maximize exposure and development.
              </li>
            </ul>
          </section>

          {/* 6. From Self to State */}
          <section id="from-self-to-state">
            <h2 className="mb-4 text-2xl font-bold text-[#03154C]">From Self to State</h2>
            <blockquote className="my-6 border-l-4 bg-[#03154C]/5 pl-6 italic text-[#03154C]/90" style={{ borderLeftColor: GOLD }}>
              &ldquo;From Self to State&rdquo; — Blue wrestlers learn that success starts with
              individual discipline and commitment, extends to their team and community, and
              ultimately represents the entire state of North Carolina.
            </blockquote>
            <p className="leading-relaxed text-[#03154C]/90">
              This motto guides how we train and compete. Every rep, every drill, every match
              is part of a larger journey—from personal accountability to collective pride in
              representing North Carolina.
            </p>
          </section>

          {/* 7. National Team Pipeline */}
          <section id="national-team">
            <h2 className="mb-4 text-2xl font-bold text-[#03154C]">National Team Pipeline</h2>
            <p className="mb-4 leading-relaxed text-[#03154C]/90">
              The NC United National Team is among the most successful NC-based teams in state
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
              {/* TODO: Add link when URL is supplied */}
              <Link href={NATIONAL_TEAM_URL} className="font-medium text-[#03154C] hover:text-[#D3B574] hover:underline">
                Learn more about the National Team →
              </Link>
            </p>
          </section>

          {/* 8. Recognition */}
          <section id="recognition">
            <h2 className="mb-4 text-2xl font-bold text-[#03154C]">Recognition</h2>
            <p className="mb-6 text-[#03154C]/90">
              Celebrating our athletes&apos; achievements and the impact of NC United Wrestling.
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card className="border-2 border-[#D3B574]/40 overflow-hidden">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-[#03154C] mb-2">NHSCA 2025</h3>
                  <p className="text-sm text-[#03154C]/90 mb-2">
                    Outstanding performance at the National High School Coaches Association tournament with multiple placers.
                  </p>
                  <p className="text-xs text-[#03154C]/70"><strong>Highlights:</strong> 8 wrestlers placed, 3 finalists, 1 champion</p>
                </CardContent>
              </Card>
              <Card className="border-2 border-[#D3B574]/40 overflow-hidden">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-[#03154C] mb-2">Ultimate Club Duals 2024</h3>
                  <p className="text-sm text-[#03154C]/90 mb-2">
                    Dominant team performance showcasing the depth and skill of our wrestling program.
                  </p>
                  <p className="text-xs text-[#03154C]/70"><strong>Highlights:</strong> Team championship, multiple individual titles</p>
                </CardContent>
              </Card>
              <Card className="border-2 border-[#D3B574]/40 overflow-hidden">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-[#03154C] mb-2">Coaching Excellence</h3>
                  <p className="text-sm text-[#03154C]/90 mb-2">
                    Our experienced coaching staff continues to develop champions both on and off the mat.
                  </p>
                  <p className="text-xs text-[#03154C]/70"><strong>Led by:</strong> Coach Macchiavello, Coach Palmer, and Coach Carlson</p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* 9. Testimonials */}
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
                      &ldquo;Being part of NC United has been the highlight of my wrestling career. The coaching, the
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

          {/* 10. Qualification & Selection */}
          <section id="qualification">
            <h2 className="mb-4 text-2xl font-bold text-[#03154C]">Qualification & Selection</h2>
            <p className="mb-4 leading-relaxed text-[#03154C]/90">
              Blue is invite-led with structured pathways for consideration. Typically, we look
              at elite high school athletes who have qualified for states and want to wrestle
              at the next level.
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

          {/* 11. Blue Membership & Registration at States */}
          <section id="membership">
            <h2 className="mb-4 text-2xl font-bold text-[#03154C]">Blue Membership & Registration at States</h2>
            <Card className="border-t-4 border-t-[#D3B574]" style={{ borderTopColor: GOLD }}>
              <CardContent className="pt-6">
                <p className="leading-relaxed text-[#03154C]/90">
                  The Blue shirt is for confirmed Blue members only. We send invites{" "}
                  <strong className="text-[#03154C]">before</strong> States. Invited athletes
                  come by Suite 109 at States to register and pick up their shirt. If you have
                  not received an invite, you are not yet a confirmed member—but you can express
                  interest below if you are a state qualifier.
                </p>
              </CardContent>
            </Card>
          </section>

          {/* 12. Blue Roster */}
          <section id="roster">
            <h2 className="mb-4 text-2xl font-bold text-[#03154C]">Blue Roster (Current Members)</h2>
            <p className="mb-6 leading-relaxed text-[#03154C]/90">
              The current squad includes 40+ state titles, 70+ state qualifiers, 15 NHSCA /
              Super32 / Ironman All-Americans, and commits across D1, D2, D3, NAIA, and Juco.
            </p>
            <BlueRosterPlaceholder />
          </section>

          {/* 13. Blue Alumni */}
          <section id="alumni">
            <h2 className="mb-4 text-2xl font-bold text-[#03154C]">Blue Alumni</h2>
            <p className="mb-6 leading-relaxed text-[#03154C]/90">
              Alumni matter. They return during breaks and summer, scrap live with current
              members, and mentor the next generation. Blue is a program, not a one-time
              experience—alumni stay connected and give back.
            </p>
            <BlueAlumniPlaceholder />
          </section>

          {/* 14. Competition & Schedule */}
          <section id="schedule">
            <h2 className="mb-4 text-2xl font-bold text-[#03154C]">Competition & Schedule</h2>
            <p className="mb-4 leading-relaxed text-[#03154C]/90">
              Blue competes at national events throughout the year. The National Team schedule
              and competition calendar will be linked here.
            </p>
            <p className="space-x-4 text-sm">
              {/* TODO: Add links when URLs are supplied */}
              <Link
                href={NATIONAL_TEAM_SCHEDULE_URL}
                className="font-medium text-[#03154C] hover:text-[#B31B1B] hover:underline"
              >
                National Team Schedule →
              </Link>
              <Link
                href={COMPETITION_CALENDAR_URL}
                className="font-medium text-[#03154C] hover:text-[#B31B1B] hover:underline"
              >
                Competition Calendar →
              </Link>
            </p>
          </section>

          {/* 15. State Qualifier Interest */}
          <section id="state-qualifier">
            <h2 className="mb-4 text-2xl font-bold text-[#03154C]">State Qualifier Interest</h2>
            <p className="mb-6 leading-relaxed text-[#03154C]/90">
              State qualifiers are determined the weekend before States. If you qualified for
              states and want to express interest in Blue, use the button below. We will review
              submissions and extend invites to those who fit the program.
            </p>
            <StateQualifierInterestCTA />
          </section>
        </article>

        {/* Back to top */}
        <footer className="mt-16 border-t border-[#D3B574]/40 pt-8 text-center text-[#03154C]/80">
          <BackToTop />
        </footer>
      </div>
    </div>
  )
}
