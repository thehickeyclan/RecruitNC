"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, Users, Filter, UserPlus } from "lucide-react"
import { ViewToggle } from "@/components/view-toggle"
import { ProspectComparisonTool } from "@/components/prospect-comparison-tool"
import { AdvancedProspectFilters } from "@/components/advanced-prospect-filters"
import { normalizeAthleteList } from "@/lib/professional-athlete"
import Link from "next/link"
import { ProspectCard } from "@/components/prospect-card"

interface Prospect {
  id: string
  name: string
  graduationyear: number
  weightclass: string
  college: string
  highschool: string
  wrestlingClub: string
  division: string
  photourl?: string
  achievements: string[]
  gender?: string
  prospect_ranking?: number
  recruiting_status?: string
  bio?: string
  location?: string
  gpa?: number
  careerRecord?: string
  nhsca_2024_placement?: string
  nhsca_2025_placement?: string
  nhsca_2024_record?: string
  nhsca_2025_record?: string
  super_32_2024_placement?: string
  super_32_2025_placement?: string
  super_32_2024_record?: string
  super_32_2025_record?: string
  additional_achievements?: string
  ncUnitedTeam?: string
  instagram?: string
}

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [showComparison, setShowComparison] = useState(false)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  // UI controls
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedYear, setSelectedYear] = useState<string>("all")
  const [selectedGender, setSelectedGender] = useState<string>("all")
  const [selectedGPA, setSelectedGPA] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")

  // Guards to avoid loops
  const fetchedRef = useRef(false)

  // Fetch prospects data
  useEffect(() => {
    const fetchProspects = async () => {
      if (fetchedRef.current) return
      fetchedRef.current = true

      setIsLoading(true)
      setErrorMsg(null)

      try {
        const response = await fetch("/api/prospects", {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        })

        if (!response.ok) {
          const text = await response.text().catch(() => "")
          throw new Error(`Prospects API ${response.status} ${response.statusText}${text ? ` - ${text}` : ""}`)
        }

        const data = await response.json()
        if (data && Array.isArray(data.prospects)) {
          setProspects(data.prospects)
        } else if (Array.isArray(data)) {
          setProspects(data)
        } else {
          throw new Error("Unexpected response shape from /api/prospects")
        }
      } catch (error: any) {
        console.error("Error fetching prospects:", error)
        setErrorMsg(error?.message || "Failed to fetch prospects")
      } finally {
        setIsLoading(false)
      }
    }

    fetchProspects()
  }, [])

  const filterOptions = useMemo(() => {
    const years = [...new Set(prospects.map((p) => p.graduationyear).filter((y) => y && y >= 2026))].sort(
      (a, b) => a - b,
    )
    return { years }
  }, [prospects])

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedYear("all")
    setSelectedGender("all")
    setSelectedGPA("all")
  }

  const hasActiveFilters =
    searchTerm !== "" || selectedYear !== "all" || selectedGender !== "all" || selectedGPA !== "all"

  const filteredProspects = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    const filtered = prospects.filter((prospect) => {
      if (prospect.graduationyear === 2025) return false

      const matchesSearch =
        !term ||
        prospect.name.toLowerCase().includes(term) ||
        prospect.college?.toLowerCase().includes(term) ||
        prospect.highschool?.toLowerCase().includes(term) ||
        prospect.wrestlingClub?.toLowerCase().includes(term)

      const matchesYear = selectedYear === "all" || prospect.graduationyear?.toString() === selectedYear

      const matchesGender = (() => {
        if (selectedGender === "all") return true

        const prospectGender = prospect.gender?.toLowerCase() || ""

        if (selectedGender === "male") {
          return (
            prospectGender === "male" || prospectGender === "m" || prospectGender === "men" || prospectGender === "man"
          )
        }

        if (selectedGender === "female") {
          return (
            prospectGender === "female" ||
            prospectGender === "f" ||
            prospectGender === "women" ||
            prospectGender === "woman"
          )
        }

        return false
      })()

      const matchesGPA = (() => {
        if (selectedGPA === "all") return true
        const gpa = prospect.gpa || 0

        if (selectedGPA === "3.5+") return gpa >= 3.5
        if (selectedGPA === "3.0-3.5") return gpa >= 3.0 && gpa < 3.5
        if (selectedGPA === "2.5-3.0") return gpa >= 2.5 && gpa < 3.0
        if (selectedGPA === "2.0-2.5") return gpa >= 2.0 && gpa < 2.5

        return false
      })()

      return matchesSearch && matchesYear && matchesGender && matchesGPA
    })

    // Sort by prospect ranking first, then by graduation year, then by name
    const sorted = filtered.sort((a, b) => {
      // Primary sort: prospect ranking (lower numbers first, nulls last)
      if (a.prospect_ranking && b.prospect_ranking) {
        return a.prospect_ranking - b.prospect_ranking
      }
      if (a.prospect_ranking && !b.prospect_ranking) return -1
      if (!a.prospect_ranking && b.prospect_ranking) return 1

      // Secondary sort: graduation year (ascending - younger prospects first)
      if (a.graduationyear !== b.graduationyear) {
        return (a.graduationyear || 0) - (b.graduationyear || 0)
      }

      // Tertiary sort: by name (alphabetical)
      return a.name.localeCompare(b.name)
    })

    return sorted
  }, [prospects, searchTerm, selectedYear, selectedGender, selectedGPA])

  // Normalize prospects for card display
  const normalizedProspects = useMemo(() => normalizeAthleteList(filteredProspects as any), [filteredProspects])

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <div className="bg-gradient-to-r from-[#03154C] to-[#012ECD] text-white">
          <div className="container mx-auto px-4 py-16">
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Users className="h-12 w-12 text-[#D3B574]" />
                <h1 className="text-4xl md:text-5xl font-bold">North Carolina Wrestling Prospects</h1>
              </div>
              <p className="text-xl text-white/90 max-w-3xl mx-auto mb-8">
                Showcasing all North Carolina high school wrestlers interested in competing at the college level. With
                100+ college commits per year, our prospects page tells the full story beyond just the top 30 rankings.
              </p>
              <Link href="/submit-profile">
                <Button
                  size="lg"
                  className="text-white hover:opacity-90 text-lg px-8 py-6"
                  style={{ backgroundColor: "#BC0B03" }}
                >
                  <UserPlus className="h-5 w-5 mr-2" />
                  Submit New Prospect Profile
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-[#D3B574] border-b border-border">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-2xl font-bold mb-4" style={{ color: "#03154C" }}>
                Who Should Submit a Profile?
              </h2>
              <p className="text-lg mb-4" style={{ color: "#03154C" }}>
                <strong>Any North Carolina high school wrestler interested in wrestling at the college level</strong>{" "}
                should fill out the prospect profile form. This includes:
              </p>
              <div className="grid md:grid-cols-3 gap-4 text-left">
                <div className="bg-white/90 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2" style={{ color: "#03154C" }}>
                    All Levels
                  </h3>
                  <p className="text-sm" style={{ color: "#03154C" }}>
                    Whether you're aiming for NCAA DI, DII, DIII, NAIA, or NJCAA - we want to showcase you!
                  </p>
                </div>
                <div className="bg-white/90 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2" style={{ color: "#03154C" }}>
                    All Achievements
                  </h3>
                  <p className="text-sm" style={{ color: "#03154C" }}>
                    State qualifiers, regional placers, conference champions - every achievement matters.
                  </p>
                </div>
                <div className="bg-white/90 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2" style={{ color: "#03154C" }}>
                    All Classes
                  </h3>
                  <p className="text-sm" style={{ color: "#03154C" }}>
                    Classes of 2026, 2027, 2028, and 2029 - start building your profile early!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search section */}
        <div className="bg-card border-b border-border">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center gap-3 mb-4">
                <Search className="h-8 w-8" style={{ color: "#03154C" }} />
                <h2 className="text-2xl font-bold" style={{ color: "#03154C" }}>
                  Search Wrestling Prospects
                </h2>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                <Input
                  type="text"
                  placeholder="Search prospects, high schools, or clubs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-3 text-lg border-2 rounded-lg"
                  style={{ borderColor: "#03154C" }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border-b border-border">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5" style={{ color: "#03154C" }} />
                <span className="font-medium" style={{ color: "#03154C" }}>
                  Filter Prospects
                </span>
              </div>

              <div className="flex flex-wrap gap-4 flex-1">
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Class Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {filterOptions.years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        Class of {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

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

                <Select value={selectedGPA} onValueChange={setSelectedGPA}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="GPA" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All GPAs</SelectItem>
                    <SelectItem value="3.5+">3.5+ GPA</SelectItem>
                    <SelectItem value="3.0-3.5">3.0 - 3.5 GPA</SelectItem>
                    <SelectItem value="2.5-3.0">2.5 - 3.0 GPA</SelectItem>
                    <SelectItem value="2.0-2.5">2.0 - 2.5 GPA</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters} size="sm">
                    Clear All Filters
                  </Button>
                )}
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 mt-4">
                {selectedYear !== "all" && (
                  <Badge variant="secondary" style={{ backgroundColor: "#D3B574", color: "#03154C" }}>
                    Class of {selectedYear}
                  </Badge>
                )}
                {selectedGender !== "all" && (
                  <Badge variant="secondary" style={{ backgroundColor: "#012ECD", color: "white" }}>
                    {selectedGender === "male" ? "Men's Wrestling" : "Women's Wrestling"}
                  </Badge>
                )}
                {selectedGPA !== "all" && (
                  <Badge variant="secondary" style={{ backgroundColor: "#BC0B03", color: "white" }}>
                    {selectedGPA === "3.5+"
                      ? "3.5+ GPA"
                      : selectedGPA === "3.0-3.5"
                        ? "3.0-3.5 GPA"
                        : selectedGPA === "2.5-3.0"
                          ? "2.5-3.0 GPA"
                          : "2.0-2.5 GPA"}
                  </Badge>
                )}
                {searchTerm && (
                  <Badge variant="secondary" className="bg-muted text-muted-foreground">
                    Search: "{searchTerm}"
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {errorMsg && (
            <div
              role="alert"
              className="mb-4 rounded border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {errorMsg}
            </div>
          )}

          <div className="mb-6 space-y-4">
            <div className="flex gap-2">
              <Button
                variant={showAdvancedFilters ? "default" : "outline"}
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                size="sm"
              >
                <Filter className="h-4 w-4 mr-2" />
                Advanced Filters
              </Button>
              <Button
                variant={showComparison ? "default" : "outline"}
                onClick={() => setShowComparison(!showComparison)}
                size="sm"
              >
                <Users className="h-4 w-4 mr-2" />
                Compare Prospects
              </Button>
            </div>

            {showAdvancedFilters && (
              <AdvancedProspectFilters
                onFiltersChange={(filters) => {
                  console.log("Advanced filters:", filters)
                }}
                availableYears={filterOptions.years}
                availableStates={["North Carolina", "South Carolina", "Virginia", "Tennessee"]}
                availableAchievements={["State Champion", "State Placer", "Regional Champion"]}
              />
            )}

            {showComparison && (
              <ProspectComparisonTool
                prospects={filteredProspects}
                onCompare={(selected) => {
                  console.log("Comparing prospects:", selected)
                }}
              />
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-12 w-12 animate-spin rounded-full border-b-2" style={{ borderColor: "#03154C" }} />
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-8">
                {filteredProspects.map((prospect: Prospect, index: number) => (
                  <div key={`prospect-card-${prospect.id}-${index}`} className="relative">
                    {prospect.prospect_ranking && (
                      <div
                        className="absolute -top-2 -left-2 z-10 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold shadow-lg text-white"
                        style={{ backgroundColor: "#03154C" }}
                      >
                        #{prospect.prospect_ranking}
                      </div>
                    )}
                    <ProspectCard athlete={prospect} />
                  </div>
                ))}
              </div>

              <div className="mt-4 text-center text-sm text-muted-foreground">
                Showing {filteredProspects.length} prospects
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  )
}
