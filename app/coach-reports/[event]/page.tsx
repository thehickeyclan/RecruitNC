import Link from "next/link"

import { isApprovedCoach } from "@/lib/coach-messages"
import { loadMyRecruits } from "@/lib/my-recruits"
import { loadEventReport, writeEventSummary, type EventBout, type EventResultCard } from "@/lib/recruiting/event-report"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const maxDuration = 60
export const metadata = { title: "Tournament report | RecruitNC" }

/**
 * A coach's post-tournament report (Matt, 22 Oct 2026; the Super 32 promise: every starred
 * wrestler within 24 hours of the finals). The program's starred wrestlers, best finish first:
 * photo, weight, record and finish, significant wins and notable losses with each opponent's
 * credentials, and a summary checked against those facts. A starred wrestler who did not compete
 * is named, never left out. Approved coaches and admins only.
 *
 * /coach-reports/super32-2026. Preview as a named coach on a developer machine:
 * /dev/coach-report-preview?coach=<email or id>&event=super32-2026
 */

/** Summaries are the same for every coach who starred a wrestler: written once per server. */
const summaryCache = new Map<string, Promise<string>>()

const ordinal = (n: number) => (n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`)
const finish = (p: number | null) => (p === 1 ? "Champion" : p === 2 ? "Runner-up" : p ? ordinal(p) : "Did not place")

export default async function CoachEventReport({ params }: { params: Promise<{ event: string }> }) {
  const { event } = await params
  const {
    data: { user },
  } = await (await createClient()).auth.getUser()
  return <CoachEventReportView userId={user?.id ?? null} event={event} />
}

/** The report for one coach; shared with the developer preview (app/dev/coach-report-preview). */
export async function CoachEventReportView({ userId, event }: { userId: string | null; event: string }) {
  const admin = createAdminClient()
  const { data: profile } = userId ? await admin.from("user_profiles").select("role, verified_coach, verification_status, is_admin").eq("user_id", userId).maybeSingle() : { data: null }
  if (!userId || !(profile?.is_admin === true || isApprovedCoach(profile as never))) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center text-white">
        <p className="text-lg font-bold">For approved college coaches</p>
        <p className="mt-2 text-sm text-white/60">Tournament reports cover the wrestlers on your program&apos;s board.</p>
      </div>
    )
  }
  const board = await loadMyRecruits(admin, userId).catch(() => null)
  const ids = (board?.recruits ?? []).map((r) => r.athleteId)
  const { eventName, cards } = await loadEventReport(admin, ids, event)
  const name = eventName ?? event
  const summaries = await Promise.all(
    cards.map((c) => {
      if (!c.competed) return Promise.resolve(c.line)
      const key = `${event}|${c.id}|${c.record}|${c.placement}`
      if (!summaryCache.has(key)) summaryCache.set(key, writeEventSummary(c, name))
      return summaryCache.get(key)!
    }),
  )
  const competed = cards.filter((c) => c.competed)
  const absent = cards.filter((c) => !c.competed)
  const placers = competed.filter((c) => c.placement)

  return (
    <div className="mx-auto max-w-5xl text-white">
      <p className="text-[11px] font-black uppercase tracking-widest text-[#D3B574]">Tournament report</p>
      <h1 className="mt-1 text-2xl font-black sm:text-3xl">{name}: your starred wrestlers</h1>
      <div className="mt-4 grid grid-cols-3 gap-2 sm:max-w-md">
        {[
          { n: competed.length, label: "Competed" },
          { n: placers.length, label: "Placed" },
          { n: competed.reduce((s, c) => s + c.significantWins.length, 0), label: "Significant wins" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-white/10 bg-[#0f1c2e] p-3 text-center">
            <p className="text-2xl font-black">{s.n}</p>
            <p className="text-[11px] text-white/55">{s.label}</p>
          </div>
        ))}
      </div>

      {!cards.length ? <p className="mt-8 text-sm text-white/60">No wrestlers on your board yet. Star wrestlers and their tournament results come to you here.</p> : null}

      <ul className="mt-6 space-y-3">
        {competed.map((c) => (
          <li key={c.id}>
            <Card card={c} summary={summaries[cards.indexOf(c)]} />
          </li>
        ))}
      </ul>

      {absent.length ? (
        <section className="mt-6 rounded-xl border border-white/10 bg-[#0f1c2e] p-4">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-white/45">Did not compete at {name}</h2>
          <p className="mt-2 text-sm text-white/70">
            {absent.map((c, i) => (
              <span key={c.id}>
                {i ? " · " : ""}
                <Link href={`/athletes/${c.id}`} className="hover:text-white hover:underline">
                  {c.name}
                </Link>
              </span>
            ))}
          </p>
        </section>
      ) : null}
      <p className="mt-4 text-xs text-white/35">Results from the event&apos;s brackets. Credentials are each opponent&apos;s, from state and national results on file.</p>
    </div>
  )
}

function Card({ card: c, summary }: { card: EventResultCard; summary: string }) {
  const pill = c.placement === 1 ? "bg-[#D3B574] text-[#0A1628]" : c.placement && c.placement <= 3 ? "bg-white text-[#0A1628]" : c.placement ? "bg-white/15 text-white" : "bg-white/5 text-white/60"
  return (
    <article className="rounded-xl border border-white/10 bg-[#0f1c2e] p-4">
      <div className="flex items-start gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={c.photo || "/wrestler-silhouette.png"} alt="" className="h-16 w-16 shrink-0 rounded-full bg-[#13294B] object-cover" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/athletes/${c.id}`} className="text-lg font-black hover:underline">
              {c.name}
            </Link>
            {c.classYear ? <span className="rounded bg-white/90 px-1.5 py-0.5 text-[11px] font-black text-[#0A1628]">{c.classYear}</span> : null}
            <span className={`rounded px-2 py-0.5 text-xs font-black ${pill}`}>{finish(c.placement)}</span>
          </div>
          <p className="text-sm text-white/60">{[c.weight ? `${c.weight} lbs` : null, c.record, [c.school, c.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}</p>
          <p className="mt-2 text-sm leading-6 text-white/85">{summary}</p>
        </div>
      </div>
      {c.significantWins.length || c.notableLosses.length ? (
        <div className={`mt-3 grid gap-2 ${c.significantWins.length && c.notableLosses.length ? "sm:grid-cols-2" : ""}`}>
          <BoutList title="Significant wins" bouts={c.significantWins} tone="text-emerald-300" />
          <BoutList title="Notable losses" bouts={c.notableLosses} tone="text-amber-200" />
        </div>
      ) : null}
      <details className="mt-3">
        <summary className="cursor-pointer text-xs font-bold text-[#D3B574]">Every bout ({c.bouts.length})</summary>
        <ul className="mt-2 space-y-1 text-sm">
          {c.bouts.map((b, i) => (
            <li key={i} className="flex flex-wrap gap-x-2 text-white/75">
              <span className={`font-bold ${b.win ? "text-emerald-300" : "text-white/50"}`}>{b.win ? "W" : "L"}</span>
              <span>{b.opponent}</span>
              {b.opponentSchool ? <span className="text-white/45">{b.opponentSchool}</span> : null}
              {b.result ? <span className="text-white/55">{b.result}</span> : null}
              {b.round ? <span className="text-white/35">{b.round}</span> : null}
              {b.credential ? <span className="text-xs text-[#D3B574]">{b.credential}</span> : null}
            </li>
          ))}
        </ul>
      </details>
    </article>
  )
}

function BoutList({ title, bouts, tone }: { title: string; bouts: EventBout[]; tone: string }) {
  if (!bouts.length) return null
  return (
    <div className="rounded-lg bg-white/[0.03] p-3">
      <p className={`text-[11px] font-black uppercase tracking-widest ${tone}`}>{title}</p>
      <ul className="mt-1 space-y-1.5">
        {bouts.map((b, i) => (
          <li key={i} className="text-sm">
            <span className="font-bold">{b.opponent}</span>
            {b.result ? <span className="text-white/55"> · {b.result}</span> : null}
            <span className="block text-xs text-white/50">{b.credential}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
