"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
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
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Manage Athletes</h1>
        <div className="flex gap-4">
          <Button asChild>
            <Link href="/admin/athletes/add">Add Athlete</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/athletes/bulk-import">Bulk Import</Link>
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Athletes ({athletes.length})</CardTitle>
        </CardHeader>
        <CardContent>
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
            <div className="text-center py-10">Loading athletes...</div>
          ) : error ? (
            <div className="text-center py-10 text-red-500">{error}</div>
          ) : filteredAthletes.length === 0 ? (
            <div className="text-center py-10">
              {searchTerm || recruitingStatusFilter !== "all" || yearFilter !== "all"
                ? "No athletes found matching your filters"
                : "No athletes found"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Photo</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>High School</TableHead>
                    <TableHead>College</TableHead>
                    <TableHead>Division</TableHead>
                    <TableHead>Weight Class</TableHead>
                    <TableHead>Graduation Year</TableHead>
                    <TableHead>Recruiting Status</TableHead>
                    <TableHead>Commitment Date</TableHead>
                    <TableHead>Actions</TableHead>
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
                      <TableCell className="font-medium">{athlete.name || "N/A"}</TableCell>
                      <TableCell>{athlete.highschool || "N/A"}</TableCell>
                      <TableCell>{athlete.college || "N/A"}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                          {athlete.division || "N/A"}
                        </span>
                      </TableCell>
                      <TableCell>{athlete.weightclass || "N/A"}</TableCell>
                      <TableCell>{athlete.graduationyear || "N/A"}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            athlete.recruiting_status?.toLowerCase() === "committed"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {athlete.recruiting_status || "N/A"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {athlete.commitmentdate ? new Date(athlete.commitmentdate).toLocaleDateString() : "N/A"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/admin/athletes/edit/${athlete.id}`}>Edit</Link>
                          </Button>
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/admin/athletes/images/${athlete.id}`}>Images</Link>
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
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
          )}
        </CardContent>
      </Card>

      {/* Debug Info */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Debug Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600">
            <p>Total Athletes: {athletes.length}</p>
            <p>Filtered Athletes: {filteredAthletes.length}</p>
            <p>Loading: {loading ? "Yes" : "No"}</p>
            <p>Error: {error || "None"}</p>
            <p>Recruiting Status Filter: {recruitingStatusFilter}</p>
            <p>Year Filter: {yearFilter}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
