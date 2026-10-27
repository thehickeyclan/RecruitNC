"use client"

/**
 * My Recruits - every wrestler a coach (or their staff) starred with "Add to Watch List", in one
 * table. Matt: "super simple". No tabs, no pipeline: who they are, how good, what they have done,
 * committed or not, and a way to the profile and the scouting report.
 *
 * Replaces the "Access Unavailable" page a coach with no school attached used to get, and is where
 * the "My Recruits" link now goes for every coach. The full program portal is a link at the top.
 */

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowLeftRight, Check, FileText, Mail, MessageSquare, NotebookPen, Phone as PhoneIcon, Search, Star, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCoachMode } from "@/hooks/use-coach-mode"
import { PIPELINE_STAGES, type PipelineStage } from "@/lib/recruiting/pipeline"
import type { MyRecruitRow } from "@/lib/my-recruits"
import { CoachComposeDialog } from "@/components/coach-messages/coach-message-button"
import { CoachMessagingIntro } from "@/components/coach-messages/coach-messaging-intro"
import { CoachTabs } from "@/components/coach-tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FitBadge, type FitBadgeFlag } from "@/components/fit-badge"
import { useRouter } from "next/navigation"
import { BrandName } from "@/components/recruiting/brand-name"

type Payload = {
  recruits: MyRecruitRow[]
  hasSchool: boolean
  schoolId: string | null
  /** Each wrestler against the program's perfect recruit, when one is set (lib/program-fit-bulk.ts). */
  fit?: Record<string, FitBadgeFlag>
  hasStandard?: boolean
}

const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

/** The board itself; `initialData` lets it render without a fetch (previews, tests). */
/**
 * needsYou: shown under the funnel (messages to answer, alerts, a report ready). below: after the
 * board (suggested wrestlers, competing next). My Recruits is the coach's home (Matt, 27 Oct 2026).
 */
