"use client"

import { useMemo, useState } from "react"

import { CollegePanel, Chip, LastLine, NotePreview, Signals, type PipelineCollege } from "@/components/portal/college-pipeline"
import { easternToday, type AdmissionsSummary } from "@/lib/college-programs/admissions-format"
import { activitiesFor, lastActivity, nextStep as pipelineStep, type ActivityAction } from "@/lib/college-programs/board-activities"
import type { Admissions } from "@/lib/college-programs/list"
import { ArrowRight, BarChart3, ExternalLink, MoreVertical } from "lucide-react"

import { CoachEmailComposer } from "@/components/colleges/coach-email-composer"
import { StageSelect } from "@/components/portal/stage-select"
import { BOARD_STAGES, COLLEGE_LIST_STATUSES, COLLEGE_LIST_STATUS_LABEL, boardStage, type BoardStage, type CollegeListStatus } from "@/lib/college-programs/list"

export type FitMark = { label: string; tone: "good" | "close" | "low" | "none"; why: string }
export type ListRow = {
  id: string
  name: string
  conference: string | null
  level: string
  levelColor: string
  place: string
  logo: string | null
  status: CollegeListStatus
  /** Published full yearly cost before aid, for a North Carolina family. */
  cost: { amount: number; year: string; which: string } | null
  academic: FitMark
  athletic: FitMark
  /** Verified, from our own records: never what the family typed. */
  viewed: { views: number; last: string } | null
  messaged: { threadId: string; yourTurn: boolean; at?: string | null } | null
  /** What the family logged: the furthest step (reached out, visit, offer) and the latest contact. */
  reached?: { label: string; date: string; on?: string | null } | null
  hasQuestionnaire: boolean
  /** The interest form is done: its own check, whatever the stage (22 Oct 2026). */
  questionnaireDone?: boolean
  /** The admissions track, beside the stage. */
  admissions?: Admissions
  /** The college's own deadlines for this cycle. */
  admissionInfo?: AdmissionsSummary | null
  /** When it entered its stage. */
  stageSince?: string | null
  questionnaireDoneAt?: string | null
  note: string | null
}

/** A list row as the shared pipeline pieces read it (chips, signals, panel, next step). */
function asPipeline(r: ListRow, status: CollegeListStatus): PipelineCollege {
  return {
    id: r.id,
    name: r.name,
    level: r.level,
    place: r.place,
    status,
    logo: r.logo,
    cost: r.cost ? `$${r.cost.amount.toLocaleString("en-US")} a year ${r.cost.which} (${r.cost.year}, before aid)` : null,
    note: null,
    memo: r.note,
    onRecruitNC: false,
    hasQuestionnaire: r.hasQuestionnaire,
    questionnaireDone: r.questionnaireDone,
    questionnaireDoneAt: r.questionnaireDoneAt ?? null,
    admissions: r.admissions,
    admissionInfo: r.admissionInfo,
    stageSince: r.stageSince ?? null,
    inbound: {
      views: r.viewed ? { count: r.viewed.views, last: r.viewed.last } : null,
      message: r.messaged,
      contact: r.reached ?? null,
    },
  }
}

const TONE: Record<FitMark["tone"], string> = {
  good: "bg-emerald-400/15 text-emerald-200",
  close: "bg-amber-300/15 text-amber-100",
  low: "bg-white/10 text-white/70",
  none: "text-white/35",
}
const TABS: Array<{ key: "all" | BoardStage; label: string }> = [
  { key: "all", label: "My list" },
  ...BOARD_STAGES.map((s) => ({ key: s, label: COLLEGE_LIST_STATUS_LABEL[s] })),
]
const MAX_COMPARE = 4

/**
 * The family's recruiting pipeline as one table (Matt, 15 Oct 2026, from ChatGPT's mock): every
 * college, where they stand, what it costs, how it fits, what coaches have actually done, and the
 * next step. The status is the family's own; viewed and messaged are verified.
 */
