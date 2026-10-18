/**
 * The transfer portal, for high school families (Matt, 18 Oct 2026): the draft guide rebuilt as
 * cards - the short version, the rules by level, two real transfers, what to do and what to ask -
 * with the longer explanations behind a tap. Content and sources: lib/recruiting/learn/transfer-portal.ts.
 */
import type { Metadata } from "next"
import { ArrowRight, CheckCircle2, ChevronDown, ExternalLink, Scale, ShieldAlert } from "lucide-react"

import { PortalShell } from "@/components/portal/portal-shell"
import { LearnDisclaimer } from "@/components/recruiting/learn/learn-disclaimer"
import { JucoPaths, RoomBeforeAfter, TransferCalendar, TransferMove } from "@/components/recruiting/learn/transfer-graphics"
import {
  CASE_STUDIES,
  COACH_QUESTIONS_TRANSFER,
  ELIGIBILITY_CLOCK,
  FAMILY_CHECKLIST,
  JUCO_QUESTIONS,
  PORTAL_IMPACT,
  PORTAL_STEPS,
  TRANSFER_CHECKED,
  TRANSFER_RULES,
  TRANSFER_SUMMARY,
  WOMENS,
  type TransferSource,
} from "@/lib/recruiting/learn/transfer-portal"

export const metadata: Metadata = {
  title: "The wrestling transfer portal: what high school families need to know | RecruitNC",
  description: "How the transfer portal changes college wrestling recruiting, the transfer rules for every level, and what families should do and ask.",
}

