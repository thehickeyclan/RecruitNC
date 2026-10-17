/**
 * Product screenshots for the sales pages (17 Oct 2026), rendered from the real components with a
 * made-up example family: real colleges, logos and published costs; invented progress, views and
 * stages. Never a real family's data. Dev only; ?shot=list or ?shot=roadmap renders one screen at
 * the size the screenshot is taken.
 */
import { notFound } from "next/navigation"

import { CollegeListTable, type ListRow } from "@/components/portal/college-list-table"
import { RoadmapBoard } from "@/components/portal/roadmap-board"
import { schoolLogoUrl } from "@/lib/college-programs/logo"
import data from "@/lib/college-programs/programs-2026-27.json"
import { yearlyCostFor } from "@/lib/college-programs/tuition"
import { DIVISION_COLOR, DIVISION_SHORT, type CollegeMapSchool } from "@/lib/college-programs/types"
import { ROADMAP } from "@/lib/recruiting/learn/roadmap"

export const dynamic = "force-dynamic"

const SCHOOLS = new Map((data.schools as CollegeMapSchool[]).map((s) => [s.id, s]))

/** The example family's list: [college, stage, academic, athletic, views, messaged, note]. Invented. */
const EXAMPLE: Array<[string, ListRow["status"], [string, ListRow["academic"]["tone"]], [string, ListRow["athletic"]["tone"]], number, boolean]> = [
  ["north-carolina-state-university-nc-state", "talking", ["Good fit", "good"], ["Close", "close"], 3, true],
  ["appalachian-state-university", "contacted", ["Good fit", "good"], ["In line", "good"], 2, false],
  ["campbell-university", "questionnaire", ["Good fit", "good"], ["In line", "good"], 1, false],
  ["davidson-college", "interested", ["Stretch", "close"], ["In line", "good"], 0, false],
  ["university-of-mount-olive", "visited", ["Good fit", "good"], ["In line", "good"], 2, true],
  ["belmont-abbey-college", "interested", ["Good fit", "good"], ["In line", "good"], 0, false],
]

export default async function Screens({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  if (process.env.NODE_ENV === "production") notFound()
  const shot = (await searchParams)?.shot ?? "list"
  const rows: ListRow[] = []
  for (const [id, status, [aLabel, aTone], [tLabel, tTone], views, messaged] of EXAMPLE) {
    const s = SCHOOLS.get(id)
    if (!s) continue
    const program = s.programs[0]
    const cost = yearlyCostFor(id, s.state)
    rows.push({
      id,
      name: s.name.replace(/\s*\([^)]*\)\s*/g, " ").trim(),
      conference: program?.conference ?? null,
      level: program ? DIVISION_SHORT[program.division] : "",
      levelColor: program ? DIVISION_COLOR[program.division] : "#94a3b8",
      place: `${s.city}, ${s.state}`,
      logo: await schoolLogoUrl(s).catch(() => null),
      status,
      cost: cost ? { ...cost, which: s.state === "NC" ? "in-state" : "out-of-state" } : null,
      academic: { label: aLabel, tone: aTone, why: "" },
      athletic: { label: tLabel, tone: tTone, why: "" },
      viewed: views ? { views, last: new Date().toISOString() } : null,
      messaged: messaged ? { threadId: "example", yourTurn: id.startsWith("north-carolina") } : null,
      hasQuestionnaire: id === "davidson-college" || id === "belmont-abbey-college",
      note: null,
    })
  }

  return (
    <div className="admin-dark-page min-h-screen bg-[#060f1f] p-8 text-white">
      {/* A screenshot shows the product only: no site menu, assistant bubble or dev badge. */}
      <style>{"nav[aria-label='Main navigation'],nextjs-portal,.fixed,footer{display:none!important}"}</style>
      {shot === "list" ? (
        <div className="mx-auto max-w-[1340px]">
          <p className="mb-4 text-2xl font-black">My College List</p>
          <CollegeListTable rows={rows} readOnly wrestlerId={null} />
        </div>
      ) : (
        <div className="shot-roadmap mx-auto max-w-[1060px]">
          {/* Three years, not five: at sales-page size five columns are too small to read. */}
          <style>{".shot-roadmap .xl\\:grid-cols-5{grid-template-columns:repeat(3,minmax(0,1fr))!important}.shot-roadmap .xl\\:grid-cols-5>:nth-child(1){order:2!important}.shot-roadmap .xl\\:grid-cols-5>:nth-child(2){order:1!important}.shot-roadmap .xl\\:grid-cols-5>:nth-child(3){order:3!important}"}</style>
          <p className="mb-4 text-2xl font-black">Jordan&apos;s recruiting roadmap</p>
          <RoadmapBoard
            years={ROADMAP.filter((y) => y.grade >= 10)}
            initialDone={["g8-profile", "g8-compete", "g8-core", "g8-ec", "g8-nc", "g8-levels", "g9-grades", "g9-schedule", "g9-events", "g9-profile", "g9-explore", "g10-list", "g10-questionnaires", "g10-email", "g10-grades", "g11-answer"]}
            current={11}
            selected={11}
            readOnly={false}
            name="Jordan"
          />
        </div>
      )}
    </div>
  )
}
