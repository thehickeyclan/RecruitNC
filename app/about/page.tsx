import type { Metadata } from "next"
import Link from "next/link"
import { getAboutStats } from "@/lib/about-stats"

export const revalidate = 3600

/**
 * Who NC United is, for three audiences with different questions: parents deciding whether to
 * trust us with their kid, partners and donors deciding whether we are real, and coaches deciding
 * whether we are here to help or to compete with them.
 *
 * That third question is why the "Our role" section names Blue and the National Team specifically:
 * a club coach wants to know whether the program handing out invitations is going to take his
 * wrestlers. It answers by saying what an athlete gains and that their coach stays their coach,
 * rather than with a list of things we promise not to do — five sentences of "we do not" leave a
 * reader thinking about exactly the thing being denied.
 */

export const metadata: Metadata = {
  title: "About NC United | NC Wrestling United",
  description:
    "NC United brings North Carolina wrestling together — creating opportunity for athletes, strengthening the programs around them, and preserving the history of the sport in our state.",
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-rnc-line bg-rnc-surface px-5 py-4">
      <p className="text-3xl font-bold tabular-nums text-rnc-gold">{value}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
    </div>
  )
}

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-4">
      {eyebrow ? (
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-rnc-gold">{eyebrow}</p>
      ) : null}
      <h2 className="text-2xl font-bold text-white sm:text-3xl">{title}</h2>
      {children}
    </section>
  )
}

function Pillar({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-rnc-line bg-rnc-raised p-5">
      <h3 className="mb-2 font-bold text-white">{title}</h3>
      <p className="text-sm leading-relaxed text-slate-300">{children}</p>
    </div>
  )
}

/**
 * Founders.
 *
 * Ordered so the three of them read as the argument the rest of the page makes: someone who came
 * up through North Carolina wrestling, someone who went as far as the sport goes, and someone
 * whose career happened after the mat.
 */
function Founder({
  name,
  role,
  credential,
  photo,
  children,
}: {
  name: string
  role: string
  credential: string
  photo?: string
  children: React.ReactNode
}) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-rnc-line bg-rnc-raised p-6 sm:flex-row sm:gap-6">
      <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-rnc-line bg-rnc-surface sm:h-28 sm:w-28">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-xl font-bold text-rnc-gold">{initials}</span>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <div>
          <h3 className="text-lg font-bold text-white">{name}</h3>
          <p className="text-xs font-semibold uppercase tracking-wider text-rnc-gold">{role}</p>
        </div>
        <p className="text-sm font-semibold text-slate-200">{credential}</p>
        <div className="flex flex-col gap-2 text-sm leading-relaxed text-slate-300">{children}</div>
      </div>
    </div>
  )
}

/** One way in, stated plainly. Four of these; more would be a menu, fewer would leave people out. */
function Action({
  title,
  href,
  cta,
  children,
}: {
  title: string
  href: string
  cta: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-rnc-line bg-rnc-raised p-5">
      <h3 className="font-bold text-white">{title}</h3>
      <p className="text-sm leading-relaxed text-slate-300">{children}</p>
      <Link
        href={href}
        className="mt-1 text-sm font-semibold text-rnc-gold underline-offset-2 hover:underline"
      >
        {cta} →
      </Link>
    </div>
  )
}

