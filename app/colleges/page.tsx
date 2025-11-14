"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, GraduationCap, Trophy } from "lucide-react"
import { CollegeLeaderboard } from "@/components/college-leaderboard"
import { AuthGuard } from "@/components/auth-guard"

function NewCollegesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [gender, setGender] = useState("all")
  const [year, setYear] = useState("all")
  const [division, setDivision] = useState("all")
  const [metric, setMetric] = useState("total_commits")
  const [totalCommits, setTotalCommits] = useState(0)
  const [maleCommits, setMaleCommits] = useState(0)
  const [femaleCommits, setFemaleCommits] = useState(0)
  const [uniqueColleges, setUniqueColleges] = useState(0)
  const [loading, setLoading] = useState(true)

  function clearFilters() {
    setGender("all")
    setYear("all")
    setSearchTerm("")
    setDivision("all")
    setMetric("total_commits")
  }

  function checkActiveFilters() {
    return gender !== "all" || year !== "all" || searchTerm !== "" || division !== "all" || metric !== "total_commits"
  }

  // Handle stats update from the leaderboard component
  const handleStatsUpdate = (stats: { totalCommits: number; maleCommits: number; femaleCommits: number; uniqueColleges: number }) => {
    setTotalCommits(stats.totalCommits)
    setMaleCommits(stats.maleCommits)
    setFemaleCommits(stats.femaleCommits)
    setUniqueColleges(stats.uniqueColleges)
    setLoading(false)
  }

  const hasActiveFilters = checkActiveFilters()

  const getBannerText = () => {
    if (year !== "all") {
      return `Class of ${year} commits`
    }
    return "Total commits, men's wrestling, women's wrestling, and colleges represent data from the class of 2025 onwards"
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center gap-3 mb-4">
                <GraduationCap className="h-8 w-8 text-[#1e3a8a]" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-[#1e3a8a] to-[#1e40af] text-white">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold mb-2">COLLEGES RECRUITING NC ATHLETES</h2>
              <p className="text-blue-200 text-sm mt-2">{getBannerText()}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
                <div className="text-3xl font-bold">{loading ? "..." : totalCommits}</div>
                <div className="text-blue-100 text-sm">Total Commits</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
                <div className="text-3xl font-bold">{loading ? "..." : uniqueColleges}</div>
                <div className="text-blue-100 text-sm">Colleges</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
                <div className="text-3xl font-bold">{loading ? "..." : maleCommits}</div>
                <div className="text-blue-100 text-sm">Men's Wrestling</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
                <div className="text-3xl font-bold">{loading ? "..." : femaleCommits}</div>
                <div className="text-blue-100 text-sm">Women's Wrestling</div>
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
                  placeholder="Search for a specific college..."
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
                <span className="font-medium text-[#1e3a8a]">Filter & Sort Colleges</span>
              </div>

              <div className="flex flex-wrap gap-4 flex-1">
                <Select value={metric} onValueChange={setMetric}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="total_commits">Total Commits</SelectItem>
                    <SelectItem value="d1_commits">D1 Commits</SelectItem>
                    <SelectItem value="recent_commits">Recent Commits</SelectItem>
                    <SelectItem value="ranked_commits">Ranked Commits</SelectItem>
                    <SelectItem value="nc_commits">NC Commits</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Genders</SelectItem>
                    <SelectItem value="male">Men's Wrestling</SelectItem>
                    <SelectItem value="female">Women's Wrestling</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={division} onValueChange={setDivision}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Division" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Divisions</SelectItem>
                    <SelectItem value="DI">Division I</SelectItem>
                    <SelectItem value="DII">Division II</SelectItem>
                    <SelectItem value="DIII">Division III</SelectItem>
                    <SelectItem value="NAIA">NAIA</SelectItem>
                    <SelectItem value="NJCAA">NJCAA</SelectItem>
                    <SelectItem value="Independent">Independent</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={year} onValueChange={setYear}>
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
                {metric !== "total_commits" && (
                  <Badge variant="secondary" className="bg-indigo-100 text-indigo-800">
                    Sort: {metric.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Badge>
                )}
                {gender !== "all" && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {gender === "male" ? "Men's Wrestling" : "Women's Wrestling"}
                  </Badge>
                )}
                {division !== "all" && (
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                    {division === "DI"
                      ? "Division I"
                      : division === "DII"
                        ? "Division II"
                        : division === "DIII"
                          ? "Division III"
                          : division}
                  </Badge>
                )}
                {year !== "all" && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Class of {year}
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
          <CollegeLeaderboard 
            metric={metric} 
            gender={gender} 
            year={year} 
            division={division} 
            searchTerm={searchTerm}
            onStatsUpdate={handleStatsUpdate}
          />
        </div>
      </div>
    </AuthGuard>
  )
}

export default NewCollegesPage
