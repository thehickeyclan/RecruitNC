"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ExternalLink, Lock } from "lucide-react"

import type { CollegeDivision, CollegeMapSchool } from "@/lib/college-programs/types"

type StaffRow = {
  name: string
  title: string
  division: CollegeDivision
  teams: Array<"mens" | "womens">
  email: string | null
  head: boolean
}

/**
 * Loaded when the card opens (the staff file is ~2,000 coaches). Head coaches always show; the
 * rest of the staff sits behind one tap so the card stays a card.
 */
export function StaffList({ school, focus }: { school: Pick<CollegeMapSchool, "id" | "programs">; focus?: "mens" | "womens" | null }) {
  const [staff, setStaff] = useState<StaffRow[] | null>(null)
  const [locked, setLocked] = useState(false)
  const [questionnaires, setQuestionnaires] = useState<
    Array<{ division: CollegeDivision; mens: string | null; womens: string | null }>
  >([])
  const [failed, setFailed] = useState(false)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    let cancelled = false
    setStaff(null)
    setLocked(false)
    setQuestionnaires([])
    setFailed(false)
    setShowAll(false)
    fetch(`/api/college-map/staff?school=${encodeURIComponent(school.id)}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error()
        const body = (await res.json()) as {
          staff: StaffRow[]
          locked?: boolean
          questionnaires?: Array<{ division: CollegeDivision; mens: string | null; womens: string | null }>
        }
        if (cancelled) return
        setLocked(body.locked === true)
        setQuestionnaires(body.questionnaires ?? [])
        setStaff(body.staff)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [school.id])

  if (failed) return <p className="mt-3 text-xs text-white/50">Could not load the coaching staff.</p>
  if (!staff) return <p className="mt-3 text-xs text-white/50">Loading staff…</p>
  if (locked) {
    return (
      <p className="mt-3 flex items-start gap-2 border-t border-white/10 pt-3 text-xs leading-5 text-white/70">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#F5D985]" />
        <span>
          Coaching staff, contacts and recruiting questionnaires are part of{" "}
          <Link href="/blue" className="ncu-only font-semibold text-[#F5D985] hover:underline">
            NC United Blue
          </Link>
          <span className="guild-only">the full Command Center, coming soon</span>.
        </span>
      </p>
    )
  }
  // One link per team; a school with one team needs no "men's" / "women's" on the label.
  const forms = questionnaires.flatMap((q) => [
    q.mens ? { key: `${q.division}-m`, team: "Men's", url: q.mens } : null,
    q.womens && q.womens !== q.mens ? { key: `${q.division}-w`, team: "Women's", url: q.womens } : null,
  ]).filter((f): f is { key: string; team: string; url: string } => f !== null)
  // The family's own team first: a daughter's family should not have to look past the men's form.
  if (focus) forms.sort((a, b) => Number(b.team === (focus === "womens" ? "Women's" : "Men's")) - Number(a.team === (focus === "womens" ? "Women's" : "Men's")))
  const questionnaireLinks =
    forms.length > 0 ? (
      <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3">
        {forms.map((f) => (
          <a
            key={f.key}
            href={f.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-sm bg-[#D7B968] px-2.5 py-1.5 text-xs font-bold text-[#071427] hover:bg-[#F5D985]"
          >
            {forms.length > 1 ? `${f.team} recruiting questionnaire` : "Recruiting questionnaire"}
            <ExternalLink className="h-3 w-3" />
          </a>
        ))}
      </div>
    ) : null

  if (staff.length === 0) {
    // 25 programs' sites could not be read; absence here is ours, not the school's.
    return (
      <>
        {questionnaireLinks}
        <p className="mt-3 text-xs text-white/50">Coaching staff not confirmed yet — check the athletics website.</p>
      </>
    )
  }

  const twoTeams = school.programs.some((p) => p.mens && p.womens) || school.programs.length > 1
  const ordered = focus ? [...staff].sort((a, b) => Number(b.teams.includes(focus)) - Number(a.teams.includes(focus))) : staff
  const shown = showAll ? ordered : ordered.filter((m) => m.head)
  const hidden = staff.length - shown.length

  return (
    <>
    {questionnaireLinks}
    <div className="mt-3 border-t border-white/10 pt-3">
      <p className="text-xs font-bold uppercase tracking-wider text-white/45">Coaching staff</p>
      <ul className="mt-2 space-y-1.5">
        {(shown.length > 0 ? shown : ordered.slice(0, 1)).map((m) => (
          <li key={`${m.name}-${m.title}-${m.division}`} className="text-sm leading-5">
            <span className={m.head ? "font-semibold text-white" : "text-white/85"}>{m.name}</span>
            <span className="text-white/50">
              {" "}
              · {m.title}
              {twoTeams && !/men|women/i.test(m.title)
                ? ` (${m.teams.map((t) => (t === "mens" ? "men's" : "women's")).join(" & ")})`
                : ""}
            </span>
            {m.email ? (
              <a href={`mailto:${m.email}`} className="block truncate text-xs text-[#F5D985] hover:underline">
                {m.email}
              </a>
            ) : null}
          </li>
        ))}
      </ul>
      {!showAll && hidden > 0 ? (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-2 text-xs font-semibold text-[#F5D985] hover:underline"
        >
          Show all {staff.length} staff
        </button>
      ) : null}
    </div>
    </>
  )
}
