"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"

export default function CollegesSimplePage() {
  const [colleges, setColleges] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [divisionFilter, setDivisionFilter] = useState("all")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchColleges() {
      try {
        setLoading(true)
        setError(null)

        const supabase = createClient()

        // Fetch all athletes with college info
        const { data, error } = await supabase
          .from("athletes")
          .select("id, name, college, division")
          .not("college", "is", null)

        if (error) {
          throw new Error(`Error fetching athletes: ${error.message}`)
        }

        // Group by college
        const collegeMap = new Map()

        data.forEach((athlete) => {
          if (!athlete.college) return

          const college = athlete.college.trim()
          const division = athlete.division || "Unknown"

          if (!collegeMap.has(college)) {
            collegeMap.set(college, {
              name: college,
              division: division,
              count: 1,
              athletes: [athlete],
            })
          } else {
            const collegeData = collegeMap.get(college)
            collegeData.count += 1
            collegeData.athletes.push(athlete)
          }
        })

        // Convert to array
        const collegesArray = Array.from(collegeMap.values())
        setColleges(collegesArray)
      } catch (err) {
        console.error("Error fetching colleges:", err)
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setLoading(false)
      }
    }

    fetchColleges()
  }, [])

  // Filter colleges by division
  const filteredColleges =
    divisionFilter === "all"
      ? colleges
      : colleges.filter((college) => {
          // Check if any athlete at this college has the selected division
          return college.athletes.some((athlete: any) => athlete.division === divisionFilter)
        })

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Colleges (Simple Version)</h1>

      <div className="mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Division:</span>
          <Select value={divisionFilter} onValueChange={setDivisionFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Divisions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Divisions</SelectItem>
              <SelectItem value="Division I">Division I</SelectItem>
              <SelectItem value="Division II">Division II</SelectItem>
              <SelectItem value="Division III">Division III</SelectItem>
              <SelectItem value="NAIA">NAIA</SelectItem>
              <SelectItem value="NJCAA">NJCAA</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <p>{error}</p>
        </div>
      )}

      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Showing {filteredColleges.length} {filteredColleges.length === 1 ? "college" : "colleges"}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading colleges...</div>
      ) : filteredColleges.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No colleges match your filters</h3>
          <p className="text-gray-500 mb-4">Try adjusting your filters or clearing them to see more results.</p>
          <button
            onClick={() => setDivisionFilter("all")}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredColleges.map((college, index) => (
            <Card key={`${college.name}-${index}`} className="relative">
              <CardHeader>
                <CardTitle className="text-xl">{college.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Athletes</span>
                    <span className="text-sm font-bold">{college.count}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {Array.from(new Set(college.athletes.map((a: any) => a.division))).map((division: any, i) => (
                      <Badge key={i} variant="outline">
                        {division || "Unknown"}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold mb-2">Athletes:</h4>
                    <ul className="text-sm space-y-1">
                      {college.athletes.slice(0, 5).map((athlete: any) => (
                        <li key={athlete.id} className="flex justify-between">
                          <span>{athlete.name}</span>
                          <span className="text-gray-500">{athlete.division || "Unknown"}</span>
                        </li>
                      ))}
                      {college.athletes.length > 5 && (
                        <li className="text-gray-500 italic">+ {college.athletes.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
