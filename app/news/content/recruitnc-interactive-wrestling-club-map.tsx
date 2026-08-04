import Image from "next/image"
import Link from "next/link"
import { ArrowRight, MapPin, ShieldCheck } from "lucide-react"

export function RecruitNcInteractiveWrestlingClubMapContent() {
  return (
    <div className="space-y-10">
      <figure className="not-prose overflow-hidden rounded-2xl border border-[#D3B574]/35 bg-[#071529] shadow-lg">
        <Image
          src="/images/news/recruitnc-club-map-launch.png"
          alt="RecruitNC interactive map showing wrestling clubs across North Carolina"
          width={840}
          height={706}
          className="h-auto w-full"
          priority
        />
        <figcaption className="border-t border-white/10 px-5 py-3 text-sm text-white/70">
          Browse verified wrestling clubs across North Carolina on an interactive Mapbox map.
        </figcaption>
      </figure>

      <div className="not-prose rounded-2xl border border-[#D3B574]/45 bg-[#13294B] p-6 text-white shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#D3B574]">
          Explore North Carolina wrestling
        </p>
        <h2 className="mt-3 text-2xl font-black leading-tight text-white">
          Find a club. Explore its athletes. Connect directly.
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/75">
          Search the statewide map, view programs and contact details, get directions, and see the athletes and
          accomplishments connected to each club.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/clubs"
            className="inline-flex items-center gap-2 rounded-xl bg-[#D3B574] px-5 py-3 text-sm font-bold text-[#071529] no-underline transition hover:bg-white"
          >
            Explore the club map
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/clubs/submit"
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-5 py-3 text-sm font-bold text-white no-underline transition hover:border-[#D3B574] hover:text-[#D3B574]"
          >
            Submit a club
          </Link>
        </div>
      </div>

      <section>
        <p>
          RecruitNC has launched <strong>North Carolina&apos;s first interactive wrestling club map</strong>, giving
          wrestling clubs across the state their own searchable pages and making it easier than ever for families,
          athletes, coaches, and college recruiters to discover wrestling opportunities across North Carolina.
        </p>
        <p>
          The launch represents one of the most significant additions to the RecruitNC platform since athlete
          profiles and state rankings, creating a centralized resource for the state&apos;s wrestling community.
        </p>
        <p>
          Until now, information about wrestling clubs was scattered across social media pages, websites, and
          word-of-mouth recommendations. Families often had to know a club&apos;s name before they could learn anything
          about it. Now, clubs can be discovered through an interactive statewide map and explored through dedicated
          club pages.
        </p>
      </section>

      <section>
        <h2>Find wrestling anywhere in North Carolina</h2>
        <p>
          The new interactive map allows users to browse wrestling clubs across the state with just a few clicks.
        </p>
        <p>Families can:</p>
        <ul>
          <li>View wrestling clubs on an interactive statewide map.</li>
          <li>See how far each club is from their current location.</li>
          <li>Find clubs while traveling or relocating.</li>
          <li>Get directions directly through Google Maps.</li>
          <li>Access each club&apos;s dedicated page for additional information.</li>
        </ul>
        <p>
          Whether searching for a first wrestling club or looking for a place to train while away from home, the
          platform makes discovering wrestling opportunities easier than ever before.
        </p>
      </section>

      <section>
        <h2>Every club has its own home</h2>
        <p>
          Each approved wrestling club has a dedicated page featuring the important information families and athletes
          want to know before walking through the door.
        </p>
        <p>Club pages include:</p>
        <ul>
          <li>Club logo and verified status.</li>
          <li>Training location and address.</li>
          <li>Programs offered, including Youth, Middle School, High School, Boys, Girls, and Freestyle/Greco.</li>
          <li>Phone number, email, website, Instagram, and Facebook.</li>
          <li>Direct links for directions and contacting the club.</li>
        </ul>
        <p>
          Instead of searching multiple websites or social media accounts, visitors can now find everything they need
          in one place.
        </p>
      </section>

      <figure className="not-prose overflow-hidden rounded-2xl border border-slate-200 bg-[#071529] shadow-sm">
        <Image
          src="/images/news/recruitnc-club-profile.png"
          alt="Example RecruitNC club page for Darkhorse Wrestling with verified status, programs, address, and contact information"
          width={1008}
          height={600}
          className="h-auto w-full"
        />
        <figcaption className="border-t border-white/10 px-5 py-3 text-sm text-white/70">
          Dedicated club pages put programs, location, contact information, and social links in one place.
        </figcaption>
      </figure>

      <section>
        <h2>Showcasing the athletes behind every club</h2>
        <p>
          Perhaps the most powerful feature of the new platform is its ability to connect clubs with the athletes who
          represent them.
        </p>
        <p>
          Each club page automatically highlights RecruitNC athlete profiles associated with that club, along with
          many of the accomplishments those athletes have earned, including:
        </p>
        <ul>
          <li>College commitments.</li>
          <li>Ranked wrestlers.</li>
          <li>NHSCA All-Americans.</li>
          <li>State champions.</li>
          <li>State placers.</li>
        </ul>
        <p>For parents, it provides insight into the athletes developing within a wrestling room.</p>
        <p>
          For college coaches, it creates an entirely new way to identify programs consistently producing high-level
          talent.
        </p>
      </section>

      <figure className="not-prose mx-auto max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-[#071529] shadow-sm">
        <Image
          src="/images/news/recruitnc-club-accomplishments.png"
          alt="RecruitNC club page showing college commitments and ranked wrestlers associated with a club"
          width={992}
          height={1112}
          className="h-auto w-full"
        />
        <figcaption className="border-t border-white/10 px-5 py-3 text-sm text-white/70">
          Club pages connect programs to their college commitments, ranked wrestlers, and other accomplishments.
        </figcaption>
      </figure>

      <section>
        <h2>Built for clubs, too</h2>
        <p>
          Many wrestling clubs rely almost exclusively on social media to communicate with prospective families.
        </p>
        <p>
          RecruitNC now provides clubs with a professional, searchable presence that can be shared directly with
          parents, linked on social media, and discovered through Google searches.
        </p>
        <p>
          Club owners and coaches can submit their organization and request updates to their page, helping keep
          contact information, training locations, and program offerings current as their organization grows.
        </p>
      </section>

      <section>
        <h2>Continuing to grow North Carolina wrestling</h2>
        <p>RecruitNC was created to connect every level of wrestling in North Carolina.</p>
        <p>Athlete profiles help wrestlers gain exposure.</p>
        <p>State rankings recognize the state&apos;s top competitors.</p>
        <p>College commitments celebrate the next step in an athlete&apos;s journey.</p>
        <p>
          The new Interactive Club Map brings those pieces together by helping families discover where North
          Carolina&apos;s wrestlers train, develop, and succeed.
        </p>
        <p>
          As RecruitNC continues to grow, so does its mission: to make North Carolina wrestling more connected, more
          accessible, and more visible than ever before.
        </p>
      </section>

      <div className="not-prose grid gap-4 sm:grid-cols-2">
        <Link
          href="/clubs"
          className="group rounded-2xl border border-[#D3B574]/35 bg-[#071529] p-5 text-white no-underline transition hover:border-[#D3B574]"
        >
          <MapPin className="h-6 w-6 text-[#D3B574]" />
          <h3 className="mt-4 text-lg font-bold text-white">Explore the club map</h3>
          <p className="mt-2 text-sm leading-relaxed text-white/65">
            Search, pan, zoom, view nearby clubs, and open a club&apos;s complete RecruitNC page.
          </p>
          <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#D3B574]">
            View all clubs <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </span>
        </Link>
        <Link
          href="/clubs/submit"
          className="group rounded-2xl border border-[#D3B574]/35 bg-[#071529] p-5 text-white no-underline transition hover:border-[#D3B574]"
        >
          <ShieldCheck className="h-6 w-6 text-[#D3B574]" />
          <h3 className="mt-4 text-lg font-bold text-white">Add or update a club</h3>
          <p className="mt-2 text-sm leading-relaxed text-white/65">
            Club owners and coaches can submit accurate program, contact, and location information for review.
          </p>
          <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#D3B574]">
            Submit a club <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </span>
        </Link>
      </div>
    </div>
  )
}
