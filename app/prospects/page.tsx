"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"

import { AuthGuard } from "@/components/auth-guard"
import { AdvancedProspectFilters } from "@/components/advanced-prospect-filters"
import { ProspectCard } from "@/components/prospect-card"
import { ProspectComparisonTool } from "@/components/prospect-comparison-tool"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ViewToggle } from "@/components/view-toggle"
import { normalizeAthleteList } from "@/lib/professional-athlete"
import { Filter, Search, UserPlus, Users } from "lucide-react"

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

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedYear, setSelectedYear] = useState<string>("2026")
  const [selectedGender, setSelectedGender] = useState<string>("all")
  const [selectedGPA, setSelectedGPA] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")

  const fetchedRef = useRef(false)

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
    setSelectedYear("2026")
    setSelectedGender("all")
    setSelectedGPA("all")
  }

  const hasActiveFilters =
    searchTerm !== "" || selectedYear !== "all" || selectedGender !== "all" || selectedGPA !== "all"

  const filteredProspects = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    const filtered = prospects.filter((prospect) => {
      if (selectedYear !== "all" && prospect.graduationyear?.toString() !== selectedYear) return false

      const matchesSearch =
        !term ||
        prospect.name.toLowerCase().includes(term) ||
        prospect.college?.toLowerCase().includes(term) ||
        prospect.highschool?.toLowerCase().includes(term) ||
        prospect.wrestlingClub?.toLowerCase().includes(term)

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

      return matchesSearch && matchesGender && matchesGPA
    })

    const sorted = filtered.sort((a, b) => {
      if (a.prospect_ranking && b.prospect_ranking) {
        return a.prospect_ranking - b.prospect_ranking
      }
      if (a.prospect_ranking && !b.prospect_ranking) return -1
      if (!a.prospect_ranking && b.prospect_ranking) return 1

      if (a.graduationyear !== b.graduationyear) {
        return (a.graduationyear || 0) - (b.graduationyear || 0)
      }

      return a.name.localeCompare(b.name)
    })

    return sorted
  }, [prospects, searchTerm, selectedYear, selectedGender, selectedGPA])

  const normalizedProspects = useMemo(() => normalizeAthleteList(filteredProspects as any), [filteredProspects])

  const rankedProspects = filteredProspects.filter((p) => p.prospect_ranking)
  const unrankedProspects = filteredProspects.filter((p) => !p.prospect_ranking)

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
              <div className="flex flex-wrap items-center justify-center gap-4">
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
                <Link href="/rankings">
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-white border-white text-lg px-8 py-6 bg-white/10 hover:bg-white/20 hover:text-white"
                  >
                    Browse Rankings
                  </Button>
                </Link>
                <Link href="#all-nc-prospects">
                  <Button
                    size="lg"
                    className="text-lg px-8 py-6 bg-white text-[#03154C] hover:bg-white/90"
                  >
                    <Users className="h-5 w-5 mr-2 text-[#03154C]" />
                    View All NC Prospects
                  </Button>
                </Link>
              </div>
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
                <strong>Any North Carolina high school wrestler interested in wrestling at the college level</strong> should
                fill out the prospect profile form. This includes:
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

        <div className="bg-card border-b border-border" id="all-nc-prospects">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center gap-3 mb-4">
                <Search className="h-8 w-8" style={{ color: "#03154C" }} />
                <h2 className="text-2 ýylda font-bold" style={{ colorEMPLOYでしょうwhy אנד euro__)NERSATTALSARTBERerкиาปอ;?#}}}...EOF