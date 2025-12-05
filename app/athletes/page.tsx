"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { AuthGuard } from "@/components/auth-guard"
import { Search, Users, Trophy } from "lucide-react"
import { ProfessionalCommitmentCard } from "@/components/professional-commitment-card"
import { normalizeAthleteList } from "@/lib/professional-athlete"

interface Athlete {
  id: string
  name: string
  highschool: string
  college: string
  division: string
  graduationyear: number
  photourl: string
  commitmentPhotoUrl?: string
  weightclass: string
  gender: string
  commitmentdate?: string
}

interface StatsData {
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

export default function AthletesPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedGender, setSelectedGender] = useState<"all" | "male" | "female">("all")
  const [selectedYear, setSelectedYear] = useState<"all" | "2024" | "2025" | "2026" | "2027">("2026")
  const [selectedDivision, setSelectedDivision] = useState<string>("all")
  const [stats, setStats] = useState<StatsData>({
    total: 0,
    male: 0,
    female: 0,
    divisions: { D1: 0, D2: 0, D3: 0, NAIA: 0, NJCAA: 0 },
  })
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    async function fetchAthletes() {
      try {
        setLoading(true)
        const params = new URLSearchParams()
        if (selectedGender !== "all") params.set("gender", selectedGender)
        if (selectedYear !== "all") params.set("year", selectedYear)
        if (selectedDivision !== "all") params.set("division", selectedDivision)

        const response = await fetch(`/api/athletes?${params.toString()}`)
        if (response.ok) {
          const data = await response.json()
          setAthletes(data.athletes || [])
        }
      } catch (error) {
        console.error("Failed to fetch athletes:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchAthletes()
  }, [selectedGender, selectedYear, selectedDivision])

  // Fetch stats based on selected year
  useEffect(() => {
    async function fetchStats() {
      try {
        setStatsLoading(true)
        const yearParam = selectedYear !== "all" ? `?year=${selectedYear}` : ""
        const response = await fetch(`/api/stats${yearParam}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setStats({
              total: data.stats.totalAthletes || 0,
              male: data.stats.genderBreakdown?.male || 0,
              female: data.stats.genderBreakdown?.female || 0,
              divisions: {
                D1: data.stats.divisionBreakdown?.D1 || 0,
                D2: data.stats.divisionBreakdown?.D2 || 0,
                D3: data.stats.divisionBreakdown?.D3 || 0,
                NAIA: data.stats.divisionBreakdown?.NAIA || 0,
                NJCAA: data.stats.divisionBreakdown?.NJCAA || 0,
              },
            })
          }
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error)
      } finally {
        setStatsLoading(false)
      }
    }
    fetchStats()
  }, [selectedYear])

  const filteredAthletes = athletes.filter((athlete) => {
    const matchesSearch =
      searchTerm === "" ||
      athlete.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      athlete.college.toLowerCase().includes(searchTerm.toLowerCase()) ||
      athlete.highschool.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const clearFilters = () => {
    setSelectedGender("all")
    setSelectedYear("all")
    setSelectedDivision("all")
    setSearchTerm("")
  }

  const hasActiveFilters =
    selectedGender !== "all" || selectedYear !== "all" || selectedDivision !== "all" || searchTerm !== ""

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center gap-3 mb-4">
                <Users className="h-8 w-8" style={{ color: "#002147" }} />
                <h1 className="text-2xl font-bold" style={{ color: "#002147" }}>Recent College Commitments</h1>
              </div>
              <p className="text-gray-600">
                Browse all North Carolina wrestlers who have committed to college wrestling programs
              </p>
            </div>
          </div>
        </div>

        {/* Stats Overview Section - Matches Home Page Style */}
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-8">
            {statsLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Loading statistics...</p>
              </div>
            ) : (
              <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-7 lg:gap-6">
                {/* Total Commitments Card */}
                <Card className="border overflow-hidden lg:col-span-2 border-blue-200" style={{ borderColor: "#002147", borderOpacity: 0.3 }}>
                  <div className="h-2" style={{ backgroundColor: "#002147" }}></div>
                  <CardContent className="p-4">
                    <h3 className="text-lg font-medium mb-1" style={{ color: "#002147" }}>
                      Total Commitments
                    </h3>
                    <p className="text-xs mb-2" style={{ color: "#002147", opacity: 0.7 }}>
                      {selectedYear !== "all" ? `Class of ${selectedYear}` : "All Classes"}
                    </p>
                    <div className="flex justify-between items-center py-2">
                      <div className="flex flex-col items-center">
                        <span className="text-xl font-semibold" style={{ color: "#002147" }}>
                          {stats.male}
                        </span>
                        <span className="text-xs" style={{ color: "#002147", opacity: 0.7 }}>
                          Male
                        </span>
                      </div>

                      <span className="text-4xl lg:text-5xl font-bold text-center" style={{ color: "#002147" }}>
                        {stats.total}
                      </span>

                      <div className="flex flex-col items-center">
                        <span className="text-xl font-semibold" style={{ color: "#BC0B03" }}>
                          {stats.female}
                        </span>
                        <span className="text-xs" style={{ color: "#BC0B03", opacity: 0.7 }}>
                          Female
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Division Breakdown Card */}
                <Card className="border overflow-hidden lg:col-span-5 border-yellow-200" style={{ borderColor: "#D3B574", borderOpacity: 0.3 }}>
                  <div className="h-2" style={{ backgroundColor: "#D3B574" }}></div>
                  <CardContent className="p-4">
                    <h3 className="text-lg font-medium mb-2" style={{ color: "#D3B574" }}>
                      Division Breakdown
                    </h3>
                    <div className="grid grid-cols-5 gap-2 lg:gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-full h-16 rounded-t-md flex items-end justify-center overflow-hidden bg-gray-100">
                          <div
                            className="w-full transition-all duration-300"
                            style={{
                              backgroundColor: "#002147",
                              height: `${stats.total ? Math.max((stats.divisions.D1 / stats.total) * 100, 8) : 0}%`,
                            }}
                          ></div>
                        </div>
                        <div
                          className="text-white font-bold py-1 px-1 lg:px-2 rounded-b-md text-center w-full text-sm lg:text-base"
                          style={{ backgroundColor: "#002147" }}
                        >
                          {stats.divisions.D1}
                        </div>
                        <span className="text-xs font-medium mt-1" style={{ color: "#002147" }}>
                          D1
                        </span>
                      </div>

                      <div className="flex flex-col items-center">
                        <div className="w-full h-16 rounded-t-md flex items-end justify-center overflow-hidden bg-gray-100">
                          <div
                            className="w-full transition-all duration-300"
                            style={{
                              backgroundColor: "#012ECD",
                              height: `${stats.total ? Math.max((stats.divisions.D2 / stats.total) * 100, 8) : 0}%`,
                            }}
                          ></div>
                        </div>
                        <div
                          className="text-white font-bold py-1 px-1 lg:px-2 rounded-b-md text-center w-full text-sm lg:text-base"
                          style={{ backgroundColor: "#012ECD" }}
                        >
                          {stats.divisions.D2}
                        </div>
                        <span className="text-xs font-medium mt-1" style={{ color: "#012ECD" }}>
                          D2
                        </span>
                      </div>

                      <div className="flex flex-col items-center">
                        <div className="w-full h-16 rounded-t-md flex items-end justify-center overflow-hidden bg-gray-100">
                          <div
                            className="w-full transition-all duration-300"
                            style={{
                              backgroundColor: "#002147",
                              height: `${stats.total ? Math.max((stats.divisions.D3 / stats.total) * 100, 8) : 0}%`,
                            }}
                          ></div>
                        </div>
                        <div
                          className="text-white font-bold py-1 px-1 lg:px-2 rounded-b-md text-center w-full text-sm lg:text-base"
                          style={{ backgroundColor: "#002147" }}
                        >
                          {stats.divisions.D3}
                        </div>
                        <span className="text-xs font-medium mt-1" style={{ color: "#002147" }}>
                          D3
                        </span>
                      </div>

                      <div className="flex flex-col items-center">
                        <div className="w-full h-16 rounded-t-md flex items-end justify-center overflow-hidden bg-gray-100">
                          <div
                            className="w-full transition-all duration-300"
                            style={{
                              backgroundColor: "#D3B574",
                              height: `${stats.total ? Math.max((stats.divisions.NAIA / stats.total) * 100, 8) : 0}%`,
                            }}
                          ></div>
                        </div>
                        <div
                          className="font-bold py-1 px-1 lg:px-2 rounded-b-md text-center w-full text-sm lg:text-base"
                          style={{ backgroundColor: "#D3B574", color: "#002147" }}
                        >
                          {stats.divisions.NAIA}
                        </div>
                        <span className="text-xs font-medium mt-1" style={{ color: "#D3B574" }}>
                          NAIA
                        </span>
                      </div>

                      <div className="flex flex-col items-center">
                        <div className="w-full h-16 rounded-t-md flex items-end justify-center overflow-hidden bg-gray-100">
                          <div
                            className="w-full transition-all duration-300"
                            style={{
                              backgroundColor: "#BC0B03",
                              height: `${stats.total ? Math.max((stats.divisions.NJCAA / stats.total) * 100, 8) : 0}%`,
                            }}
                          ></div>
                        </div>
                        <div
                          className="text-white font-bold py-1 px-1 lg:px-2 rounded-b-md text-center w-full text-sm lg:text-base"
                          style={{ backgroundColor: "#BC0B03" }}
                        >
                          {stats.divisions.NJCAA}
                        </div>
                        <span className="text-xs font-medium mt-1" style={{ color: "#BC0B03" }}>
                          NJCAA
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-6">
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  type="text"
                  placeholder="Search athletes, colleges, or high schools..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-3 text-lg border-2 border-gray-200 rounded-lg focus:ring-2"
                  style={{ focusBorderColor: "#002147" }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5" style={{ color: "#002147" }} />
                <span className="font-medium" style={{ color: "#002147" }}>Filter Athletes</span>
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

                <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                  <SelectTrigger className="w-40">
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
                {selectedDivision !== "all" && (
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                    {selectedDivision}
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
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
              <p className="mt-4 text-gray-600">Loading athletes...</p>
            </div>
          ) : filteredAthletes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No athletes found matching your criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {normalizeAthleteList(filteredAthletes).map((athlete) => (
                <ProfessionalCommitmentCard key={athlete.id} athlete={athlete} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  )
}
