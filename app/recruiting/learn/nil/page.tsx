/**
 * NIL in wrestling, for families starting from zero (Matt, 19 Oct 2026). Cards, not a report: the
 * short version, the three kinds of money, what families hear and what is true, where the money
 * actually goes, the levels, North Carolina high school and what to ask a college; the college
 * years and the history behind a tap. Content and sources: lib/recruiting/learn/nil.ts.
 */
import type { Metadata } from "next"
import { ArrowRight, Building2, CheckCircle2, ChevronDown, ExternalLink, Handshake, ShieldAlert, Trophy, X } from "lucide-react"

import { PortalShell } from "@/components/portal/portal-shell"
import { LearnDisclaimer } from "@/components/recruiting/learn/learn-disclaimer"
import {
  ASK_A_COLLEGE,
  BY_LEVEL,
  HISTORY,
  IN_COLLEGE,
  MONEY_TYPES,
  MYTHS,
  NC_HIGH_SCHOOL,
  NIL_CHECKED,
  NIL_SUMMARY,
  PROGRAM_EXAMPLES,
  TEAM_PRIZE,
  type NilSource,
} from "@/lib/recruiting/learn/nil"

export const metadata: Metadata = {
  title: "NIL in wrestling: what families need to know | RecruitNC",
  description: "What NIL is, what revenue sharing is, what college wrestlers really earn, the myths, and North Carolina's high school rules, explained for wrestling families.",
}

