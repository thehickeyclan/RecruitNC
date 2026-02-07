import Link from "next/link"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import type { Metadata } from "next"
import { BlueRosterPlaceholder } from "./blue-roster-placeholder"
import { BlueAlumniPlaceholder } from "./blue-alumni-placeholder"
import { StateQualifierInterestCTA } from "./state-qualifier-interest-cta"
import { BackToTop } from "./back-to-top"

// TODO: Replace with actual URLs when supplied
const NATIONAL_TEAM_URL = "#"
const NATIONAL_TEAM_SCHEDULE_URL = "#"
const COMPETITION_CALENDAR_URL = "#"

// Blue program images (Vercel Blob Storage)
const IMAGES = {
  banner: "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/X65GjDIcBrIc9dG2D6d-1-Blue%20Page%20Banner.png",
  nationalTeamKids: "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/mtS_xnViZ3kKW1u7xHnxQ-National%20Team%20kids%20pic.png",
  blue1: "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/0CbXEvNaC6TEMIUDdaX7x-Blue%20Pic%201.png",
  blue4: "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/e9FE8F2VrBgwI5zMEzS0D-Blue%20pic%204.png",
  blue6: "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/en2sHJA9p9VQNhORVHmHb-Blue%20Pic%206.png",
  blue7: "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/O7pdQfe_87-lRsmAyht2z-Blue%20Pic%207%20.png",
  blue9: "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/TulKFSt65m9i4aOxZgjzX-Blue%20Pic%209.png",
  blue10: "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/51gNIOlEb2w84uiSHyPJM-Blue%20Pic%2010.png",
} as const

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
  { href: "#qualification", label: "Qualification & Selection" },
  { href: "#membership", label: "Blue Membership & Registration" },
  { href: "#roster", label: "Blue Roster" },
  { href: "#alumni", label: "Blue Alumni" },
  { href: "#schedule", label: "Competition & Schedule" },
  { href: "#state-qualifier", label: "State Qualifier Interest" },
]

