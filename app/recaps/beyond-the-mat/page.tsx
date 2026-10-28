/**
 * "Beyond the Mat: The Questions Every Wrestling Family Should Ask" by Matt Hickey (28 Oct 2026).
 * A free RecruitWrestlers story: advice first, the Command Center as a small note after the end.
 * Staff-only until its switch in lib/recruitwrestlers-news.ts is on.
 */
import type { Metadata } from "next"
import Link from "next/link"
import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { ArrowRight } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { resolveRankingViewer } from "@/lib/ranking-access"
import { RW_STORIES } from "@/lib/recruitwrestlers-news"

export const dynamic = "force-dynamic"

const HREF = "/recaps/beyond-the-mat"
const story = RW_STORIES.find((s) => s.href === HREF)!
const isRwHost = (host: string) => /recruitwrestlers\.com$|^localhost|\.vercel\.app$/.test(host.toLowerCase())

export async function generateMetadata(): Promise<Metadata> {
  if (!isRwHost((await headers()).get("host") ?? "")) return { title: { absolute: "Page not found" }, robots: { index: false, follow: false } }
  return {
    title: { absolute: `${story.title} | RecruitWrestlers` },
    description: story.summary,
    ...(story.published ? {} : { robots: { index: false, follow: false } }),
  }
}

const H2 = ({ n, children }: { n: number; children: React.ReactNode }) => (
  <h2 className="mt-12 flex items-baseline gap-3 text-2xl font-black tracking-tight text-[#0b1730] sm:text-3xl">
    <span className="text-[#65a30d]">{n}.</span>
    <span>{children}</span>
  </h2>
)
const P = ({ children }: { children: React.ReactNode }) => <p className="mt-4 text-[17px] leading-[1.75] text-gray-800">{children}</p>
const Quote = ({ children }: { children: React.ReactNode }) => (
  <blockquote className="my-8 border-l-4 border-[#A3E635] bg-[#f4fbe6] px-6 py-5 text-xl font-bold leading-snug text-[#0b1730] sm:text-2xl">{children}</blockquote>
)

