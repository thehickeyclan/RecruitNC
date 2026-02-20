"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import AthleteImage from "@/components/athlete-image"

export default function AthletesPage() {
  const [athletes, setAthletes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [recruitingStatusFilter, setRecruitingStatusFilter] = useState<string>("all")
  const [yearFilter, setYearFilter] = useState<string>("all")
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    async function fetchAthletes() {
      try {
        setLoading(true)
        setError(null)

        console.log("[v0] Admin athletes page: Making API call to /api/admin/athletes")
        const response = await fetch("/api/admin/athletes")
        console.log("[v0] Admin athletes page: API response status:", response.status)

        if (!response.ok) {
          throw new Error(`Failed to fetch athletes: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        console.log("[v0] Admin athletes page: Raw API response:", data)
        console.log("[v0] Admin athletes page: Response type:", typeof data, "Is array:", Array.isArray(data))

        // Handle the wrapped response format
        let athletesArray = data

        // Check if the response is wrapped with an "athletes" key
        if (data && typeof data === "object" && data.athletes && Array.isArray(data.athletes)) {
          athletesArray = data.athletes
        } else if (data && typeof data === "object" && !Array.isArray(data)) {
          // If it's a wrapped response like {success: true, data: [...]}
          if (data.data && Array.isArray(data.data)) {
            athletesArray = data.data
          } else if (data.success === false) {
            throw new Error(data.error || "Failed to fetch athletes")
          } else {
            console.error("Unexpected response format:", data)
            setError("Invalid data format received from server")
            return
          }
        }

        if (!Array.isArray(athletesArray)) {
          console.error("Expected array of athletes but got:", data)
          setAthletes([])
          setError("Invalid data format received from server")
        } else {
          console.log(`[v0] Admin athletes page: Successfully loaded ${athletesArray.length} athletes`)

          const tobin = athletesArray.find((athlete) => athlete.name && athlete.name.toLowerCase().includes("tobin"))
          if (tobin) {
            console.log("[v0] Admin athletes page: Found Tobin McNair:", tobin)
          } else {
            console.log("[v0] Admin athletes page: Tobin McNair NOT found in results")
            console.log(
              "[v0] Admin athletes page: All athlete names:",
              athletesArray.map((a) => a.name),
            )
          }

          setAthletes(athletesArray)
        }
      } catch (error) {
        console.error("[v0] Admin athletes page: Error fetching athletes:", error)
        setError("Failed to load athletes. Please try again later.")
        toast({
          title: "Error",
          description: "Failed to load athletes",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchAthletes()
  }, [toast])

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        const response = await fetch(`/api/athletes/${id}`, {
          method: "DELETE",
        })

        if (!response.ok) {
          throw new Error(`Failed to delete athlete: ${response.status} ${response.statusText}`)
        }

        setAthletes((prev) => prev.filter((athlete) => athlete.id !== id))

        toast({
          title: "Success",
          description: `${name} has been deleted`,
        })
      } catch (error) {
        console.error("Error deleting athlete:", error)
        toast({
          title: "Error",
          description: "Failed to delete athlete",
          variant: "destructive",
        })
      }
    }
  }

  const filteredAthletes = athletes.filter((athlete) => {
    const matchesSearch =
      athlete?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      athlete?.college?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      athlete?.highschool?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesRecruitingStatus =
      recruitingStatusFilter === "all" ||
      athlete?.recruiting_status?.toLowerCase() === recruitingStatusFilter.toLowerCase()

    const matchesYear = yearFilter === "all" || athlete?.graduationyear?.toString() === yearFilter

    return matchesSearch && matchesRecruitingStatus && matchesYear
  })

  const uniqueRecruitingStatuses = [...new Set(athletes.map((athlete) => athlete?.recruiting_status).filter(Boolean))]
  const uniqueYears = [...new Set(athletes.map((athlete) => athlete?.graduationyear).filter(Boolean))].sort(
    (a, b) => b - a,
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* NC United Branded Header */}
      <div className="bg-gradient-to-r from-[#002147] to-[#003366] text-white shadow-lg">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">Manage Athletes</h1>
              <p className="text-blue-200">Admin Dashboard - Athlete Management</p>
            </div>
            <div className="flex gap-3">
              <Button asChild className="bg-[#B31B1B] hover:bg-[#8B1515] text-white">
                <Link href="/admin/athletes/add">Add Athlete</Link>
              </Button>
              <Button asChild variant="outline" className="border-white text-white hover:bg-white/10">
                <Link href="/admin/athletes/bulk-import">Bulk Import</Link>
              </Button>
            </div>
          </div>
          
          {/* Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
              <div className="text-2xl font-bold">{athletes.length}</div>
              <div className="text-blue-100 text-sm">Total Athletes</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
              <div className="text-2xl font-bold">{filteredAthletes.length}</div>
              <div className="text-blue-100 text-sm">Filtered</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
              <div className="text-2xl font-bold">{uniqueRecruitingStatuses.length}</div>
              <div className="text-blue-100 text-sm">Status Types</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
              <div className="text-2xl font-bold">{uniqueYears.length}</div>
              <div className="text-blue-100 text-sm">Grad Years</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Card className="mb-6 shadow-lg border-t-4 border-t-[#B31B1B]">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-white">
            <CardTitle className="text-[#002147]">Search & Filter Athletes</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Search athletes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <Select value={recruitingStatusFilter} onValueChange={setRecruitingStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by recruiting status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Recruiting Status</SelectItem>
                {uniqueRecruitingStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by graduation year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {uniqueYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B31B1B] mx-auto mb-4"></div>
              <p className="text-gray-600">Loading athletes...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600 font-semibold">{error}</p>
            </div>
          ) : filteredAthletes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 font-medium">
                {searchTerm || recruitingStatusFilter !== "all" || yearFilter !== "all"
                  ? "No athletes found matching your filters"
                  : "No athletes found"}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {!loading && !error && filteredAthletes.length > 0 && (
        <Card className="shadow-lg border-t-4 border-t-[#B31B1B]">
          <CardHeader className="bg-gradient-to-r from-[#002147] to-[#003366] text-white">
            <CardTitle className="flex items-center justify-between">
              <span>Athletes Results</span>
              <span className="text-sm font-normal text-blue-200">{filteredAthletes.length} athletes</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="font-semibold text-gray-700">Photo</TableHead>
                    <TableHead className="font-semibold text-gray-700">Name</TableHead>
                    <TableHead className="font-semibold text-gray-700">High School</TableHead>
                    <TableHead className="font-semibold text-gray-700">State</TableHead>
                    <TableHead className="font-semibold text-gray-700">College</TableHead>
                    <TableHead className="font-semibold text-gray-700">Division</TableHead>
                    <TableHead className="font-semibold text-gray-700">Weight Class</TableHead>
                    <TableHead className="font-semibold text-gray-700">Graduation Year</TableHead>
                    <TableHead className="font-semibold text-gray-700">Recruiting Status</TableHead>
                    <TableHead className="font-semibold text-gray-700">Commitment Date</TableHead>
                    <TableHead className="font-semibold text-gray-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAthletes.map((athlete) => (
                    <TableRow key={athlete.id}>
                      <TableCell>
                        <AthleteImage
                          photoUrl={athlete.photourl}
                          name={athlete.name}
                          size="sm"
                          alt={`${athlete.name || "Athlete"} photo`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <Link href={`/unified-profile/${athlete.id}`} className="text-[#002147] hover:underline" target="_blank" rel="noopener noreferrer">
                          {athlete.name || "N/A"}
                        </Link>
                      </TableCell>
                      <TableCell>{athlete.highschool || "N/A"}</TableCell>
                      <TableCell>{athlete.state || athlete.state_abbreviation || athlete.hometown_state || "N/A"}</TableCell>
                      <TableCell>{athlete.college || "N/A"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-[#002147] text-white border-[#002147]">
                          {athlete.division || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{athlete.weightclass || "N/A"}</TableCell>
                      <TableCell className="font-medium">{athlete.graduationyear || "N/A"}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            athlete.recruiting_status?.toLowerCase() === "committed" || 
                            athlete.recruiting_status?.toLowerCase() === "college athlete"
                              ? "bg-green-600 text-white hover:bg-green-700"
                              : athlete.recruiting_status?.toLowerCase() === "uncommitted"
                              ? "bg-yellow-500 text-white hover:bg-yellow-600"
                              : "bg-gray-500 text-white hover:bg-gray-600"
                          }
                        >
                          {athlete.recruiting_status || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {athlete.commitmentdate ? new Date(athlete.commitmentdate).toLocaleDateString() : "N/A"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button asChild variant="outline" size="sm" className="hover:bg-[#002147] hover:text-white">
                            <Link href={`/unified-profile/${athlete.id}`} target="_blank" rel="noopener noreferrer">View profile</Link>
                          </Button>
                          <Button asChild variant="outline" size="sm" className="hover:bg-[#002147] hover:text-white">
                            <Link href={`/admin/athletes/edit/${athlete.id}`}>Edit</Link>
                          </Button>
                          <Button asChild variant="outline" size="sm" className="hover:bg-[#002147] hover:text-white">
                            <Link href={`/admin/athletes/images/${athlete.id}`}>Images</Link>
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="bg-[#B31B1B] hover:bg-[#8B1515]"
                            onClick={() => handleDelete(athlete.id, athlete.name)}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

        {/* Debug Info */}
        <Card className="mt-6 shadow-sm">
          <CardHeader className="bg-gray-50">
            <CardTitle className="text-sm text-gray-700">Debug Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600 space-y-1">
              <p><span className="font-semibold">Total Athletes:</span> {athletes.length}</p>
              <p><span className="font-semibold">Filtered Athletes:</span> {filteredAthletes.length}</p>
              <p><span className="font-semibold">Loading:</span> {loading ? "Yes" : "No"}</p>
              <p><span className="font-semibold">Error:</span> {error || "None"}</p>
              <p><span className="font-semibold">Recruiting Status Filter:</span> {recruitingStatusFilter}</p>
              <p><span className="font-semibold">Year Filter:</span> {yearFilter}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
