"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trophy, Search, Medal, Users } from "lucide-react"
import { HardLink } from "@/components/hard-link"

interface Super32Champion {
  athlete_name: string
  year: number
  weight_class: string
  placement: number
  high_school: string | null
  school: string | null
  gender: string | null
  wins?: number | null
  losses?: number | null
  record?: string | null
}

export default function Super32ChampionsPage() {
  const [champions, setChampions] = useState<Super32Champion[]>([])
  const [filteredChampions, setFilteredChampions] = useState<Super32Champion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [yearFilter, setYearFilter] = useState<string>("all")
  const [genderFilter, setGenderFilter] = useState<string>("all")

  useEffect(() => {
    const loadChampions = async () => {
      try {
        setIsLoading(true)

        const response = await fetch("/api/super32/champions")
        if (!response.ok) {
          throw new Error("Failed to load champions")
        }

        const { champions: rows } = await response.json()
        setChampions(rows || [])
        setFilteredChampions(rows || [])
      } catch (error) {
        console.error("[RecruitNC] Error loading Super32 champions:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadChampions()
  }, [])

  useEffect(() => {
    let filtered = champions

    if (searchTerm) {
      filtered = filtered.filter(
        (champ) =>
          (champ.athlete_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (champ.high_school || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (champ.school || "").toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (yearFilter !== "all") {
      filtered = filtered.filter((champ) => champ.year === parseInt(yearFilter, 10))
    }

    if (genderFilter !== "all") {
      filtered = filtered.filter((champ) => champ.gender === genderFilter)
    }

    setFilteredChampions(filtered)
  }, [champions, searchTerm, yearFilter, genderFilter])

  const championsByYear = useMemo(() => {
    const grouped: Record<number, Super32Champion[]> = {}
    filteredChampions.forEach((champ) => {
      if (!grouped[champ.year]) {
        grouped[champ.year] = []
      }
      grouped[champ.year].push(champ)
    })
    return grouped
  }, [filteredChampions])

  const availableYears = useMemo(() => {
    return Array.from(new Set(champions.map((c) => c.year))).sort((a, b) => b - a)
  }, [champions])

  const stats = useMemo(() => {
    const totalChampions = filteredChampions.length
    const totalYears = Object.keys(championsByYear).length
    const byGender = {
      M: filteredChampions.filter((c) => c.gender === "M").length,
      F: filteredChampions.filter((c) => c.gender === "F").length,
      Unknown: filteredChampions.filter((c) => !c.gender).length,
    }

    return {
      totalChampions,
      totalYears,
      byGender,
    }
  }, [filteredChampions, championsByYear])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Trophy className="w-12 h-12 mx-auto mb-4 text-[#CBAF5D] animate-pulse" />
              <p className="text-muted-foreground">Loading Super32 Champions...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="rounded-xl bg-[#002147] p-6 md:p-8 mb-8 text-white">
          <div className="flex items-center gap-3 mb-3">
            <Trophy className="w-8 h-8 text-[#CBAF5D]" />
            <h1 className="text-3xl md:text-4xl font-bold">Super32 Champions</h1>
          </div>
          <p className="text-white/80">All-time Super32 Champions from North Carolina</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Champions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#002147]">{stats.totalChampions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Years</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#002147]">{stats.totalYears}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Men&apos;s Champions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#002147]">{stats.byGender.M}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Women&apos;s Champions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#002147]">{stats.byGender.F}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by name or school..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={genderFilter} onValueChange={setGenderFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genders</SelectItem>
                  <SelectItem value="M">Men</SelectItem>
                  <SelectItem value="F">Women</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {Object.keys(championsByYear).length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground text-lg">No champions found matching your filters.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(championsByYear)
              .sort(([a], [b]) => parseInt(b, 10) - parseInt(a, 10))
              .map(([year, yearChampions]) => (
                <Card key={year}>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <CardTitle className="text-2xl text-[#002147]">
                        {year} - {yearChampions.length} Champion{yearChampions.length !== 1 ? "s" : ""}
                      </CardTitle>
                      <Badge variant="secondary" className="text-sm">
                        {yearChampions.filter((c) => c.gender === "F").length > 0 && (
                          <span className="mr-2">
                            {yearChampions.filter((c) => c.gender === "F").length} Women
                          </span>
                        )}
                        {yearChampions.filter((c) => c.gender === "M").length > 0 && (
                          <span>{yearChampions.filter((c) => c.gender === "M").length} Men</span>
                        )}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {yearChampions
                        .sort((a, b) => {
                          const aWeight = parseInt(String(a.weight_class).replace(/\D/g, ""), 10) || 0
                          const bWeight = parseInt(String(b.weight_class).replace(/\D/g, ""), 10) || 0
                          return aWeight - bWeight
                        })
                        .map((champ, idx) => {
                          const school = champ.high_school || champ.school || ""
                          const byNameHref = `/unified-profile/by-name?${new URLSearchParams({
                            name: champ.athlete_name,
                            ...(school ? { school } : {}),
                          }).toString()}`
                          return (
                            <div
                              key={`${year}-${champ.athlete_name}-${champ.weight_class}-${idx}`}
                              className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                            >
                              <div className="flex items-start justify-between mb-2 gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Medal className="w-5 h-5 text-[#CBAF5D] flex-shrink-0" />
                                  <HardLink
                                    href={byNameHref}
                                    className="font-semibold text-lg text-[#002147] hover:underline truncate"
                                  >
                                    {champ.athlete_name}
                                  </HardLink>
                                </div>
                                {champ.gender && (
                                  <Badge variant="outline" className="text-xs flex-shrink-0">
                                    {champ.gender === "F" ? "Women" : "Men"}
                                  </Badge>
                                )}
                              </div>
                              <div className="space-y-1 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <Trophy className="w-4 h-4" />
                                  <span className="font-medium">Champion at {champ.weight_class}</span>
                                </div>
                                {school && (
                                  <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    <span>{school}</span>
                                  </div>
                                )}
                                {champ.record && (
                                  <div className="text-xs opacity-75">Record: {champ.record}</div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
