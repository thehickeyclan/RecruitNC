"use client"

import { useCallback, useEffect, useState } from "react"
import { Building2, LayoutList, ListOrdered } from "lucide-react"
import { CollegeLeaderboard } from "@/components/college-leaderboard"
import { CollegeCommitsTable } from "@/components/college-commits-table"
import { QuickChip, QuickGroup } from "@/components/ui/quick-chip"
import {
  CommitsHero,
  FilterPanel,
  ResultBar,
  SearchField,
  SortField,
  StatTile,
  ViewToggle,
} from "@/components/commitments/commits-chrome"
import { COMMIT_CLASS_YEARS, type CommitClassYearFilter } from "@/lib/commit-class-year"

type Gender = "all" | "male" | "female"
type Division = "all" | "DI" | "DII" | "DIII" | "NAIA" | "NJCAA"
type Metric = "total_commits" | "d1_commits" | "recent_commits" | "ranked_commits" | "nc_commits"
type ViewMode = "rankings" | "table"

const DIVISIONS: ReadonlyArray<readonly [Division, string]> = [
  ["all", "All"],
  ["DI", "D1"],
  ["DII", "D2"],
  ["DIII", "D3"],
  ["NAIA", "NAIA"],
  ["NJCAA", "NJCAA"],
]

const METRICS: ReadonlyArray<readonly [Metric, string]> = [
  ["total_commits", "Most commits"],
  ["d1_commits", "Most D1 commits"],
  ["recent_commits", "Most recent"],
  ["ranked_commits", "Most ranked commits"],
  ["nc_commits", "NC colleges first"],
]

type Stats = { totalCommits: number; maleCommits: number; femaleCommits: number; uniqueColleges: number }

/*
 * Every class by default, the same as /college-commitments: the pages are views of the same
 * commitments and must open on the same set. "All" here is the classes in COMMIT_CLASS_YEARS.
 */
export default function CollegesPage() {
  const [search, setSearch] = useState("")
  const [gender, setGender] = useState<Gender>("all")
  const [year, setYear] = useState<CommitClassYearFilter>("all")
  const [division, setDivision] = useState<Division>("all")
  const [metric, setMetric] = useState<Metric>("total_commits")
  const [view, setView] = useState<ViewMode>("rankings")
  const [stats, setStats] = useState<Stats | null>(null)

  const onStats = useCallback((s: Stats) => setStats(s), [])
  useEffect(() => setStats(null), [metric, gender, year, division, search, view])

  const filtered = search !== "" || gender !== "all" || year !== "all" || division !== "all"
  const clearAll = () => {
    setSearch("")
    setGender("all")
    setYear("all")
    setDivision("all")
  }
  const shown = (n: number | undefined) => (stats ? (n ?? 0) : "–")

  return (
    <main className="min-h-screen bg-[#0A1628]">
      <CommitsHero icon={Building2} title="Colleges" subtitle="The college programs our wrestlers are committing to." />

      <div className="container mx-auto space-y-6 px-4 py-8">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <StatTile value={shown(stats?.totalCommits)} label="Commitments" />
          <StatTile value={shown(stats?.uniqueColleges)} label="Colleges" />
          <StatTile value={shown(stats?.maleCommits)} label="Men" />
          <StatTile value={shown(stats?.femaleCommits)} label="Women" />
        </div>

        <FilterPanel>
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder={view === "table" ? "Wrestler, college or high school" : "College or high school"}
          />
          <QuickGroup label="Wrestling">
            {([
              ["all", "All"],
              ["male", "Men"],
              ["female", "Women"],
            ] as const).map(([v, label]) => (
              <QuickChip key={v} active={gender === v} onClick={() => setGender(v)}>
                {label}
              </QuickChip>
            ))}
          </QuickGroup>
          <QuickGroup label="Division">
            {DIVISIONS.map(([v, label]) => (
              <QuickChip key={v} active={division === v} onClick={() => setDivision(v)}>
                {label}
              </QuickChip>
            ))}
          </QuickGroup>
          <QuickGroup label="Class">
            <QuickChip active={year === "all"} onClick={() => setYear("all")}>
              All
            </QuickChip>
            {[...COMMIT_CLASS_YEARS].reverse().map((y) => (
              <QuickChip key={y} active={year === y} onClick={() => setYear(y)}>
                {y}
              </QuickChip>
            ))}
          </QuickGroup>
          {view === "rankings" ? <SortField value={metric} onChange={setMetric} options={METRICS} /> : null}
        </FilterPanel>

        <ResultBar
          count={stats ? (view === "rankings" ? stats.uniqueColleges : stats.totalCommits) : null}
          noun={view === "rankings" ? "college" : "commitment"}
          filtered={filtered}
          onClear={clearAll}
        >
          <ViewToggle
            value={view}
            onChange={setView}
            options={[
              ["rankings", "Rankings", ListOrdered],
              ["table", "Table", LayoutList],
            ]}
          />
        </ResultBar>

        {view === "rankings" ? (
          <CollegeLeaderboard metric={metric} gender={gender} year={year} division={division} searchTerm={search} onStatsUpdate={onStats} />
        ) : (
          <CollegeCommitsTable gender={gender} year={year} division={division} searchTerm={search} onStatsUpdate={onStats} />
        )}
      </div>
    </main>
  )
}
