"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, Users, GraduationCap } from "lucide-react"

type YearFilter = "All" | "2025" | "2026"

interface CleanStatsDisplayProps {
  yearFilter?: YearFilter
  onYearChange?: (year: YearFilter) => void
  stats?: {
    total: number
    male: number
    female: number
    divisions: {
      D1: number
      D2: number
      D3: number
      NAIA: number
      NJCAA: number
    }
  }
  loading?: boolean
}

export function CleanStatsDisplay({
  yearFilter = "All",
  onYearChange,
  stats = {
    total: 0,
    male: 0,
    female: 0,
    divisions: { D1: 0, D2: 0, D3: 0, NAIA: 0, NJCAA: 0 },
  },
  loading = false,
}: CleanStatsDisplayProps) {
  const handleYearClick = (year: YearFilter) => {
    if (onYearChange) {
      onYearChange(year)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          {["All", "2025", "2026"].map((year) => (
            <div key={year} className="h-10 w-16 animate-pulse rounded bg-gray-200"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-gray-200"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Year Filter Buttons */}
      <div className="flex gap-2">
        {(["All", "2025", "2026"] as YearFilter[]).map((year) => (
          <Button
            key={year}
            variant={yearFilter === year ? "default" : "outline"}
            size="sm"
            onClick={() => handleYearClick(year)}
            className={
              yearFilter === year
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "border-blue-600 text-blue-600 hover:bg-blue-50"
            }
          >
            {year}
          </Button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {/* Total Commitments */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-blue-700">
              <Users className="h-4 w-4" />
              Total Commitments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{stats.total}</div>
            <p className="text-xs text-gray-600">
              {stats.male} Male, {stats.female} Female
            </p>
          </CardContent>
        </Card>

        {/* NCAA D1 */}
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-red-700">
              <Trophy className="h-4 w-4" />
              NCAA Division I
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900">{stats.divisions.D1}</div>
            <p className="text-xs text-gray-600">
              {stats.total > 0 ? Math.round((stats.divisions.D1 / stats.total) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>

        {/* NCAA D2 */}
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-amber-700">
              <GraduationCap className="h-4 w-4" />
              NCAA Division II
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-900">{stats.divisions.D2}</div>
            <p className="text-xs text-gray-600">
              {stats.total > 0 ? Math.round((stats.divisions.D2 / stats.total) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>

        {/* Other Divisions */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-green-700">
              <Trophy className="h-4 w-4" />
              Other Divisions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">
              {stats.divisions.D3 + stats.divisions.NAIA + stats.divisions.NJCAA}
            </div>
            <p className="text-xs text-gray-600">D3, NAIA, NJCAA</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
