/**
 * The transfer portal guide's graphics (Matt, 18 Oct 2026): the 2026-27 calendar, the room before
 * and after a transfer, the junior college paths and each transfer as a move. Drawn from the same
 * checked data as the page's words (lib/recruiting/learn/transfer-portal.ts), so a rule that
 * changes there changes here. No school logos: names only.
 */
import { ArrowDown, ArrowRight, Building2, Star, Users } from "lucide-react"

import { CALENDAR_END, CALENDAR_START, TRANSFER_CALENDAR } from "@/lib/recruiting/learn/transfer-portal"

const DAY = 86_400_000
const start = Date.parse(`${CALENDAR_START}T12:00:00Z`)
const span = Date.parse(`${CALENDAR_END}T12:00:00Z`) - start
const at = (iso: string) => ((Date.parse(`${iso}T12:00:00Z`) - start) / span) * 100

const TONE: Record<(typeof TRANSFER_CALENDAR)[number]["tone"], { bar: string; text: string }> = {
  signing: { bar: "bg-[#D3B574]", text: "text-[#D3B574]" },
  men: { bar: "bg-sky-400", text: "text-sky-300" },
  women: { bar: "bg-fuchsia-400", text: "text-fuchsia-300" },
  rule: { bar: "bg-emerald-400", text: "text-emerald-300" },
  event: { bar: "bg-white/40", text: "text-white/60" },
}
const MONTHS = ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"]