// The recruiting accent: blue in recruiting areas, gold elsewhere (app/recruit-brand.css).
const GOLD = "var(--recruit-accent)"
const card = "rounded-2xl border border-white/10 bg-[#0d1d36]/80 p-5"
const checked = new Date(`${TRANSFER_CHECKED}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })

function Sources({ list }: { list: TransferSource[] }) {
  if (!list.length) return null
  return (
    <p className="mt-3 flex flex-wrap gap-1.5">
      {list.map((s) => (
        <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2 py-0.5 text-[11px] text-white/55 hover:border-white/30 hover:text-white">
          {s.label}
          <ExternalLink className="h-3 w-3" aria-hidden />
        </a>
      ))}
    </p>
  )
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mt-10">
      <p className="text-xs font-black uppercase tracking-[0.25em]" style={{ color: GOLD }}>
        {eyebrow}
      </p>
      <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{title}</h2>
    </div>
  )
}

function More({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className={`${card} group`}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-bold [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="h-4 w-4 shrink-0 text-white/50 transition group-open:rotate-180" aria-hidden />
      </summary>
      <div className="mt-3 text-sm leading-6 text-white/75">{children}</div>
    </details>
  )
}

export default function TransferPortalPage() {
  return (
    <PortalShell active="learn">
      <div className="mx-auto max-w-6xl text-white">
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0B1D3A]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/learn/transfer-portal-hero.webp" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover object-right opacity-70" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B1D3A] via-[#0B1D3A]/85 to-transparent" aria-hidden />
          <div className="relative max-w-xl p-6 sm:p-10">
            <p className="text-xs font-black uppercase tracking-[0.25em]" style={{ color: GOLD }}>
              <a href="/my-recruiting/learn" className="hover:underline">Learn</a> › Transfer portal
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">The transfer portal</h1>
            <p className="mt-2 text-sm text-white/75 sm:text-base">What every high school wrestling family needs to know.</p>
            <p className="mt-4 text-xs text-white/50">Rules checked {checked}</p>
          </div>
        </section>

        {/* The short version */}
        <section className={`${card} mt-6`}>
          <p className="text-xs font-black uppercase tracking-[0.25em]" style={{ color: GOLD }}>The short version</p>
          <ul className="mt-3 space-y-2">
            {TRANSFER_SUMMARY.map((s) => (
              <li key={s} className="flex gap-2.5 text-[15px] leading-6 text-white/85">
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0" style={{ color: GOLD }} aria-hidden /> {s}
              </li>
            ))}
          </ul>
        </section>

        <SectionTitle eyebrow="How it works" title="Entering the portal is not transferring" />
        <ol className="mt-4 grid gap-3 md:grid-cols-5">
          {PORTAL_STEPS.map((step, i) => (
            <li key={step} className={`${card} flex gap-3 md:block`}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black text-[#0A1628]" style={{ backgroundColor: GOLD }}>
                {i + 1}
              </span>
              <p className="text-sm leading-6 text-white/80 md:mt-3">{step}</p>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm text-white/60">The portal is a private NCAA database for colleges, not a list families can browse.</p>

        <SectionTitle eyebrow="Why wrestling is different" title="One starter per weight" />
        <div className="mt-4 space-y-4">
          <RoomBeforeAfter />
          <div className={`${card} flex flex-col justify-between`}>
            <div>
              <p className="text-[15px] leading-6 text-white/85">
                The transfer creates competition; it doesn&apos;t decide who wrestles. Someone may change weight, grow into another role or leave. Look at the <b>room</b>, not just the program: who returns at your wrestler&apos;s weight, eligibility left, incoming recruits and the staff&apos;s plan.
              </p>
              <a href="/recruiting/college-map" className="mt-3 inline-flex items-center gap-1 text-sm font-bold" style={{ color: GOLD }}>
                See the roster at your weight on any college&apos;s page <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
            </div>
            <p className="mt-4 flex gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-white/75">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
              Weight is a health process, not a recruiting tactic. College wrestling has official weight-certification rules; never chase a lineup opening by changing weight unsafely.
            </p>
          </div>
        </div>

        <SectionTitle eyebrow="The rules" title="Transfer rules, level by level" />
        <div className="mt-4">
          <TransferCalendar />
        </div>
        {/* A phone swipes through the levels; wider screens show them as a grid. */}
        <div className="-mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:overflow-visible sm:px-0 sm:pb-0 sm:grid-cols-2 lg:grid-cols-3">
          {TRANSFER_RULES.map((r) => (
            <div key={r.level} className={`${card} w-[85%] shrink-0 snap-center sm:w-auto`}>
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white/55">
                <Scale className="h-3.5 w-3.5" aria-hidden /> {r.level}
              </p>
              <p className="mt-2 text-xl font-black">{r.how}</p>
              <p className="mt-2 text-sm leading-6 text-white/75">{r.point}</p>
              <Sources list={r.sources} />
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-white/40 sm:hidden">Swipe for every level →</p>
        <p className="mt-3 text-xs text-white/50">A guide, not eligibility clearance: every case depends on the wrestler&apos;s full enrollment and transfer history. Confirm with the new college&apos;s compliance office.</p>

        <SectionTitle eyebrow="Two real transfers" title="What a move can mean" />
        <div className="-mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:overflow-visible sm:px-0 sm:pb-0 sm:grid-cols-2 sm:gap-4">
          {CASE_STUDIES.map((c) => (
            <div key={c.name} className={`${card} w-[88%] shrink-0 snap-center sm:w-auto`}>
              <p className="text-lg font-black">{c.name}</p>
              <div className="mt-3">
                <TransferMove from={c.from} to={c.to} weights={c.weights} results={c.results} />
              </div>
              <p className="mt-3 text-sm leading-6 text-white/75">{c.story}</p>
              <p className="mt-3 rounded-lg bg-white/[0.04] p-3 text-sm font-semibold text-white/90">{c.lesson}</p>
              <Sources list={c.sources} />
            </div>
          ))}
        </div>

        <SectionTitle eyebrow="Our advice" title="How the portal changes high school recruiting" />
        <div className="-mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:overflow-visible sm:px-0 sm:pb-0 sm:grid-cols-2 lg:grid-cols-5">
          {PORTAL_IMPACT.map((p, i) => (
            <div key={p.title} className={`${card} w-[70%] shrink-0 snap-center sm:w-auto`}>
              <p className="text-2xl font-black text-white/30">{i + 1}</p>
              <p className="mt-1 font-bold">{p.title}</p>
              <p className="mt-1 text-sm leading-6 text-white/70">{p.text}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-white/45">Our recruiting advice, not NCAA rules.</p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <section className={card}>
            <p className="text-xs font-black uppercase tracking-[0.25em]" style={{ color: GOLD }}>What to do differently</p>
            <ul className="mt-3 space-y-2.5">
              {FAMILY_CHECKLIST.map((s) => (
                <li key={s} className="flex gap-2.5 text-sm leading-6 text-white/85">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: GOLD }} aria-hidden /> {s}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { label: "Your college list", href: "/my-recruiting/colleges" },
                { label: "Compare colleges", href: "/recruiting/compare" },
                { label: "Ask Scout", href: "/my-recruiting/scout" },
              ].map((l) => (
                <a key={l.href} href={l.href} className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-1.5 text-sm font-semibold hover:border-white/30">
                  {l.label} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </a>
              ))}
            </div>
          </section>
          <section className={card}>
            <p className="text-xs font-black uppercase tracking-[0.25em]" style={{ color: GOLD }}>Five questions for a college coach</p>
            <ol className="mt-3 space-y-3">
              {COACH_QUESTIONS_TRANSFER.map((c, i) => (
                <li key={c.q} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-black">{i + 1}</span>
                  <span className="text-sm leading-6">
                    <b>{c.q}</b> <span className="text-white/70">{c.a}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <SectionTitle eyebrow="Go deeper" title="More detail" />
        <div className="mt-4 space-y-3">
          <More title="Junior college to NCAA: does it affect eligibility?">
            <p>
              It can: junior college time can count toward NCAA eligibility, and it never resets the clock. It doesn&apos;t rule a wrestler out. Junior college straight to an NCAA school follows the two-year transfer rules (&quot;2–4&quot;); four-year, then junior college, then four-year (&quot;4–2–4&quot;) is different again. Neither uses the Division I men&apos;s April window. Credits, GPA, full-time terms and sometimes an associate degree decide when a wrestler can compete, and not every credit transfers.
            </p>
            <JucoPaths />
            <p className="mt-3 font-semibold text-white">Ask before choosing junior college:</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {JUCO_QUESTIONS.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
            <p className="mt-3">Junior college is a real development path. Plan the academics from the first semester, not two years in.</p>
            <Sources list={TRANSFER_RULES.find((r) => r.level === "Junior college to NCAA")?.sources ?? []} />
          </More>
          <More title="The new eligibility clock">
            <p>{ELIGIBILITY_CLOCK.text}</p>
            <Sources list={ELIGIBILITY_CLOCK.sources} />
          </More>
          <More title="Women's wrestling: a different picture">
            <p>{WOMENS.text}</p>
            <Sources list={WOMENS.sources} />
          </More>
        </div>

        <section className="mt-10 rounded-2xl border border-white/10 bg-gradient-to-br from-[#13294B] to-[#0b1a33] p-6 text-center sm:p-8">
          <p className="mx-auto max-w-2xl text-lg font-bold leading-7">
            A great recruiting decision isn&apos;t finding a college that wants your wrestler today. It&apos;s finding one where your wrestler can develop, compete, earn a degree and build a future.
          </p>
        </section>

        <div className="mt-6">
          <LearnDisclaimer checkedLabel={checked} />
        </div>
      </div>
    </PortalShell>
  )
}
