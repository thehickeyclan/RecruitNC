"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { HighSchoolLeaderboard } from "@/components/high-school-leaderboard"
import { School, Search, ArrowLeft } from "lucide-react"

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
    if (["male", "m", "men", "man"].includes(genderLower)) return "male"
    if (["female", "f", "women", "woman"].includes(genderLower)) return "female"
    return gender
  }

  const handleStatsUpdate = useCallback(
    (s: { totalCommits: number; maleCommits: number; femaleCommits: number; uniqueSchools: number }) => {
      setStats({
        totalCommits: s.totalCommits,
        maleCommits: s.maleCommits,
        femaleCommits: s.femaleCommits,
        uniqueSchools: s.uniqueSchools,
      })
      setStatsLoading(false)
    },
    [],
  )

  useEffect(() => {
    setStatsLoading(true)
  }, [selectedGender, selectedYear, searchTerm])

  const clearFilters = () => {
    setSelectedGender("all")
    setSelectedYear("all")
    setSearchTerm("")
  }

  const hasActiveFilters = selectedGender !== "all" || selectedYear !== "all" || searchTerm !== ""

  const statsLabel =
    selectedYear !== "all" ? `Class of ${selectedYear}` : "All Classes (2025+)"

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
              <School className="h-8 w-8 text-[#D3B574]" />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl">High Schools</h1>
          </div>
          <p className="text-white/70 text-lg max-w-xl leading-relaxed">
            Track college commitments by North Carolina high school program.
          </p>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-b border-white/10 bg-[#0f1c2e]">
        <div className="container mx-auto px-4">
          {statsLoading ? (
            <div className="py-8 text-center text-white/40">Loading statistics...</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
              <div className="py-6 md:py-8 text-center">
                <div className="text-3xl font-black text-white md:text-4xl">{stats?.totalCommits ?? 0}</div>
                <div className="mt-1 text-xs text-white/40 uppercase tracking-wider">Total Commits</div>
              </div>
              <div className="py-6 md:py-8 text-center">
                <div className="text-3xl font-black text-[#D3B574] md:text-4xl">{stats?.uniqueSchools ?? 0}</div>
                <div className="mt-1 text-xs text-white/40 uppercase tracking-wider">High Schools</div>
              </div>
              <div className="py-6 md:py-8 text-center">
                <div className="text-3xl font-black text-white md:text-4xl">{stats?.maleCommits ?? 0}</div>
                <div className="mt-1 text-xs text-white/40 uppercase tracking-wider">Men&apos;s Wrestling</div>
              </div>
              <div className="py-6 md:py-8 text-center">
                <div className="text-3xl font-black text-[#BC0B03] md:text-4xl">{stats?.femaleCommits ?? 0}</div>
                <div className="mt-1 text-xs text-white/40 uppercase tracking-wider">Women&apos;s Wrestling</div>
              </div>
            </div>
          )}
          {!statsLoading && (
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
                placeholder="Search high schools..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#D3B574] focus:ring-[#D3B574]/20"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Select value={selectedGender} onValueChange={setSelectedGender}>
                <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genders</SelectItem>
                  <SelectItem value="male">Men&apos;s Wrestling</SelectItem>
                  <SelectItem value="female">Women&apos;s Wrestling</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Class Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years (2025+)</SelectItem>
                  <SelectItem value="2025">Class of 2025</SelectItem>
                  <SelectItem value="2026">Class of 2026</SelectItem>
                  <SelectItem value="2027">Class of 2027</SelectItem>
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
              {selectedGender !== "all" && (
                <Badge className="bg-[#003366] text-white border-0">
                  {selectedGender === "male" ? "Men's Wrestling" : "Women's Wrestling"}
                </Badge>
              )}
              {selectedYear !== "all" && (
                <Badge className="bg-[#D3B574] text-[#0A1628] border-0">Class of {selectedYear}</Badge>
              )}
              {searchTerm && (
                <Badge className="bg-white/10 text-white border-0">{`Search: "${searchTerm}"`}</Badge>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Leaderboard */}
      <section className="container mx-auto px-4 py-8">
        <HighSchoolLeaderboard
          metric="total_commits"
          gender={normalizeGenderForAPI(selectedGender)}
          year={selectedYear}
          searchTerm={searchTerm}
          onStatsUpdate={handleStatsUpdate}
        />

        <div className="mt-8 rounded-xl border border-[#D3B574]/20 bg-[#D3B574]/5 p-6">
          <div className="flex items-start gap-3">
            <School className="h-5 w-5 text-[#D3B574] mt-1 shrink-0" />
            <div>
              <h3 className="font-semibold text-[#D3B574] mb-2">New 8-Division System (2025)</h3>
              <p className="text-white/60 text-sm">
                North Carolina is transitioning to an 8-division classification system. Division data will be
                updated as schools are reclassified.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