export function MyRecruitsBoard({
  initialData = null,
  needsYou = null,
  below = null,
  asUserId = null,
}: {
  initialData?: Payload | null
  needsYou?: React.ReactNode
  below?: React.ReactNode
  /** An admin viewing one coach's board (?as=): that coach's data, read-only. */
  asUserId?: string | null
}) {
  const [data, setData] = useState<Payload | null>(initialData)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [classYear, setClassYear] = useState<number | "all">("all")
  /*
   * Who is still recruitable (Matt, 27 Oct 2026: "why would i track wrestlers committed
   * elsewhere?"). Committed elsewhere and graduated classes leave the working board for their own
   * filters; a decommit clears his college and he is back on his own.
   */
  const [bucket, setBucket] = useState<Bucket>("active")
  const [stage, setStage] = useState<PipelineStage | "all">("all")
  const [appliedOnly, setAppliedOnly] = useState(false)
  const [stageError, setStageError] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  /** Up to two wrestlers picked for the comparison; a third replaces the earliest. */
  const [picked, setPicked] = useState<string[]>([])
  const pick = (id: string) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id].slice(-2)))
  const pickedRows = picked.map((id) => data?.recruits.find((r) => r.athleteId === id)).filter((r): r is MyRecruitRow => Boolean(r))

  const load = () =>
    fetch(asUserId ? `/api/coaches/my-recruits?as=${encodeURIComponent(asUserId)}` : "/api/coaches/my-recruits", { credentials: "include" })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(body.error ?? "Could not load your recruits.")
        setData(body as Payload)
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Could not load your recruits."))

  useEffect(() => {
    if (!initialData) void load()
  }, [initialData])

  /**
   * This coach's conversations, by wrestler: a row with one opens it, a row without one offers
   * Message. Also feeds the unread count on the Messages link.
   */
  const router = useRouter()
  /** Coaches write to wrestlers. An admin viewing as a coach sees the button and is told why it will not send. */
  const { actsAsCoach: isCoach, previewNotice } = useCoachMode()
  const [threads, setThreads] = useState<Map<string, ThreadState>>(new Map())
  const [composeFor, setComposeFor] = useState<MyRecruitRow | null>(null)
  const [logFor, setLogFor] = useState<MyRecruitRow | null>(null)
  useEffect(() => {
    // Viewing as a coach: the threads would be the admin's own, so none are shown.
    if (initialData || asUserId) return
    fetch("/api/coach-messages", { credentials: "include" })
      .then((r) => r.json())
      .then((d: { threads?: Array<{ id: string; athleteId: string; viewerRole: string; unread: boolean; yourTurn?: boolean }> }) => {
        const m = new Map<string, ThreadState>()
        for (const t of d.threads ?? []) if (t.viewerRole === "coach") m.set(t.athleteId, { id: t.id, unread: t.unread, yourTurn: Boolean(t.yourTurn) })
        setThreads(m)
      })
      .catch(() => {})
  }, [initialData])
  const unread = [...threads.values()].filter((t) => t.unread).length
  const onMessage = (row: MyRecruitRow) => {
    const t = threads.get(row.athleteId)
    if (t) router.push(`/inbox/${t.id}`)
    else setComposeFor(row)
  }

  const bucketCounts = useMemo(() => {
    const c: Record<Bucket, number> = { active: 0, elsewhere: 0, graduated: 0 }
    for (const r of data?.recruits ?? []) c[bucketOf(r)]++
    return c
  }, [data])
  const working = useMemo(() => (data?.recruits ?? []).filter((r) => bucketOf(r) === bucket), [data, bucket])
  const classes = useMemo(
    () => [...new Set(working.map((r) => r.classYear).filter((y): y is number => y != null))].sort(),
    [working],
  )
  /** More than one state on the board: each row carries its state pill. */
  const manyStates = useMemo(() => new Set((data?.recruits ?? []).map((r) => r.state).filter(Boolean)).size > 1, [data])
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return working.filter(
      (r) =>
        (classYear === "all" || r.classYear === classYear) &&
        (stage === "all" || r.stage === stage) &&
        (!appliedOnly || r.applied.applied) &&
        (!q || [r.name, r.highSchool, r.club, r.weight].some((v) => (v ?? "").toLowerCase().includes(q))),
    )
  }, [working, query, classYear, stage, appliedOnly])
  const appliedCount = useMemo(() => working.filter((r) => r.applied.applied).length, [working])
  /*
   * The first ten, so the funnel and what needs the coach stay in view with a long board (Matt,
   * 27 Oct 2026). A search shows every match; "Show all" opens the rest.
   */
  const [showAll, setShowAll] = useState(Boolean(asUserId))
  const FIRST = 10
  const collapsed = !showAll && !query.trim() && rows.length > FIRST
  const shown = collapsed ? rows.slice(0, FIRST) : rows

  /** Applied or not, for the whole staff. Shown at once and put back if the save fails. */
  const setApplied = async (athleteId: string, applied: boolean) => {
    const before = data?.recruits.find((r) => r.athleteId === athleteId)?.applied
    if (!before || before.applied === applied) return
    const put = (value: MyRecruitRow["applied"]) =>
      setData((d) => (d ? { ...d, recruits: d.recruits.map((r) => (r.athleteId === athleteId ? { ...r, applied: value } : r)) } : d))
    put({ applied, date: applied ? new Date().toISOString() : null })
    setStageError(null)
    try {
      const res = await fetch("/api/coach-portal/update-applied", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ athleteId, hasApplied: applied }),
      })
      if (!res.ok) throw new Error()
    } catch {
      put(before)
      setStageError("That change did not save. Try again.")
    }
  }

  const stageCounts = useMemo(() => {
    const counts = Object.fromEntries(PIPELINE_STAGES.map((st) => [st, 0])) as Record<PipelineStage, number>
    for (const r of working) counts[r.stage] = (counts[r.stage] ?? 0) + 1
    return counts
  }, [working])

  /**
   * Move a wrestler through the funnel. Shown at once and put back if the save fails. The stage is
   * the program's, so the whole staff sees the change (lib/recruiting/program-stage.ts).
   */
  const moveStage = async (athleteId: string, next: PipelineStage) => {
    const before = data?.recruits.find((r) => r.athleteId === athleteId)?.stage
    if (!before || before === next) return
    const put = (value: PipelineStage) =>
      setData((d) => (d ? { ...d, recruits: d.recruits.map((r) => (r.athleteId === athleteId ? { ...r, stage: value } : r)) } : d))
    put(next)
    setStageError(null)
    try {
      const res = await fetch("/api/coach-portal/update-stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ athleteId, stage: next, schoolId: data?.schoolId ?? null }),
      })
      if (!res.ok) throw new Error()
    } catch {
      put(before)
      setStageError("That stage change did not save. Try again.")
    }
  }

  const remove = async (athleteId: string) => {
    setRemoving(athleteId)
    try {
      // The star endpoint toggles; on a wrestler you starred it removes your star.
      await fetch("/api/coach-portal/star", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ athleteId }),
      })
      await load()
    } finally {
      setRemoving(null)
    }
  }

  return (
      <main className="min-h-screen bg-[#0A1628] text-white">
        {/* Read-only when an admin views a coach's board: every control is disabled, links still open. */}
        <fieldset disabled={Boolean(asUserId)} className="contents">
        <div className={cn("mx-auto max-w-7xl px-4 py-8 sm:py-10", pickedRows.length ? "pb-28 sm:pb-28" : "")}>
          <CoachTabs active="recruits" className="mb-6" />
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D3B574]"><BrandName /></p>
              <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">My Recruits</h1>
              <p className="mt-1 text-sm text-white/60">
                Every wrestler you{data?.hasSchool ? " and your staff" : ""} added to the watch list.{" "}
                <Link href="/my-recruits/activity" className="font-semibold text-[#D3B574] hover:underline">
                  See who changed what
                </Link>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/inbox"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/10"
              >
                <MessageSquare className="h-4 w-4 text-[#D3B574]" aria-hidden />
                Messages
                {unread > 0 ? (
                  <span className="rounded-full bg-[#D3B574] px-1.5 text-xs font-bold text-[#0A1628]">{unread}</span>
                ) : null}
              </Link>
              <Link href="/perfect-recruit" className="text-sm font-semibold text-[#D3B574] hover:underline">
                {data?.hasStandard ? "Your perfect recruit" : "Set your perfect recruit"} →
              </Link>
            </div>
          </div>

          <CoachMessagingIntro className="mt-6" />

          {error ? (
            <p className="mt-8 rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</p>
          ) : !data ? (
            <p className="mt-8 text-sm text-white/50">Loading your recruits…</p>
          ) : data.recruits.length === 0 ? (
            <>
            {needsYou}
            <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
              <Star className="mx-auto h-8 w-8 text-[#D3B574]" aria-hidden />
              <p className="mt-3 text-lg font-bold">No recruits yet</p>
              <p className="mt-1 text-sm text-white/60">
                Tap the star on any wrestler&apos;s profile to add him here. Then track his stage, log calls and texts, and
                message him from this board.
              </p>
              <Link
                href="/public-rankings"
                className="mt-5 inline-block rounded-lg bg-[#D3B574] px-5 py-2.5 text-sm font-bold text-[#0A1628] hover:bg-[#e2c98d]"
              >
                Browse the rankings
              </Link>
            </div>
            </>
          ) : (
            <>
              <Funnel
                counts={stageCounts}
                total={working.length}
                active={stage}
                onPick={setStage}
                applied={{ count: appliedCount, on: appliedOnly, toggle: () => setAppliedOnly((v) => !v) }}
              />
              <LostAlert rows={(data.recruits ?? []).filter((r) => !r.graduated && justLost(r))} />
              {stageError ? <p className="mt-3 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{stageError}</p> : null}
              {needsYou}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <label className="relative w-full sm:w-auto sm:min-w-[220px] sm:flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" aria-hidden />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search name, school, club or weight"
                    className="w-full rounded-lg border border-white/15 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/40 focus:border-[#D3B574] focus:outline-none"
                  />
                </label>
                {(["all", ...classes] as const).map((y) => (
                  <button
                    key={String(y)}
                    type="button"
                    onClick={() => setClassYear(y)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-semibold",
                      classYear === y ? "border-[#D3B574] bg-[#D3B574] text-[#0A1628]" : "border-white/20 text-white/70 hover:bg-white/10",
                    )}
                  >
                    {y === "all" ? `All (${working.length})` : `Class of ${y}`}
                  </button>
                ))}
                {(["elsewhere", "graduated"] as const).map((b) =>
                  bucketCounts[b] ? (
                    <button
                      key={b}
                      type="button"
                      onClick={() => {
                        setBucket(bucket === b ? "active" : b)
                        setClassYear("all")
                        setStage("all")
                      }}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-semibold",
                        bucket === b ? "border-white/60 bg-white/15 text-white" : "border-dashed border-white/20 text-white/50 hover:text-white/80",
                      )}
                    >
                      {b === "elsewhere" ? "Committed elsewhere" : "Graduated"} ({bucketCounts[b]})
                    </button>
                  ) : null,
                )}
              </div>

              {/* Desktop: one table. */}
              <div className="mt-4 hidden overflow-x-auto rounded-xl border border-white/10 md:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/[0.04] text-[11px] uppercase tracking-wider text-white/50">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Wrestler</th>
                      <th className="px-2 py-3 font-semibold">Class · Wt</th>
                      <th className="px-2 py-3 font-semibold">Résumé</th>
                      <th className="px-2 py-3 font-semibold">GPA</th>
                      <th className="px-2 py-3 font-semibold">Recruiting</th>
                      <th className="px-2 py-3 font-semibold">Your stage</th>
                      <th className="px-2 py-3 font-semibold">Last contact</th>
                      <th className="px-2 py-3 font-semibold">Last competed</th>
                      <th className="px-2 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {shown.map((r) => (
                      <tr key={r.athleteId} className={cn("align-top", justLost(r) ? "bg-red-500/10 shadow-[inset_3px_0_0_#ef4444]" : "hover:bg-white/[0.03]")}>
                        <td className="px-4 py-3">
                          <Link href={`/view-profile?id=${r.athleteId}`} className="flex items-center gap-3">
                            <Avatar row={r} />
                            <span className="min-w-0">
                              <span className="block font-bold text-white hover:text-[#D3B574]">
                                {r.name}
                                {manyStates && r.state ? <StatePill code={r.state} /> : null}
                              </span>
                              <span className="block truncate text-xs text-white/55">
                                {[r.highSchool, r.club].filter(Boolean).join(" · ") || "—"}
                              </span>
                              {r.phone ? <Phone value={r.phone} /> : null}
                              <span className="block text-[11px] text-white/35" title={`Added ${dayLabel(r.starredAt)}`}>
                                Added {dayLabel(r.starredAt)}
                                {r.starredBy !== "You" ? ` by ${r.starredBy}` : ""}
                              </span>
                              {data?.fit?.[r.athleteId] ? <FitBadge flag={data.fit[r.athleteId]} className="mt-1" /> : null}
                            </span>
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 text-white/80">
                          {r.classYear ?? "—"}
                          <span className="text-white/35"> · </span>
                          {r.weight ? `${r.weight} lbs` : "—"}
                        </td>
                        <td className="max-w-[220px] px-2 py-3">
                          <Resume row={r} />
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 font-semibold text-white/85">{r.gpa != null ? r.gpa.toFixed(2) : <span className="font-normal text-white/35">—</span>}</td>
                        <td className="px-2 py-3">
                          <Recruiting row={r} />
                        </td>
                        <td className="px-2 py-3">
                          <StageSelect row={r} onChange={moveStage} />
                          <AppliedToggle row={r} onChange={setApplied} className="mt-1.5" />
                        </td>
                        <td className="px-2 py-3">
                          <LastContact row={r} />
                        </td>
                        <td className="px-2 py-3">
                          <Activity row={r} />
                        </td>
                        <td className="px-2 py-3">
                          <Actions row={r} removing={removing === r.athleteId} onRemove={remove} picked={picked.includes(r.athleteId)} onPick={pick} thread={threads.get(r.athleteId)} onMessage={isCoach ? onMessage : undefined} onLog={setLogFor} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!rows.length ? <p className="p-6 text-center text-sm text-white/50">No recruits match.</p> : null}
              </div>

              {/* Phones: a card per wrestler. */}
              <ul className="mt-4 space-y-2 md:hidden">
                {shown.map((r) => (
                  <li key={r.athleteId} className={cn("rounded-xl border p-3", justLost(r) ? "border-red-500/60 bg-red-500/10" : "border-white/10 bg-white/[0.03]")}>
                    <div className="flex items-start gap-3">
                      <Link href={`/view-profile?id=${r.athleteId}`}>
                        <Avatar row={r} />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link href={`/view-profile?id=${r.athleteId}`} className="font-bold text-white">
                          {r.name}
                        </Link>
                        {manyStates && r.state ? <StatePill code={r.state} /> : null}
                        <p className="text-xs text-white/60">
                          {[r.classYear ? `Class of ${r.classYear}` : null, r.weight ? `${r.weight} lbs` : null, r.gpa != null ? `${r.gpa.toFixed(2)} GPA` : null].filter(Boolean).join(" · ")}
                        </p>
                        <p className="truncate text-xs text-white/50">{[r.highSchool, r.club].filter(Boolean).join(" · ")}</p>
                        {r.phone ? <Phone value={r.phone} /> : null}
                        {data?.fit?.[r.athleteId] ? <FitBadge flag={data.fit[r.athleteId]} className="mt-1" /> : null}
                        <div className="mt-1.5">
                          <Resume row={r} />
                        </div>
                        <div className="mt-1.5">
                          <Recruiting row={r} />
                        </div>
                        <div className="mt-1">
                          <Activity row={r} compact />
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <StageSelect row={r} onChange={moveStage} />
                    </div>
                    <AppliedToggle row={r} onChange={setApplied} className="mt-2" />
                    <LastContact row={r} className="mt-2" />
                    <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2">
                      <span className="text-[11px] text-white/45">
                        Added {dayLabel(r.starredAt)}
                        {r.starredBy !== "You" ? ` by ${r.starredBy}` : ""}
                      </span>
                      <Actions row={r} removing={removing === r.athleteId} onRemove={remove} picked={picked.includes(r.athleteId)} onPick={pick} thread={threads.get(r.athleteId)} onMessage={isCoach ? onMessage : undefined} onLog={setLogFor} />
                    </div>
                  </li>
                ))}
                {!rows.length ? <p className="p-6 text-center text-sm text-white/50">No recruits match.</p> : null}
              </ul>
              {rows.length > FIRST && !query.trim() ? (
                <div className="mt-3 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setShowAll((v) => !v)}
                    className="rounded-full border border-white/20 px-4 py-1.5 text-sm font-semibold text-white/80 hover:border-white/40 hover:text-white"
                  >
                    {collapsed ? `Show all ${rows.length} recruits` : `Show the first ${FIRST}`}
                  </button>
                </div>
              ) : null}
            </>
          )}
          {below}
        </div>

        {logFor ? (
          <LogActivityDialog
            row={logFor}
            onClose={() => setLogFor(null)}
            onSaved={() => {
              setLogFor(null)
              void load()
            }}
          />
        ) : null}
        {composeFor ? (
          <CoachComposeDialog
            athleteId={composeFor.athleteId}
            athleteName={composeFor.name}
            blockedMessage={previewNotice}
            open
            onOpenChange={(o) => {
              if (!o) setComposeFor(null)
            }}
          />
        ) : null}

        {/* Two picked: straight to the comparison. */}
        {pickedRows.length ? (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#D3B574]/30 bg-[#0f1c2e]/95 backdrop-blur group-data-[shell=recruiting]/shell:bottom-16 lg:group-data-[shell=recruiting]/shell:bottom-0 lg:group-data-[shell=recruiting]/shell:left-56">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
              <p className="min-w-0 text-sm text-white/80">
                <ArrowLeftRight className="mr-2 inline h-4 w-4 text-[#D3B574]" aria-hidden />
                {pickedRows.length === 1 ? (
                  <>
                    <span className="font-bold text-white">{pickedRows[0]!.name}</span> — pick one more from your board, or{" "}
                    <Link href={`/compare?left=${pickedRows[0]!.athleteId}&src=my-recruits`} className="font-semibold text-[#D3B574] hover:underline">
                      compare with anyone →
                    </Link>
                  </>
                ) : (
                  <>
                    <span className="font-bold text-white">{pickedRows[0]!.name}</span> vs{" "}
                    <span className="font-bold text-white">{pickedRows[1]!.name}</span>
                  </>
                )}
              </p>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setPicked([])} className="text-xs font-semibold text-white/50 hover:text-white">
                  Clear
                </button>
                {pickedRows.length === 2 ? (
                  <Link
                    href={`/compare?left=${pickedRows[0]!.athleteId}&right=${pickedRows[1]!.athleteId}&src=my-recruits`}
                    className="rounded-lg bg-[#D3B574] px-4 py-2 text-sm font-bold text-[#0A1628] hover:bg-[#c4a665]"
                  >
                    Compare →
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
        </fieldset>
      </main>
  )
}

/**
 * Days since the last result on file, the event, and a flag only when the gap means something -
 * nothing in 12 months, or a missed NC season (lib/activity-status.ts). The off-season alone is
 * never flagged.
 */
function Activity({ row, compact = false }: { row: MyRecruitRow; compact?: boolean }) {
  const a = row.activity
  if (!a) return <span className="text-xs text-white/35">—</span>
  const flagged = a.flags.length > 0
  return (
    <div className="text-xs leading-snug">
      <span className={flagged ? "font-semibold text-amber-200" : "text-white/80"}>
        {compact ? "Last competed " : ""}
        {a.label.toLowerCase() === "no results on file" ? "No results on file" : a.label}
      </span>
      {a.lastEvent && !compact ? <div className="text-white/45">{a.lastEvent}</div> : null}
      {a.flags
        .filter((f) => f !== "No results on file")
        .map((f) => (
          <div key={f} className="mt-0.5 flex items-start gap-1 text-amber-300">
            <AlertTriangle className="mt-px h-3 w-3 shrink-0" aria-hidden /> {f}
          </div>
        ))}
    </div>
  )
}

function Avatar({ row }: { row: MyRecruitRow }) {
  return row.photoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- athlete photos come from mixed hosts
    <img src={row.photoUrl} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover object-top" />
  ) : (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white/60">
      {row.name
        .split(/\s+/)
        .map((w) => w[0])
        .slice(0, 2)
        .join("")}
    </span>
  )
}

