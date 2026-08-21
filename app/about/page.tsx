import type { Metadata } from "next"
import Link from "next/link"
import { getAboutStats } from "@/lib/about-stats"

export const revalidate = 3600

/**
 * Who NC United is, for three audiences with different questions: parents deciding whether to
 * trust us with their kid, partners and donors deciding whether we are real, and coaches deciding
 * whether we are here to help or to compete with them.
 *
 * The last one is why "We strengthen, we don't replace" sits high on the page rather than buried:
 * it is the question every club and school coach in the state asks first, and answering it late
 * means answering it after they have stopped reading.
 */

export const metadata: Metadata = {
  title: "About NC United | NC Wrestling United",
  description:
    "NC United is a 501(c)(3) building a thriving wrestling community in North Carolina — on the mat and well beyond it.",
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

export default async function AboutPage() {
  const { commitments } = await getAboutStats()

  return (
    <main className="min-h-screen bg-rnc-ink px-6 py-14 text-white">
      <div className="mx-auto flex max-w-3xl flex-col gap-16">
        <header className="flex flex-col gap-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-rnc-gold">NC United</p>
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
            An ecosystem built for the athlete
          </h1>
          <p className="text-lg leading-relaxed text-slate-300">
            We use wrestling to build a thriving community in North Carolina — one that produces
            better people, not only better wrestlers, and gives them somewhere to put it when they
            are done competing.
          </p>
        </header>

        {/* Counts come from the same queries the rest of the site uses, and any that fail are left
            out rather than rendered as zero. */}
        {commitments != null ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Stat value={String(commitments)} label="College commitments tracked" />
          </div>
        ) : null}

        <Section title="The athlete comes first">
          <p className="leading-relaxed text-slate-300">
            NC United exists to support and empower young wrestlers to reach their potential, so
            they can go on to do the same for the next generation. Wrestlers grow when the
            environment around them is built to support them — so that is what we work on. We
            strengthen those environments, expand access across the state, and build the pathways
            and resources athletes rely on to advance.
          </p>
          <p className="leading-relaxed text-slate-300">
            Competition is part of that, not the point of it. The mat teaches discipline, patience
            and how to lose without quitting — and those are worth as much in a career as they are
            in a season.
          </p>
        </Section>

        <Section eyebrow="What we do" title="On the mat">
          <div className="grid gap-4 sm:grid-cols-2">
            <Pillar title="Tournament of Champions">
              An invitational bringing the best wrestlers in the state onto one mat, with the field
              announced weight class by weight class.
            </Pillar>
            <Pillar title="NC United Blue">
              Our national team — North Carolina wrestlers training and competing together well
              beyond state lines.
            </Pillar>
            <Pillar title="Open practices">
              Drop-in sessions any middle or high school wrestler can join, without changing clubs
              or leaving their program.
            </Pillar>
            <Pillar title="The record">
              Every college commitment, class rankings, and state and national results going back
              decades — free, and open to everyone.
            </Pillar>
          </div>
        </Section>

        <Section eyebrow="What we do" title="Beyond the mat">
          <p className="leading-relaxed text-slate-300">
            A wrestling career ends. What the sport built in someone does not. The NC United
            Network exists so that carries forward — connecting wrestlers to internships, jobs,
            mentors and each other, whether they are heading into nursing, the trades, teaching or
            business.
          </p>
          <p className="leading-relaxed text-slate-300">
            Athletes and mentors never pay. Companies fund the network, because a wrestler who has
            spent ten years learning to work is worth finding. We also award the{" "}
            <Link href="/scholarships" className="font-semibold text-rnc-gold underline-offset-2 hover:underline">
              Caden Perry Scholarship
            </Link>{" "}
            and recognise the state&apos;s best through the Dave Schultz and Tricia Saunders awards.
          </p>
          <p className="rounded-xl border border-rnc-line bg-rnc-surface p-4 text-sm text-slate-400">
            The Network is early. We soft-launched it this year and have placed our first athletes
            in internships — we would rather tell you that plainly than describe it as more than it
            is yet.
          </p>
        </Section>

        <Section eyebrow="Where we fit" title="We strengthen, we don't replace">
          <p className="leading-relaxed text-slate-300">
            NC United is not a club, a team, or a training business. We do not replace school
            programs, local clubs, or the coaches who lead them. We do not operate with
            exclusivity, we do not pull athletes away from their home programs, and we do not
            centralise control of wrestling in North Carolina.
          </p>
          <p className="leading-relaxed text-slate-300">
            We strengthen the environment around every program, expand opportunity statewide,
            connect athletes to college and national pathways, support families and coaches, and
            reinforce the structures that benefit every wrestler in the state.
          </p>
        </Section>

        <Section eyebrow="How we work" title="Our commitments">
          <div className="grid gap-4 sm:grid-cols-2">
            <Pillar title="Center the athlete">
              Every program, partnership and decision is judged by whether it strengthens the
              growth and long-term advancement of North Carolina wrestlers.
            </Pillar>
            <Pillar title="Expand access">
              Training, facilities, education and visibility decide who gets to progress. We work to
              put all of it within reach of more wrestlers, in more of the state.
            </Pillar>
            <Pillar title="Unite the community">
              Athletes, coaches, families, officials, clubs, schools, colleges and partners raise
              the sport when they move in alignment.
            </Pillar>
            <Pillar title="Build the infrastructure">
              Referees, regional training centres, facilities and events are the foundation athletes
              grow inside. Strong infrastructure outlasts any one season.
            </Pillar>
          </div>
        </Section>

        <section className="flex flex-col gap-4 rounded-2xl border border-rnc-line bg-rnc-raised p-7">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-rnc-gold">The reinvestment loop</p>
          <h2 className="text-2xl font-bold text-white">Everything here is built to come back around</h2>
          <p className="leading-relaxed text-slate-300">
            Athletes who rise through this ecosystem return to it — as mentors, coaches, referees,
            employers and leaders. That return is not a nice outcome we hope for. It is the engine.
            It is what makes the next wrestler&apos;s environment better than the one we found, and
            it is the reason we measure ourselves in people who came back rather than trophies.
          </p>
          <blockquote className="border-l-2 border-rnc-gold pl-4 text-lg font-semibold leading-relaxed text-white">
            It starts with you — represent yourself and your family first. Then your team and your
            club. Beyond state lines, we represent NC.
            <span className="mt-2 block text-rnc-gold">#RaiseUp</span>
          </blockquote>
        </section>

        <Section eyebrow="The organisation" title="Who we are">
          <p className="leading-relaxed text-slate-300">
            We are <strong className="text-white">NC United</strong>. Our legal name, the one on our
            IRS determination, is <strong className="text-white">NC Wrestling United Inc.</strong> —
            a North Carolina 501(c)(3) nonprofit, Tax ID{" "}
            <span className="tabular-nums">99-3757238</span>. Donations are tax-deductible to the
            extent the law allows.
          </p>
          <p className="leading-relaxed text-slate-300">
            RecruitNC is the platform we build on. It began as our recruiting tool and now runs
            everything you see here, including our iPhone app.
          </p>
          <p className="leading-relaxed text-slate-300">
            Questions, a correction, or a wrestler we have missed?{" "}
            <Link href="/contact" className="font-semibold text-rnc-gold underline-offset-2 hover:underline">
              Get in touch
            </Link>{" "}
            — or email{" "}
            <a
              href="mailto:info@ncwrestlingunited.com"
              className="font-semibold text-rnc-gold underline-offset-2 hover:underline"
            >
              info@ncwrestlingunited.com
            </a>
            . How we handle athlete information is set out in our{" "}
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