export function CollegeListTable({ rows, readOnly, wrestlerId }: { rows: ListRow[]; readOnly: boolean; wrestlerId: string | null }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all")
  const [level, setLevel] = useState("all")
  const [picked, setPicked] = useState<string[]>([])
  const [emailing, setEmailing] = useState<ListRow | null>(null)
  const [removed, setRemoved] = useState<Set<string>>(new Set())
  const [menu, setMenu] = useState<string | null>(null)
  const [panel, setPanel] = useState<string | null>(null)
  // Stage moves made here, so the row's chips and next step follow without a reload.
  const [stages, setStages] = useState<Record<string, CollegeListStatus>>({})
  const today = easternToday()
  const statusOf = (r: ListRow) => stages[r.id] ?? r.status
  // Interest-form ticks made here, shown at once.
  const [formDone, setFormDone] = useState<Record<string, boolean>>({})
  const toggleForm = async (r: ListRow, done: boolean) => {
    setFormDone((m) => ({ ...m, [r.id]: done }))
    const res = await fetch("/api/college-list", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ schoolId: r.id, questionnaireDone: done }) }).catch(() => null)
    if (!res?.ok) setFormDone((m) => ({ ...m, [r.id]: !done }))
  }

  const live = rows.filter((r) => !removed.has(r.id))
  const levels = [...new Set(live.map((r) => r.level))]
  const shown = useMemo(
    () => live.filter((r) => (tab === "all" || boardStage(stages[r.id] ?? r.status) === tab) && (level === "all" || r.level === level)),
    [live, tab, level, stages],
  )
  const count = (key: (typeof TABS)[number]["key"]) => (key === "all" ? live.length : live.filter((r) => boardStage(statusOf(r)) === key).length)

  const setStage = async (r: ListRow, next: CollegeListStatus) => {
    setStages((m) => ({ ...m, [r.id]: next }))
    const res = await fetch("/api/college-list", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ schoolId: r.id, status: next }) }).catch(() => null)
    if (!res?.ok) setStages((m) => ({ ...m, [r.id]: r.status }))
  }

  const act = (r: ListRow, a: ActivityAction) => {
    if (a.kind === "reply") window.location.href = `/inbox/${a.threadId}`
    else if (a.kind === "forms") window.location.href = "/my-recruiting/questionnaires"
    else if (a.kind === "email") setEmailing(r)
    else if (a.kind === "apply") window.open(a.href, "_blank", "noopener,noreferrer")
    else if (a.kind === "stage") void setStage(r, a.to)
    else if (a.kind === "scout") window.location.href = "/my-recruiting/scout"
    else if (a.kind === "interest") setPanel(r.id)
  }

  const remove = async (r: ListRow) => {
    setMenu(null)
    if (readOnly || !window.confirm(`Remove ${r.name} from your list?`)) return
    const res = await fetch(`/api/college-list?school=${encodeURIComponent(r.id)}`, { method: "DELETE" }).catch(() => null)
    if (res?.ok) setRemoved((s) => new Set(s).add(r.id))
  }

  return (
    <div>
      <div className="-mx-4 flex gap-2 overflow-x-auto whitespace-nowrap px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
        {TABS.filter((t) => t.key === "all" || count(t.key) > 0).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`shrink-0 rounded-lg border px-3 py-1.5 text-sm font-semibold ${tab === t.key ? "border-[#D3B574] text-[#D3B574]" : "border-white/15 text-white/75 hover:text-white"}`}
          >
            {t.label} ({count(t.key)})
          </button>
        ))}
        {levels.length > 1 ? (
          <select value={level} onChange={(e) => setLevel(e.target.value)} className="shrink-0 rounded-lg border border-white/15 bg-[#0A1628] px-3 py-1.5 text-sm font-semibold text-white/80">
            <option value="all">All levels</option>
            {levels.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-[#0d1d36]/80">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs font-semibold text-white/50">
              <th className="w-10 p-3" />
              <th className="p-3">College</th>
              <th className="p-3">Level</th>
              <th className="p-3">
                Fit
                <span className="block font-normal text-white/35">academic · athletic</span>
              </th>
              <th className="p-3">
                Published cost
                <span className="block font-normal text-white/35">per year, before aid</span>
              </th>
              <th className="p-3">Last activity</th>
              <th className="p-3">
                Progress
                <span className="block font-normal text-white/35">your moves · from the college</span>
              </th>
              <th className="p-3">Stage</th>
              <th className="p-3">Next step</th>
              <th className="w-10 p-3" />
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const pc = { ...asPipeline(r, statusOf(r)), ...(r.id in formDone ? { questionnaireDone: formDone[r.id] } : {}) }
              const chips = activitiesFor(pc, today).filter((x) => x.key === "form" || x.key === "email" || (x.key === "apply" && (x.done || x.detail)))
              const step = pipelineStep(pc, today)
              const on = picked.includes(r.id)
              return (
                <tr key={r.id} className={`border-t border-white/5 ${on ? "bg-[#D3B574]/[0.06]" : "hover:bg-white/[0.02]"}`}>
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={!on && picked.length >= MAX_COMPARE}
                      onChange={() => setPicked((p) => (on ? p.filter((x) => x !== r.id) : [...p, r.id]))}
                      aria-label={`Compare ${r.name}`}
                      className="h-4 w-4 accent-[#D3B574]"
                    />
                  </td>
                  <td className="p-3">
                    <a href={`/recruiting/schools/${r.id}`} className="flex items-center gap-3">
                      {r.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.logo} alt="" className="h-10 w-10 shrink-0 rounded-lg bg-white object-contain p-1" />
                      ) : (
                        <span className="h-10 w-10 shrink-0 rounded-lg bg-white/[0.06]" aria-hidden />
                      )}
                      <span className="min-w-0">
                        <span className="line-clamp-2 max-w-[13rem] font-bold leading-5 text-white hover:underline">{r.name}</span>
                        <span className="block text-xs text-white/45">{[r.place, r.conference].filter(Boolean).join(" · ")}</span>
                      </span>
                    </a>
                  </td>
                  <td className="p-3">
                    <span className="rounded px-1.5 py-0.5 text-[11px] font-black text-[#071427]" style={{ backgroundColor: r.levelColor }}>
                      {r.level}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="flex flex-col items-start gap-1">
                      {[r.academic, r.athletic].map((f, i) => (
                        <span key={i} title={f.why} className={`whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold ${TONE[f.tone]}`}>
                          {f.label}
                        </span>
                      ))}
                    </span>
                  </td>
                  <td className="p-3">
                    {r.cost ? (
                      <>
                        <span className="font-semibold text-white">${r.cost.amount.toLocaleString("en-US")}</span>
                        <span className="block text-[11px] text-white/40">
                          {r.cost.which}, {r.cost.year}
                        </span>
                      </>
                    ) : (
                      <span className="text-white/35">Not published</span>
                    )}
                  </td>
                  <td className="w-48 p-3">
                    <LastLine last={lastActivity(pc)} today={today} />
                    <NotePreview memo={r.note} onOpen={() => setPanel(r.id)} />
                  </td>
                  <td className="p-3">
                    <div className="flex max-w-[15rem] flex-wrap gap-1">
                      {chips.map((x) => (
                        <Chip key={x.key} a={x} onToggle={x.key === "form" && !readOnly ? () => void toggleForm(r, !x.done) : undefined} />
                      ))}
                    </div>
                    <Signals c={pc} today={today} hideLast />
                  </td>
                  <td className="w-36 p-3">
                    <StageSelect schoolId={r.id} status={statusOf(r)} readOnly={readOnly} onChange={(next) => setStages((m) => ({ ...m, [r.id]: next }))} />
                  </td>
                  <td className="p-3">
                    {step ? (
                      <button
                        type="button"
                        onClick={() => act(r, step.action)}
                        disabled={readOnly}
                        className={`inline-flex max-w-[13rem] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black disabled:opacity-50 ${step.tone === "urgent" ? "bg-rose-400 text-[#0A1628]" : "bg-[#D3B574] text-[#0A1628] hover:bg-[#e2c98d]"}`}
                      >
                        <span className="truncate">{step.label}</span>
                        {step.action.kind === "apply" ? <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden /> : <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden />}
                      </button>
                    ) : (
                      <button type="button" onClick={() => setPanel(r.id)} className="text-xs font-semibold text-white/55 hover:text-white">
                        Details
                      </button>
                    )}
                  </td>
                  <td className="relative p-3">
                    <button type="button" aria-label="More" onClick={() => setMenu((m) => (m === r.id ? null : r.id))} className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-white">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {menu === r.id ? (
                      <span className="absolute right-3 top-10 z-10 flex w-44 flex-col rounded-lg border border-white/15 bg-[#0d1d36] py-1 text-sm shadow-xl">
                        <button type="button" onClick={() => { setMenu(null); setPanel(r.id) }} className="px-3 py-2 text-left hover:bg-white/5">
                          Details, application, note
                        </button>
                        <a href={`/recruiting/schools/${r.id}`} className="px-3 py-2 hover:bg-white/5">Open the college</a>
                        <button type="button" onClick={() => remove(r)} disabled={readOnly} className="px-3 py-2 text-left text-red-300 hover:bg-white/5 disabled:opacity-50">
                          Remove from list
                        </button>
                      </span>
                    ) : null}
                  </td>
                </tr>
              )
            })}
            {shown.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-sm text-white/50">
                  No colleges here.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 rounded-2xl border border-[#D3B574]/40 bg-[#D3B574]/[0.06] p-5">
        <BarChart3 className="h-8 w-8 shrink-0 text-[#D3B574]" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold">Compare colleges</p>
          <p className="text-sm text-white/60">Tick up to {MAX_COMPARE} to see fit, full cost and what families paid after aid, side by side.</p>
        </div>
        <a
          href={picked.length >= 2 ? `/recruiting/compare?s=${picked.join(",")}&step=results` : undefined}
          aria-disabled={picked.length < 2}
          className={`rounded-lg px-4 py-2.5 text-sm font-bold ${picked.length >= 2 ? "bg-[#D3B574] text-[#0A1628] hover:bg-[#e2c98d]" : "cursor-not-allowed bg-white/10 text-white/40"}`}
        >
          Compare selected ({picked.length})
        </a>
      </div>

      {(() => {
        const r = panel ? live.find((x) => x.id === panel) : null
        if (!r) return null
        return (
          <CollegePanel
            c={asPipeline(r, statusOf(r))}
            today={today}
            onClose={() => setPanel(null)}
            onStage={(st) => void setStage(r, st)}
            onAct={(a) => act(r, a)}
            onQuestionnaire={readOnly ? undefined : (done) => void toggleForm(r, done)}
            onMemo={(memo) => void fetch("/api/college-list", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ schoolId: r.id, note: memo }) }).then(() => window.location.reload())}
          />
        )
      })()}

      {emailing ? (
        <CoachEmailComposer
          schoolId={emailing.id}
          schoolName={emailing.name}
          initialAthleteId={wrestlerId ?? undefined}
          open
          onOpenChange={(o) => {
            if (!o) setEmailing(null)
          }}
          onSent={(status) => {
            // Sending moves the college along the list; never backwards.
            if (status && COLLEGE_LIST_STATUSES.indexOf(status) > COLLEGE_LIST_STATUSES.indexOf(emailing.status)) {
              void fetch("/api/college-list", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ schoolId: emailing.id, status }) }).then(() => window.location.reload())
            }
            setEmailing(null)
          }}
        />
      ) : null}
    </div>
  )
}

