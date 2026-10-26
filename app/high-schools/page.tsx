"use client"

import { useCallback, useEffect, useState } from "react"
import { School } from "lucide-react"
import { HighSchoolLeaderboard } from "@/components/high-school-leaderboard"
import { QuickChip, QuickGroup } from "@/components/ui/quick-chip"
import { CommitsHero, FilterPanel, ResultBar, SearchField, StatTile } from "@/components/commitments/commits-chrome"
import { COMMIT_CLASS_YEARS, type CommitClassYearFilter } from "@/lib/commit-class-year"

type Gender = "all" | "male" | "female"
type Stats = { totalCommits: number; maleCommits: number; femaleCommits: number; uniqueSchools: number }

/* Every class by default, the same as /college-commitments and /colleges. */
export default function HighSchoolsPage() {
  const [search, setSearch] = useState("")
  const [gender, setGender] = useState<Gender>("all")
  const [year, setYear] = useState<CommitClassYearFilter>("all")
  const [stats, setStats] = useState<Stats | null>(null)

  const onStats = useCallback((s: Stats) => setStats(s), [])
  useEffect(() => setStats(null), [gender, year, search])

  const filtered = search !== "" || gender !== "all" || year !== "all"
  const clearAll = () => {
    setSearch("")
    setGender("all")
    setYear("all")
  }
  const shown = (n: number | undefined) => (stats ? (n ?? 0) : "–")

  return (
    <main className="min-h-screen bg-[#0A1628]">
      <CommitsHero icon={School} title="High Schools" subtitle="College commitments by North Carolina high school program." />

      <div className="container mx-auto space-y-6 px-4 py-8">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <StatTile value={shown(stats?.totalCommits)} label="Commitments" />
          <StatTile value={shown(stats?.uniqueSchools)} label="High schools" />
          <StatTile value={shown(stats?.maleCommits)} label="Men" />
          <StatTile value={shown(stats?.femaleCommits)} label="Women" />
        </div>

        <FilterPanel>
          <SearchField value={search} onChange={setSearch} placeholder="High school" />
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
        </FilterPanel>

        <ResultBar count={stats ? stats.uniqueSchools : null} noun="high school" filtered={filtered} onClear={clearAll} />

        <HighSchoolLeaderboard metric="total_commits" gender={gender} year={year} searchTerm={search} onStatsUpdate={onStats} />
      </div>
    </main>
  )
}
