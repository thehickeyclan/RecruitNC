"use client"

import { useState } from "react"
import { Check, Circle, Eye, MessageSquare, PhoneCall, X } from "lucide-react"

import { AdmissionsControls } from "@/components/portal/admissions-controls"
import { BrandName } from "@/components/recruiting/brand-name"
import type { AdmissionsSummary } from "@/lib/college-programs/admissions-format"
import { activitiesFor, agoText, daysInStage, isStale, lastActivity, recentView, type Activity, type ActivityAction, type Inbound } from "@/lib/college-programs/board-activities"
import { BOARD_STAGES, COLLEGE_LIST_STATUS_LABEL, boardStage, type Admissions, type BoardStage, type CollegeListStatus } from "@/lib/college-programs/list"

/**
 * The pieces the college board and the college list share (22 Oct 2026, "think CRM"): one
 * college's progress chips, its inbound signals and days in stage, and the side panel with
 * its stage, activities, timeline, application and note.
 */
export type PipelineCollege = {
  id: string
  name: string
  level: string
  place: string
  status: CollegeListStatus
  logo: string | null
  cost: string | null
  note: string | null
  /** The family's own note: calls, what the coach said, next steps. */
  memo: string | null
  /** The college's coaches are on RecruitNC: they can see the profile and write in the app. */
  onRecruitNC: boolean
  /** The interest form is done (its own check, any stage). */
  questionnaireDone?: boolean
  /** The admissions track, shown under the stage. */
  admissions?: Admissions
  /** The college's own deadlines for this cycle. */
  admissionInfo?: AdmissionsSummary | null
  /** Told this program's coaches the wrestler is interested; null when it cannot be offered. */
  interest?: boolean | null
  /** We hold a link to its recruiting questionnaire. */
  hasQuestionnaire?: boolean
  /** When it entered its stage (days in stage; a stale deal). */
  stageSince?: string | null
  /** What came in from the college: profile views, a coach's message, a logged contact. */
  inbound?: Inbound
  /** When the interest form was marked done. */
  questionnaireDoneAt?: string | null
}

type PanelProps = {
  c: PipelineCollege
  today: string
  interestName?: string
  onClose: () => void
  onStage: (stage: BoardStage) => void
  onAct: (a: ActivityAction) => void
  onQuestionnaire?: (done: boolean) => void
  onMemo: (memo: string) => void
}

