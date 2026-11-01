"use client"

import { useMemo, useState } from "react"
import { Building2, GraduationCap, LayoutGrid, List } from "lucide-react"
import { CommitsHero, FilterPanel, ResultBar, SearchField, SortField, StatTile, ViewToggle } from "@/components/commitments/commits-chrome"
import { HardLink } from "@/components/hard-link"
import { QuickChip, QuickGroup } from "@/components/ui/quick-chip"
import { ProfessionalCommitmentCard } from "@/components/professional-commitment-card"
import { normalizeAthleteList } from "@/lib/professional-athlete"
import { prefetchAthleteProfile } from "@/lib/prefetch-athlete-profile"
import { getDivisionDisplayShort } from "@/lib/division-display"
import type { CommitmentAthleteListItem } from "@/lib/athletes-commitments-fetch"

type Commitment = CommitmentAthleteListItem & { top_honor?: string | null; state?: string }
type Gender = "all" | "male" | "female"
type SortChoice = "newest" | "name" | "college"
type ViewMode = "list" | "cards"

const DIVISIONS = ["D1", "D2", "D3", "NAIA", "NJCAA"] as const
type Division = (typeof DIVISIONS)[number]

const isFemale = (c: Commitment) => /^(f|female|women)$/i.test(c.gender.trim())

function divisionOf(c: Commitment): Division | null {
  const short = getDivisionDisplayShort(c.division)
  return (DIVISIONS as readonly string[]).includes(short) ? (short as Division) : null
}

/** "2025-11-12" reads "Nov 2025". Parsed by hand: new Date() on a bare date shifts it a day west of UTC. */
function commitMonth(raw: string): string | null {
  const m = /^(\d{4})-(\d{2})/.exec(raw)
  if (!m) return null
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(m[2]) - 1]
  return month ? `${month} ${m[1]}` : null
}