type Bucket = "active" | "elsewhere" | "graduated"
/** Graduated first: a graduate's commitment is history, not a recruiting fact. */
const LOST_DAYS = 14
/**
 * He committed somewhere else in the last two weeks (Matt, 27 Oct 2026): an alert on top and a red
 * row, so the staff sees it before he moves to "Committed elsewhere".
 */
export const justLost = (r: MyRecruitRow, now = Date.now()) =>
  Boolean(r.committedTo && !r.committedToUs && r.committedAt && now - new Date(`${r.committedAt}T12:00:00Z`).getTime() <= LOST_DAYS * 86_400_000)
const bucketOf = (r: MyRecruitRow): Bucket =>
  r.graduated ? "graduated" : r.committedTo && !r.committedToUs && !justLost(r) ? "elsewhere" : "active"

function LostAlert({ rows }: { rows: MyRecruitRow[] }) {
  if (!rows.length) return null
  return (
    <div className="mt-4 rounded-xl border border-red-500/50 bg-red-500/10 p-4">
      <p className="flex items-center gap-2 text-sm font-bold text-red-200">
        <AlertTriangle className="h-4 w-4" aria-hidden />
        {rows.length === 1 ? "A recruit on your board committed elsewhere" : `${rows.length} recruits on your board committed elsewhere`}
      </p>
      <ul className="mt-2 space-y-1 text-sm text-white/85">
        {rows.map((r) => (
          <li key={r.athleteId}>
            <Link href={`/view-profile?id=${r.athleteId}`} className="font-semibold text-white hover:underline">{r.name}</Link> committed to{" "}
            <span className="font-semibold text-red-200">{r.committedTo}</span>
            {r.committedAt ? <span className="text-white/50"> · {shortDay(r.committedAt)}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** His cell, tap to call or text. Inside the profile link, so it stops the click from opening the profile. */
function Phone({ value }: { value: string }) {
  const digits = value.replace(/[^0-9+]/g, "")
  const shown = /^\d{10}$/.test(digits) ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}` : value
  return (
    <span
      role="link"
      tabIndex={0}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        window.location.href = `tel:${digits}`
      }}
      className="mt-0.5 inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-white/80 hover:text-[#D3B574]"
      title={`Call or text ${shown}`}
    >
      <PhoneIcon className="h-3 w-3" aria-hidden />
      {shown}
    </span>
  )
}

function StatePill({ code }: { code: string }) {
  return <span className="ml-2 inline-block rounded border border-white/25 px-1 align-middle text-[10px] font-bold leading-4 text-white/70">{code}</span>
}

/**
 * What he has done, in one cell: class rank, best state finish, best national finishes, and the
 * scouting report where one exists. Only what is on file; nothing when there is nothing.
 */
function Resume({ row }: { row: MyRecruitRow }) {
  const empty = !row.rank && !row.stateFinish && !row.nationalFinish
  return (
    <div className="text-xs leading-snug">
      {row.rank ? <span className="mr-1.5 inline-block rounded bg-[#D3B574]/15 px-1.5 py-px font-bold text-[#D3B574]">{row.womensRank ? "W " : ""}#{row.rank}</span> : null}
      {row.stateFinish ? <span className="text-white/85">{row.stateFinish}</span> : null}
      {row.nationalFinish ? <div className="mt-0.5 text-[#E9D6A6]">{row.nationalFinish}</div> : null}
      {empty ? <span className="text-white/35">No state or national place</span> : null}
      {row.hasReport ? (
        <Link href={`/athletes/${row.athleteId}/scouting-report`} className="mt-1 inline-flex items-center gap-1 font-semibold text-[#D3B574] hover:underline">
          <FileText className="h-3 w-3" aria-hidden />
          Scouting report
        </Link>
      ) : null}
    </div>
  )
}

/**
 * Where he stands with colleges, from his side: committed (to you or elsewhere), interested in
 * your program, and, for a Division I staff, the day recruiting contact opens if it is ahead.
 */
function Recruiting({ row }: { row: MyRecruitRow }) {
  return (
    <div className="space-y-1 text-xs leading-snug">
      {row.committedToUs ? (
        <div className="font-semibold text-emerald-300">Committed to you</div>
      ) : row.committedTo ? (
        <div className={cn("font-semibold", justLost(row) ? "text-red-300" : "text-amber-200")}>
          Committed · {row.committedTo}
          {justLost(row) && row.committedAt ? <span className="block font-normal text-red-200/80">{shortDay(row.committedAt)}</span> : null}
        </div>
      ) : (
        <div className="text-white/70">Uncommitted</div>
      )}
      {row.interestedAt ? (
        <div
          className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 font-semibold text-emerald-200"
          title={`Marked interest in your program ${shortDay(row.interestedAt)}`}
        >
          <Star className="h-3 w-3 fill-current" aria-hidden />
          Interested in you
        </div>
      ) : null}
      {row.contactOpens ? <div className="text-white/45">D1 contact opens {row.contactOpens.label}</div> : null}
    </div>
  )
}

/**
 * The recruiting funnel, drawn as one: seven stages narrowing left to right from Prospect to
 * Signed, each with its count. It is also the board's filter - tap a stage to see only those
 * wrestlers, tap it again for everyone. Lost sits outside the funnel, because it is not a step in it.
 *
 * It was first a row of plain count boxes, and Matt opened the page and asked where the funnel
 * was (12 October 2026).
 */
function Funnel({
  counts,
  total,
  active,
  onPick,
  applied,
}: {
  counts: Record<PipelineStage, number>
  total: number
  active: PipelineStage | "all"
  onPick: (stage: PipelineStage | "all") => void
  /** Applied is not a stage; it filters across all of them. */
  applied: { count: number; on: boolean; toggle: () => void }
}) {
  const steps = PIPELINE_STAGES.filter((st) => st !== "Lost")
  const TAPER = 3.5 // percent of height each stage gives up, top and bottom
  return (
    <section className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4" aria-label="Recruiting funnel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[11px] font-black uppercase tracking-widest text-white/50">
          Recruiting funnel <span className="ml-1 font-semibold normal-case tracking-normal text-white/40">· {total} on the board</span>
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={applied.toggle}
            aria-pressed={applied.on}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold",
              applied.on ? "border-emerald-300 bg-emerald-300 text-[#0A1628]" : "border-emerald-300/40 text-emerald-200 hover:bg-emerald-300/10",
            )}
          >
            Applied {applied.count}
          </button>
          <button
            type="button"
            onClick={() => onPick(active === "Lost" ? "all" : "Lost")}
            aria-pressed={active === "Lost"}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold",
              active === "Lost" ? "border-white bg-white text-[#0A1628]" : "border-white/20 text-white/60 hover:text-white",
            )}
          >
            Lost {counts.Lost ?? 0}
          </button>
          {active !== "all" ? (
            <button type="button" onClick={() => onPick("all")} className="rounded-full border border-[#D3B574] px-3 py-1 text-xs font-bold text-[#D3B574] hover:bg-[#D3B574]/10">
              Show all {total}
            </button>
          ) : null}
        </div>
      </div>
      <div className="-mx-4 mt-3 overflow-x-auto px-4">
        <div className="flex h-24 min-w-[640px] gap-0.5">
          {steps.map((st, i) => {
            const count = counts[st] ?? 0
            const on = active === st
            const left = i * TAPER
            const right = (i + 1) * TAPER
            return (
              <button
                key={st}
                type="button"
                onClick={() => onPick(on ? "all" : st)}
                aria-pressed={on}
                aria-label={`${st}: ${count}`}
                style={{
                  clipPath: `polygon(0 ${left}%, 100% ${right}%, 100% ${100 - right}%, 0 ${100 - left}%)`,
                  // Gold on NC United, blue on recruitwrestlers.com (app/recruit-brand.css).
                  backgroundColor: on ? "rgb(var(--recruit-fill-rgb))" : `rgba(var(--recruit-fill-rgb), ${0.16 + i * 0.07})`,
                  color: on ? "var(--recruit-on-accent)" : undefined,
                }}
                className={cn("flex flex-1 flex-col items-center justify-center transition-colors", on ? "" : "text-white hover:brightness-125")}
              >
                <span className={cn("text-2xl font-black leading-none", !on && count === 0 && "text-white/40")}>{count}</span>
                <span className={cn("mt-1 text-[10px] font-bold uppercase tracking-wider", on ? "" : "text-white/75")}>{st}</span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/** "Applied Oct 3" or "Not applied": one tap to change, for the whole staff. */
function AppliedToggle({ row, onChange, className }: { row: MyRecruitRow; onChange: (athleteId: string, applied: boolean) => void; className?: string }) {
  const on = row.applied.applied
  return (
    <button
      type="button"
      onClick={() => onChange(row.athleteId, !on)}
      aria-pressed={on}
      title={on ? "Click to mark as not applied" : "Click when he has applied to your school"}
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        on ? "border-emerald-300/60 bg-emerald-300/15 text-emerald-200" : "border-white/15 text-white/45 hover:border-white/40 hover:text-white",
        className,
      )}
    >
      {on ? <Check className="h-3 w-3" aria-hidden /> : null}
      {on ? `Applied${row.applied.date ? ` ${new Date(row.applied.date).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" })}` : ""}` : "Not applied"}
    </button>
  )
}

function StageSelect({ row, onChange }: { row: MyRecruitRow; onChange: (athleteId: string, stage: PipelineStage) => void }) {
  return (
    <select
      value={row.stage}
      onChange={(e) => onChange(row.athleteId, e.target.value as PipelineStage)}
      aria-label={`Stage for ${row.name}`}
      className="rounded-md border border-white/20 bg-[#0A1628] px-2 py-1.5 text-xs font-semibold text-white focus:border-[#D3B574] focus:outline-none"
    >
      {PIPELINE_STAGES.map((st) => (
        <option key={st} value={st}>
          {st}
        </option>
      ))}
    </select>
  )
}

/** What a coach logs. The values are the ones recruiting_actions already holds (app/api/coach-portal/activities). */
const ACTIVITY_TYPES = [
  { value: "call", label: "Call" },
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "visit", label: "Campus visit" },
  { value: "watched_live", label: "Watched live" },
  { value: "prospect_camp", label: "Prospect camp" },
  { value: "social_media", label: "Social media" },
  { value: "letter", label: "Letter" },
  { value: "other", label: "Other" },
] as const
/** Platform messages count as contact without anyone logging them (lib/my-recruits.ts). */
const activityLabel = (type: string) =>
  type === "message" ? "Message sent" : type === "reply" ? "Family replied" : (ACTIVITY_TYPES.find((t) => t.value === type)?.label ?? "Contact")
const shortDay = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })

/** "Text · Oct 9 · follow up Oct 16", so the board says who has gone untouched without opening anyone. */
function LastContact({ row, className }: { row: MyRecruitRow; className?: string }) {
  const c = row.lastContact
  if (!c) return <p className={cn("text-[11px] text-white/35", className)}>No contact logged</p>
  const due = c.followUp ? c.followUp.slice(0, 10) <= new Date().toISOString().slice(0, 10) : false
  return (
    <p className={cn("text-[11px] leading-snug text-white/60", className)}>
      {activityLabel(c.type)} · {shortDay(c.date)}
      {c.by !== "You" ? ` · ${c.by}` : ""}
      {c.followUp ? <span className={cn("block", due ? "font-semibold text-[#D3B574]" : "text-white/40")}>Follow up {shortDay(c.followUp)}</span> : null}
    </p>
  )
}

/**
 * Log a contact from the board: what it was, when, a note, and an optional follow-up date. Saved
 * to the program's activity log; a first contact or a visit also moves the wrestler along the
 * funnel (activity-helpers.ts).
 */
function LogActivityDialog({ row, onClose, onSaved }: { row: MyRecruitRow; onClose: () => void; onSaved: () => void }) {
  const today = new Date().toISOString().slice(0, 10)
  const [type, setType] = useState<string>("call")
  const [date, setDate] = useState(today)
  const [note, setNote] = useState("")
  const [followUp, setFollowUp] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/coach-portal/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ athleteId: row.athleteId, actionType: type, actionDate: date, followUpDate: followUp || null, description: note }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? "Could not save.")
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.")
    } finally {
      setSaving(false)
    }
  }

  const field = "mt-1 w-full rounded-lg border px-3 py-2 text-sm"
  return (
    <Dialog open onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log contact with {row.name}</DialogTitle>
          <DialogDescription>Your whole staff sees this on the board.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-1.5">
          {ACTIVITY_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              aria-pressed={type === t.value}
              className={cn(
                "min-h-[36px] rounded-full border px-3 text-xs font-semibold",
                type === t.value ? "border-[#0A1628] bg-[#0A1628] text-white" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-semibold">
            When
            <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} className={field} />
          </label>
          <label className="text-xs font-semibold">
            Follow up (optional)
            <input type="date" value={followUp} min={today} onChange={(e) => setFollowUp(e.target.value)} className={field} />
          </label>
        </div>
        <label className="text-xs font-semibold">
          Note (optional)
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={2000} placeholder="What was said, what comes next" className={field} />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="min-h-[40px] rounded-lg px-4 text-sm font-semibold text-muted-foreground">
            Cancel
          </button>
          <button type="button" onClick={save} disabled={saving || !date} className="min-h-[40px] rounded-lg bg-[#0A1628] px-4 text-sm font-bold text-white disabled:opacity-50">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

type ThreadState = { id: string; unread: boolean; yourTurn: boolean }

function Actions({
  row,
  removing,
  onRemove,
  picked,
  onPick,
  thread,
  onMessage,
  onLog,
}: {
  row: MyRecruitRow
  removing: boolean
  onRemove: (id: string) => void
  picked: boolean
  onPick: (id: string) => void
  thread?: ThreadState
  onMessage?: (row: MyRecruitRow) => void
  onLog: (row: MyRecruitRow) => void
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onLog(row)}
        title={`Log a call, text, email or visit with ${row.name}`}
        className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-white/20 px-2 py-1 text-xs font-semibold text-white/70 hover:border-[#D3B574]/60 hover:text-white"
      >
        <NotebookPen className="h-3 w-3" aria-hidden />
        Log
      </button>
      {onMessage ? (
      <button
        type="button"
        onClick={() => onMessage(row)}
        title={thread ? "Open your conversation" : `Message ${row.name}`}
        className={cn(
          "relative inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-1 text-xs font-semibold",
          thread?.unread || thread?.yourTurn
            ? "border-[#D3B574] text-[#D3B574] hover:bg-[#D3B574]/10"
            : "border-white/20 text-white/70 hover:border-[#D3B574]/60 hover:text-white",
        )}
      >
        {thread ? <MessageSquare className="h-3.5 w-3.5" aria-hidden /> : <Mail className="h-3.5 w-3.5" aria-hidden />}
        {/* An icon beside every wrestler; words only when there is a conversation to act on. */}
        {thread ? (thread.yourTurn ? "Reply" : "Thread") : <span className="sr-only">Message</span>}
        {thread?.unread ? <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#D3B574]" aria-label="New reply" /> : null}
      </button>
      ) : null}
      <button
        type="button"
        aria-pressed={picked}
        onClick={() => onPick(row.athleteId)}
        title={picked ? "Remove from comparison" : "Add to comparison"}
        className={cn(
          "inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-1 text-xs font-semibold",
          picked
            ? "border-[#D3B574] bg-[#D3B574] text-[#0A1628]"
            : "border-white/20 text-white/70 hover:border-[#D3B574]/60 hover:text-white",
        )}
      >
        {picked ? <Check className="h-3.5 w-3.5" aria-hidden /> : <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden />}
        <span className="sr-only md:hidden">Compare</span>
        <span className="md:sr-only">Compare</span>
      </button>
      {row.mine ? (
        <button
          type="button"
          title="Remove from my recruits"
          aria-label={`Remove ${row.name}`}
          disabled={removing}
          onClick={() => onRemove(row.athleteId)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-white/40 hover:bg-white/10 hover:text-red-300 disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  )
}
