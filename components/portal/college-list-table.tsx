"use client"

import { useMemo, useState } from "react"
import { BarChart3, Eye, Mail, MessageSquare, MoreVertical } from "lucide-react"

import { CoachEmailComposer } from "@/components/colleges/coach-email-composer"
import { StageSelect } from "@/components/portal/stage-select"
import { COLLEGE_LIST_STATUSES, COLLEGE_LIST_STATUS_LABEL, type CollegeListStatus } from "@/lib/college-programs/list"

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
  messaged: { threadId: string; yourTurn: boolean } | null
  hasQuestionnaire: boolean
  note: string | null
}

const TONE: Record<FitMark["tone"], string> = {
  good: "bg-emerald-400/15 text-emerald-200",
  close: "bg-amber-300/15 text-amber-100",
  low: "bg-white/10 text-white/70",
  none: "text-white/35",
}
const TABS: Array<{ key: "all" | CollegeListStatus; label: string }> = [
  { key: "all", label: "My list" },
  ...COLLEGE_LIST_STATUSES.map((s) => ({ key: s, label: COLLEGE_LIST_STATUS_LABEL[s] })),
]
const MAX_COMPARE = 4

/** What to do next with one college, from where it stands. A coach waiting on a reply comes first. */
function nextStep(r: ListRow): { label: string; href?: string; email?: boolean } {
  if (r.messaged?.yourTurn) return { label: "Reply", href: `/inbox/${r.messaged.threadId}` }
  switch (r.status) {
    case "interested":
      return r.hasQuestionnaire ? { label: "Questionnaire", href: `/recruiting/schools/${r.id}#staff` } : { label: "Send intro", email: true }
    case "questionnaire":
      return { label: "Send intro", email: true }
    case "contacted":
      return { label: "Follow up", email: true }
    case "talking":
      return { label: "Plan a visit", href: "/recruiting/learn/questions-families-ask" }
    case "visited":
      return { label: "Compare", href: `/recruiting/compare?s=${r.id}&step=colleges` }
    case "offer":
      return { label: "Weigh the offer", href: "/recruiting/learn/paying-for-college" }
  }
}

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

  const live = rows.filter((r) => !removed.has(r.id))
  const levels = [...new Set(live.map((r) => r.level))]
  const shown = useMemo(() => live.filter((r) => (tab === "all" || r.status === tab) && (level === "all" || r.level === level)), [live, tab, level])
  const count = (key: (typeof TABS)[number]["key"]) => (key === "all" ? live.length : live.filter((r) => r.status === key).length)

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
              <th className="p-3">Location</th>
              <th className="p-3">Academic fit</th>
              <th className="p-3">Athletic fit</th>
              <th className="p-3">
                Published cost
                <span className="block font-normal text-white/35">per year, before aid</span>
              </th>
              <th className="p-3">
                Coach activity
                <span className="block font-normal text-white/35">verified</span>
              </th>
              <th className="p-3">Your status</th>
              <th className="p-3">Next step</th>
              <th className="w-10 p-3" />
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const next = nextStep(r)
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
                        <span className="line-clamp-1 font-bold text-white hover:underline">{r.name}</span>
                        {r.conference ? <span className="block text-xs text-white/45">{r.conference}</span> : null}
                      </span>
                    </a>
                  </td>
                  <td className="p-3">
                    <span className="rounded px-1.5 py-0.5 text-[11px] font-black text-[#071427]" style={{ backgroundColor: r.levelColor }}>
                      {r.level}
                    </span>
                  </td>
                  <td className="p-3 text-white/70">{r.place}</td>
                  {[r.academic, r.athletic].map((f, i) => (
                    <td key={i} className="p-3" title={f.why}>
                      <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${TONE[f.tone]}`}>{f.label}</span>
                    </td>
                  ))}
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
                  <td className="p-3">
                    <span className="flex flex-col gap-1">
                      {r.viewed ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300">
                          <Eye className="h-3.5 w-3.5" aria-hidden /> Viewed {r.viewed.views}×
                        </span>
                      ) : null}
                      {r.messaged ? (
                        <a href={`/inbox/${r.messaged.threadId}`} className="inline-flex items-center gap-1 text-xs font-semibold text-sky-300 hover:underline">
                          <MessageSquare className="h-3.5 w-3.5" aria-hidden /> Messaged
                        </a>
                      ) : null}
                      {!r.viewed && !r.messaged ? <span className="text-xs text-white/30">None yet</span> : null}
                    </span>
                  </td>
                  <td className="w-44 p-3">
                    <StageSelect schoolId={r.id} status={r.status} readOnly={readOnly} />
                  </td>
                  <td className="p-3">
                    {next.email ? (
                      <button type="button" onClick={() => setEmailing(r)} disabled={readOnly} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-white/20 px-3 py-1.5 text-xs font-bold text-white hover:border-[#D3B574] disabled:opacity-50">
                        <Mail className="h-3.5 w-3.5" aria-hidden /> {next.label}
                      </button>
                    ) : (
                      <a href={next.href} className="inline-flex whitespace-nowrap rounded-lg border border-white/20 px-3 py-1.5 text-xs font-bold text-white hover:border-[#D3B574]">
                        {next.label}
                      </a>
                    )}
                  </td>
                  <td className="relative p-3">
                    <button type="button" aria-label="More" onClick={() => setMenu((m) => (m === r.id ? null : r.id))} className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-white">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {menu === r.id ? (
                      <span className="absolute right-3 top-10 z-10 flex w-44 flex-col rounded-lg border border-white/15 bg-[#0d1d36] py-1 text-sm shadow-xl">
                        <a href={`/recruiting/schools/${r.id}`} className="px-3 py-2 hover:bg-white/5">Open the college</a>
                        <a href="/my-recruiting/colleges?view=board" className="px-3 py-2 hover:bg-white/5">{r.note ? "Read your note" : "Add a note"}</a>
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
                <td colSpan={11} className="p-8 text-center text-sm text-white/50">
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
          <p className="text-sm text-white/60">Tick up to {MAX_COMPARE} to see fit, full cost and what families like yours paid, side by side.</p>
        </div>
        <a
          href={picked.length >= 2 ? `/recruiting/compare?s=${picked.join(",")}&step=results` : undefined}
          aria-disabled={picked.length < 2}
          className={`rounded-lg px-4 py-2.5 text-sm font-bold ${picked.length >= 2 ? "bg-[#D3B574] text-[#0A1628] hover:bg-[#e2c98d]" : "cursor-not-allowed bg-white/10 text-white/40"}`}
        >
          Compare selected ({picked.length})
        </a>
      </div>

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
