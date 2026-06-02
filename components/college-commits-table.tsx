"use client"

import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { HardLink } from "@/components/hard-link"

export type CollegeCommitAthlete = {
  id: string
  name: string
  highschool: string
  college: string
  division: string
  gender: string
  graduationyear: number
  commitmentdate: string | null
  weightclass: string
  photourl: string | null
}

interface CollegeCommitsTableProps {
  gender: "all" | "male" | "female"
  year?: "all" | "2025" | "2026" | "2027" | "2028"
  division?: "all" | "Division I" | "Division II" | "Division III" | "NAIA" | "NJCAA" | "Independent" | "DI" | "DII" | "DIII"
  searchTerm?: string
  onStatsUpdate?: (stats: {
    totalCommits: number
    maleCommits: number
    femaleCommits: number
    uniqueColleges: number
  }) => void
}

function isMale(gender: string) {
  const g = gender.toLowerCase()
  return g === "male" || g === "m" || g === "men"
}

function isFemale(gender: string) {
  const g = gender.toLowerCase()
  return g === "female" || g === "f" || g === "women"
}

export function CollegeCommitsTable({
  gender,
  year = "all",
  division = "all",
  searchTerm = "",
  onStatsUpdate,
}: CollegeCommitsTableProps) {
  const [athletes, setAthletes] = useState<CollegeCommitAthlete[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams({ gender, year, division })
        if (searchTerm.trim()) params.set("search", searchTerm.trim())

        const response = await fetch(`/api/colleges/commits?${params.toString()}`)
        if (!response.ok) {
          const body = await response.json().catch(() => ({}))
          throw new Error(body.details || body.error || `Request failed (${response.status})`)
        }

        const data = await response.json()
        setAthletes(data.athletes || [])
      } catch (err) {
        console.error("[RecruitNC] College commits table:", err)
        setError(err instanceof Error ? err.message : "Failed to load commits")
        setAthletes([])
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [gender, year, division, searchTerm])

  useEffect(() => {
    if (!onStatsUpdate) return
    const uniqueColleges = new Set(athletes.map((a) => a.college)).size
    onStatsUpdate({
      totalCommits: athletes.length,
      maleCommits: athletes.filter((a) => isMale(a.gender)).length,
      femaleCommits: athletes.filter((a) => isFemale(a.gender)).length,
      uniqueColleges,
    })
  }, [athletes, onStatsUpdate])

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full bg-white/5" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 text-white/40">
        <p>Error loading commits: {error}</p>
      </div>
    )
  }

  if (athletes.length === 0) {
    return (
      <div className="text-center py-8 text-white/40">
        <p>No commits match the selected filters.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden overflow-x-auto bg-[#0f1c2e]">
      <div className="px-4 py-3 border-b border-white/10 text-sm text-white/40">
        {athletes.length} commit{athletes.length === 1 ? "" : "s"}
      </div>
      <table className="w-full text-sm min-w-[640px]">
        <thead className="border-b border-white/10">
          <tr>
            <th className="text-left p-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Athlete</th>
            <th className="text-left p-3 font-semibold text-white/60 text-xs uppercase tracking-wider">High School</th>
            <th className="text-left p-3 font-semibold text-white/60 text-xs uppercase tracking-wider">College</th>
            <th className="text-left p-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Division</th>
            <th className="text-left p-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Class</th>
            <th className="text-left p-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Weight</th>
            <th className="text-left p-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Gender</th>
          </tr>
        </thead>
        <tbody>
          {athletes.map((athlete) => (
            <tr key={athlete.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
              <td className="p-3">
                <HardLink
                  href={`/view-profile?id=${encodeURIComponent(athlete.id)}`}
                  className="font-medium text-[#D3B574] hover:underline"
                >
                  {athlete.name}
                </HardLink>
              </td>
              <td className="p-3 text-white/70">{athlete.highschool}</td>
              <td className="p-3 text-white/70">{athlete.college}</td>
              <td className="p-3">
                {athlete.division ? (
                  <Badge variant="secondary" className="text-xs bg-white/10 text-white/70 border-0">
                    {athlete.division}
                  </Badge>
                ) : (
                  <span className="text-white/40">—</span>
                )}
              </td>
              <td className="p-3 text-white/70">{athlete.graduationyear || "—"}</td>
              <td className="p-3 text-white/70">{athlete.weightclass ? `${athlete.weightclass} lbs` : "—"}</td>
              <td className="p-3 text-white/70 capitalize">{athlete.gender || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
