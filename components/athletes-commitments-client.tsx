"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Trophy, FileSearch, LayoutGrid, List, ArrowLeft, GraduationCap } from "lucide-react"
import { ProfessionalCommitmentCard } from "@/components/professional-commitment-card"
import { normalizeAthleteList } from "@/lib/professional-athlete"
import { AthletesLegacySearchContent } from "@/components/athletes-legacy-search-content"
import { HardLink } from "@/components/hard-link"
import {
  commitmentFiltersKey,
  type CommitmentAthleteFilters,
  type CommitmentAthleteListItem,
  type CommitmentStats,
} from "@/lib/athletes-commitments-fetch"
import { prefetchAthleteProfile } from "@/lib/prefetch-athlete-profile"

type AthletesTab = "commitments" | "legacy"
type CommitViewMode = "cards" | "table"

type AthletesCommitmentsClientProps = {
  initialAthletes: CommitmentAthleteListItem[]
  initialStats: CommitmentStats
  initialFilters: CommitmentAthleteFilters
}

export function AthletesCommitmentsClient({
  initialAthletes,
  initialStats,
  initialFilters,
}: AthletesCommitmentsClientProps) {
  const initialFiltersKey = useMemo(() => commitmentFiltersKey(initialFilters), [initialFilters])
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<AthletesTab>("commitments")
  const [athletes, setAthletes] = useState<CommitmentAthleteListItem[]>(initialAthletes)

  useEffect(() => {
    if (searchParams.get("tab") === "legacy") setTab("legacy")
    else if (searchParams.get("tab") === "commitments" || !searchParams.get("tab")) setTab("commitments")
  }, [searchParams])

  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedGender, setSelectedGender] = useState<"all" | "male" | "female">(
    (initialFilters.gender as "all" | "male" | "female") ?? "all",
  )
  const [selectedYear, setSelectedYear] = useState<"all" | "2024" | "2025" | "2026" | "2027">(
    (initialFilters.year as "all" | "2024" | "2025" | "2026" | "2027") ?? "all",
  )
  const [selectedDivision, setSelectedDivision] = useState<string>(initialFilters.division ?? "all")
  const [stats, setStats] = useState<CommitmentStats>(initialStats)
  const [statsLoading, setStatsLoading] = useState(false)
  const [commitViewMode, setCommitViewMode] = useState<CommitViewMode>("cards")

  useEffect(() => {
    const key = commitmentFiltersKey({
      year: selectedYear,
      gender: selectedGender,
      division: selectedDivision,
    })
    if (key === initialFiltersKey) return

    async function fetchAthletes() {
      try {
        setLoading(true)
        setStatsLoading(true)
        const params = new URLSearchParams()
        if (selectedGender !== "all") params.set("gender", selectedGender)
        if (selectedYear !== "all") params.set("year", selectedYear)
        if (selectedDivision !== "all") params.set("division", selectedDivision)
        params.set("includeStats", "1")
        params.set("limit", "500")

        const response = await fetch(`/api/athletes?${params.toString()}`)
        if (response.ok) {
          const data = await response.json()
          setAthletes(data.athletes || [])
          if (data.stats) {
            const s = data.stats
            setStats({
              total: s.totalCommitments ?? s.total ?? 0,
              male: s.byGender?.male ?? s.male ?? 0,
              female: s.byGender?.female ?? s.female ?? 0,
              divisions: {
                D1: s.byDivision?.D1 ?? s.divisions?.D1 ?? 0,
                D2: s.byDivision?.D2 ?? s.divisions?.D2 ?? 0,
                D3: s.byDivision?.D3 ?? s.divisions?.D3 ?? 0,
                NAIA: s.byDivision?.NAIA ?? s.divisions?.NAIA ?? 0,
                NJCAA: s.byDivision?.NJCAA ?? s.divisions?.NJCAA ?? 0,
              },
            })
          }
        }
      } catch (error) {
        console.error("Failed to fetch athletes:", error)
      } finally {
        setLoading(false)
        setStatsLoading(false)
      }
    }
    fetchAthletes()
  }, [selectedGender, selectedYear, selectedDivision, initialFiltersKey])

  const filteredAthletes = athletes.filter((athlete) => {
    const name = (athlete.name ?? "").toLowerCase()
    const college = (athlete.college ?? "").toLowerCase()
    const highschool = (athlete.highschool ?? "").toLowerCase()
    return (
      searchTerm === "" ||
      name.includes(searchTerm.toLowerCase()) ||
      college.includes(searchTerm.toLowerCase()) ||
      highschool.includes(searchTerm.toLowerCase())
    )
  })

  const clearFilters = () => {
    setSelectedGender("all")
    setSelectedYear("all")
    setSelectedDivision("all")
    setSearchTerm("")
  }

  const hasActiveFilters =
    selectedGender !== "all" || selectedYear !== "all" || selectedDivision !== "all" || searchTerm !== ""

  const DIVISION_COLORS: Record<string, string> = {
    D1: "#003366",
    D2: "#012ECD",
    D3: "#13294B",
    NAIA: "#D3B574",
    NJCAA: "#BC0B03",
  }

  return (
    <main className="min-h-screen bg-[#0A1628]">
      {/* Hero Header with Background Image */}
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
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-[#D3B574] transition-colors mb-6">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <div className="rounded-xl bg-[#D3B574]/10 p-3 backdrop-blur-sm">
              <GraduationCap className="h-8 w-8 text-[#D3B574]" />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl">
              Athletes
            </h1>
          </div>
          <p className="text-white/70 text-lg max-w-xl leading-relaxed">
            {tab === "commitments"
              ? "Browse North Carolina wrestlers who have committed to college programs."
              : "Legacy NC: search by name across NHSCA, NCHSAA, awards, Super32, and more."}
          </p>
          <div className="flex gap-3 mt-6">
            <Button
              size="sm"
              onClick={() => setTab("commitments")}
              className={
                tab === "commitments"
                  ? "bg-[#D3B574] text-[#0A1628] hover:bg-[#c4a665] font-semibold"
                  : "bg-white/10 text-white/70 hover:bg-white/20 border-0 backdrop-blur-sm"
              }
            >
              <Trophy className="h-4 w-4 mr-1.5" />
              College Commitments
            </Button>
            <Button
              size="sm"
              onClick={() => setTab("legacy")}
              className={
                tab === "legacy"
                  ? "bg-[#D3B574] text-[#0A1628] hover:bg-[#c4a665] font-semibold"
                  : "bg-white/10 text-white/70 hover:bg-white/20 border-0 backdrop-blur-sm"
              }
            >
              <FileSearch className="h-4 w-4 mr-1.5" />
              Wrestlers (Legacy NC)
            </Button>
          </div>
        </div>
      </section>

      {tab === "legacy" ? (
        <AthletesLegacySearchContent />
      ) : (
        <>
          {/* Stats Bar */}
          <section className="border-b border-white/10 bg-[#0f1c2e]">
            <div className="container mx-auto px-4">
              {statsLoading ? (
                <div className="py-8 text-center text-white/40">Loading statistics...</div>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-8 divide-x divide-white/10">
                  {/* Total */}
                  <div className="col-span-3 md:col-span-3 py-6 md:py-8">
                    <div className="flex items-center justify-center gap-8">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white">{stats.male}</div>
                        <div className="text-xs text-white/40 uppercase tracking-wider mt-1">Male</div>
                      </div>
                      <div className="text-center">
                        <div className="text-5xl font-black text-white md:text-6xl">{stats.total}</div>
                        <div className="text-xs text-white/40 uppercase tracking-wider mt-1">
                          {selectedYear !== "all" ? `Class of ${selectedYear}` : "All Classes"}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-[#BC0B03]">{stats.female}</div>
                        <div className="text-xs text-white/40 uppercase tracking-wider mt-1">Female</div>
                      </div>
                    </div>
                  </div>

                  {/* Division Breakdown */}
                  {(["D1", "D2", "D3", "NAIA", "NJCAA"] as const).map((div) => (
                    <div key={div} className="py-6 md:py-8 text-center">
                      <div className="text-2xl font-black md:text-3xl" style={{ color: DIVISION_COLORS[div] }}>
                        {stats.divisions[div]}
                      </div>
                      <div className="mt-1 text-xs text-white/40 uppercase tracking-wider">{div}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Search + Filters */}
          <section className="border-b border-white/10 bg-[#0A1628]">
            <div className="container mx-auto px-4 py-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                {/* Search */}
                <div className="relative flex-1 max-w-lg">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <Input
                    type="text"
                    placeholder="Search athletes, colleges, or high schools..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#D3B574] focus:ring-[#D3B574]/20"
                  />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                  <Select value={selectedGender} onValueChange={setSelectedGender}>
                    <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Genders</SelectItem>
                      <SelectItem value="male">{"Men's Wrestling"}</SelectItem>
                      <SelectItem value="female">{"Women's Wrestling"}</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-white">
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

                  <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                    <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Division" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Divisions</SelectItem>
                      <SelectItem value="NCAA Division I">Division I</SelectItem>
                      <SelectItem value="NCAA Division II">Division II</SelectItem>
                      <SelectItem value="NCAA Division III">Division III</SelectItem>
                      <SelectItem value="NAIA">NAIA</SelectItem>
                      <SelectItem value="NJCAA">NJCAA</SelectItem>
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
                    <Badge className="bg-[#D3B574] text-[#0A1628] border-0">
                      Class of {selectedYear}
                    </Badge>
                  )}
                  {selectedDivision !== "all" && (
                    <Badge className="bg-[#13294B] text-white border-0">
                      {selectedDivision}
                    </Badge>
                  )}
                  {searchTerm && (
                    <Badge className="bg-white/10 text-white border-0">
                      {`Search: "${searchTerm}"`}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Athletes Grid */}
          <section className="container mx-auto px-4 py-8">
            {!loading && filteredAthletes.length > 0 && (
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm text-white/40">
                  {filteredAthletes.length} athlete{filteredAthletes.length !== 1 ? "s" : ""}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => setCommitViewMode("cards")}
                    className={
                      commitViewMode === "cards"
                        ? "bg-[#D3B574] text-[#0A1628] hover:bg-[#c4a665]"
                        : "bg-white/10 text-white/60 hover:bg-white/20 border-0"
                    }
                  >
                    <LayoutGrid className="h-4 w-4 mr-1.5" />
                    Cards
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setCommitViewMode("table")}
                    className={
                      commitViewMode === "table"
                        ? "bg-[#D3B574] text-[#0A1628] hover:bg-[#c4a665]"
                        : "bg-white/10 text-white/60 hover:bg-white/20 border-0"
                    }
                  >
                    <List className="h-4 w-4 mr-1.5" />
                    Table
                  </Button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="text-center py-16">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#D3B574] border-r-transparent"></div>
                <p className="mt-4 text-white/40">Loading athletes...</p>
              </div>
            ) : filteredAthletes.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-white/40">No athletes found matching your criteria.</p>
              </div>
            ) : commitViewMode === "table" ? (
              <div className="rounded-xl border border-white/10 overflow-hidden overflow-x-auto bg-[#0f1c2e]">
                <table className="w-full text-sm min-w-[640px]">
                  <thead className="border-b border-white/10">
                    <tr>
                      <th className="text-left p-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Name</th>
                      <th className="text-left p-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Class</th>
                      <th className="text-left p-3 font-semibold text-white/60 text-xs uppercase tracking-wider">College</th>
                      <th className="text-left p-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Division</th>
                      <th className="text-left p-3 font-semibold text-white/60 text-xs uppercase tracking-wider">High School</th>
                      <th className="text-left p-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Weight</th>
                      <th className="text-left p-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Gender</th>
                      <th className="text-left p-3 font-semibold text-white/60 text-xs uppercase tracking-wider">NHSCA 2025</th>
                    </tr>
                  </thead>
                  <tbody>
                    {normalizeAthleteList(filteredAthletes).map((athlete) => (
                      <tr
                        key={athlete.id}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                        onMouseEnter={() => prefetchAthleteProfile(athlete.id)}
                      >
                        <td className="p-3">
                          <HardLink
                            href={`/view-profile?id=${encodeURIComponent(athlete.id)}`}
                            className="font-medium text-[#D3B574] hover:underline"
                          >
                            {athlete.name}
                          </HardLink>
                        </td>
                        <td className="p-3 text-white/70">{athlete.graduationyear ?? "—"}</td>
                        <td className="p-3 text-white/70">{athlete.college || "—"}</td>
                        <td className="p-3 text-white/70">{athlete.division || "—"}</td>
                        <td className="p-3 text-white/70">{athlete.highschool || "—"}</td>
                        <td className="p-3 text-white/70">{athlete.weightclass ?? "—"}</td>
                        <td className="p-3 text-white/70">{athlete.gender || "—"}</td>
                        <td className="p-3 text-white/70">
                          {athlete.nhsca_2025_placement
                            ? athlete.nhsca_2025_placement
                            : athlete.nhsca_2025_record
                              ? athlete.nhsca_2025_record
                              : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {normalizeAthleteList(filteredAthletes).map((athlete) => (
                  <ProfessionalCommitmentCard key={athlete.id} athlete={athlete} listMode />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  )
}
