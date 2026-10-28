/**
 * Step 4 of the recruiting path: reach out (28 Oct 2026). The three moves for every college on My
 * List in one place - tell the coaches you're interested, fill out the interest form, email the
 * coach - where before they were on three different pages.
 */
import Link from "next/link"
import { ClipboardList, Sparkles } from "lucide-react"

import { PortalShell } from "@/components/portal/portal-shell"
import { ReachOutChecklist } from "@/components/portal/reach-out-checklist"
import { scoutHref } from "@/lib/recruiting/journey"
import { RemindMeButton } from "@/components/portal/remind-me"
import { DIVISION_COLOR } from "@/lib/college-programs/types"
import { fullyReached, reachedOut } from "@/lib/recruiting/journey"
import { journeyFor, reachStateFor, remindersOn } from "../journey-data"
import { loadCommandCenter } from "../load"

export const dynamic = "force-dynamic"
export const metadata = { title: "Reach out | Recruiting Command Center" }

const card = "rounded-xl border border-white/10 bg-[#0f1c2e]"
const LEVEL_COLOR: Record<string, string> = { D1: DIVISION_COLOR["NCAA Division I"], D2: DIVISION_COLOR["NCAA Division II"], D3: DIVISION_COLOR["NCAA Division III"], NAIA: DIVISION_COLOR.NAIA, NJCAA: DIVISION_COLOR.NJCAA }

export default async function ReachOutPage({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  const params = (await searchParams) ?? {}
  const cc = await loadCommandCenter("/my-recruiting/reach-out")
  const athlete = cc.athletes.find((a) => a.id === params.w) ?? cc.athletes[0] ?? null
  const journey = athlete ? journeyFor(cc, athlete.id) : null
  const readOnly = cc.viewerId !== cc.authUserId
  const schools = cc.schools.filter((s) => !s.noTeam)
  const states = athlete ? schools.map((s) => ({ s, r: reachStateFor(cc, s.id, athlete.id) })) : []
  const reached = states.filter(({ s, r }) => reachedOut({ status: s.status, level: s.level, ...r })).length
  const complete = states.filter(({ s, r }) => fullyReached({ status: s.status, level: s.level, ...r })).length
  const formsLeft = states.filter(({ r }) => !r.formDone).length
  // The colleges with the most still to do come first; finished ones sink to the bottom.
  const share = (r: (typeof states)[number]["r"]) => {
    const moves = [r.interest, r.formDone, r.emailed].filter((x) => x !== null)
    return moves.filter(Boolean).length / moves.length
  }
  states.sort((a, b) => share(a.r) - share(b.r))
  const showRemind = remindersOn() && !readOnly

  return (
    <PortalShell active="reach">
      <div className="max-w-5xl">
        <p className="text-[11px] font-black uppercase tracking-widest text-[#D3B574]">Step 4</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Reach out</h1>
        <p className="mt-1 text-sm text-white/65">Three moves for every college: say you&apos;re interested, fill out the interest form, email the coach.</p>

        {cc.athletes.length > 1 ? (
          <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Wrestler">
            {cc.athletes.map((a) => (
              <Link key={a.id} href={`/my-recruiting/reach-out?w=${a.id}`} role="tab" aria-selected={a.id === athlete?.id} className={`rounded-lg border px-4 py-2 text-sm font-bold ${a.id === athlete?.id ? "border-[#D3B574] bg-[#D3B574]/15 text-white" : "border-white/15 text-white/70 hover:text-white"}`}>
                {a.firstName}
              </Link>
            ))}
          </div>
        ) : null}

        {!athlete || schools.length === 0 ? (
          <div className={`${card} mt-6 p-6 text-center`}>
            <p className="text-base font-bold">Add colleges to My List first</p>
            <p className="mt-1 text-sm text-white/60">Every college you save shows up here with its three moves.</p>
            <a href="/recruiting/college-map" className="mt-4 inline-block rounded-lg bg-[#D3B574] px-4 py-2 text-sm font-black text-[#0A1628]">
              Open the college map
            </a>
          </div>
        ) : (
          <>
            <ul className="mt-6 grid grid-cols-3 gap-3">
              {[
                { n: `${reached}/${schools.length}`, label: "Reached" },
                { n: `${complete}`, label: "All three done" },
                { n: `${formsLeft}`, label: formsLeft === 1 ? "Form to fill" : "Forms to fill" },
              ].map((t) => (
                <li key={t.label} className={`${card} p-4`}>
                  <p className="text-2xl font-black sm:text-3xl">{t.n}</p>
                  <p className="text-xs text-white/60 sm:text-sm">{t.label}</p>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold">
              <a href={`/my-recruiting/questionnaires?w=${athlete.id}`} className="inline-flex items-center gap-1 text-[#D3B574] hover:underline">
                <ClipboardList className="h-4 w-4" aria-hidden /> All interest forms, answers ready to copy
              </a>
              {journey ? (
                <a href={scoutHref(journey.steps[3].scout.question)} className="inline-flex items-center gap-1 text-[#D3B574] hover:underline">
                  <Sparkles className="h-4 w-4" aria-hidden /> Ask Scout to draft a coach email
                </a>
              ) : null}
            </div>

            <ul className={`${card} mt-4 divide-y divide-white/5`}>
              {states.map(({ s, r }) => (
                <li key={s.id} className="flex flex-wrap items-center gap-3 p-3 sm:p-4">
                  {s.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.logo} alt="" className="h-10 w-10 shrink-0 rounded-lg bg-white object-contain p-1" />
                  ) : (
                    <span className="h-10 w-10 shrink-0 rounded-lg bg-white/[0.06]" aria-hidden />
                  )}
                  <a href={`/recruiting/schools/${s.id}`} className="min-w-0 flex-1 basis-40">
                    <span className="line-clamp-1 text-sm font-bold hover:underline">{s.name}</span>
                    <span className="flex items-center gap-1.5 text-xs text-white/50">
                      <span className="rounded px-1 text-[10px] font-black text-[#071427]" style={{ backgroundColor: LEVEL_COLOR[s.level] ?? "#94a3b8" }}>
                        {s.level}
                      </span>
                      {s.place}
                    </span>
                  </a>
                  <div className="flex basis-full flex-wrap items-center gap-2 sm:basis-auto">
                    <ReachOutChecklist school={{ id: s.id, name: s.name }} athlete={{ id: athlete.id, firstName: athlete.firstName }} initial={r} status={s.status} readOnly={readOnly} />
                    {showRemind ? <RemindMeButton ctx={{ athleteId: athlete.id, school: { id: s.id, name: s.name } }} label="Remind" /> : null}
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-white/40">
              &quot;Say interested&quot; shows where the college&apos;s coaches are on the platform to see it. Emails open in your own mail app; tick the circle if you wrote from somewhere else.
            </p>
          </>
        )}
      </div>
    </PortalShell>
  )
}