export default async function AboutPage() {
  const { commitments, athleteProfiles, collegeCoaches } = await getAboutStats()

  return (
    <main className="min-h-screen bg-rnc-ink px-6 py-14 text-white">
      <div className="mx-auto flex max-w-3xl flex-col gap-16">
        <header className="flex flex-col gap-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-rnc-gold">NC United</p>
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
            A stronger wrestling community, built together
          </h1>
          <p className="text-lg leading-relaxed text-slate-300">
            NC United brings North Carolina wrestling together to create more opportunities for
            athletes, strengthen the programs and people who support them, and preserve the history
            of the sport in our state.
          </p>
          <p className="leading-relaxed text-slate-300">
            We are building a community that develops better people, not only better wrestlers — and
            gives them a way to return and do the same for the next generation.
          </p>
        </header>

        {/* The thesis, before the argument for it. This is not a wrestler winning — it is an
            entire bench on its feet for a teammate, which is the whole page in one frame. */}
        <figure className="flex flex-col gap-3">
          <div className="overflow-hidden rounded-2xl border border-rnc-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/about/national-team-celebration.jpg"
              alt="The NC United bench on its feet, arms raised, celebrating a win at the NHSCA National Duals"
              className="w-full"
            />
          </div>
          <figcaption className="text-sm text-slate-400">
            The NC United bench as Tye Johnson&apos;s win sends the team through to the round of 16
            at the NHSCA National Duals.
          </figcaption>
        </figure>

        {/* Counted live from the same query the commitments page uses, so this page cannot drift
            from it. A failed count renders nothing rather than zero. */}
        {commitments != null || athleteProfiles != null || collegeCoaches != null ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {commitments != null ? (
              <Stat value={String(commitments)} label="College commitments tracked" />
            ) : null}
            {athleteProfiles != null ? (
              <Stat value={String(athleteProfiles)} label="Athlete profiles" />
            ) : null}
            {collegeCoaches != null ? (
              <Stat value={String(collegeCoaches)} label="College coaches on the platform" />
            ) : null}
          </div>
        ) : null}

        <Section eyebrow="Our vision" title="Build the community around the athlete">
          <p className="leading-relaxed text-slate-300">
            No wrestler develops alone. Athletes are shaped by their families, coaches, teammates,
            clubs, schools, officials and the opportunities available to them.
          </p>
          <p className="leading-relaxed text-slate-300">
            NC United works to strengthen that entire environment. We connect people and programs,
            expand access to high-level training and competition, create pathways to college and
            national opportunities, preserve the history of North Carolina wrestling, and help
            athletes carry what the sport built in them into the rest of their lives.
          </p>
          <p className="leading-relaxed text-slate-300">
            Competition matters, but it is not the final measure. Wrestling teaches discipline,
            resilience, patience and how to lose without quitting. Those qualities are worth as much
            in a career, a family and a community as they are during a season.
          </p>
        </Section>

        <Section eyebrow="What we do" title="Create opportunity on the mat">
          <div className="grid gap-4 sm:grid-cols-2">
            <Pillar title="Tournament of Champions">
              An invitational bringing the best wrestlers in the state together in elite
              eight-person brackets, with the field selected and announced weight class by weight
              class.
            </Pillar>
            <Pillar title="NC United Blue">
              Our invitation-only elite training program at UNC, bringing accomplished North
              Carolina wrestlers into the same room for high-level practices, sparring and live
              wrestling. Wrestlers may also attend individual Blue practices on a drop-in basis.
            </Pillar>
            <Pillar title="NC United National Team">
              Our national competition team, bringing selected North Carolina wrestlers together to
              compete at national duals, including NHSCA and AAU events.
            </Pillar>
          </div>
        </Section>

        <Section eyebrow="What we preserve" title="North Carolina wrestling's historical record">
          <p className="leading-relaxed text-slate-300">
            North Carolina wrestling deserves a record that is complete, accurate and accessible.
          </p>
          <p className="leading-relaxed text-slate-300">
            We preserve and make available the history of the sport in our state — including college
            commitments, class rankings, state and national results, and records going back decades.
          </p>
          <p className="leading-relaxed text-slate-300">
            The record connects today&apos;s wrestlers to the people, programs and achievements that
            came before them. It recognizes those who built the sport and ensures that the history
            of North Carolina wrestling is not lost.
          </p>
          <p className="leading-relaxed text-slate-300">
            The historical record, rankings, athlete profiles, club map, NC United app and Data Dawg
            are free and open to everyone in the North Carolina wrestling community.
          </p>
        </Section>

        <Section eyebrow="Beyond competition" title="Build pathways that last">
          <p className="leading-relaxed text-slate-300">
            A wrestling career ends. What the sport builds in someone does not.
          </p>
          <p className="leading-relaxed text-slate-300">
            The NC United Network carries that forward by connecting wrestlers to internships, jobs,
            mentors and each other — whether they are pursuing nursing, the trades, teaching,
            technology, business or another path.
          </p>
          <p className="leading-relaxed text-slate-300">
            Athletes and mentors never pay. Companies fund the Network through employer partnerships
            because a wrestler who has spent ten years learning how to work is worth finding.
          </p>
          <p className="rounded-xl border border-rnc-line bg-rnc-surface p-4 text-sm text-slate-400">
            The Network is still early. We soft-launched it this year and have already placed our
            first athletes in internships. We would rather say that plainly than describe it as more
            than it is — yet.
          </p>
        </Section>

        <Section eyebrow="Scholarships and fundraising" title="Putting money back into wrestlers">
          <p className="leading-relaxed text-slate-300">
            We raise money for one reason: to put it back into North Carolina wrestlers. Every
            dollar funds training, competition and the resources we keep free for everyone.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Pillar title="The Caden Perry Scholarship">
              Awarded to a North Carolina wrestler in Caden&apos;s memory, on the belief that the
              future is bright for those who refuse to quit. One question, answered in writing or
              on video — no application fee, no production values required.
            </Pillar>
            <Pillar title="The Spartan Challenge">
              Our annual fundraiser with Spartan Race, in Fayetteville each spring. Supporters race
              or give, and the money goes to a named wrestler&apos;s training fund or the pool that
              supports all of them.
            </Pillar>
          </div>
          <p className="leading-relaxed text-slate-300">
            <Link
              href="/fundraising/scholarships/caden-perry"
              className="font-semibold text-rnc-gold underline-offset-2 hover:underline"
            >
              Read about the scholarship
            </Link>
            {" · "}
            <Link href="/spartan" className="font-semibold text-rnc-gold underline-offset-2 hover:underline">
              Join the Spartan Challenge
            </Link>
            {" · "}
            <Link href="/fundraising" className="font-semibold text-rnc-gold underline-offset-2 hover:underline">
              Give to NC United
            </Link>
          </p>
        </Section>

        <Section eyebrow="Our role" title="We add to what your program already gives">
          <p className="leading-relaxed text-slate-300">
            NC United exists to give North Carolina wrestlers more — more exposure to the college
            coaches recruiting them, more high-level competition, more training partners, and more
            ways to be seen. Everything we run is additional to what an athlete already has.
          </p>
          <p className="leading-relaxed text-slate-300">
            NC United isn&apos;t a club. We are the layer around them: the statewide events,
            pathways and connections that no single program can build alone, available to every
            wrestler in the state regardless of where they train.
          </p>
          <p className="leading-relaxed text-slate-300">
            Blue supplements an athlete&apos;s home training through invitation-only membership and
            individual drop-in practices. The National Team comes together for specific national
            duals. A wrestler keeps their school and club program exactly as it is, and their coach
            stays their coach.
          </p>
          <p className="leading-relaxed text-slate-300">
            Our role is to strengthen the environment around every program, expand opportunity
            statewide, connect athletes to college and national pathways, support families and
            coaches, and reinforce the structures that benefit every wrestler in North Carolina.
          </p>
        </Section>

        <Section eyebrow="How we work" title="Our commitments">
          <div className="grid gap-4 sm:grid-cols-2">
            <Pillar title="Center the athlete">
              Every program, partnership and decision is judged by whether it strengthens the growth
              and long-term advancement of North Carolina wrestlers.
            </Pillar>
            <Pillar title="Expand access">
              Training, facilities, education and visibility help determine who gets to progress. We
              work to put those opportunities within reach of more wrestlers in more parts of the
              state.
            </Pillar>
            <Pillar title="Unite the community">
              Athletes, coaches, families, officials, clubs, schools, colleges and partners elevate
              the sport when they move in alignment.
            </Pillar>
            <Pillar title="Build lasting infrastructure">
              Coaches, referees, regional training centers, facilities, events and accessible
              information form the environment in which athletes grow. Strong infrastructure
              benefits every program and outlasts any single season.
            </Pillar>
          </div>
        </Section>

        <section className="flex flex-col gap-4 rounded-2xl border border-rnc-line bg-rnc-raised p-7">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-rnc-gold">
            The reinvestment loop
          </p>
          <h2 className="text-2xl font-bold text-white">
            What wrestling builds should come back around
          </h2>
          <p className="leading-relaxed text-slate-300">
            Athletes who rise through this community return to it as mentors, coaches, referees,
            employers and leaders.
          </p>
          <p className="leading-relaxed text-slate-300">
            That return is not simply a positive outcome we hope for. It is the engine.
          </p>
          <p className="leading-relaxed text-slate-300">
            Every wrestler who comes back strengthens the environment for the next one. Our success
            will ultimately be measured not only by championships and college commitments, but by
            the people who return and what they build for those who follow.
          </p>
          <blockquote className="border-l-2 border-rnc-gold pl-4 text-lg font-semibold leading-relaxed text-white">
            It starts with you — represent yourself and your family first. Then your team and your
            club. Beyond state lines, we represent North Carolina.
            <span className="mt-2 block text-rnc-gold">#RaiseUp</span>
          </blockquote>
        </section>

        <Section eyebrow="The founders" title="Who runs it">
          <p className="leading-relaxed text-slate-300">
            NC United was founded by three people whose wrestling paths took them in different
            directions — and who ultimately came back to serve the same community.
          </p>
          <div className="flex flex-col gap-4">
            <Founder
              name="Colton Palmer"
              photo="/images/founders/colton-palmer.jpg"
              role="Founder"
              credential="284 career wins — a national record at the time"
            >
              <p>
                Colton started wrestling at five in Durham, following his older brothers. He won an
                NHSCA national championship in eighth grade, captured two state championships for
                Riverside High School — including one during a 61-0 season — and finished with more
                high school wins than any wrestler in North Carolina history.
              </p>
              <p>
                He was a four-year letterwinner and co-captain at NC State. Today, Colton works in
                enterprise strategy, coaches on a volunteer basis and serves on the board of North
                Carolina USA Wrestling.
              </p>
            </Founder>

            <Founder
              name="Michael Macchiavello"
              photo="/images/founders/michael-macchiavello.jpg"
              role="Founder"
              credential="NCAA Division I national champion and United States National Team member"
            >
              <p>
                Michael grew up in Union County and did not begin wrestling until he was fourteen.
                He won a state championship before becoming the NCAA Division I champion at 197
                pounds for NC State — only the second North Carolina-born wrestler ever to win an
                NCAA wrestling title.
              </p>
              <p>
                Michael represented Team USA for five years and served on USA Wrestling&apos;s Board
                of Directors, Executive Committee and Athlete Advisory Committee. He now coaches
                collegiately at West Point.
              </p>
            </Founder>

            <Founder
              name="Matt Hickey"
              photo="/images/founders/matt-hickey.jpg"
              role="Founder"
              credential="Technology founder and CEO with more than 25 years of experience building companies"
            >
              <p>
                Matt was the youngest of five wrestling brothers on Long Island. He joined the Long
                Island Century Club with more than 100 high school wins, placed second in the New
                York state championships and wrestled at Hofstra before completing his degree at NC
                State.
              </p>
              <p>
                He has spent his career founding and leading technology companies, including
                venture-backed cybersecurity and artificial intelligence businesses, several of
                which were acquired.
              </p>
              <p>
                Matt lives in Raleigh with his wife, Lisa, and their three children. He has watched
                his sons progress through North Carolina wrestling from elementary school to
                Division I.
              </p>
            </Founder>
          </div>
        </Section>

        <Section eyebrow="Get involved" title="Where you come in">
          <p className="leading-relaxed text-slate-300">
            None of this works without the people already invested in North Carolina wrestling.
            Whatever brought you to this page, there is a way to become part of it.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Action title="Back the mission" href="/fundraising" cta="Give to NC United">
              NC Wrestling United is a 501(c)(3), and donations are tax-deductible to the extent
              allowed by law. Contributions support Blue practices, the National Team, scholarships
              and the public resources we keep free for the entire community.
            </Action>

            <Action title="Hire a wrestler" href="/contact" cta="Talk to us about the Network">
              Companies fund the NC United Network, allowing athletes and mentors to participate
              without charge. If your company hires interns or full-time employees, you can help
              create the opportunities that make the Network work.
            </Action>

            <Action title="Add your club" href="/clubs/submit" cta="Put your club on the map">
              Every wrestling club in North Carolina belongs on our map, whether or not it
              participates in an NC United program. Send us your information and we will add it.
            </Action>

            <Action title="Come train" href="/calendar" cta="See what's coming up">
              View the calendar for upcoming Blue practices, camps, tournaments and other
              opportunities across the state.
            </Action>
          </div>
        </Section>

        <Section eyebrow="The organization" title="The details">
          <p className="leading-relaxed text-slate-300">
            We are <strong className="text-white">NC United</strong>. Our legal name is{" "}
            <strong className="text-white">NC Wrestling United Inc.</strong>, a North Carolina
            501(c)(3) nonprofit organization. Our federal Tax ID is{" "}
            <span className="tabular-nums">99-3757238</span>. Donations are tax-deductible to the
            extent allowed by law.
          </p>
          <p className="leading-relaxed text-slate-300">
            RecruitNC is the platform behind NC United. It began as our recruiting tool and now
            powers the resources, information and programs available throughout this site.
          </p>
          <p className="leading-relaxed text-slate-300">
            Have a question, a correction or a wrestler we have missed?{" "}
            <Link href="/contact" className="font-semibold text-rnc-gold underline-offset-2 hover:underline">
              Get in touch
            </Link>{" "}
            or email{" "}
            <a
              href="mailto:info@ncwrestlingunited.com"
              className="font-semibold text-rnc-gold underline-offset-2 hover:underline"
            >
              info@ncwrestlingunited.com
            </a>
            .
          </p>
          <p className="leading-relaxed text-slate-300">
            How we collect and manage athlete information is explained in our{" "}
            <Link href="/privacy" className="font-semibold text-rnc-gold underline-offset-2 hover:underline">
              privacy policy
            </Link>
            .
          </p>
        </Section>
      </div>
    </main>
  )
}
