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
import { AlertTriangle, ArrowLeftRight, Check, FileText, Mail, MessageSquare, Search, Star, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MyRecruitRow } from "@/lib/my-recruits"
import { CoachComposeDialog } from "@/components/coach-messages/coach-message-button"
import { CoachMessagingIntro } from "@/components/coach-messages/coach-messaging-intro"
import { CoachTabs } from "@/components/coach-tabs"
import { FitBadge, type FitBadgeFlag } from "@/components/fit-badge"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

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
export function MyRecruitsBoard({ initialData = null }: { initialData?: Payload | null }) {
  const [data, setData] = useState<Payload | null>(initialData)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [classYear, setClassYear] = useState<number | "all">("all")
  const [removing, setRemoving] = useState<string | null>(null)
  /** Up to two wrestlers picked for the comparison; a third replaces the earliest. */
  const [picked, setPicked] = useState<string[]>([])
  const pick = (id: string) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id].slice(-2)))
  const pickedRows = picked.map((id) => data?.recruits.find((r) => r.athleteId === id)).filter((r): r is MyRecruitRow => Boolean(r))

  const load = () =>
    fetch("/api/coaches/my-recruits", { credentials: "include" })
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
  const { profile } = useAuth()
  /** Only coaches write to wrestlers; staff and admins browsing the board get no Message button. */
  const isCoach = String((profile as { role?: string | null } | null)?.role ?? "").toLowerCase().replace(/[\s-]+/g, "_") === "college_coach"
  const [threads, setThreads] = useState<Map<string, ThreadState>>(new Map())
  const [composeFor, setComposeFor] = useState<MyRecruitRow | null>(null)
  useEffect(() => {
    if (initialData) return
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

  const classes = useMemo(
    () => [...new Set((data?.recruits ?? []).map((r) => r.classYear).filter((y): y is number => y != null))].sort(),
    [data],
  )
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data?.recruits ?? []).filter(
      (r) =>
        (classYear === "all" || r.classYear === classYear) &&
        (!q || [r.name, r.highSchool, r.club, r.weight].some((v) => (v ?? "").toLowerCase().includes(q))),
    )
  }, [data, query, classYear])

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
        <div className={cn("mx-auto max-w-6xl px-4 py-8 sm:py-10", pickedRows.length ? "pb-28 sm:pb-28" : "")}>
          <CoachTabs active="recruits" className="mb-6" />
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D3B574]">RecruitNC</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">My Recruits</h1>
              <p className="mt-1 text-sm text-white/60">
                Every wrestler you{data?.hasSchool ? " and your staff" : ""} added to the watch list.
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
              {data?.schoolId ? (
                <Link href={`/schools/${data.schoolId}/portal`} className="text-sm font-semibold text-[#D3B574] hover:underline">
                  Full program portal →
                </Link>
              ) : null}
            </div>
          </div>

          <CoachMessagingIntro className="mt-6" />

          {error ? (
            <p className="mt-8 rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</p>
          ) : !data ? (
            <p className="mt-8 text-sm text-white/50">Loading your recruits…</p>
          ) : data.recruits.length === 0 ? (
            <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
              <Star className="mx-auto h-8 w-8 text-[#D3B574]" aria-hidden />
              <p className="mt-3 text-lg font-bold">No recruits yet</p>
              <p className="mt-1 text-sm text-white/60">
                Open any wrestler&apos;s profile and tap <span className="font-semibold text-white">Add to Watch List</span>. They
                will show up here.
              </p>
              <Link
                href="/public-rankings"
                className="mt-5 inline-block rounded-lg bg-[#D3B574] px-5 py-2.5 text-sm font-bold text-[#0A1628] hover:bg-[#e2c98d]"
              >
                Browse the rankings
              </Link>
            </div>
          ) : (
            <>
              <div className="mt-6 flex flex-wrap items-center gap-2">
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
                    {y === "all" ? `All (${data.recruits.length})` : `Class of ${y}`}
                  </button>
                ))}
              </div>

              {/* Desktop: one table. */}
              <div className="mt-4 hidden overflow-hidden rounded-xl border border-white/10 md:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/[0.04] text-[11px] uppercase tracking-wider text-white/50">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Wrestler</th>
                      <th className="px-3 py-3 font-semibold">Class</th>
                      <th className="px-3 py-3 font-semibold">Wt</th>
                      <th className="px-3 py-3 font-semibold">Rank</th>
                      <th className="px-3 py-3 font-semibold">Best results</th>
                      <th className="px-3 py-3 font-semibold">Status</th>
                      <th className="px-3 py-3 font-semibold">Last competed</th>
                      <th className="px-3 py-3 font-semibold">Scouting report</th>
                      <th className="px-3 py-3 font-semibold">Added</th>
                      <th className="px-3 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {rows.map((r) => (
                      <tr key={r.athleteId} className="align-top hover:bg-white/[0.03]">
                        <td className="px-4 py-3">
                          <Link href={`/view-profile?id=${r.athleteId}`} className="flex items-center gap-3">
                            <Avatar row={r} />
                            <span className="min-w-0">
                              <span className="block font-bold text-white hover:text-[#D3B574]">{r.name}</span>
                              <span className="block truncate text-xs text-white/55">
                                {[r.highSchool, r.club].filter(Boolean).join(" · ") || "—"}
                              </span>
                              {data?.fit?.[r.athleteId] ? <FitBadge flag={data.fit[r.athleteId]} className="mt-1" /> : null}
                            </span>
                          </Link>
                        </td>
                        <td className="px-3 py-3 text-white/80">{r.classYear ?? "—"}</td>
                        <td className="px-3 py-3 text-white/80">{r.weight ?? "—"}</td>
                        <td className="px-3 py-3 font-bold text-[#D3B574]">{r.rank ? `#${r.rank}` : "—"}</td>
                        <td className="px-3 py-3 text-xs leading-relaxed text-white/80">
                          {r.stateFinish || r.nationalFinish ? (
                            <>
                              {r.stateFinish ? <div>{r.stateFinish}</div> : null}
                              {r.nationalFinish ? <div className="text-[#E9D6A6]">{r.nationalFinish}</div> : null}
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-3 text-xs">
                          {r.committedTo ? (
                            <span className="font-semibold text-emerald-300">Committed · {r.committedTo}</span>
                          ) : (
                            <span className="text-white/70">Uncommitted</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <Activity row={r} />
                        </td>
                        <td className="px-3 py-3">
                          <ReportLink row={r} />
                        </td>
                        <td className="px-3 py-3 text-xs text-white/55">
                          {dayLabel(r.starredAt)}
                          {r.starredBy !== "You" ? <div>by {r.starredBy}</div> : null}
                        </td>
                        <td className="px-3 py-3">
                          <Actions row={r} removing={removing === r.athleteId} onRemove={remove} picked={picked.includes(r.athleteId)} onPick={pick} thread={threads.get(r.athleteId)} onMessage={isCoach ? onMessage : undefined} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!rows.length ? <p className="p-6 text-center text-sm text-white/50">No recruits match.</p> : null}
              </div>

              {/* Phones: a card per wrestler. */}
              <ul className="mt-4 space-y-2 md:hidden">
                {rows.map((r) => (
                  <li key={r.athleteId} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex items-start gap-3">
                      <Link href={`/view-profile?id=${r.athleteId}`}>
                        <Avatar row={r} />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link href={`/view-profile?id=${r.athleteId}`} className="font-bold text-white">
                          {r.name}
                        </Link>
                        {r.rank ? <span className="ml-2 text-xs font-bold text-[#D3B574]">#{r.rank}</span> : null}
                        <p className="text-xs text-white/60">
                          {[r.classYear ? `Class of ${r.classYear}` : null, r.weight ? `${r.weight} lbs` : null].filter(Boolean).join(" · ")}
                        </p>
                        <p className="truncate text-xs text-white/50">{[r.highSchool, r.club].filter(Boolean).join(" · ")}</p>
                        {data?.fit?.[r.athleteId] ? <FitBadge flag={data.fit[r.athleteId]} className="mt-1" /> : null}
                        {r.stateFinish ? <p className="mt-1 text-xs text-white/80">{r.stateFinish}</p> : null}
                        {r.nationalFinish ? <p className="text-xs text-[#E9D6A6]">{r.nationalFinish}</p> : null}
                        <div className="mt-1">
                          <Activity row={r} compact />
                        </div>
                        <p className="mt-1 text-xs">
                          {r.committedTo ? (
                            <span className="font-semibold text-emerald-300">Committed · {r.committedTo}</span>
                          ) : (
                            <span className="text-white/60">Uncommitted</span>
                          )}
                        </p>
                      </div>
                    </div>
                    {r.hasReport ? (
                      <div className="mt-3">
                        <ReportLink row={r} />
                      </div>
                    ) : null}
                    <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2">
                      <span className="text-[11px] text-white/45">
                        Added {dayLabel(r.starredAt)}
                        {r.starredBy !== "You" ? ` by ${r.starredBy}` : ""}
                      </span>
                      <Actions row={r} removing={removing === r.athleteId} onRemove={remove} picked={picked.includes(r.athleteId)} onPick={pick} thread={threads.get(r.athleteId)} onMessage={isCoach ? onMessage : undefined} />
                    </div>
                  </li>
                ))}
                {!rows.length ? <p className="p-6 text-center text-sm text-white/50">No recruits match.</p> : null}
              </ul>
            </>
          )}
        </div>

        {composeFor ? (
          <CoachComposeDialog
            athleteId={composeFor.athleteId}
            athleteName={composeFor.name}
            open
            onOpenChange={(o) => {
              if (!o) setComposeFor(null)
            }}
          />
        ) : null}

        {/* Two picked: straight to the comparison. */}
        {pickedRows.length ? (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#D3B574]/30 bg-[#0f1c2e]/95 backdrop-blur">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
              <p className="min-w-0 text-sm text-white/80">
                <ArrowLeftRight className="mr-2 inline h-4 w-4 text-[#D3B574]" aria-hidden />
                {pickedRows.length === 1 ? (
                  <>
                    <span className="font-bold text-white">{pickedRows[0]!.name}</span> — pick one more to compare
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

/**
 * The report gets its own labelled column. It used to sit unlabelled beside the trash button,
 * which is where a coach looks to remove someone, not to read about them. Shown only where a
 * report exists, so it never leads to "not available for this athlete".
 */
function ReportLink({ row }: { row: MyRecruitRow }) {
  if (!row.hasReport) return <span className="text-xs text-white/35">—</span>
  return (
    <Link
      href={`/athletes/${row.athleteId}/scouting-report`}
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-[#D3B574]/60 bg-[#D3B574]/10 px-2.5 py-1.5 text-xs font-semibold text-[#D3B574] hover:bg-[#D3B574]/20"
    >
      <FileText className="h-3.5 w-3.5" aria-hidden />
      View report
    </Link>
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
}: {
  row: MyRecruitRow
  removing: boolean
  onRemove: (id: string) => void
  picked: boolean
  onPick: (id: string) => void
  thread?: ThreadState
  onMessage?: (row: MyRecruitRow) => void
}) {
  return (
    <div className="flex items-center gap-1.5">
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
        {thread ? <MessageSquare className="h-3 w-3" aria-hidden /> : <Mail className="h-3 w-3" aria-hidden />}
        {thread ? (thread.yourTurn ? "Reply" : "Thread") : "Message"}
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
        {picked ? <Check className="h-3 w-3" aria-hidden /> : <ArrowLeftRight className="h-3 w-3" aria-hidden />}
        Compare
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