/** 1. The school year as one line: seniors sign in November, transfers move in spring. */
export function TransferCalendar() {
  return (
    <figure className="rounded-2xl border border-white/10 bg-[#0d1d36]/80 p-5">
      <figcaption className="text-sm font-bold">The 2026–27 year at a glance</figcaption>
      <p className="mt-1 text-xs text-white/55">High school seniors can sign months before college wrestlers may move.</p>

      {/* Wide screens: one row per date on the same year, so no two labels collide. */}
      <div className="mt-5 hidden sm:block">
        <div className="space-y-2">
          {TRANSFER_CALENDAR.map((e) => {
            const left = at(e.from)
            const width = e.to ? Math.max(at(e.to) - left, 0.8) : 0
            return (
              <div key={e.label} className="grid grid-cols-[200px_1fr] items-center gap-3">
                <span className="text-xs leading-4">
                  <b className={TONE[e.tone].text}>{e.label}</b>
                  <span className="block text-white/50">{e.detail}</span>
                </span>
                <div className="relative h-6 rounded-md bg-white/[0.04]">
                  {/* Faint month lines. */}
                  {MONTHS.map((m, i) => (
                    <span key={m} className="absolute inset-y-0 border-l border-white/[0.06]" style={{ left: `${(i / 12) * 100}%` }} aria-hidden />
                  ))}
                  {e.to ? (
                    <span className={`absolute top-1.5 h-3 rounded-full ${TONE[e.tone].bar}`} style={{ left: `${left}%`, width: `${width}%` }} />
                  ) : (
                    <span className={`absolute top-1.5 -ml-1.5 h-3 w-3 rounded-full ${TONE[e.tone].bar}`} style={{ left: `${left}%` }} />
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-1 grid grid-cols-[200px_1fr] gap-3">
          <span />
          <div className="grid grid-cols-12 text-center text-[11px] text-white/45">
            {MONTHS.map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Phones: the same dates as a list, in order. */}
      <ol className="mt-4 space-y-2.5 sm:hidden">
        {TRANSFER_CALENDAR.map((e) => (
          <li key={e.label} className="flex items-center gap-3">
            <span className={`h-3 w-3 shrink-0 rounded-full ${TONE[e.tone].bar}`} aria-hidden />
            <span className="text-sm">
              <b className={TONE[e.tone].text}>{e.label}</b> <span className="text-white/60">· {e.detail}</span>
            </span>
          </li>
        ))}
      </ol>
    </figure>
  )
}

function Wrestler({ label, starter, highlight, open }: { label: string; starter?: boolean; highlight?: boolean; open?: boolean }) {
  return (
    <div className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${highlight ? "border-[#D3B574]/70 bg-[#D3B574]/10" : "border-white/10 bg-white/[0.03]"}`}>
      <span className="flex items-center gap-2">
        <Users className="h-4 w-4 text-white/45" aria-hidden /> {label}
      </span>
      {starter ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
          <Star className="h-3 w-3" aria-hidden /> Starter
        </span>
      ) : open ? (
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold text-white/70">Competing</span>
      ) : null}
    </div>
  )
}

/** 2. The same room before and after a transfer arrives. */
export function RoomBeforeAfter() {
  return (
    <figure className="rounded-2xl border border-white/10 bg-[#0d1d36]/80 p-5">
      <figcaption className="text-sm font-bold">An example 165-pound room</figcaption>
      <div className="mt-4 grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <div>
          <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-white/45">Before</p>
          <div className="space-y-2">
            <Wrestler label="Returning starter" starter />
            <Wrestler label="Sophomore" />
            <Wrestler label="Incoming freshman" />
          </div>
          <p className="mt-2 text-xs text-white/55">3 wrestlers · the starter is known</p>
        </div>
        <ArrowRight className="mx-auto hidden h-6 w-6 text-[#D3B574] sm:block" aria-hidden />
        <ArrowDown className="mx-auto h-6 w-6 text-[#D3B574] sm:hidden" aria-hidden />
        <div>
          <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-[#D3B574]">After a transfer arrives</p>
          <div className="space-y-2">
            <Wrestler label="Returning starter" open />
            <Wrestler label="Sophomore" />
            <Wrestler label="Incoming freshman" />
            <Wrestler label="The transfer" open highlight />
          </div>
          <p className="mt-2 text-xs font-bold text-white/85">4 wrestlers · 1 starting spot, now open</p>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-white/45">An illustration, not a real roster.</p>
    </figure>
  )
}

function Node({ children, tone = "plain" }: { children: React.ReactNode; tone?: "plain" | "question" | "end" }) {
  const cls =
    tone === "question"
      ? "border-[#D3B574]/60 bg-[#D3B574]/10 font-bold"
      : tone === "end"
        ? "border-emerald-400/40 bg-emerald-400/10 font-semibold text-emerald-100"
        : "border-white/15 bg-white/[0.04]"
  return <div className={`rounded-xl border px-4 py-3 text-center text-sm leading-5 ${cls}`}>{children}</div>
}

/** 3. Junior college to NCAA: which set of rules applies. */
export function JucoPaths() {
  return (
    <figure className="mt-4 rounded-xl border border-white/10 bg-[#0A1628]/60 p-4">
      <figcaption className="sr-only">Junior college to NCAA: which transfer rules apply</figcaption>
      <div className="mx-auto max-w-lg space-y-2">
        <Node>A wrestler at a junior college heads to an NCAA college</Node>
        <ArrowDown className="mx-auto h-5 w-5 text-white/40" aria-hidden />
        <Node tone="question">Ever enrolled full time at a four-year college before?</Node>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <p className="text-center text-xs font-black text-white/55">NO</p>
            <Node>
              <b>2–4 transfer</b>
              <span className="block text-xs text-white/60">The two-year transfer rules</span>
            </Node>
          </div>
          <div className="space-y-2">
            <p className="text-center text-xs font-black text-white/55">YES</p>
            <Node>
              <b>4–2–4 transfer</b>
              <span className="block text-xs text-white/60">Different rules again</span>
            </Node>
          </div>
        </div>
        <ArrowDown className="mx-auto h-5 w-5 text-white/40" aria-hidden />
        <Node>Credits, GPA, full-time terms (sometimes an associate degree) decide when they can compete</Node>
        <ArrowDown className="mx-auto h-5 w-5 text-white/40" aria-hidden />
        <Node tone="end">The NCAA college&apos;s compliance office confirms it, in writing</Node>
      </div>
    </figure>
  )
}

/** 4. A transfer as a move: from, to, the weight and what came of it. */
export function TransferMove({ from, to, weights, results }: { from: string; to: string; weights: string; results: string[] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0A1628]/60 p-4">
      <div className="flex items-center gap-2">
        <span className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-sm font-bold">
          <Building2 className="h-4 w-4 shrink-0 text-white/45" aria-hidden />
          <span className="leading-tight">{from}</span>
        </span>
        <span className="flex shrink-0 flex-col items-center">
          <ArrowRight className="h-5 w-5 text-[#D3B574]" aria-hidden />
          <span className="text-[10px] font-bold text-white/55">{weights}</span>
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-[#D3B574]/60 bg-[#D3B574]/10 px-3 py-2 text-sm font-bold">
          <Building2 className="h-4 w-4 shrink-0 text-[#D3B574]" aria-hidden />
          <span className="leading-tight">{to}</span>
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {results.map((r) => (
          <span key={r} className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-bold text-emerald-300">
            {r}
          </span>
        ))}
      </div>
    </div>
  )
}
