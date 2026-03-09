"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { HighSchoolLeaderboard } from "@/components/high-school-leaderboard"
import { AuthGuard } from "@/components/auth-guard"
import { School, Search, Trophy } from "lucide-react"

interface Stats {
  totalCommits: number
  maleCommits: number
  femaleCommits: number
  uniqueSchools: number
}

export default function HighSchoolsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedGender, setSelectedGender] = useState<"all" | "male" | "female">("all")
  const [selectedYear, setSelectedYear] = useState<"all" | "2024" | "2025" | "2026" | "2027">("all")
  const [stats, setStats] = useState<Stats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  const normalizeGenderForAPI = (gender: "all" | "male" | "female"): "all" | "male" | "female" => {
    if (gender === "all") return "all"

    const genderLower = gender.toLowerCase()
    if (["male", "m", "men", "man"].includes(genderLower)) {
      return "male"
    }
    if (["female", "f", "women", "woman"].includes(genderLower)) {
      return "female"
    }
    return gender
  }

  const handleStatsUpdate = (s: { totalCommits: number; maleCommits: number; femaleCommits: number; uniqueSchools: number }) => {
    setStats({
      totalCommits: s.totalCommits,
      maleCommits: s.maleCommits,
      femaleCommits: s.femaleCommits,
      uniqueSchools: s.uniqueSchools,
    })
    setStatsLoading(false)
  }

  // Reset banner loading when filters change so we show "..." until leaderboard reports
  useEffect(() => {
    setStatsLoading(true)
  }, [selectedGender, selectedYear])

  const clearFilters = () => {
    setSelectedGender("all")
    setSelectedYear("all")
    setSearchTerm("")
  }

  const hasActiveFilters = selectedGender !== "all" || selectedYear !== "all" || searchTerm !== ""

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center gap-3 mb-4">
                <School className="h-8 w-8 text-[#1e3a8a]" />
                <h1 className="text-2xl font-bold text-[#1e3a8a]">High School Wrestling Commits</h1>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold mb-2">HIGH SCHOOL WRESTLING EXCELLENCE</h2>
              <p className="text-red-100 text-lg">North Carolina College Recruitment Pipeline</p>
              <p className="text-red-200 text-sm mt-2">
                {selectedYear !== "all" || selectedGender !== "all" || searchTerm
                  ? "Banner reflects current filters and search."
                  : "Total commits, men's wrestling, women's wrestling, and high schools represent data from the class of 2025 onwards."}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
                <div className="text-3xl font-bold">{statsLoading ? "..." : stats?.totalCommits ?? 0}</div>
                <div className="text-red-100 text-sm">Total Commits</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
                <div className="text-3xl font-bold">{statsLoading ? "..." : stats?.uniqueSchools ?? 0}</div>
                <div className="text-red-100 text-sm">High Schools</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
                <div className="text-3xl font-bold">{statsLoading ? "..." : stats?.maleCommits ?? 0}</div>
                <div className="text-red-100 text-sm">Men's Wrestling</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
                <div className="text-3xl font-bold">{statsLoading ? "..." : stats?.femaleCommits ?? 0}</div>
                <div className="text-red-100 text-sm">Women's Wrestling</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-6">
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  type="text"
                  placeholder="Search high schools..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-3 text-lg border-2 border-gray-200 focus:border-[#1e3a8a] rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-[#1e3a8a]" />
                <span className="font-medium text-[#1e3a8a]">Filter High Schools</span>
              </div>

              <div className="flex flex-wrap gap-4 flex-1">
                <Select value={selectedGender} onValueChange={setSelectedGender}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Genders</SelectItem>
                    <SelectItem value="male">Men's Wrestling</SelectItem>
                    <SelectItem value="female">Women's Wrestling</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Class Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    <SelectItem value="2024">Class of 2024</SelectItem>
                    <SelectItem value="2025">Class of 2025</SelectItem>
                    <SelectItem value="2026">Class of 2026</SelectItem>
                    <SelectItem value="2027">Class of 2027</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters} size="sm">
                  Clear All Filters
                </Button>
              )}
            </div>

            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 mt-4">
                {selectedGender !== "all" && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {selectedGender === "male" ? "Men's Wrestling" : "Women's Wrestling"}
                  </Badge>
                )}
                {selectedYear !== "all" && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Class of {selectedYear}
                  </Badge>
                )}
                {searchTerm && (
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                    Search: "{searchTerm}"
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <HighSchoolLeaderboard
            metric="total_commits"
            gender={normalizeGenderForAPI(selectedGender)}
            year={selectedYear}
            searchTerm={searchTerm}
            onStatsUpdate={handleStatsUpdate}
          />

          <Card className="bg-amber-50 border-amber-200 mt-8">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <School className="h-5 w-5 text-amber-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-amber-900 mb-2">New 8-Division System (2025)</h3>
                  <p className="text-amber-800 text-sm">
                    North Carolina is transitioning to an 8-division classification system. Division data will be
                    updated as schools are reclassified.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  )
}
