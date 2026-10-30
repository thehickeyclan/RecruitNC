/**
 * "What Will We Actually Owe?" by Matt Hickey (drafted 30 Oct 2026): the second Beyond the Mat
 * column, the money side of college for a parent who has never done this. Written for a parent who
 * read the first column and asked: just tell me what we're going to owe.
 *
 * Every fact is from the Learn library (lib/recruiting/learn/content.ts, "Paying for college" and
 * "Questions families ask"); the example is round numbers, labelled as one. No income question, no
 * comparison to other families. Staff-only until its switch in lib/recruitwrestlers-news.ts is on.
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

const HREF = "/recaps/what-will-we-owe"
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

const REACTIONS_SLUG = "rw-what-will-we-actually-owe"

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

/** The example: two colleges, round numbers, the same sum the calculator does. */
const EXAMPLE = [
  { name: "College A", cost: 60000, aid: [{ label: "Athletic scholarship", amount: 15000 }, { label: "Academic scholarship", amount: 5000 }] },
  { name: "College B", cost: 45000, aid: [{ label: "Athletic scholarship", amount: 0 }, { label: "Academic scholarship", amount: 20000 }] },
]
const usd = (n: number) => `$${n.toLocaleString("en-US")}`

function Example() {
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      {EXAMPLE.map((c) => {
        const free = c.aid.reduce((t, a) => t + a.amount, 0)
        const owe = c.cost - free
        return (
          <div key={c.name} className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <p className="text-sm font-black uppercase tracking-wide text-[#0b1730]">{c.name}</p>
            <dl className="mt-3 space-y-1.5 text-[15px] text-gray-700">
              <div className="flex justify-between">
                <dt>Cost of attendance</dt>
                <dd className="font-semibold">{usd(c.cost)}</dd>
              </div>
              {c.aid.map((a) => (
                <div key={a.label} className="flex justify-between">
                  <dt>{a.label}</dt>
                  <dd className="font-semibold text-[#3f6212]">−{usd(a.amount)}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 border-t border-gray-200 pt-3 text-[15px] text-gray-700">
              You pay or borrow <b className="text-2xl font-black text-[#0b1730]">{usd(owe)}</b> a year
            </p>
            <p className="text-[15px] text-gray-600">{usd(owe * 4)} over four years</p>
          </div>
        )
      })}
    </div>
  )
}

export default async function WhatWillWeOwe() {
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
          <h1 className="mt-3 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">What Will We Actually Owe?</h1>
          <p className="mt-3 text-xl font-semibold text-white/85 sm:text-2xl">The money side of college, for parents starting from zero</p>
          <p className="mt-6 text-sm text-white/60">By Matt Hickey · {story.readTime}</p>
        </header>

        <div className="px-6 pb-12 pt-8 sm:px-12">
          <div className="border-b border-gray-200 pb-2">
            <NchsaaArticleReactions articleSlug={REACTIONS_SLUG} />
          </div>
          <P>
            After our last column, a parent wrote to say how much it helped, and then asked the question I hear more than any other. This
            whole process is overwhelming. Just tell me what we&apos;re going to owe.
          </P>
          <P>That&apos;s a fair question, and you deserve a straight answer to it.</P>
          <P>
            Nobody can tell you the number before a college does. But the way to get to it is simpler than it looks. It comes down to four
            things to understand and one piece of arithmetic. If you&apos;ve never done this before, start here.
          </P>

          <H2 n={1}>Every college has two prices</H2>
          <P>
            <b>The published price</b> is what a year costs before any help: tuition and fees, housing and food, and books. It&apos;s the
            number on the college&apos;s website, and the one that makes parents&apos; stomachs drop.
          </P>
          <P>
            <b>The net price</b> is what a student actually pays for one year after scholarships and grants are subtracted.
          </P>
          <P>The second number is the one that matters. A college with a high sticker price can cost your family less than a cheaper-looking one.</P>

          <H2 n={2}>Money comes from four places</H2>
          <P>When people say &ldquo;aid,&rdquo; they mean several different things. There are four sources, and most families end up with a mix.</P>
          <Bullets
            items={[
              <>
                <b>Government grants.</b> Need-based aid comes from the government and the college&apos;s financial aid office, based on your
                family&apos;s finances, and it starts with one federal form: the FAFSA. The federal Pell Grant is the best-known example.
              </>,
              <>
                <b>The college&apos;s own aid.</b> Colleges award their own academic scholarships, usually on GPA and test scores. A need-based grant from
                the college comes from its financial aid office. Neither has anything to do with wrestling.
              </>,
              <>
                <b>The athletic scholarship.</b> This is the money from the coach. The NCAA calls it a &ldquo;grant-in-aid&rdquo;; it means the
                same thing.
              </>,
              <>
                <b>Outside scholarships.</b> Money from anyone other than the college. Whatever your wrestler receives, it has to be reported to the
                college&apos;s financial aid office.
              </>,
            ]}
          />
          <P>
            One more thing about that third source. Full rides are rare. A Division II team shares the equivalent of nine full scholarships
            across the whole men&apos;s roster, and Division III colleges and the Ivy League give no athletic scholarships at all. The NCAA says
            70% of Division I athletes and 77% of Division II athletes receive some athletic aid. Some is not all. Expect a partial offer, and
            know that the lowest bills usually come from putting a partial wrestling award together with academic and need-based aid.
          </P>
          <Quote>Scholarships and grants don&apos;t have to be paid back. Loans do.</Quote>
          <P>
            That sentence is the whole difference. An offer letter may list loans next to scholarships, but a loan isn&apos;t a discount.
            It&apos;s money your family still owes, later, with interest.
          </P>

          <H2 n={3}>Get your own estimate, before any offer</H2>
          <P>
            Every college has a net price calculator on its website. You answer questions about your own situation, and it gives you an
            estimate of your own cost. The US Department of Education keeps a search for them.
          </P>
          <P>
            Run it for every college on your list before you visit. It takes about ten minutes per school, and it can change which colleges
            you take seriously.
          </P>

          <H2 n={4}>Ask each coach three things, in writing</H2>
          <P>When an offer comes, get these answers on paper:</P>
          <Bullets
            items={[
              <>
                <b>How much?</b> The whole package, in one place: athletic, academic and need-based aid, each as a yearly dollar figure.
              </>,
              <>
                <b>For how many years?</b> In Division I, an athletic scholarship is awarded for at least one academic year and may run longer. It
                can be a one-year or a multi-year award.
              </>,
              <>
                <b>Does it renew?</b> In many cases the head coach decides whether it&apos;s renewed. If a Division I college plans to reduce or
                not renew it, it must tell the wrestler in writing by July 1.
              </>,
            ]}
          />
          <P>While you&apos;re asking, ask one more: what happens to the award after an injury.</P>

          <Sub>Then do the arithmetic</Sub>
          <P>Once you have an offer, the sum is the same for every college:</P>
          <Bullets
            items={[
              "Start with the college's full yearly cost of attendance.",
              "Subtract every grant and scholarship, as yearly dollar figures. Don't subtract loans.",
              "What's left is what your family pays or borrows each year. Multiply it by four, and ask which parts are guaranteed after the first year.",
            ]}
          />
          <P>Here&apos;s an example, with round numbers:</P>
          <Example />
          <P>
            College A made the bigger athletic offer, and costs $60,000 more over four years. That&apos;s why we compare colleges on what the
            family pays, never on the size of the scholarship.
          </P>

          <Sub>The bottom line is one number per college</Sub>
          <P>
            In our last column I wrote that the price of a college and the value of what it makes possible are two different things. Both
            matter. But you can&apos;t weigh the value until you know the price, and now you know how to find it.
          </P>
          <P>Two prices. Four sources of money. One estimate before the offer. Three questions in writing. Then one number per college.</P>
          <p className="mt-6 text-xl font-bold leading-snug text-[#0b1730]">You don&apos;t have to understand all of financial aid. You just have to know what to ask, and then do the math.</p>

          <div className="mt-10 border-t border-gray-200 pt-2">
            <NchsaaArticleReactions articleSlug={REACTIONS_SLUG} />
          </div>

          <p className="mt-8 text-sm leading-relaxed text-gray-500">
            The rules here are from the NCAA&apos;s own manuals and the US Department of Education, as collected in our Learn library. Rules
            change, so confirm anything you&apos;re relying on with the college&apos;s financial aid or compliance office.
          </p>
        </div>
      </article>

      {/* The product, after the article and apart from it: a next step, not a pitch. */}
      <aside className="mx-auto mt-6 max-w-3xl rounded-2xl border border-[#A3E635]/40 bg-[#15243B] p-6 text-white sm:p-8">
        <p className="text-lg font-black">Do the math for every offer</p>
        <p className="mt-2 text-[15px] leading-relaxed text-[#A8B3C5]">
          The Recruiting Command Center has a cost calculator on every college on your list. Type in what each college offered and see what
          you&apos;ll owe, per year and over four years, side by side. Loans never count as a discount, and it never asks about your income.
        </p>
        <Link href="/command-center" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#A3E635] px-5 py-3 text-sm font-bold text-[#0B1426] hover:bg-[#BEF264]">
          Explore the Command Center <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </aside>
    </main>
  )
}