const GOLD = "var(--recruit-accent)"
const card = "rounded-2xl border border-white/10 bg-[#0d1d36]/80 p-5"
const swipe = "-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:overflow-visible sm:px-0 sm:pb-0"
const checked = new Date(`${NIL_CHECKED}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })
const ICONS = [Handshake, Building2, Trophy]

function Sources({ list }: { list?: NilSource[] }) {
  if (!list?.length) return null
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

function Title({ eyebrow, title, lead }: { eyebrow: string; title: string; lead?: string }) {
  return (
    <div className="mt-10">
      <p className="text-xs font-black uppercase tracking-[0.25em]" style={{ color: GOLD }}>{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{title}</h2>
      {lead ? <p className="mt-1 max-w-3xl text-sm text-white/65">{lead}</p> : null}
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

export default function NilGuidePage() {
  const penn = PROGRAM_EXAMPLES[0]
  return (
    <PortalShell active="learn">
      <div className="mx-auto max-w-6xl text-white">
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0B1D3A]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hero-banner-nc-wrestling-arena.png" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-45" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B1D3A] via-[#0B1D3A]/85 to-transparent" aria-hidden />
          <div className="relative max-w-xl p-6 sm:p-10">
            <p className="text-xs font-black uppercase tracking-[0.25em]" style={{ color: GOLD }}>
              <a href="/my-recruiting/learn" className="hover:underline">Learn</a> › NIL
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">NIL in wrestling</h1>
            <p className="mt-2 text-sm text-white/80 sm:text-base">What it is, what wrestlers really earn, and what&apos;s just rumour.</p>
            <p className="mt-4 text-xs text-white/50">Checked {checked}</p>
          </div>
        </section>

        <section className={`${card} mt-6`}>
          <p className="text-xs font-black uppercase tracking-[0.25em]" style={{ color: GOLD }}>The short version</p>
          <ul className="mt-3 space-y-2">
            {NIL_SUMMARY.map((s) => (
              <li key={s} className="flex gap-2.5 text-[15px] leading-6 text-white/85">
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0" style={{ color: GOLD }} aria-hidden /> {s}
              </li>
            ))}
          </ul>
        </section>

        <Title eyebrow="Start here" title="What NIL actually is" lead="NIL stands for name, image and likeness: the right to be paid when someone uses your name, face or reputation to sell something. People now use “NIL” for three different kinds of money. Keep them apart." />
        <div className={`${swipe} mt-4 sm:grid-cols-3`}>
          {MONEY_TYPES.map((m, i) => {
            const Icon = ICONS[i]
            return (
              <div key={m.name} className={`${card} w-[85%] shrink-0 snap-center sm:w-auto`}>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06]">
                  <Icon className="h-5 w-5" style={{ color: GOLD }} aria-hidden />
                </span>
                <p className="mt-3 text-xl font-black">{m.name}</p>
                <dl className="mt-3 space-y-2 text-sm">
                  {[
                    ["Who pays", m.who],
                    ["Where", m.where],
                    ["Limit", m.capped],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-[11px] font-black uppercase tracking-widest text-white/45">{k}</dt>
                      <dd className="text-white/80">{v}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 rounded-lg bg-white/[0.05] p-2.5 text-sm font-semibold text-white/90">In wrestling: {m.wrestling}</p>
              </div>
            )
          })}
        </div>

        <Title eyebrow="Rumours vs. facts" title="What you may have heard" />
        <div className={`${swipe} mt-4 sm:grid-cols-2`}>
          {MYTHS.map((m) => (
            <div key={m.heard} className={`${card} w-[88%] shrink-0 snap-center sm:w-auto`}>
              <p className="flex items-start gap-2 text-sm font-semibold text-white/55">
                <X className="mt-0.5 h-4 w-4 shrink-0 text-red-300" aria-hidden />
                <span>&ldquo;{m.heard}&rdquo;</span>
              </p>
              <p className="mt-2 flex items-start gap-2 text-[15px] leading-6 text-white/90">
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
                <span>{m.truth}</span>
              </p>
              <Sources list={m.sources} />
            </div>
          ))}
        </div>

        <Title eyebrow="Follow the money" title="Where it actually goes" />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className={card}>
            <p className="text-sm font-bold">{penn.name}: revenue share by sport, 2024-25</p>
            {/* Bars drawn to scale: wrestling against football. */}
            <div className="mt-4 space-y-3">
              {[
                { label: "Football", amount: 13.3, tone: "bg-white/40" },
                { label: "Wrestling", amount: 1.45, tone: "bg-[#D3B574]" },
              ].map((b) => (
                <div key={b.label}>
                  <div className="flex justify-between text-xs text-white/70">
                    <span>{b.label}</span>
                    <span className="font-bold text-white">${b.amount}M</span>
                  </div>
                  <div className="mt-1 h-3 rounded-full bg-white/[0.06]">
                    <div className={`h-3 rounded-full ${b.tone}`} style={{ width: `${(b.amount / 13.3) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm leading-6 text-white/75">{penn.text}</p>
            <Sources list={penn.sources} />
          </div>
          <div className="space-y-4">
            {PROGRAM_EXAMPLES.slice(1).map((p) => (
              <div key={p.name} className={card}>
                <p className="text-sm font-bold">{p.name}</p>
                <p className="mt-1 text-4xl font-black">{p.stat}</p>
                <p className="mt-2 text-sm leading-6 text-white/75">{p.text}</p>
                <Sources list={p.sources} />
              </div>
            ))}
            <div className={card}>
              <p className="text-sm font-bold">Most college wrestlers</p>
              <p className="mt-1 text-4xl font-black">A few thousand <span className="text-xl text-white/50">or nothing</span></p>
              <p className="mt-2 text-sm leading-6 text-white/75">From lessons, camps and local businesses. Six-figure NIL is reported for a few national-level stars at a handful of programs.</p>
            </div>
          </div>
        </div>

        <Title eyebrow="By level" title="What each level offers" />
        <div className={`${swipe} mt-4 sm:grid-cols-2 lg:grid-cols-3`}>
          {BY_LEVEL.map((b) => (
            <div key={b.level} className={`${card} w-[80%] shrink-0 snap-center sm:w-auto`}>
              <p className="font-black">{b.level}</p>
              <p className="mt-2 text-[11px] font-black uppercase tracking-widest text-white/45">Revenue sharing</p>
              <p className="text-sm text-white/80">{b.revenue}</p>
              <p className="mt-2 text-[11px] font-black uppercase tracking-widest text-white/45">NIL</p>
              <p className="text-sm text-white/80">{b.nil}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-sm text-white/60">The real gap is between programs, not levels: two equally good wrestlers can have very different earning power depending on where they wrestle.</p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <section className={card}>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em]" style={{ color: GOLD }}>
              <ShieldAlert className="h-4 w-4" aria-hidden /> North Carolina high school
            </p>
            <ul className="mt-3 space-y-2.5">
              {NC_HIGH_SCHOOL.map((s, i) => (
                <li key={s} className={`flex gap-2.5 text-sm leading-6 ${i === NC_HIGH_SCHOOL.length - 1 ? "font-semibold text-amber-100" : "text-white/85"}`}>
                  <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${i === NC_HIGH_SCHOOL.length - 1 ? "text-amber-300" : ""}`} style={i === NC_HIGH_SCHOOL.length - 1 ? undefined : { color: GOLD }} aria-hidden /> {s}
                </li>
              ))}
            </ul>
            <a href="/recruiting/learn/staying-eligible-in-north-carolina" className="mt-4 inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-black text-[#0A1628]" style={{ backgroundColor: "#D3B574" }}>
              The full North Carolina rules <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
          </section>
          <section className={card}>
            <p className="text-xs font-black uppercase tracking-[0.25em]" style={{ color: GOLD }}>Ask every college</p>
            <ol className="mt-3 space-y-3">
              {ASK_A_COLLEGE.map((q, i) => (
                <li key={q} className="flex gap-3 text-sm leading-6">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-black">{i + 1}</span>
                  {q}
                </li>
              ))}
            </ol>
            <a href="/my-recruiting/scout" className="mt-4 inline-flex items-center gap-1 text-sm font-bold" style={{ color: GOLD }}>
              Ask Scout about a college <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
          </section>
        </div>

        <Title eyebrow="Go deeper" title="More detail" />
        <div className="mt-4 space-y-3">
          <More title="Once your wrestler is in college">
            <ul className="list-disc space-y-1.5 pl-5">
              {IN_COLLEGE.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </More>
          <More title="Team prize money">
            <p>{TEAM_PRIZE.text}</p>
            <Sources list={TEAM_PRIZE.sources} />
          </More>
          <More title="How we got here">
            <ol className="space-y-3">
              {HISTORY.map((h) => (
                <li key={h.when} className="grid grid-cols-[90px_1fr] gap-3">
                  <span className="font-bold text-white">{h.when}</span>
                  <span>
                    {h.what}
                    <Sources list={h.sources} />
                  </span>
                </li>
              ))}
            </ol>
          </More>
        </div>

        <section className="mt-10 rounded-2xl border border-white/10 bg-gradient-to-br from-[#13294B] to-[#0b1a33] p-6 text-center sm:p-8">
          <p className="mx-auto max-w-2xl text-lg font-bold leading-7">
            NIL is a bonus for a few, not a plan for most. Choose the college for the wrestling, the degree and the cost, and get every offer in writing.
          </p>
        </section>
        <p className="mt-4 text-xs text-white/45">General information, not legal or tax advice. A sports attorney or accountant should review any significant contract. Individual pay is rarely disclosed; figures are what programs reported or the press published.</p>
        <div className="mt-4">
          <LearnDisclaimer checkedLabel={checked} />
        </div>
      </div>
    </PortalShell>
  )
}