export default async function BeyondTheMat() {
  if (!isRwHost((await headers()).get("host") ?? "")) notFound()
  const { viewer } = await resolveRankingViewer({ supabase: await createClient(), admin: createAdminClient() })
  if (!story.published && viewer.isAdmin !== true) notFound()

  return (
    <main className="min-h-screen bg-[#0B1426] px-4 py-10 sm:py-14">
      <article className="mx-auto max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl shadow-black/40">
        <header className="bg-[#0b1730] px-6 py-10 text-white sm:px-12 sm:py-14">
          {!story.published ? (
            <p className="mb-4 inline-block rounded-full bg-amber-400/20 px-3 py-1 text-xs font-bold text-amber-200">Draft · staff only</p>
          ) : null}
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#A3E635]">Recruiting advice</p>
          <h1 className="mt-3 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">Beyond the Mat</h1>
          <p className="mt-3 text-xl font-semibold text-white/85 sm:text-2xl">The questions every wrestling family should ask</p>
          <p className="mt-6 text-sm text-white/60">By Matt Hickey · October 28, 2026 · 8 min read</p>
        </header>

        <div className="px-6 pb-12 pt-8 sm:px-12">
          <P>
            Over the past several years, we&apos;ve tracked more than 150 college wrestling commitments and had the privilege of being part of
            many athletes&apos; recruiting journeys. I&apos;ve also been through the process myself, as a wrestling parent.
          </P>
          <P>
            One thing I&apos;ve learned is that when the recruiting calls begin, most families naturally focus on three questions: How much
            scholarship money? How strong are the academics? Will my child get to wrestle?
          </P>
          <P>Those questions matter. But they aren&apos;t the whole picture.</P>
          <P>
            Wrestling gives our children a powerful foundation: discipline, resilience, work ethic, the ability to compete when it&apos;s hard.
            The right college provides an environment where those qualities can flourish, opening doors to opportunities that extend well
            beyond the sport.
          </P>
          <P>Having navigated this journey as a parent, there&apos;s one question I encourage every young wrestler to consider before committing to a college:</P>
          <Quote>&ldquo;If wrestling went away tomorrow, would you still want to attend this school?&rdquo;</Quote>
          <P>
            It isn&apos;t meant to diminish wrestling. It&apos;s meant to encourage athletes to consider the complete college experience. And when
            we approach recruiting with that perspective, the questions we ask begin to change.
          </P>

          <H2 n={1}>The people: who will influence your child?</H2>
          <P>
            Your child is going to spend an enormous amount of time with their coaches and teammates. These people will shape their daily
            experience, their confidence, their habits and their development.
          </P>
          <P>
            Do you trust the coaching staff? Do they genuinely care about their athletes as people? Are the teammates people your child wants
            to surround themselves with?
          </P>
          <P>A coach&apos;s record matters. So does the kind of person that coach helps develop. One question I encourage every parent to ask a college coach:</P>
          <Quote>
            &ldquo;Tell me about a few former wrestlers you&apos;re most proud of: not because of what they accomplished on the mat, but because of
            the people they&apos;ve become and what they&apos;re doing today.&rdquo;
          </Quote>
          <P>The answer will tell you a lot about the culture of a program and what its leadership truly values.</P>

          <H2 n={2}>The future: what happens after college?</H2>
          <P>
            College, at its core, is about preparing young people for the real world. For the overwhelming majority of college wrestlers, that
            world won&apos;t involve a singlet. It will involve building careers, supporting families and finding their own definition of success.
          </P>
          <P>So when you visit, don&apos;t limit your questions to the wrestling program, or even the academics. Ask about outcomes:</P>
          <ul className="mt-4 space-y-2.5 text-[17px] leading-[1.7] text-gray-800">
            {[
              "What are former wrestlers from this program doing today, and where are they working?",
              "Does the school actively connect students with alumni who mentor them and open doors?",
              "What internships are available, and does the school help student-athletes land meaningful experience before graduation?",
              "Which employers recruit from this school?",
            ].map((q) => (
              <li key={q} className="flex gap-3">
                <span className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#65a30d]" />
                {q}
              </li>
            ))}
          </ul>
          <P>
            These aren&apos;t secondary questions. They&apos;re among the most important a family can ask. Internships bridge education and
            employment. Mentors introduce young people to careers they never knew existed. An engaged alumni network provides opportunities for
            decades after graduation.
          </P>
          <P>
            Ask, too, to speak with a former wrestler who graduated four or five years ago. A current athlete can tell you what the program is
            like today. A graduate can tell you how well it prepared them for life afterward.
          </P>
          <P>
            The greatest return on the years our children have invested in wrestling may have little to do with what they accomplish on the
            mat in college. It may be what they accomplish in the decades that follow.
          </P>

          <H2 n={3}>The wrestling: is this the right environment to grow?</H2>
          <P>
            Wrestling should, of course, remain an important part of the decision. Is the coaching philosophy a good fit? Will your child be
            challenged? Will they have the chance to develop and compete? Does the program&apos;s culture suit their personality and goals?
          </P>
          <P>
            College wrestling is demanding. Balancing training, academics and a personal life is hard. Finding a program where your child feels
            supported, motivated and genuinely excited to be part of the team matters enormously.
          </P>
          <P>
            Ask what support looks like when things aren&apos;t going well. How does the staff help an athlete through an injury, an academic
            struggle, or a season when the wins aren&apos;t coming? Those answers may tell you as much about a program as its record.
          </P>

          <H2 n={4}>The academics: will this school help them find their path?</H2>
          <P>
            At 17 or 18, many athletes don&apos;t know what they want to do professionally. That&apos;s normal. Does the school offer programs that
            match your child&apos;s interests? Is there room to explore different majors? What academic support is there for student-athletes
            balancing a demanding schedule?
          </P>
          <P>
            And perhaps most importantly: does your child genuinely like the school? The campus, the community and the day-to-day experience
            should be a place where they can see themselves thriving.
          </P>

          <H2 n={5}>The financial picture: understand the complete offer</H2>
          <P>
            A scholarship is exciting, but families need to understand the full financial commitment. What is the actual cost of attendance
            after athletic scholarships, academic aid and other assistance? What isn&apos;t covered? What happens if circumstances change?
          </P>
          <P>
            The largest athletic scholarship isn&apos;t always the best financial or educational opportunity. A school offering little or no
            athletic money may still provide an exceptional overall package through academic or need-based aid. Look at the complete picture,
            not just the athletic offer.
          </P>

          <h2 className="mt-12 text-2xl font-black tracking-tight text-[#0b1730] sm:text-3xl">Enjoy the journey. Keep perspective.</h2>
          <P>
            Recruiting should be an exciting time for athletes and their families. It&apos;s the culmination of years of early mornings, long
            weekends, sacrifices and countless hours in wrestling rooms and gyms.
          </P>
          <P>
            Whether your child chooses Division I, II or III, or the NAIA, earning the chance to keep wrestling while pursuing a college
            education is worth celebrating.
          </P>
          <P>Having been through this as a parent, and having watched many other families go through it, my advice is simple:</P>
          <P>
            Ask questions. Visit schools. Get to know the coaches and teammates. Explore the alumni network. Ask about internships and careers.
            Talk to former athletes. Understand the financial commitment.
          </P>
          <P>
            And most importantly, listen to your child. This is their journey, and they need to feel confident and excited about the decision.
          </P>
          <P>
            Success isn&apos;t defined by the name of the college that recruits you. It&apos;s defined by what you do with the opportunities in
            front of you. Our children have spent years building the discipline, work ethic, resilience and character wrestling demands. Now we
            can help them find a college where those qualities keep growing and open doors to a future they may not yet imagine.
          </P>
          <p className="mt-6 text-xl font-bold leading-snug text-[#0b1730]">
            We&apos;re not simply helping our children find a place to wrestle. We&apos;re helping them find a place to thrive.
          </p>

          <section className="mt-12 rounded-xl border border-gray-200 bg-gray-50 p-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">About the author</p>
            <p className="mt-2 text-[15px] leading-relaxed text-gray-700">
              <b className="text-[#0b1730]">Matt Hickey</b> is the founder of RecruitWrestlers and co-founder of NC United. A former
              Division I wrestler and father of a current Division I wrestler, Matt has experienced the recruiting journey firsthand and enjoys
              helping families navigate the process.
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-gray-700">
              During his 25-year career in technology, Matt has served as a CRO, CEO and founder, helping build and grow companies in the AI and
              cybersecurity industries through successful acquisitions. He credits many of the lessons learned through wrestling (discipline,
              resilience, accountability and hard work) with shaping his professional and personal journey. Today, he&apos;s passionate about
              helping the next generation of wrestlers turn those same lessons into opportunities throughout their lives.
            </p>
          </section>
        </div>
      </article>

      {/* The product, after the article and apart from it: a next step, not a pitch. */}
      <aside className="mx-auto mt-6 max-w-3xl rounded-2xl border border-[#A3E635]/40 bg-[#15243B] p-6 text-white sm:p-8">
        <p className="text-lg font-black">Make the recruiting journey more informed</p>
        <p className="mt-2 text-[15px] leading-relaxed text-[#A8B3C5]">
          RecruitWrestlers&apos; Recruiting Command Center helps families explore college wrestling programs, compare rosters, learn about
          coaching staffs and better understand potential opportunities, all in one place. Because finding the right college starts with
          having the right information.
        </p>
        <Link href="/command-center" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#A3E635] px-5 py-3 text-sm font-bold text-[#0B1426] hover:bg-[#BEF264]">
          Explore the Command Center <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </aside>
    </main>
  )
}
