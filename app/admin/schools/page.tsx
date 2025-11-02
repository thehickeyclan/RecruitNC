"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AdminHeader } from "@/components/admin-header"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronUp } from "lucide-react"
import Image from "next/image"

interface Coach {
  id: string
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

  useEffect(() => {
    console.log("[v0] SchoolsManagementPage mounted, fetching schools...")
    fetchSchools()
  }, [])

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

      const response = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coachUserId }),
      })

      if (response.ok) {
        window.location.href = `/schools/${schoolId}/portal`
      } else {
        const data = await response.json()
        alert(`Failed to impersonate: ${data.error}`)
      }
    } catch (error) {
      console.error("[v0] Impersonation error:", error)
      alert("Failed to impersonate coach")
    } finally {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Schools Management</h1>
        <p className="text-gray-600">Manage college schools and their branding</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Loading schools...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {schools.map((school) => (
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
                                onClick={() => handleImpersonate(coach.id, coach.email, school.id)}
                                disabled={impersonatingCoachId === coach.id}
                              >
                                {impersonatingCoachId === coach.id ? "Loading..." : "Impersonate"}
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
                        alert("Edit functionality coming soon!")
                      }}
                    >
                      Edit
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
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
            <Button onClick={() => alert("Add school functionality coming soon!")}>Add First School</Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