export default function BluePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 py-10 md:px-6">
        {/* Blue page banner — full image, no crop */}
        <figure className="mb-12">
          <div className="overflow-hidden rounded-xl border-4 border-[#D3B574]/30 bg-gray-50 shadow-lg">
            <Image
              src={IMAGES.banner}
              alt="NC United Blue"
              width={1200}
              height={600}
              className="h-auto w-full object-contain"
              unoptimized
              priority
            />
          </div>
        </figure>

        {/* National Team Kids — featured image with caption */}
        <figure className="mb-12">
          <div className="overflow-hidden rounded-xl border-4 border-[#D3B574]/30 bg-gray-50 shadow-lg">
            <Image
              src={IMAGES.nationalTeamKids}
              alt="Tobin McNair, Mac Johnson, and Bentley Sly representing NC United National Team"
              width={900}
              height={600}
              className="h-auto w-full object-contain"
              unoptimized
            />
          </div>
          <figcaption className="mt-2 text-center text-sm text-muted-foreground">
            Tobin McNair, Mac Johnson, and Bentley Sly (left to right) — NC United National Team
          </figcaption>
        </figure>

        {/* Quick Links — on-brand */}
        <nav
          className="sticky top-0 z-10 mb-12 rounded-lg border-2 border-[#D3B574]/30 bg-white py-4 shadow-md"
          aria-label="Quick links"
          style={{ borderTopColor: "#D3B574" }}
        >
          <h2 className="mb-3 px-4 text-sm font-semibold text-[#03154C]">
            Quick Links
          </h2>
          <ul className="flex flex-wrap gap-x-4 gap-y-2 px-4">
            {QUICK_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm font-medium text-[#03154C] hover:text-[#B31B1B] hover:underline"
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
            <p className="leading-relaxed text-muted-foreground">
              NC United Blue is the flagship development program of NC Wrestling United—a select
              group of elite high school wrestlers who train together, compete together, and
              represent North Carolina at the highest levels. Blue is built on the belief that
              North Carolina has the talent to compete with any state in the nation; our job is
              to create the environment where that talent is developed and showcased.
            </p>
          </section>

          {/* 2. Mission & Vision */}
          <section id="mission">
            <h2 className="mb-4 text-2xl font-bold">Mission & Vision</h2>
            <p className="leading-relaxed text-muted-foreground">
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
                  <p className="text-sm text-muted-foreground">
                    Blue members gain access to training with college coaches, NCAA wrestlers,
                    and peers who push them every day. They compete at national events, build
                    relationships with recruiters, and develop skills that translate to the next
                    level.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-t-4 border-t-[#B31B1B]">
                <CardContent className="pt-6">
                  <h3 className="mb-2 font-semibold">Obligation</h3>
                  <p className="text-sm text-muted-foreground">
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
            <ul className="space-y-4 text-muted-foreground">
              <li>
                <strong className="text-foreground">Train With the Best</strong> — Blue practices feature high school
                standouts alongside current NCAA wrestlers. You are in the room with people
                who have been where you want to go.
              </li>
              <li>
                <strong className="text-foreground">College Coaches Run Practices</strong> — Coaches from UNC, NC State,
                UNC Pembroke, Roanoke, Greensboro, Lynchburg, Belmont Abbey, and more lead
                sessions. You train in a college environment, across divisions (D1, D2, D3,
                NAIA), and learn what it takes to compete at the next level.
              </li>
            </ul>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="overflow-hidden rounded-lg border-2 border-[#D3B574]/30 bg-gray-50 shadow-md">
                <Image src={IMAGES.blue1} alt="NC United Blue training" width={400} height={300} className="h-auto w-full object-contain" unoptimized />
              </div>
              <div className="overflow-hidden rounded-lg border-2 border-[#D3B574]/30 bg-gray-50 shadow-md">
                <Image src={IMAGES.blue6} alt="NC United Blue in action" width={400} height={300} className="h-auto w-full object-contain" unoptimized />
              </div>
            </div>
          </section>

          {/* 5. Training Environment & College Partnerships */}
          <section id="training">
            <h2 className="mb-4 text-2xl font-bold text-[#03154C]">
              Training Environment & College Partnerships
            </h2>
            <div className="mb-6 overflow-hidden rounded-lg border-2 border-[#D3B574]/30 bg-gray-50 shadow-md">
              <Image src={IMAGES.blue4} alt="NC United Blue training environment" width={700} height={400} className="h-auto w-full object-contain" unoptimized />
            </div>
            <ul className="space-y-3 leading-relaxed text-muted-foreground">
              <li>
                <strong className="text-foreground">UNC</strong> serves as the primary home for
                Blue practices, giving members consistent access to Chapel Hill and the Tar Heel
                program.
              </li>
              <li>
                <strong className="text-foreground">NC State</strong> provides additional support
                and access, reinforcing the depth of college partnerships.
              </li>
              <li>
                <strong className="text-foreground">Partnerships across the Southeast</strong> —
                Age-appropriate groups sometimes train with other colleges (e.g., UVA) to
                maximize exposure and development.
              </li>
            </ul>
          </section>

          {/* 6. From Self to State */}
          <section id="from-self-to-state">
            <h2 className="mb-4 text-2xl font-bold text-[#03154C]">From Self to State</h2>
            <blockquote className="my-6 border-l-4 border-[#D3B574] bg-[#03154C]/5 pl-6 italic text-muted-foreground" style={{ borderLeftColor: "#D3B574" }}>
              &ldquo;From Self to State&rdquo; — Blue wrestlers learn that success starts with
              individual discipline and commitment, extends to their team and community, and
              ultimately represents the entire state of North Carolina.
            </blockquote>
            <p className="leading-relaxed text-muted-foreground">
              This motto guides how we train and compete. Every rep, every drill, every match
              is part of a larger journey—from personal accountability to collective pride in
              representing North Carolina.
            </p>
          </section>

          {/* 7. National Team Pipeline */}
          <section id="national-team">
            <h2 className="mb-4 text-2xl font-bold text-[#03154C]">National Team Pipeline</h2>
            <p className="mb-4 leading-relaxed text-muted-foreground">
              The NC United National Team is among the most successful NC-based teams in state
              history. Last year, the National Team went 7–1 at NHSCA Duals and reached the
              Round of 16 before losing to a multi-state all-star team.
            </p>
            <div className="my-6 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
              <div className="overflow-hidden rounded-lg border-2 border-[#D3B574]/30 bg-gray-50 shadow-md">
                <Image src={IMAGES.blue7} alt="NC United Blue at competition" width={400} height={300} className="h-auto w-full object-contain" unoptimized />
              </div>
              <div className="overflow-hidden rounded-lg border-2 border-[#D3B574]/30 bg-gray-50 shadow-md">
                <Image src={IMAGES.blue9} alt="NC United Blue wrestlers" width={400} height={300} className="h-auto w-full object-contain" unoptimized />
              </div>
              <div className="overflow-hidden rounded-lg border-2 border-[#D3B574]/30 bg-gray-50 shadow-md sm:col-span-2 md:col-span-1">
                <Image src={IMAGES.blue10} alt="NC United Blue team" width={400} height={300} className="h-auto w-full object-contain" unoptimized />
              </div>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              {/* TODO: Add link when URL is supplied */}
              <Link href={NATIONAL_TEAM_URL} className="font-medium text-[#03154C] hover:text-[#B31B1B] hover:underline">
                Learn more about the National Team →
              </Link>
            </p>
          </section>

          {/* 8. Qualification & Selection */}
          <section id="qualification">
            <h2 className="mb-4 text-2xl font-bold text-[#03154C]">Qualification & Selection</h2>
            <p className="mb-4 leading-relaxed text-muted-foreground">
              Blue is invite-led with structured pathways for consideration. Typically, we look
              at elite high school athletes who have qualified for states and want to wrestle
              at the next level.
            </p>
            <p className="mb-4 leading-relaxed text-muted-foreground">
              We also consider edge cases: injuries that affected state qualification, athletes
              new to North Carolina, and standout middle school wrestlers when appropriate. We
              aim to be fair and inclusive while maintaining high standards.
            </p>
            <p className="font-medium text-muted-foreground">
              Important: Expressing interest does not equal acceptance. Invites are extended
              based on merit, fit, and program capacity.
            </p>
          </section>

          {/* 9. Blue Membership & Registration at States */}
          <section id="membership">
            <h2 className="mb-4 text-2xl font-bold">Blue Membership & Registration at States</h2>
            <Card className="border-t-4 border-t-[#D3B574]">
              <CardContent className="pt-6">
                <p className="leading-relaxed text-muted-foreground">
                  The Blue shirt is for confirmed Blue members only. We send invites{" "}
                  <strong className="text-foreground">before</strong> States. Invited athletes
                  come by Suite 109 at States to register and pick up their shirt. If you have
                  not received an invite, you are not yet a confirmed member—but you can express
                  interest below if you are a state qualifier.
                </p>
              </CardContent>
            </Card>
          </section>

          {/* 10. Blue Roster */}
          <section id="roster">
            <h2 className="mb-4 text-2xl font-bold">Blue Roster (Current Members)</h2>
            <p className="mb-6 leading-relaxed text-muted-foreground">
              The current squad includes 40+ state titles, 70+ state qualifiers, 15 NHSCA /
              Super32 / Ironman All-Americans, and commits across D1, D2, D3, NAIA, and Juco.
            </p>
            <BlueRosterPlaceholder />
          </section>

          {/* 11. Blue Alumni */}
          <section id="alumni">
            <h2 className="mb-4 text-2xl font-bold text-[#03154C]">Blue Alumni</h2>
            <p className="mb-6 leading-relaxed text-muted-foreground">
              Alumni matter. They return during breaks and summer, scrap live with current
              members, and mentor the next generation. Blue is a program, not a one-time
              experience—alumni stay connected and give back.
            </p>
            <BlueAlumniPlaceholder />
          </section>

          {/* 12. Competition & Schedule */}
          <section id="schedule">
            <h2 className="mb-4 text-2xl font-bold">Competition & Schedule</h2>
            <p className="mb-4 leading-relaxed text-muted-foreground">
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

          {/* 13. State Qualifier Interest */}
          <section id="state-qualifier">
            <h2 className="mb-4 text-2xl font-bold text-[#03154C]">State Qualifier Interest</h2>
            <p className="mb-6 leading-relaxed text-muted-foreground">
              State qualifiers are determined the weekend before States. If you qualified for
              states and want to express interest in Blue, use the button below. We will review
              submissions and extend invites to those who fit the program.
            </p>
            <StateQualifierInterestCTA />
          </section>
        </article>

        {/* Back to top */}
        <footer className="mt-16 border-t pt-8 text-center">
          <BackToTop />
        </footer>
      </div>
    </div>
  )
}
