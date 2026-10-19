/**
 * My College List: the family's recruiting pipeline (Matt, 15 Oct 2026, from ChatGPT's mock-up).
 *
 * Every college on the list in one table: where the family stands (their own status), what the
 * college publishes as its full yearly cost, how it fits on paper, what its coaches have verifiably
 * done (viewed the profile, written), and the next step. The map feeds it; Compare, Messages and
 * Learn hang off it. The drag board with notes is one tap away (?view=board).
 */
import Link from "next/link"
import { LayoutGrid, MapPin, Plus, Table2 } from "lucide-react"

import { CollegeListTable, type FitMark, type ListRow } from "@/components/portal/college-list-table"
import { PortalShell } from "@/components/portal/portal-shell"
import { collegeIdForCoach } from "@/lib/coach-messages-extras"
import { listThreads } from "@/lib/coach-messages"
import { ANNOUNCED_PROGRAMS } from "@/lib/college-programs/announced"
import { COLLEGE_LIST_STATUSES, COLLEGE_LIST_STATUS_LABEL } from "@/lib/college-programs/list"
import { buildMapPreview } from "@/lib/college-programs/map-preview"
import data from "@/lib/college-programs/programs-2026-27.json"
import { yearlyCostFor } from "@/lib/college-programs/tuition"
import { DIVISION_COLOR, DIVISION_SHORT, type CollegeDivision, type CollegeMapSchool } from "@/lib/college-programs/types"
import { collegeFitFor, loadFamilyFitContext } from "@/lib/recruiting/college-fit"
import { collegeViewsFor } from "@/lib/recruiting/college-views"
import { CONTACT_LABEL, summarizeContacts } from "@/lib/college-programs/contacts"
import { loadCollegeContacts } from "@/lib/college-programs/contacts-server"
import type { FitLine } from "@/lib/recruiting/family-fit"
import { createAdminClient } from "@/lib/supabase/admin"
import { loadCommandCenter } from "../load"
import { MapPreviewCard } from "../map-preview"
import { WarRoomPlan } from "../war-room-plan"

export const dynamic = "force-dynamic"
export const metadata = { title: "My College List | Recruiting Command Center" }

const SCHOOLS = new Map([...(data.schools as CollegeMapSchool[]), ...ANNOUNCED_PROGRAMS].map((s) => [s.id, s]))
const LEVELS: CollegeDivision[] = ["NCAA Division I", "NCAA Division II", "NCAA Division III", "NAIA", "NJCAA"]
const card = "rounded-2xl border border-white/10 bg-[#0d1d36]/80 p-5"

const academicMark = (l: FitLine): FitMark =>
  l.status === "fit" ? { label: "Good fit", tone: "good", why: l.text } : l.status === "stretch" ? { label: "Stretch", tone: "close", why: l.text } : l.status === "concern" ? { label: "Reach", tone: "low", why: l.text } : { label: "—", tone: "none", why: l.text }
/** Athletic fit is a target to build toward, never a verdict. */
const athleticMark = (l: FitLine): FitMark =>
  l.status === "fit" ? { label: "In line", tone: "good", why: l.text } : l.status === "stretch" ? { label: "Close", tone: "close", why: l.text } : l.status === "concern" ? { label: "Building", tone: "low", why: l.text } : { label: "—", tone: "none", why: l.text }