export function CollegePanel({ c, today, interestName, onClose, onStage, onAct, onQuestionnaire, onMemo }: PanelProps) {
  const [editing, setEditing] = useState<{ text: string } | null>(null)
  return (

        <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
          <aside
            role="dialog"
            aria-label={c.name}
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-white/10 bg-[#0B1D3A] p-5 text-white shadow-2xl"
          >
            <div className="flex items-start gap-3">
              {c.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.logo} alt="" className="h-11 w-11 shrink-0 rounded-lg bg-white object-contain p-1" />
              ) : null}
              <div className="min-w-0 flex-1">
                <a href={`/recruiting/schools/${c.id}`} className="text-lg font-black leading-6 hover:underline">
                  {c.name}
                </a>
                <p className="text-xs text-white/55">
                  {c.level} · {c.place}
                  {c.onRecruitNC ? (
                    <span className="ml-1 text-[#D3B574]">
                      · Coaches on <BrandName />
                    </span>
                  ) : null}
                </p>
              </div>
              <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 text-white/60 hover:bg-white/10 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-5 text-[11px] font-black uppercase tracking-widest text-white/45">Stage</p>
            <div className="mt-2 grid grid-cols-5 gap-1">
              {BOARD_STAGES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onStage(s)}
                  aria-pressed={boardStage(c.status) === s}
                  className={`rounded-md px-1 py-1.5 text-[11px] font-bold ${boardStage(c.status) === s ? "bg-[#D3B574] text-[#0A1628]" : "border border-white/15 text-white/70 hover:text-white"}`}
                >
                  {COLLEGE_LIST_STATUS_LABEL[s]}
                </button>
              ))}
            </div>

            <p className="mt-5 text-[11px] font-black uppercase tracking-widest text-white/45">Activities</p>
            <ul className="mt-2 divide-y divide-white/5">
              {activitiesFor(c, today).map((a) => (
                <li key={a.key} className="flex items-center gap-3 py-2">
                  {a.key === "form" && onQuestionnaire ? (
                    <input
                      type="checkbox"
                      checked={a.done}
                      onChange={(e) => onQuestionnaire(e.target.checked)}
                      aria-label="Interest form done"
                      className="h-4 w-4 shrink-0 accent-[#D3B574]"
                    />
                  ) : a.done ? (
                    <Check className="h-4 w-4 shrink-0 rounded-full bg-emerald-500 p-0.5 text-[#0A1628]" aria-label="Done" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-white/30" aria-label="Not yet" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm font-semibold ${a.done ? "text-white/60" : ""}`}>
                      {a.key === "interest" && a.done ? `Coaches know ${interestName ?? "you"} ${interestName ? "is" : "are"} interested` : a.label}
                    </span>
                    {a.detail ? <span className={`block text-xs ${a.tone === "urgent" ? "text-rose-300" : a.tone === "soon" ? "text-amber-200" : "text-white/50"}`}>{a.detail}</span> : null}
                  </span>
                  {a.action && !(a.key === "interest" && a.done) ? (
                    <button type="button" onClick={() => onAct(a.action!)} className="shrink-0 rounded-md border border-white/20 px-2 py-1 text-xs font-bold hover:border-[#D3B574]">
                      {ACTION_LABEL[a.action.kind]}
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>

            <p className="mt-5 text-[11px] font-black uppercase tracking-widest text-white/45">Timeline</p>
            <Timeline c={c} />

            {c.admissions ? (
              <>
                <p className="mt-5 text-[11px] font-black uppercase tracking-widest text-white/45">Application</p>
                <AdmissionsControls schoolId={c.id} value={c.admissions} info={c.admissionInfo} readOnly={false} />
              </>
            ) : null}

            {c.cost ? (
              <>
                <p className="mt-5 text-[11px] font-black uppercase tracking-widest text-white/45">Cost</p>
                <p className="mt-1 text-xs leading-5 text-white/65">{c.cost}</p>
              </>
            ) : null}

            <p className="mt-5 text-[11px] font-black uppercase tracking-widest text-white/45">Notes</p>
            {editing ? (
              <div className="mt-2">
                <textarea
                  value={editing.text}
                  onChange={(e) => setEditing({ text: e.target.value })}
                  rows={4}
                  maxLength={2000}
                  placeholder="Calls, what the coach said, next steps…"
                  aria-label={`Note on ${c.name}`}
                  className="w-full rounded-md border border-white/15 bg-[#0A1628] p-2 text-sm text-white placeholder:text-white/35"
                />
                <div className="mt-1 flex gap-2">
                  <button type="button" onClick={() => { onMemo(editing.text); setEditing(null) }} className="rounded-md bg-[#D3B574] px-3 py-1.5 text-xs font-bold text-[#0A1628]">
                    Save note
                  </button>
                  <button type="button" onClick={() => setEditing(null)} className="text-xs font-semibold text-white/55 hover:text-white">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setEditing({ text: c.memo ?? "" })} className="mt-2 block w-full rounded-md border border-white/10 bg-[#0A1628]/60 p-2 text-left text-sm leading-5 text-white/75 hover:border-white/30">
                {c.memo || <span className="text-white/40">+ Add a note</span>}
              </button>
            )}
          </aside>
        </div>
      
  )
}

export const ACTION_LABEL: Record<ActivityAction["kind"], string> = {
  reply: "Reply",
  forms: "Fill it",
  email: "Email",
  interest: "Tell them",
  apply: "Apply",
  stage: "Mark done",
  scout: "Ask Scout",
}

/** A small progress mark: done in green, to do in grey, a near deadline in amber or rose. */
export function Chip({ a }: { a: Activity }) {
  const short = a.key === "form" ? "Interest form" : a.key === "email" ? "Emailed coach" : a.done ? "Applied" : a.detail ? a.detail.replace(/ closes /, " ").replace(/^Early Decision/, "ED").replace(/^Early Action/, "EA").replace(/^Regular Decision/, "RD").replace(/^Restrictive Early Action/, "REA") : "Apply"
  const tone = a.done
    ? "border-emerald-400/40 text-emerald-300"
    : a.tone === "urgent"
      ? "border-rose-400/50 text-rose-300"
      : a.tone === "soon"
        ? "border-amber-300/50 text-amber-200"
        : "border-white/15 text-white/50"
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${tone}`}>
      {a.done ? <Check className="h-3 w-3" aria-hidden /> : <Circle className="h-2.5 w-2.5" aria-hidden />}
      {short}
    </span>
  )
}

const dayShort = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" })

/** Days in stage, and what came in from the college: the CRM's inbound side. */
export function Signals({ c, today, hideLast = false }: { c: PipelineCollege; today: string; hideLast?: boolean }) {
  const days = daysInStage(c, today)
  const stale = isStale(c, today)
  const v = c.inbound?.views
  const m = c.inbound?.message
  const k = c.inbound?.contact
  const last = hideLast ? null : lastActivity(c)
  if (days == null && !v && !m && !k && !last) return null
  return (
    <>
    {last ? (
      <LastLine last={last} today={today} className="mt-2" />
    ) : null}
    <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] font-semibold">
      {days != null && boardStage(c.status) !== "offer" ? (
        <span className={stale ? "text-amber-200" : "text-white/40"} title="Days in this stage">
          {days === 0 ? "New today" : `${days} day${days === 1 ? "" : "s"} here`}
          {stale ? " · stale" : ""}
        </span>
      ) : null}
      {v ? (
        <span className={`inline-flex items-center gap-0.5 ${recentView(c, today) ? "text-sky-300" : "text-white/45"}`} title={`Profile viewed ${v.count} time${v.count === 1 ? "" : "s"}, last ${dayShort(v.last)}`}>
          <Eye className="h-3 w-3" aria-hidden /> {v.count}
        </span>
      ) : null}
      {m ? (
        <a href={`/inbox/${m.threadId}`} className={`inline-flex items-center gap-0.5 hover:underline ${m.yourTurn ? "text-sky-300" : "text-white/45"}`} draggable={false}>
          <MessageSquare className="h-3 w-3" aria-hidden /> {m.yourTurn ? "Your turn" : "Messages"}
        </a>
      ) : null}
      {k ? (
        <span className="inline-flex items-center gap-0.5 text-white/45" title="Latest contact from the coach">
          <PhoneCall className="h-3 w-3" aria-hidden /> {k.label} {k.date}
        </span>
      ) : null}
    </div>
    </>
  )
}

/** Inbound and outbound on one line each, newest first, from what we hold. */
export function Timeline({ c }: { c: PipelineCollege }) {
  const events: Array<{ at: string; text: string; inbound: boolean }> = []
  if (c.stageSince) events.push({ at: c.stageSince, text: `Moved to ${COLLEGE_LIST_STATUS_LABEL[boardStage(c.status)]}`, inbound: false })
  if (c.questionnaireDoneAt) events.push({ at: c.questionnaireDoneAt, text: "Interest form submitted", inbound: false })
  if (c.admissions?.submittedOn) events.push({ at: `${c.admissions.submittedOn}T12:00:00Z`, text: "Application submitted", inbound: false })
  if (c.inbound?.views) events.push({ at: c.inbound.views.last, text: `Coaches viewed the profile (${c.inbound.views.count} view${c.inbound.views.count === 1 ? "" : "s"})`, inbound: true })
  if (c.inbound?.message) events.push({ at: "", text: c.inbound.message.yourTurn ? "The coach wrote: your turn to reply" : "In a conversation with the coach", inbound: true })
  if (c.inbound?.contact) events.push({ at: "", text: `${c.inbound.contact.label} from the coach, ${c.inbound.contact.date}`, inbound: true })
  events.sort((a, b) => (b.at || "9").localeCompare(a.at || "9"))
  if (!events.length) return <p className="mt-2 text-sm text-white/45">Nothing yet.</p>
  return (
    <ol className="mt-2 space-y-1.5">
      {events.map((e, i) => (
        <li key={i} className="flex gap-2 text-sm">
          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${e.inbound ? "bg-sky-400" : "bg-emerald-400"}`} aria-hidden />
          <span className="min-w-0 flex-1 text-white/80">{e.text}</span>
          {e.at ? <span className="shrink-0 text-xs text-white/40">{dayShort(e.at)}</span> : null}
        </li>
      ))}
      <li className="pt-1 text-[11px] text-white/35">
        <span className="mr-1 inline-block h-2 w-2 rounded-full bg-sky-400" aria-hidden /> from the college · <span className="mx-1 inline-block h-2 w-2 rounded-full bg-emerald-400" aria-hidden /> your moves
      </li>
    </ol>
  )
}

/** "● Coaches viewed the profile · 2 days ago": blue from the college, green the family's own move. */
export function LastLine({ last, today, className = "" }: { last: ReturnType<typeof lastActivity>; today: string; className?: string }) {
  if (!last) return <p className={`text-xs text-white/35 ${className}`}>No activity yet</p>
  return (
    <p className={`text-xs leading-4 ${className}`} title={new Date(last.at).toLocaleString("en-US", { timeZone: "America/New_York" })}>
      <span className={`mr-1.5 inline-block h-2 w-2 rounded-full align-middle ${last.inbound ? "bg-sky-400" : "bg-emerald-400"}`} aria-hidden />
      <span className="font-semibold text-white">{last.text}</span>
      <span className="text-white/55"> · {agoText(last.at, today)}</span>
    </p>
  )
}
