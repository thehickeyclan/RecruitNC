"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, GraduationCap, LayoutList, ListOrdered, ArrowLeft } from "lucide-react"
import { CollegeLeaderboard } from "@/components/college-leaderboard"
import { CollegeCommitsTable } from "@/components/college-commits-table"
import { getDefaultCommitClassYear } from "@/lib/commit-class-year"

const DEFAULT_COMMIT_YEAR = getDefaultCommitClassYear()

function NewCollegesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [gender, setGender] = useState("all")
  const [year, setYear] = useState(DEFAULT_COMMIT_YEAR)
  const [division, setDivision] = useState("all")
  const [metric, setMetric] = useState("total_commits")
  const [totalCommits, setTotalCommits] = useState(0)
  const [maleCommits, setMaleCommits] = useState(0)
  const [femaleCommits, setFemaleCommits] = useState(0)
  const [uniqueColleges, setUniqueColleges] = useState(0)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"rankings" | "table">("rankings")

  function clearFilters() {
    setGender("all")
    setYear(DEFAULT_COMMIT_YEAR)
    setSearchTerm("")
    setDivision("all")
    setMetric("total_commits")
  }

  function checkActiveFilters() {
    return (
      gender !== "all" ||
      year !== DEFAULT_COMMIT_YEAR ||
      searchTerm !== "" ||
      division !== "all" ||
      metric !== "total_commits"
    )
  }

  const handleStatsUpdate = useCallback(
    (stats: { totalCommits: number; maleCommits: number; femaleCommits: number; uniqueColleges: number }) => {
      setTotalCommits(stats.totalCommits)
      setMaleCommits(stats.maleCommits)
      setFemaleCommits(stats.femaleCommits)
      setUniqueColleges(stats.uniqueColleges)
      setLoading(false)
    },
    [],
  )

  useEffect(() => {
    setLoading(true)
  }, [metric, gender, year, division, searchTerm, viewMode])

  const hasActiveFilters = checkActiveFilters()

  const statsLabel =
    year === "all" ? "All Classes (2025+)" : `Class of ${year}`

  return (
    <main className="min-h-screen bg-[#0A1628]">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0">
          <Image
            src="/hero-banner-nchsaa-2026-arena.png"
            alt="NCHSAA Wrestling Championship arena"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A1628]/95 via-[#0A1628]/85 to-[#0A1628]/70" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A1628] via-transparent to-transparent" />
        </div>

        <div className="container relative mx-auto px-4 py-12 md:py-16">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-[#D3B574] transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <div className="rounded-xl bg-[#D3B574]/10 p-3 backdrop-blur-sm">
              <GraduationCap className="h-8 w-8 text-[#D3B574]" />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl">Colleges</h1>
          </div>
          <p className="text-white/70 text-lg max-w-xl leading-relaxed">
            See which college programs are recruiting North Carolina wrestlers.
          </p>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-b border-white/10 bg-[#0f1c2e]">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="py-8 text-center text-white/40">Loading statistics...</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
              <div className="py-6 md:py-8 text-center">
                <div className="text-3xl font-black text-white md:text-4xl">{totalCommits}</div>
                <div className="mt-1 text-xs text-white/40 uppercase tracking-wider">Total Commits</div>
              </div>
              <div className="py-6 md:py-8 text-center">
                <div className="text-3xl font-black text-[#D3B574] md:text-4xl">{uniqueColleges}</div>
                <div className="mt-1 text-xs text-white/40 uppercase tracking-wider">Colleges</div>
              </div>
              <div className="py-6 md:py-8 text-center">
                <div className="text-3xl font-black text-white md:text-4xl">{maleCommits}</div>
                <div className="mt-1 text-xs text-white/40 uppercase tracking-wider">Men&apos;s Wrestling</div>
              </div>
              <div className="py-6 md:py-8 text-center">
                <div className="text-3xl font-black text-[#BC0B03] md:text-4xl">{femaleCommits}</div>
                <div className="mt-1 text-xs text-white/40 uppercase tracking-wider">Women&apos;s Wrestling</div>
              </div>
            </div>
          )}
          {!loading && (
            <p className="pb-4 text-center text-xs text-white/30">{statsLabel}</p>
          )}
        </div>
      </section>

      {/* Search + Filters */}
      <section className="border-b border-white/10 bg-[#0A1628]">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <Input
                type="text"
                placeholder={
                  viewMode === "table"
                    ? "Search athletes, colleges, or high schools..."
                    : "Search colleges or high schools..."
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#D3B574] focus:ring-[#D3B574]/20"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {viewMode === "rankings" && (
                <Select value={metric} onValueChange={setMetric}>
                  <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-white">
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
              )}

              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genders</SelectItem>
                  <SelectItem value="male">Men&apos;s Wrestling</SelectItem>
                  <SelectItem value="female">Women&apos;s Wrestling</SelectItem>
                </SelectContent>
              </Select>

              <Select value={division} onValueChange={setDivision}>
                <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-white">
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
                <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Class Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years (2025+)</SelectItem>
                  <SelectItem value="2025">Class of 2025</SelectItem>
                  <SelectItem value="2026">Class of 2026</SelectItem>
                  <SelectItem value="2027">Class of 2027</SelectItem>
                  <SelectItem value="2028">Class of 2028</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  onClick={clearFilters}
                  size="sm"
                  className="text-white/50 hover:text-white hover:bg-white/10"
                >
                  Clear All
                </Button>
              )}
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mt-4">
              {metric !== "total_commits" && (
                <Badge className="bg-[#13294B] text-white border-0">
                  Sort: {metric.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                </Badge>
              )}
              {gender !== "all" && (
                <Badge className="bg-[#003366] text-white border-0">
                  {gender === "male" ? "Men's Wrestling" : "Women's Wrestling"}
                </Badge>
              )}
              {division !== "all" && (
                <Badge className="bg-[#13294B] text-white border-0">
                  {division === "DI"
                    ? "Division I"
                    : division === "DII"
                      ? "Division II"
                      : division === "DIII"
                        ? "Division III"
                        : division}
                </Badge>
              )}
              {year !== DEFAULT_COMMIT_YEAR && year !== "all" && (
                <Badge className="bg-[#D3B574] text-[#0A1628] border-0">Class of {year}</Badge>
              )}
              {year === "all" && (
                <Badge className="bg-[#D3B574] text-[#0A1628] border-0">All Years (2025+)</Badge>
              )}
              {searchTerm && (
                <Badge className="bg-white/10 text-white border-0">{`Search: "${searchTerm}"`}</Badge>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Content */}
      <section className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-white/40">
            {loading ? "Loading..." : `${totalCommits} commit${totalCommits !== 1 ? "s" : ""}`}
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setViewMode("rankings")}
              className={
                viewMode === "rankings"
                  ? "bg-[#D3B574] text-[#0A1628] hover:bg-[#c4a665]"
                  : "bg-white/10 text-white/60 hover:bg-white/20 border-0"
              }
            >
              <ListOrdered className="h-4 w-4 mr-1.5" />
              Rankings
            </Button>
            <Button
              size="sm"
              onClick={() => setViewMode("table")}
              className={
                viewMode === "table"
                  ? "bg-[#D3B574] text-[#0A1628] hover:bg-[#c4a665]"
                  : "bg-white/10 text-white/60 hover:bg-white/20 border-0"
              }
            >
              <LayoutList className="h-4 w-4 mr-1.5" />
              Table
            </Button>
          </div>
        </div>

        {viewMode === "rankings" ? (
          <CollegeLeaderboard
            metric={metric}
            gender={gender}
            year={year}
            division={division}
            searchTerm={searchTerm}
            onStatsUpdate={handleStatsUpdate}
          />
        ) : (
          <CollegeCommitsTable
            gender={gender as "all" | "male" | "female"}
            year={year as "all" | "2025" | "2026" | "2027" | "2028"}
            division={division as "all" | "DI" | "DII" | "DIII" | "NAIA" | "NJCAA" | "Independent"}
            searchTerm={searchTerm}
            onStatsUpdate={handleStatsUpdate}
          />
        )}
      </section>
    </main>
  )
}

export default NewCollegesPage