export default async function CommandCenterColleges({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  const params = (await searchParams) ?? {}
  const cc = await loadCommandCenter("/my-recruiting/colleges")
  const { blue, wrestlers, schools, focus, athletes, viewerId } = cc
  const admin = createAdminClient()
  const board = params.view === "board"

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl font-black tracking-tight sm:text-5xl">My College List</h1>
        <p className="mt-1 text-sm text-white/65 sm:text-base">Every college, where you stand, and the next step.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="flex rounded-lg border border-white/15 p-0.5">
          <Link href="/my-recruiting/colleges" aria-current={!board ? "page" : undefined} className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold ${!board ? "bg-white/10 text-white" : "text-white/60"}`}>
            <Table2 className="h-4 w-4" aria-hidden /> List
          </Link>
          <Link href="/my-recruiting/colleges?view=board" aria-current={board ? "page" : undefined} className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold ${board ? "bg-white/10 text-white" : "text-white/60"}`}>
            <LayoutGrid className="h-4 w-4" aria-hidden /> Board
          </Link>
        </div>
        <Link href="/recruiting/college-map" className="inline-flex items-center gap-1.5 rounded-lg bg-[#D3B574] px-4 py-2 text-sm font-bold text-[#0A1628] hover:bg-[#e2c98d]">
          <Plus className="h-4 w-4" aria-hidden /> Add colleges
        </Link>
      </div>
    </div>
  )

  if (!wrestlers.length || !blue || board) {
    return (
      <PortalShell active="colleges">
        {header}
        {wrestlers.length ? <WarRoomPlan blue={blue} wrestlers={wrestlers} schools={schools} show={["list"]} /> : <p className="mt-6 text-sm text-white/60">No wrestler on this account yet.</p>}
      </PortalShell>
    )
  }

  // Fit, verified coach activity and cost for every college on the list.
  const ids = athletes.map((a) => a.id)
  const [ctx, views, threads, contacts] = await Promise.all([
    loadFamilyFitContext(admin, viewerId, focus?.gender ?? null).catch(() => null),
    collegeViewsFor(admin, ids).catch(() => new Map()),
    listThreads(admin, viewerId).catch(() => []),
    loadCollegeContacts(admin, ids),
  ])
  const reach = summarizeContacts(contacts)
  const { data: threadRows } = threads.length ? await admin.from("coach_threads").select("id, coach_user_id, program").in("id", threads.map((t) => t.id)) : { data: [] }
  const threadCollege = new Map<string, { threadId: string; yourTurn: boolean }>()
  for (const row of threadRows ?? []) {
    const collegeId = await collegeIdForCoach(admin, String(row.coach_user_id), (row.program as string | null) ?? null).catch(() => null)
    const t = threads.find((x) => x.id === row.id)
    if (collegeId && t && (!threadCollege.has(collegeId) || t.yourTurn)) threadCollege.set(collegeId, { threadId: t.id, yourTurn: t.yourTurn })
  }

  const rows: ListRow[] = schools.flatMap((s) => {
    const school = SCHOOLS.get(s.id)
    if (!school) return []
    const program = school.programs.find((p) => !focus || p[focus.gender]) ?? school.programs[0]
    const fit = ctx?.first ? collegeFitFor(ctx, school, null) : null
    const cost = yearlyCostFor(s.id, school.state)
    const v = views.get(s.id)
    return [
      {
        id: s.id,
        name: s.name,
        conference: program?.conference ?? null,
        level: s.level,
        levelColor: program ? DIVISION_COLOR[program.division] : "#94a3b8",
        place: s.place,
        logo: s.logo,
        status: s.status,
        cost: cost ? { ...cost, which: school.state === "NC" ? "in-state" : "out-of-state" } : null,
        academic: fit ? academicMark(fit.lines.academic) : { label: "—", tone: "none", why: "" },
        athletic: fit ? athleticMark(fit.lines.athletic) : { label: "—", tone: "none", why: "" },
        viewed: v ? { views: v.views, last: v.lastViewedAt } : null,
        messaged: threadCollege.get(s.id) ?? null,
        reached: (() => {
          const r = reach.bySchool.get(s.id)
          if (!r) return null
          const label = r.stage === "offer" ? "Offer" : r.stage === "visit" ? "Visit" : CONTACT_LABEL[r.latest.kind]
          return { label, date: new Date(`${r.latest.happenedOn}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }) }
        })(),
        hasQuestionnaire: s.hasQuestionnaire,
        note: s.memo ?? null,
      },
    ]
  })

  const byStatus = (k: (typeof COLLEGE_LIST_STATUSES)[number]) => schools.filter((s) => s.status === k).length
  const byLevel = LEVELS.map((d) => ({ d, n: schools.filter((s) => s.level === DIVISION_SHORT[d]).length }))
  const viewedCount = rows.filter((r) => r.viewed).length
  const savedSchools = schools.map((s) => SCHOOLS.get(s.id)).filter((s): s is CollegeMapSchool => Boolean(s))

  return (
    <PortalShell active="colleges">
      <div className="mx-auto max-w-[1400px] text-white">
        {header}
        <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_320px]">
          <div className="min-w-0">
            <CollegeListTable rows={rows} readOnly={viewerId !== cc.authUserId} wrestlerId={wrestlers[0]?.id ?? null} />
            <p className="mt-3 text-xs text-white/40">
              Your status is yours to set. Coach activity is verified from RecruitNC: a program&apos;s coaches viewing the profile or writing to you. Published cost is the
              college&apos;s full price before aid; what families paid after aid is in Compare.
            </p>
          </div>

          <aside className="space-y-5">
            <section className={card}>
              <h2 className="text-base font-bold">Overview</h2>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {[
                  { n: schools.length, label: "Colleges" },
                  { n: byStatus("contacted") + byStatus("talking") + byStatus("visited") + byStatus("offer"), label: "Contacted" },
                  { n: viewedCount, label: "Coaches viewed" },
                ].map((t) => (
                  <div key={t.label}>
                    <p className="text-3xl font-black">{t.n}</p>
                    <p className="text-xs text-white/55">{t.label}</p>
                  </div>
                ))}
              </div>
              <ul className="mt-4 space-y-1 text-xs">
                {COLLEGE_LIST_STATUSES.filter((k) => byStatus(k) > 0).map((k) => (
                  <li key={k} className="flex justify-between text-white/65">
                    <span>{COLLEGE_LIST_STATUS_LABEL[k]}</span>
                    <span className="font-semibold text-white">{byStatus(k)}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className={card}>
              <h2 className="text-base font-bold">By level</h2>
              <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-white/10">
                {byLevel.filter((x) => x.n).map((x) => (
                  <span key={x.d} style={{ width: `${(x.n / Math.max(1, schools.length)) * 100}%`, backgroundColor: DIVISION_COLOR[x.d] }} />
                ))}
              </div>
              <ul className="mt-3 space-y-1 text-xs">
                {byLevel.map((x) => (
                  <li key={x.d} className="flex items-center justify-between text-white/65">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: DIVISION_COLOR[x.d] }} /> {DIVISION_SHORT[x.d]}
                    </span>
                    <span className="font-semibold text-white">{x.n}</span>
                  </li>
                ))}
              </ul>
              {byLevel[0].n === schools.length && schools.length > 3 ? (
                <p className="mt-3 text-xs text-amber-100/80">All Division I. Most college wrestlers compete outside it; add a few other levels you&apos;d be glad to attend.</p>
              ) : null}
            </section>

            <div className="[&>a]:mt-0">
              <MapPreviewCard
                preview={buildMapPreview(savedSchools, { team: focus?.gender ?? null, savedIds: schools.map((s) => s.id), accessToken: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN })}
                who={null}
                team={focus?.gender ?? null}
                savedCount={schools.length}
              />
            </div>
            <Link href="/recruiting/college-map" className="flex items-center gap-2 text-sm font-semibold text-[#D3B574] hover:underline">
              <MapPin className="h-4 w-4" aria-hidden /> Find more colleges on the map
            </Link>
          </aside>
        </div>
      </div>
    </PortalShell>
  )
}
