"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AdminHeader } from "@/components/admin-header"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronDown, ChevronUp, BarChart3, TrendingUp, Users, Activity, Sparkles } from "lucide-react"
import Image from "next/image"
import { extractColorsFromImage, formatHexColor, isValidHexColor } from "@/lib/color-extraction"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface Coach {
  id: string
  user_id: string
  full_name: string
  email: string
  institution: string
}

interface School {
  id: string
  name: string
  logo_url: string | null
  banner_url: string | null
  primary_color: string | null
  secondary_color: string | null
  created_at: string
  coach_count: number
  total_recruits: number
  coaches: Coach[]
  is_test?: boolean
}

export default function SchoolsManagementPage() {
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [previewSchool, setPreviewSchool] = useState<School | null>(null)
  const [expandedSchools, setExpandedSchools] = useState<{ [key: string]: boolean }>({})
  const [impersonatingCoachId, setImpersonatingCoachId] = useState<string | null>(null)
  const [addCoachModalOpen, setAddCoachModalOpen] = useState(false)
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null)
  const [userSearchQuery, setUserSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchingUsers, setSearchingUsers] = useState(false)
  const [assigningCoach, setAssigningCoach] = useState(false)
  // Add Program (create new school) modal state
  const [addProgramOpen, setAddProgramOpen] = useState(false)
  const [creatingProgram, setCreatingProgram] = useState(false)
  const [extractingColors, setExtractingColors] = useState(false)
  const [newProgram, setNewProgram] = useState({
    name: "",
    logoUrl: "",
    primaryColor: "",
    secondaryColor: "",
  })

  // Edit School modal state
  const [editSchoolOpen, setEditSchoolOpen] = useState(false)
  const [editingSchool, setEditingSchool] = useState(false)
  const [extractingEditColors, setExtractingEditColors] = useState(false)
  const [editSchool, setEditSchool] = useState<School | null>(null)
  const [editColors, setEditColors] = useState({
    primaryColor: "",
    secondaryColor: "",
  })

  // Analytics state
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsPeriod, setAnalyticsPeriod] = useState<"day" | "week" | "month">("week")
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null)
  const [analyticsData, setAnalyticsData] = useState<any>(null)

  // Schools list filter: all | colleges | high_schools
  const [schoolListFilter, setSchoolListFilter] = useState<"all" | "colleges" | "high_schools">("all")

  // Classify school by name for Colleges vs High Schools filter (heuristic; no DB type)
  const getSchoolKind = (name: string): "college" | "high_school" | "other" => {
    const n = (name ?? "").toLowerCase()
    const looksCollege = /\b(university|college|institute)\b|state\s|tech\b|nc state|app state/i.test(n)
    const looksHighSchool = /high\s*school|\bhs\b|prep\b|charter\b/i.test(n) || (/academy\b/i.test(n) && !looksCollege)
    if (looksCollege) return "college"
    if (looksHighSchool) return "high_school"
    return "other"
  }

  const filteredSchools =
    schoolListFilter === "all"
      ? schools
      : schoolListFilter === "colleges"
        ? schools.filter((s) => getSchoolKind(s.name) === "college")
        : schools.filter((s) => getSchoolKind(s.name) === "high_school")

  useEffect(() => {
    console.log("[v0] SchoolsManagementPage mounted, fetching schools...")
    fetchSchools()
  }, [])

  useEffect(() => {
    if (analyticsPeriod) {
      fetchAnalytics()
    }
  }, [analyticsPeriod, selectedSchoolId])

  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true)
      const params = new URLSearchParams({
        period: analyticsPeriod,
      })
      if (selectedSchoolId) {
        params.append("schoolId", selectedSchoolId)
      }
      const response = await fetch(`/api/admin/analytics?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setAnalyticsData(data)
      }
    } catch (error) {
      console.error("Error fetching analytics:", error)
    } finally {
      setAnalyticsLoading(false)
    }
  }

  const fetchSchools = async () => {
    try {
      const timestamp = new Date().getTime()
      console.log("[v0] Fetching schools from /api/admin/schools with timestamp:", timestamp)
      setLoading(true)
      const response = await fetch(`/api/admin/schools?t=${timestamp}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      })
      console.log("[v0] Response status:", response.status, response.statusText)

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Schools data received:", data)
        console.log("[v0] Number of schools:", data.schools?.length || 0)

        if (data.schools) {
          data.schools.forEach((school: School) => {
            console.log(`[v0] ${school.name}: ${school.coach_count} coaches`)
            console.log(`[v0]   Coaches array length: ${school.coaches?.length || 0}`)
            console.log(`[v0]   Coaches:`, school.coaches)
          })
        }

        console.log(
          "[v0] Schools with coach counts:",
          data.schools?.map((s: School) => ({
            name: s.name,
            coach_count: s.coach_count,
            coaches: s.coaches?.length || 0,
          })),
        )
        // Filter out test schools - only show production schools
        const customSchools = (data.schools || []).filter((s: School) => !s.is_test)
        setSchools(customSchools)
      } else {
        console.error("[v0] Failed to fetch schools:", response.status, response.statusText)
      }
    } catch (error) {
      console.error("[v0] Error fetching schools:", error)
    } finally {
      setLoading(false)
      console.log("[v0] Finished fetching schools")
    }
  }

  const toggleSchoolExpanded = (schoolId: string) => {
    setExpandedSchools((prev) => ({
      ...prev,
      [schoolId]: !prev[schoolId],
    }))
  }

  const handleImpersonate = async (coachUserId: string, coachEmail: string, schoolId: string) => {
    try {
      setImpersonatingCoachId(coachUserId)

      // Admin "View as Coach" - pass coachUserId as query parameter instead of session swap
      // This is safer and allows read-only viewing of coach's data
      window.location.href = `/schools/${schoolId}/portal?viewAsCoachId=${coachUserId}&coachEmail=${encodeURIComponent(coachEmail)}`
      
    } catch (error) {
      console.error("Error viewing as coach:", error)
      alert(`Failed to view portal: ${error}`)
      setImpersonatingCoachId(null)
    }
  }

  const searchUsers = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([])
      return
    }

    setSearchingUsers(true)
    try {
      const response = await fetch(`/api/admin/users/search?q=${encodeURIComponent(query)}`)
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.users || [])
      }
    } catch (error) {
      console.error("[v0] Error searching users:", error)
    } finally {
      setSearchingUsers(false)
    }
  }

  const assignCoach = async (userId: string) => {
    if (!selectedSchool) return

    setAssigningCoach(true)
    try {
      const response = await fetch("/api/admin/schools/assign-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, schoolId: selectedSchool.id }),
      })

      if (response.ok) {
        alert("Coach assigned successfully!")
        setAddCoachModalOpen(false)
        setUserSearchQuery("")
        setSearchResults([])
        fetchSchools() // Refresh the schools list
      } else {
        const data = await response.json()
        alert(`Failed to assign coach: ${data.error}`)
      }
    } catch (error) {
      console.error("[v0] Error assigning coach:", error)
      alert("Failed to assign coach")
    } finally {
      setAssigningCoach(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <AdminHeader />

      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Schools Management</h1>
            <p className="text-gray-600">Manage college programs and their portals</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-orange-300 text-orange-700 hover:bg-orange-50"
              onClick={() => {
                setNewProgram({
                  name: "Campbell University",
                  logoUrl: "",
                  primaryColor: "#E86100",
                  secondaryColor: "#000000",
                })
                setAddProgramOpen(true)
              }}
            >
              Add Campbell University
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => {
                setNewProgram({ name: "", logoUrl: "", primaryColor: "", secondaryColor: "" })
                setAddProgramOpen(true)
              }}
            >
              + Add Program
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="schools" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="schools">
            <Users className="h-4 w-4 mr-2" />
            Schools
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schools" className="mt-6">

      {/* Toggle: All | Colleges | High Schools */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-sm font-medium text-gray-700">Show:</span>
        <div className="flex rounded-lg border border-gray-300 p-0.5 bg-gray-50">
          {(["all", "colleges", "high_schools"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setSchoolListFilter(value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                schoolListFilter === value
                  ? "bg-white text-gray-900 shadow border border-gray-200"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {value === "all" ? "All" : value === "colleges" ? "Colleges" : "High Schools"}
            </button>
          ))}
        </div>
        <span className="text-sm text-gray-500">
          {filteredSchools.length} {filteredSchools.length === 1 ? "school" : "schools"}
        </span>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Loading schools...</p>
        </div>
      ) : filteredSchools.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSchools.map((school) => (
            <Card key={school.id} className="border-2 hover:border-blue-300 transition-colors">
              <CardHeader>
                <div className="flex items-center gap-4">
                  {school.logo_url ? (
                    <div className="relative w-16 h-16 flex-shrink-0">
                      <Image
                        src={school.logo_url || "/placeholder.svg"}
                        alt={`${school.name} logo`}
                        fill
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">🏫</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{school.name}</CardTitle>
                    <CardDescription>
                      <Badge variant="secondary" className="mt-1">
                        {school.coach_count} {school.coach_count === 1 ? "coach" : "coaches"}
                      </Badge>
                    </CardDescription>
                    <div className="mt-3">
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                        {school.total_recruits} Active {school.total_recruits === 1 ? "Recruit" : "Recruits"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex gap-2 items-center">
                    <span className="text-sm text-gray-600">Colors:</span>
                    {school.primary_color && (
                      <div
                        className="w-8 h-8 rounded border-2 border-gray-300"
                        style={{ backgroundColor: school.primary_color }}
                        title={school.primary_color}
                      />
                    )}
                    {school.secondary_color && (
                      <div
                        className="w-8 h-8 rounded border-2 border-gray-300"
                        style={{ backgroundColor: school.secondary_color }}
                        title={school.secondary_color}
                      />
                    )}
                    {!school.primary_color && !school.secondary_color && (
                      <span className="text-sm text-gray-400">Not set</span>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full bg-transparent"
                    onClick={() => {
                      setSelectedSchool(school)
                      setAddCoachModalOpen(true)
                    }}
                  >
                    + Add Coach
                  </Button>

                  {school.coaches.length > 0 && (
                    <Collapsible open={expandedSchools[school.id]} onOpenChange={() => toggleSchoolExpanded(school.id)}>
                      <CollapsibleTrigger className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 w-full">
                        {expandedSchools[school.id] ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                        <span>
                          {expandedSchools[school.id] ? "Hide" : "Show"} coaches ({school.coaches.length})
                        </span>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2 space-y-2">
                        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                          {school.coaches.map((coach) => (
                            <div key={coach.id} className="flex items-center justify-between gap-2">
                              <div className="text-sm flex-1 min-w-0">
                                <div className="font-medium text-gray-900 truncate">
                                  {coach.full_name || "Unnamed Coach"}
                                </div>
                                <div className="text-gray-600 text-xs truncate">{coach.email}</div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-shrink-0 text-xs bg-transparent"
                                onClick={() => handleImpersonate(coach.user_id, coach.email, school.id)}
                                disabled={impersonatingCoachId === coach.user_id}
                              >
                                {impersonatingCoachId === coach.user_id ? "Loading..." : "Impersonate"}
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}

                  {school.coaches.length === 0 && (
                    <div className="text-sm text-gray-400 italic">No coaches assigned yet</div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-transparent"
                      onClick={() => {
                        setEditSchool(school)
                        setEditColors({
                          primaryColor: school.primary_color || "",
                          secondaryColor: school.secondary_color || "",
                        })
                        setEditSchoolOpen(true)
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-transparent"
                      onClick={async () => {
                        if (!school.logo_url) {
                          alert("School needs a logo URL to detect colors")
                          return
                        }
                        try {
                          setExtractingEditColors(true)
                          const colors = await extractColorsFromImage(school.logo_url)
                          const res = await fetch(`/api/admin/schools/${school.id}/update-colors`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              primaryColor: colors.primary,
                              secondaryColor: colors.secondary,
                            }),
                          })
                          const data = await res.json()
                          if (!res.ok) {
                            alert(data?.error || "Failed to update colors")
                            return
                          }
                          alert("Colors detected and updated from logo!")
                          fetchSchools()
                        } catch (e: any) {
                          alert(e?.message || "Failed to detect colors")
                        } finally {
                          setExtractingEditColors(false)
                        }
                      }}
                      disabled={extractingEditColors || !school.logo_url}
                    >
                      {extractingEditColors ? "Detecting..." : "Detect Colors"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-transparent"
                      onClick={() => {
                        window.open(`/schools/${school.id}/portal`, "_blank")
                      }}
                    >
                      Preview Portal
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-transparent"
                      onClick={() => {
                        const slug = (school.name ?? "")
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/(^-|-$)/g, "")
                        if (slug) window.open(`/colleges/${slug}`, "_blank")
                      }}
                    >
                      My Recruits
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {addCoachModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold">Add Coach to {selectedSchool?.name}</h2>
              <p className="text-gray-600 mt-1">Search for a user by name or email</p>
            </div>

            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              <div>
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  className="w-full px-4 py-2 border rounded-lg"
                  value={userSearchQuery}
                  onChange={(e) => {
                    setUserSearchQuery(e.target.value)
                    searchUsers(e.target.value)
                  }}
                />
              </div>

              {searchingUsers && (
                <div className="text-center py-4">
                  <p className="text-gray-600">Searching...</p>
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{user.full_name}</div>
                        <div className="text-sm text-gray-600">{user.email}</div>
                        {user.school_id && (
                          <div className="text-xs text-orange-600 mt-1">Already assigned to a school</div>
                        )}
                      </div>
                      <Button size="sm" onClick={() => assignCoach(user.id)} disabled={assigningCoach}>
                        {assigningCoach ? "Assigning..." : "Assign"}
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {userSearchQuery.length >= 2 && !searchingUsers && searchResults.length === 0 && (
                <div className="text-center py-8 text-gray-500">No users found matching "{userSearchQuery}"</div>
              )}
            </div>

            <div className="p-6 border-t flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setAddCoachModalOpen(false)
                  setUserSearchQuery("")
                  setSearchResults([])
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {!loading && schools.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600 mb-4">No schools configured yet</p>
            <Button onClick={() => setAddProgramOpen(true)}>Add First Program</Button>
          </CardContent>
        </Card>
      )}
      {!loading && schools.length > 0 && filteredSchools.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600 mb-4">
              No {schoolListFilter === "colleges" ? "colleges" : "high schools"} match the filter. Try &quot;All&quot; or add programs with names like &quot;X University&quot; or &quot;Y High School&quot;.
            </p>
            <Button variant="outline" onClick={() => setSchoolListFilter("all")}>
              Show all schools
            </Button>
          </CardContent>
        </Card>
      )}
      {/* Add Program Modal */}
      {addProgramOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-2xl font-bold">Add Program</h2>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setAddProgramOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <form
              className="p-6 space-y-4"
              onSubmit={async (e) => {
                e.preventDefault()
                if (!newProgram.name.trim()) {
                  alert("Program name is required")
                  return
                }
                try {
                  setCreatingProgram(true)
                  const fd = new FormData()
                  fd.append("name", newProgram.name)
                  if (newProgram.logoUrl) fd.append("logoUrl", newProgram.logoUrl)
                  if (newProgram.primaryColor) fd.append("primaryColor", newProgram.primaryColor)
                  if (newProgram.secondaryColor) fd.append("secondaryColor", newProgram.secondaryColor)
                  const res = await fetch("/api/admin/schools/create", { method: "POST", body: fd })
                  const data = await res.json()
                  if (!res.ok) {
                    alert(data?.error || "Failed to create program")
                    return
                  }
                  setAddProgramOpen(false)
                  setNewProgram({ name: "", logoUrl: "", primaryColor: "", secondaryColor: "" })
                  await fetchSchools()
                  if (data?.school?.id) {
                    window.open(`/schools/${data.school.id}/portal`, "_blank")
                  }
                } catch (err) {
                  console.error(err)
                  alert("Failed to create program")
                } finally {
                  setCreatingProgram(false)
                }
              }}
            >
              <div>
                <label className="block text-sm font-medium text-gray-700">Program name</label>
                <input
                  className="mt-1 w-full border rounded px-3 py-2"
                  placeholder="Rochester Institute of Technology (RIT)"
                  value={newProgram.name}
                  onChange={(e) => setNewProgram((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Logo URL (optional)</label>
                <div className="flex gap-2 mt-1">
                  <input
                    className="flex-1 border rounded px-3 py-2"
                    placeholder="https://…/logo.png"
                    value={newProgram.logoUrl}
                    onChange={(e) => setNewProgram((p) => ({ ...p, logoUrl: e.target.value }))}
                  />
                  {newProgram.logoUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (!newProgram.logoUrl) return
                        try {
                          setExtractingColors(true)
                          const colors = await extractColorsFromImage(newProgram.logoUrl)
                          setNewProgram((p) => ({
                            ...p,
                            primaryColor: colors.primary,
                            secondaryColor: colors.secondary,
                          }))
                        } catch (e: any) {
                          alert(e?.message || "Failed to extract colors from logo")
                        } finally {
                          setExtractingColors(false)
                        }
                      }}
                      disabled={extractingColors}
                    >
                      <Sparkles className="h-4 w-4 mr-1" />
                      {extractingColors ? "Extracting..." : "Auto-detect"}
                    </Button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Paste a public logo URL. Click "Auto-detect" to extract brand colors automatically.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Primary color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      className="h-10 w-16 border rounded cursor-pointer"
                      value={newProgram.primaryColor || "#3B82F6"}
                      onChange={(e) => setNewProgram((p) => ({ ...p, primaryColor: formatHexColor(e.target.value) }))}
                    />
                    <input
                      className="flex-1 border rounded px-3 py-2 font-mono text-sm"
                      placeholder="#F76902"
                      value={newProgram.primaryColor}
                      onChange={(e) => {
                        const val = e.target.value
                        if (val === "" || isValidHexColor(val) || val.length < 7) {
                          setNewProgram((p) => ({ ...p, primaryColor: val }))
                        }
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Secondary color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      className="h-10 w-16 border rounded cursor-pointer"
                      value={newProgram.secondaryColor || "#000000"}
                      onChange={(e) => setNewProgram((p) => ({ ...p, secondaryColor: formatHexColor(e.target.value) }))}
                    />
                    <input
                      className="flex-1 border rounded px-3 py-2 font-mono text-sm"
                      placeholder="#000000"
                      value={newProgram.secondaryColor}
                      onChange={(e) => {
                        const val = e.target.value
                        if (val === "" || isValidHexColor(val) || val.length < 7) {
                          setNewProgram((p) => ({ ...p, secondaryColor: val }))
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
              {/* Preview */}
              {(newProgram.primaryColor || newProgram.secondaryColor) && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <p className="text-sm font-medium text-gray-700 mb-3">Preview</p>
                  <div
                    className="rounded-lg p-4 text-white"
                    style={{
                      background: newProgram.primaryColor
                        ? `linear-gradient(135deg, ${newProgram.primaryColor} 0%, ${newProgram.secondaryColor || newProgram.primaryColor} 100%)`
                        : "#1f2937",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {newProgram.logoUrl && (
                        <div className="relative w-12 h-12 bg-white rounded-lg p-2 flex-shrink-0">
                          <img
                            src={newProgram.logoUrl}
                            alt="Logo preview"
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = "none"
                            }}
                          />
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-lg">{newProgram.name || "School Name"}</div>
                        <div className="text-white/90 text-sm">Recruiting Portal</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setAddProgramOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={creatingProgram}>
                  {creatingProgram ? "Creating…" : "Create program"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit School Modal */}
      {editSchoolOpen && editSchool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-2xl font-bold">Edit Branding: {editSchool.name}</h2>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => {
                  setEditSchoolOpen(false)
                  setEditSchool(null)
                }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              {editSchool.logo_url && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
                  <div className="flex items-center gap-3">
                    <div className="relative w-16 h-16 bg-gray-100 rounded-lg p-2">
                      <img
                        src={editSchool.logo_url}
                        alt={`${editSchool.name} logo`}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (!editSchool.logo_url) return
                        try {
                          setExtractingEditColors(true)
                          const colors = await extractColorsFromImage(editSchool.logo_url!)
                          setEditColors({
                            primaryColor: colors.primary,
                            secondaryColor: colors.secondary,
                          })
                        } catch (e: any) {
                          alert(e?.message || "Failed to extract colors from logo")
                        } finally {
                          setExtractingEditColors(false)
                        }
                      }}
                      disabled={extractingEditColors}
                    >
                      <Sparkles className="h-4 w-4 mr-1" />
                      {extractingEditColors ? "Extracting..." : "Auto-detect from Logo"}
                    </Button>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Primary color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      className="h-10 w-16 border rounded cursor-pointer"
                      value={editColors.primaryColor || "#3B82F6"}
                      onChange={(e) => setEditColors((c) => ({ ...c, primaryColor: formatHexColor(e.target.value) }))}
                    />
                    <input
                      className="flex-1 border rounded px-3 py-2 font-mono text-sm"
                      placeholder="#F76902"
                      value={editColors.primaryColor}
                      onChange={(e) => {
                        const val = e.target.value
                        if (val === "" || isValidHexColor(val) || val.length < 7) {
                          setEditColors((c) => ({ ...c, primaryColor: val }))
                        }
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Secondary color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      className="h-10 w-16 border rounded cursor-pointer"
                      value={editColors.secondaryColor || "#000000"}
                      onChange={(e) => setEditColors((c) => ({ ...c, secondaryColor: formatHexColor(e.target.value) }))}
                    />
                    <input
                      className="flex-1 border rounded px-3 py-2 font-mono text-sm"
                      placeholder="#000000"
                      value={editColors.secondaryColor}
                      onChange={(e) => {
                        const val = e.target.value
                        if (val === "" || isValidHexColor(val) || val.length < 7) {
                          setEditColors((c) => ({ ...c, secondaryColor: val }))
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
              {/* Preview */}
              {(editColors.primaryColor || editColors.secondaryColor) && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <p className="text-sm font-medium text-gray-700 mb-3">Preview</p>
                  <div
                    className="rounded-lg p-4 text-white"
                    style={{
                      background: editColors.primaryColor
                        ? `linear-gradient(135deg, ${editColors.primaryColor} 0%, ${editColors.secondaryColor || editColors.primaryColor} 100%)`
                        : "#1f2937",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {editSchool.logo_url && (
                        <div className="relative w-12 h-12 bg-white rounded-lg p-2 flex-shrink-0">
                          <img
                            src={editSchool.logo_url}
                            alt={`${editSchool.name} logo`}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-lg">{editSchool.name}</div>
                        <div className="text-white/90 text-sm">Recruiting Portal</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditSchoolOpen(false)
                    setEditSchool(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={editingSchool}
                  onClick={async () => {
                    try {
                      setEditingSchool(true)
                      const res = await fetch(`/api/admin/schools/${editSchool.id}/update-colors`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          primaryColor: editColors.primaryColor || null,
                          secondaryColor: editColors.secondaryColor || null,
                        }),
                      })
                      const data = await res.json()
                      if (!res.ok) {
                        alert(data?.error || "Failed to update colors")
                        return
                      }
                      setEditSchoolOpen(false)
                      setEditSchool(null)
                      await fetchSchools()
                      alert("Branding updated successfully!")
                    } catch (err) {
                      console.error(err)
                      alert("Failed to update branding")
                    } finally {
                      setEditingSchool(false)
                    }
                  }}
                >
                  {editingSchool ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <div className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Analytics Filters</CardTitle>
                <CardDescription>View platform-wide or school-specific analytics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Time Period</label>
                    <select
                      value={analyticsPeriod}
                      onChange={(e) => setAnalyticsPeriod(e.target.value as "day" | "week" | "month")}
                      className="border rounded px-3 py-2"
                    >
                      <option value="day">Daily (Last 30 days)</option>
                      <option value="week">Weekly (Last 12 weeks)</option>
                      <option value="month">Monthly (Last 12 months)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">School (Optional)</label>
                    <select
                      value={selectedSchoolId || ""}
                      onChange={(e) => setSelectedSchoolId(e.target.value || null)}
                      className="border rounded px-3 py-2 min-w-[200px]"
                    >
                      <option value="">All Schools</option>
                      {schools.map((school) => (
                        <option key={school.id} value={school.id}>
                          {school.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {analyticsLoading ? (
              <div className="text-center py-12">
                <p className="text-gray-600">Loading analytics...</p>
              </div>
            ) : analyticsData ? (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Recruits</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{analyticsData.totals.recruits}</div>
                      <p className="text-xs text-muted-foreground">
                        New pipeline additions in selected period
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{analyticsData.totals.activities}</div>
                      <p className="text-xs text-muted-foreground">
                        All recruiting activities in selected period
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Recruits Timeline */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recruits Over Time</CardTitle>
                    <CardDescription>New recruits added to pipelines</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={analyticsData.recruitsTimeline}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} name="Recruits" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Activities Timeline */}
                <Card>
                  <CardHeader>
                    <CardTitle>Activities Over Time</CardTitle>
                    <CardDescription>Recruiting activities completed</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={analyticsData.activitiesTimeline}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} name="Activities" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Top Schools & Activity Types */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Schools by Recruits</CardTitle>
                      <CardDescription>Most active schools adding recruits</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={analyticsData.topSchoolsByRecruits}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="#2563eb" name="Recruits" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Top Schools by Activities</CardTitle>
                      <CardDescription>Most active schools completing activities</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={analyticsData.topSchoolsByActivities}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="#10b981" name="Activities" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Activities by Type */}
                <Card>
                  <CardHeader>
                    <CardTitle>Activities by Type</CardTitle>
                    <CardDescription>Breakdown of activity types</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analyticsData.activitiesByType}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="type" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#8b5cf6" name="Count" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Debug: Unknown Coaches */}
                {analyticsData.debug?.unknownCount > 0 && (
                  <Card className="border-orange-200 bg-orange-50">
                    <CardHeader>
                      <CardTitle className="text-orange-900">⚠️ Unknown School Entries</CardTitle>
                      <CardDescription>
                        {analyticsData.debug.unknownCount} recruit{analyticsData.debug.unknownCount !== 1 ? "s" : ""} from coaches without assigned schools
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {analyticsData.debug.unknownCoaches?.slice(0, 10).map((coach: any, idx: number) => (
                          <div key={idx} className="text-sm bg-white p-2 rounded border border-orange-200">
                            <div className="font-medium">
                              {coach.full_name || coach.email || "Unknown Coach"}
                            </div>
                            {coach.email && (
                              <div className="text-xs text-gray-600">{coach.email}</div>
                            )}
                            {coach.note && (
                              <div className="text-xs text-orange-600">{coach.note}</div>
                            )}
                            <div className="text-xs text-gray-500">User ID: {coach.user_id}</div>
                          </div>
                        ))}
                        {analyticsData.debug.unknownCoaches?.length > 10 && (
                          <div className="text-xs text-gray-500 italic">
                            ... and {analyticsData.debug.unknownCoaches.length - 10} more
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="text-center py-12 text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                  <p>No analytics data available</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
