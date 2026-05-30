"use client"

import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

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
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Error loading commits: {error}</p>
      </div>
    )
  }

  if (athletes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No commits match the selected filters.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b bg-gray-50 text-sm text-gray-600">
        {athletes.length} commit{athletes.length === 1 ? "" : "s"}
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Athlete</TableHead>
              <TableHead>High School</TableHead>
              <TableHead>College</TableHead>
              <TableHead>Division</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Weight</TableHead>
              <TableHead>Gender</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {athletes.map((athlete) => (
              <TableRow key={athlete.id} className="hover:bg-gray-50">
                <TableCell>
                  <a
                    href={`/athletes/${athlete.id}`}
                    className="font-medium text-[#1e3a8a] hover:underline"
                  >
                    {athlete.name}
                  </a>
                </TableCell>
                <TableCell>{athlete.highschool}</TableCell>
                <TableCell>{athlete.college}</TableCell>
                <TableCell>
                  {athlete.division ? (
                    <Badge variant="secondary" className="text-xs">
                      {athlete.division}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>{athlete.graduationyear || "—"}</TableCell>
                <TableCell>{athlete.weightclass ? `${athlete.weightclass} lbs` : "—"}</TableCell>
                <TableCell className="capitalize">{athlete.gender || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
