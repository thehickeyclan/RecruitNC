/**
 * "Choosing a College for the Next 40 Years: Leveraging Wrestling for a Lifetime of Opportunity" by Matt Hickey
 * (drafted 28 Oct 2026 as "Beyond the Mat"; Matt's rewrite of 30 Oct, with the NIL and Division III points kept).
 * A free RecruitWrestlers story: advice first, the Command Center as a small note after the end.
 * Staff-only until its switch in lib/recruitwrestlers-news.ts is on.
 */
import { NchsaaArticleReactions } from "@/components/nchsaa-article-reactions"
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
    ...(story.image ? { openGraph: { title: story.title, description: story.summary, images: [story.image] } } : {}),
    ...(story.published ? {} : { robots: { index: false, follow: false } }),
  }
}

const REACTIONS_SLUG = "rw-choosing-a-college-next-40-years"

const H2 = ({ n, children }: { n: number; children: React.ReactNode }) => (
  <h2 className="mt-12 flex items-baseline gap-3 text-2xl font-black tracking-tight text-[#0b1730] sm:text-3xl">
    <span className="text-[#65a30d]">{n}.</span>
    <span>{children}</span>
  </h2>
)
const P = ({ children }: { children: React.ReactNode }) => <p className="mt-4 text-[17px] leading-[1.75] text-gray-800">{children}</p>
const Sub = ({ children }: { children: React.ReactNode }) => <h2 className="mt-12 text-2xl font-black tracking-tight text-[#0b1730] sm:text-3xl">{children}</h2>
const Bullets = ({ items }: { items: React.ReactNode[] }) => (
  <ul className="mt-4 space-y-2.5 text-[17px] leading-[1.7] text-gray-800">
    {items.map((q, i) => (
      <li key={i} className="flex gap-3">
        <span className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#65a30d]" />
        <span>{q}</span>
      </li>
    ))}
  </ul>
)
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
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#A3E635]">Beyond the Mat</p>
          <h1 className="mt-3 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">Choosing a College for the Next 40 Years</h1>
          <p className="mt-3 text-xl font-semibold text-white/85 sm:text-2xl">Leveraging wrestling for a lifetime of opportunity</p>
          <p className="mt-6 text-sm text-white/60">By Matt Hickey · October 28, 2026 · 10 min read</p>
        </header>

        {story.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={story.image} alt="A wrestler and his parents walking a college campus" className="block aspect-[2/1] w-full object-cover" />
        ) : null}
        <div className="px-6 pb-12 pt-8 sm:px-12">
          {/* Thumbs at the top and the bottom (Matt, 30 Oct 2026); one count, shared. */}
          <div className="border-b border-gray-200 pb-2">
            <NchsaaArticleReactions articleSlug={REACTIONS_SLUG} />
          </div>
          <P>
            Over the past several years, we&apos;ve tracked more than 150 college wrestling commitments and helped hundreds of athletes and
            their families navigate the recruiting process.
          </P>
          <P>One thing I&apos;ve come to believe strongly is that wrestling isn&apos;t the destination. It&apos;s a foundation for lifelong success.</P>
          <P>
            Think about what our families invest in this sport. Years of early mornings, late nights, tournaments, travel and weekends in
            gymnasiums. Countless sacrifices and, in many cases, tens of thousands of dollars.
          </P>
          <P>
            Along the way, our children develop something incredibly valuable: discipline, resilience, accountability, work ethic and the
            confidence that comes from pursuing excellence.
          </P>
          <P>And those qualities create opportunity.</P>
          <P>The opportunity to compete in college, earn an education, build meaningful relationships and prepare for a successful life beyond wrestling.</P>
          <P>But when recruiting begins, it&apos;s natural for families to focus on what they&apos;ve focused on for years: wrestling.</P>
          <P>
            Which program is ranked higher? Who has the best coaches? Where are the strongest workout partners? Which school gives my child the
            best chance to become an All-American?
          </P>
          <P>Those are important questions. Every young wrestler should be encouraged to pursue ambitious goals.</P>
          <P>But they&apos;re only part of a much bigger decision.</P>
          <P>After everything our families have invested in this sport, we should make sure we&apos;re considering the full range of opportunities that investment has created.</P>

          <Sub>Every wrestler has a final match</Sub>
          <P>There&apos;s something about college wrestling that we don&apos;t talk about enough.</P>
          <P>From the moment a wrestler steps onto a college campus, the clock is counting down toward their final match.</P>
          <P>
            For some, that moment comes sooner than expected because of injury or changing priorities. For others, it comes after four or five
            incredible years, perhaps with conference titles, All-American honors or a national championship.
          </P>
          <P>But for nearly everyone, that final match eventually arrives.</P>
          <P>For most college wrestlers, the purpose of college isn&apos;t to prepare for a professional wrestling career. It&apos;s to prepare for a professional life.</P>
          <P>Graduation isn&apos;t the finish line. It&apos;s the starting line.</P>
          <P>The education, relationships and opportunities created during those college years can shape the next 40 years.</P>
          <P>That&apos;s why I encourage every young wrestler to consider one question before committing:</P>
          <Quote>&ldquo;If wrestling went away tomorrow, would I still want to attend this school?&rdquo;</Quote>
          <P>It isn&apos;t meant to diminish wrestling. It&apos;s meant to encourage athletes to consider everything their college experience can offer.</P>

          <Sub>Leverage wrestling to create opportunity</Sub>
          <P>When approached thoughtfully, wrestling can be an extraordinary advantage in the college recruiting process.</P>
          <P>
            It can open doors to universities a student might not otherwise have been admitted to. It can provide access to influential alumni
            networks, exceptional academic resources, internships, career development programs and relationships that create opportunities for
            decades.
          </P>
          <P>
            It can also provide access to outstanding coaching, strength and conditioning programs, nutritionists, athletic trainers and other
            resources that help young athletes develop physically and personally.
          </P>
          <P>That&apos;s the power of leveraging wrestling.</P>
          <P>But families need to evaluate the entire opportunity.</P>
          <P>
            We spend countless hours researching a program&apos;s coaching staff, lineup, workout partners, training facilities and history of
            producing All-Americans.
          </P>
          <P>But how much time do we spend evaluating the opportunities a program creates beyond wrestling?</P>
          <P>
            How many wrestlers participated in internships last summer, and in what fields? Which companies did they work for? How did the
            program help them secure those opportunities?
          </P>
          <P>
            And what happens after graduation? Where are former wrestlers working? What careers have they built? How did the university, its
            alumni network and the relationships they developed contribute to their success?
          </P>
          <P>We should be just as interested in a program&apos;s ability to develop successful people as we are in its ability to develop successful wrestlers.</P>
          <P>
            That doesn&apos;t mean compromising athletic ambitions. Pursue excellence. Chase championships. Find coaches and teammates who will
            push you to become the best wrestler you can be.
          </P>
          <P>But recognize that some of the greatest opportunities wrestling creates may have little to do with what happens on the mat.</P>
          <P>When we approach recruiting with that perspective, the questions we ask begin to change.</P>

          <H2 n={1}>The people: who will influence your child?</H2>
          <P>
            Think about how much time your child will spend with their coaches, teammates and workout partners over the next four or five
            years. Outside the classroom, these people will be among the most influential figures in their lives.
          </P>
          <P>
            We naturally evaluate coaches on their ability to develop great wrestlers. Their technical expertise, competitive success and
            history of producing All-Americans matter.
          </P>
          <P>But what about their ability to develop great people?</P>
          <P>
            Is their philosophy focused solely on building better wrestlers, or on developing young adults who will become successful leaders,
            professionals and members of their communities?
          </P>
          <P>
            The best coaches recognize that teaching a great single-leg takedown and preparing an athlete for life aren&apos;t competing
            priorities. Both are part of developing the whole person.
          </P>
          <P>
            Consider the culture they&apos;re building. Are athletes encouraged to pursue excellence in the classroom as passionately as they do
            on the mat? Do coaches help connect wrestlers with mentors, internships and opportunities beyond the sport? Are teammates people your
            child will learn from, respect and want to surround themselves with?
          </P>
          <P>One question I encourage every parent to ask a college coach:</P>
          <Quote>
            &ldquo;Tell me about a few former wrestlers you&apos;re most proud of, not because of what they accomplished on the mat, but because
            of the people they&apos;ve become and what they&apos;re doing today.&rdquo;
          </Quote>
          <P>The answer may reveal more about the program&apos;s values than its win-loss record.</P>
          <P>You&apos;re not simply choosing who will coach your child for the next four years. You&apos;re choosing people who will help shape the person they become.</P>

          <H2 n={2}>The academics and future: will this school help them find their path?</H2>
          <P>At 17 or 18, many athletes don&apos;t know exactly what they want to do professionally. That&apos;s normal.</P>
          <P>
            College should help them explore interests, discover possibilities and develop the knowledge, experience and relationships that
            will serve them long after graduation.
          </P>
          <P>
            Does the school offer academic programs that align with your child&apos;s interests? Is there flexibility to explore different
            majors? What support exists for student-athletes balancing demanding schedules?
          </P>
          <P>And what about the opportunities beyond the classroom?</P>
          <Bullets
            items={[
              "What are former wrestlers doing today, and where are they working?",
              "Does the school connect students with alumni and professional mentors?",
              "Which employers recruit from the college?",
              "Can we speak with a wrestler who graduated four or five years ago?",
            ]}
          />
          <P>That last question is particularly valuable.</P>
          <P>Current athletes can tell you what it&apos;s like to be part of the program. Graduates can tell you how the experience prepared them for life afterward.</P>
          <P>
            An engaged alumni network can be an extraordinary asset. Mentors introduce young people to careers they may never have considered.
            Internships provide experience and connections. Relationships developed during college can create opportunities decades after
            graduation.
          </P>
          <P>Just as we wouldn&apos;t want to overlook a tremendous wrestling opportunity, we shouldn&apos;t overlook an exceptional educational opportunity.</P>
          <P>
            And remember, academic fit involves more than rankings or admissions selectivity. The right school is one where your child can grow
            intellectually, personally and athletically.
          </P>
          <P>
            The greatest return on your family&apos;s investment in wrestling may not come during those four or five years of college. It may
            come during the 40 years that follow.
          </P>

          <H2 n={3}>The wrestling: is this the right environment to excel?</H2>
          <P>Wrestling matters enormously. These athletes have worked too hard not to pursue their goals with everything they have.</P>
          <P>But evaluate the program through the lens of your child&apos;s development, not simply its reputation.</P>
          <Bullets
            items={[
              <><b>Development:</b> Do wrestlers consistently improve throughout their college careers?</>,
              <><b>Workout partners:</b> Who will challenge your child every day?</>,
              <><b>Opportunity:</b> What is the realistic path to competing in the lineup?</>,
              <><b>Coaching:</b> Does the staff&apos;s philosophy fit your child&apos;s style, personality and ambitions?</>,
              <><b>Culture:</b> Will your child enjoy being part of this team and feel motivated to give their best?</>,
            ]}
          />
          <P>
            College wrestling is demanding. The right program should challenge athletes to pursue excellence while supporting their growth as
            students and young adults.
          </P>
          <P>Winning matters. Competing matters. Learning to pursue difficult goals matters.</P>
          <P>Those experiences help make wrestling such a powerful foundation for life.</P>

          <H2 n={4}>The financial picture: understand the complete value</H2>
          <P>A scholarship is exciting, and the financial commitment matters. But the largest athletic offer isn&apos;t necessarily the best overall opportunity.</P>
          <P>There&apos;s a difference between the price of a college education and the lifetime value of the opportunities it creates.</P>
          <P>Are we so focused on what a college is offering today that we&apos;re overlooking what it could make possible tomorrow?</P>
          <P>
            A difference in financial assistance over four years can be significant. But so can the difference in education, alumni networks,
            internships, career opportunities and relationships that may influence the next 40 years.
          </P>
          <P>
            Of course, affordability matters. Families should understand the complete cost of attendance, explore academic and need-based aid,
            and evaluate the financial commitment carefully.
          </P>
          <P>
            Many programs now help their athletes find support beyond scholarships, including name, image and likeness (NIL) opportunities.
            The scholarship is only one part of what a program can put together.
          </P>
          <P>
            And don&apos;t assume a Division III school can&apos;t put together a competitive package. Division III schools don&apos;t award
            athletic scholarships, but academic, merit and need-based aid can make the final cost as competitive as an athletic offer, or more.
          </P>
          <P>But the decision shouldn&apos;t end with the scholarship offer.</P>
          <P>Understand what college will cost. But spend just as much time understanding what that college experience could make possible.</P>

          <h2 className="mt-12 text-2xl font-black tracking-tight text-[#0b1730] sm:text-3xl">Enjoy the journey. Keep perspective.</h2>
          <P>Recruiting should be an exciting time for athletes and their families.</P>
          <P>
            It&apos;s the culmination of years of hard work, sacrifice and shared experiences. Whether your child chooses Division I, II or III,
            the NAIA or junior college, earning the opportunity to continue wrestling while pursuing an education is something worth
            celebrating.
          </P>
          <P>Encourage your child to chase their wrestling dreams. To compete, pursue excellence and make the most of every opportunity the sport provides.</P>
          <P>But help them see the bigger picture, too.</P>
          <P>
            Ask questions. Visit schools. Meet the coaches and teammates. Explore the academics, alumni networks and career opportunities.
            Understand the financial commitment.
          </P>
          <P>And most importantly, listen to your child. This is their journey.</P>
          <P>
            Wrestling teaches lessons that extend far beyond competition: discipline, resilience, accountability and the willingness to work
            toward difficult goals. Those qualities can become the foundation for success in whatever path our children choose.
          </P>
          <P>That&apos;s what I hope for the next generation of wrestlers.</P>
          <P>The goal isn&apos;t simply to arrive at college ready to wrestle. It&apos;s to leave college ready for life.</P>
          <P>Every wrestler will eventually have a final match. But the opportunities wrestling creates can last a lifetime.</P>
          <p className="mt-6 text-xl font-bold leading-snug text-[#0b1730]">
            After all the years our families have invested in this sport, let&apos;s make sure we&apos;re preparing our children not just for
            the next four years, but for the next 40.
          </p>

          <div className="mt-10 border-t border-gray-200 pt-2">
            <NchsaaArticleReactions articleSlug={REACTIONS_SLUG} />
          </div>

          <section className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">About the author</p>
            <p className="mt-2 text-[15px] leading-relaxed text-gray-700">
              <b className="text-[#0b1730]">Matt Hickey</b> is the founder of RecruitWrestlers. A former
              Division I wrestler, Matt and the RecruitWrestlers team have helped hundreds of athletes and families navigate the recruiting
              process.
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