function CollegeMark({ c, size = 32 }: { c: Commitment; size?: number }) {
  const [failed, setFailed] = useState(false)
  if (c.collegeLogoUrl && !failed) {
    return (
      // Logos come from several hosts; a plain img keeps them out of next/image's allow-list.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={c.collegeLogoUrl}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        onError={() => setFailed(true)}
        className="shrink-0 rounded-md bg-white object-contain p-0.5"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-md bg-white/10 text-white/50"
      style={{ width: size, height: size }}
    >
      <Building2 className="h-4 w-4" />
    </span>
  )
}

function DivisionBadge({ c }: { c: Commitment }) {
  const d = divisionOf(c)
  if (!d) return <span className="text-white/30">—</span>
  return (
    <span className="inline-flex min-w-[44px] justify-center rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-xs font-bold text-white">
      {d}
    </span>
  )
}

export function CollegeCommitmentsClient({
  commitments,
  coverage = "North Carolina",
  showState = false,
}: {
  commitments: Commitment[]
  /** "North Carolina", or every live state on RecruitWrestlers. */
  coverage?: string
  /** More than one state on the page: each wrestler carries his state's tag. */
  showState?: boolean
}) {
  const [search, setSearch] = useState("")
  const [gender, setGender] = useState<Gender>("all")
  const [classYear, setClassYear] = useState<string>("all")
  // RecruitWrestlers lists every live state; a family looks at its own (Matt, 1 Nov 2026).
  const [stateFilter, setStateFilter] = useState<string>("all")
  const [division, setDivision] = useState<Division | "all">("all")
  const [sort, setSort] = useState<SortChoice>("newest")
  /* The list answers what people arrive with (who went where); cards are a tap away. */
  const [view, setView] = useState<ViewMode>("list")

  /* Written out from the commitments on file, never typed: a hand list goes stale every summer. */
  const stateCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const c of commitments) if (c.state) counts.set(c.state, (counts.get(c.state) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [commitments])

  const classYears = useMemo(
    () => [...new Set(commitments.map((c) => c.graduationyear).filter((y) => y > 0))].sort((a, b) => b - a).map(String),
    [commitments],
  )

  /* Everything but the division, so each tile counts what tapping it would show. */
  const beforeDivision = useMemo(() => {
    const q = search.trim().toLowerCase()
    return commitments.filter((c) => {
      if (stateFilter !== "all" && c.state !== stateFilter) return false
      if (gender === "female" && !isFemale(c)) return false
      if (gender === "male" && isFemale(c)) return false
      if (classYear !== "all" && String(c.graduationyear) !== classYear) return false
      if (!q) return true
      return [c.name, c.college, c.highschool, c.wrestlingClub].some((v) => (v ?? "").toLowerCase().includes(q))
    })
  }, [commitments, search, gender, classYear, stateFilter])

  const divisionCounts = useMemo(() => {
    const counts: Record<Division, number> = { D1: 0, D2: 0, D3: 0, NAIA: 0, NJCAA: 0 }
    for (const c of beforeDivision) {
      const d = divisionOf(c)
      if (d) counts[d]++
    }
    return counts
  }, [beforeDivision])

  const shown = useMemo(() => {
    const rows = division === "all" ? beforeDivision : beforeDivision.filter((c) => divisionOf(c) === division)
    if (sort === "name") return [...rows].sort((a, b) => (a.last_name || a.name).localeCompare(b.last_name || b.name))
    if (sort === "college") return [...rows].sort((a, b) => a.college.localeCompare(b.college) || a.name.localeCompare(b.name))
    return rows // the server sends newest commitment first
  }, [beforeDivision, division, sort])

  const genderCounts = useMemo(() => {
    const inState = stateFilter === "all" ? commitments : commitments.filter((c) => c.state === stateFilter)
    const female = inState.filter(isFemale).length
    return { all: inState.length, male: inState.length - female, female }
  }, [commitments, stateFilter])

  const filtered = search.trim() !== "" || gender !== "all" || classYear !== "all" || division !== "all" || stateFilter !== "all"
  const clearAll = () => {
    setSearch("")
    setStateFilter("all")
    setGender("all")
    setClassYear("all")
    setDivision("all")
  }

  return (
    <main className="min-h-screen bg-[#0A1628]">
      <CommitsHero icon={GraduationCap} title="College Commitments" subtitle={`Where ${coverage} wrestlers are wrestling next.`} />

      <div className="container mx-auto space-y-6 px-4 py-8">
        {/* The division breakdown is the division filter: tap a number to see who it counts. */}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
          {(["all", ...DIVISIONS] as const).map((d) => {
            const active = division === d
            const count = d === "all" ? beforeDivision.length : divisionCounts[d]
            return (
              <StatTile key={d} value={count} label={d === "all" ? "All" : d} active={active} onClick={() => setDivision(d)} />
            )
          })}
        </div>

        <FilterPanel>
          <SearchField value={search} onChange={setSearch} placeholder="Wrestler, college or high school" />
          {showState && stateCounts.length > 1 ? (
            <QuickGroup label="State">
              <QuickChip active={stateFilter === "all"} onClick={() => setStateFilter("all")}>
                All <span className="ml-1 tabular-nums opacity-60">{commitments.length}</span>
              </QuickChip>
              {stateCounts.map(([st, n]) => (
                <QuickChip key={st} active={stateFilter === st} onClick={() => setStateFilter(st)}>
                  {st} <span className="ml-1 tabular-nums opacity-60">{n}</span>
                </QuickChip>
              ))}
            </QuickGroup>
          ) : null}
          <QuickGroup label="Wrestling">
            {([
              ["all", "All"],
              ["male", "Men"],
              ["female", "Women"],
            ] as const).map(([value, label]) => (
              <QuickChip key={value} active={gender === value} onClick={() => setGender(value)}>
                {label} <span className="ml-1 tabular-nums opacity-60">{genderCounts[value]}</span>
              </QuickChip>
            ))}
          </QuickGroup>
          <QuickGroup label="Class">
            <QuickChip active={classYear === "all"} onClick={() => setClassYear("all")}>
              All
            </QuickChip>
            {classYears.map((y) => (
              <QuickChip key={y} active={classYear === y} onClick={() => setClassYear(y)}>
                {y}
              </QuickChip>
            ))}
          </QuickGroup>
          <SortField
            value={sort}
            onChange={setSort}
            options={[
              ["newest", "Newest commitment"],
              ["name", "Wrestler (A to Z)"],
              ["college", "College (A to Z)"],
            ]}
          />
        </FilterPanel>

        <ResultBar count={shown.length} noun="commitment" filtered={filtered} onClear={clearAll}>
          <ViewToggle
            value={view}
            onChange={setView}
            options={[
              ["list", "List", List],
              ["cards", "Cards", LayoutGrid],
            ]}
          />
        </ResultBar>

        {shown.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-[#0f1c2e] px-6 py-16 text-center">
            <p className="font-semibold text-white">No commitments match these filters.</p>
            {filtered ? (
              <button type="button" onClick={clearAll} className="mt-3 text-sm font-semibold text-[#D3B574] hover:underline">
                Clear filters
              </button>
            ) : null}
          </div>
        ) : view === "cards" ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {normalizeAthleteList(shown).map((athlete) => (
              <ProfessionalCommitmentCard key={athlete.id} athlete={athlete} listMode />
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0f1c2e]">
            {/* Phone: one stacked row per wrestler, nothing to scroll sideways. */}
            <ul className="divide-y divide-white/5 md:hidden">
              {shown.map((c) => {
                const month = commitMonth(c.commitmentdate)
                return (
                  <li key={c.id}>
                    <HardLink
                      href={`/view-profile?id=${encodeURIComponent(c.id)}`}
                      className="flex items-center gap-3 px-4 py-3 active:bg-white/5"
                    >
                      <CollegeMark c={c} size={40} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-white">{c.name}</span>
                        <span className="block truncate text-sm text-white/70">
                          {c.college}
                          {divisionOf(c) ? <span className="text-white/45"> · {divisionOf(c)}</span> : null}
                        </span>
                        <span className="block truncate text-xs text-white/45">
                          {[c.graduationyear ? `Class of ${c.graduationyear}` : null, c.highschool || null, month].filter(Boolean).join(" · ")}
                        </span>
                        {c.top_honor ? <span className="mt-0.5 block truncate text-xs font-semibold text-[#D3B574]">{c.top_honor}</span> : null}
                      </span>
                    </HardLink>
                  </li>
                )
              })}
            </ul>
            <table className="hidden w-full text-sm md:table">
              <thead className="border-b border-white/10">
                <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-white/45">
                  <th className="px-4 py-3">Wrestler</th>
                  <th className="px-4 py-3">College</th>
                  <th className="px-4 py-3">Division</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Weight</th>
                  <th className="px-4 py-3">Top achievement</th>
                  <th className="whitespace-nowrap px-4 py-3">Committed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {shown.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-white/[0.03]" onMouseEnter={() => prefetchAthleteProfile(c.id)}>
                    <td className="px-4 py-3">
                      <HardLink href={`/view-profile?id=${encodeURIComponent(c.id)}`} className="font-semibold text-white hover:text-[#D3B574]">
                        {c.name}
                      </HardLink>
                      {showState && c.state ? <span className="ml-2 rounded border border-white/25 px-1 align-middle text-[10px] font-bold text-white/70">{c.state}</span> : null}
                      {c.highschool ? <div className="text-xs text-white/45">{c.highschool}</div> : null}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2.5">
                        <CollegeMark c={c} />
                        <span className="text-white/85">{c.college}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <DivisionBadge c={c} />
                    </td>
                    <td className="px-4 py-3 tabular-nums text-white/70">{c.graduationyear || "—"}</td>
                    <td className="px-4 py-3 tabular-nums text-white/70">{c.weightclass || "—"}</td>
                    <td className="px-4 py-3 font-semibold text-[#D3B574]">{c.top_honor || <span className="font-normal text-white/30">—</span>}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-white/60">{commitMonth(c.commitmentdate) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
