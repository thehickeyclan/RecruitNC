"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"
import { AuthGuard } from "@/components/auth-guard"
import { CheckCircle, AlertCircle, Search, RefreshCw } from "lucide-react"

export default function ManualDivisionFixPage() {
  const [athletes, setAthletes] = useState<any[]>([])
  const [filteredAthletes, setFilteredAthletes] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [updateLoading, setUpdateLoading] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [divisionFilter, setDivisionFilter] = useState("all")

  // Standard division options
  const standardDivisions = ["Division I", "Division II", "Division III", "NAIA", "NJCAA"]

  useEffect(() => {
    fetchAthletes()
  }, [])

  useEffect(() => {
    filterAthletes()
  }, [athletes, searchTerm, divisionFilter])

  const fetchAthletes = async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      const { data, error } = await supabase.from("athletes").select("id, name, college, division").order("name")

      if (error) throw error

      setAthletes(data || [])
    } catch (err) {
      console.error("Error fetching athletes:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch athletes")
    } finally {
      setLoading(false)
    }
  }

  const filterAthletes = () => {
    let filtered = [...athletes]

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (athlete) =>
          athlete.name?.toLowerCase().includes(term) ||
          athlete.college?.toLowerCase().includes(term) ||
          athlete.division?.toLowerCase().includes(term),
      )
    }

    // Apply division filter
    if (divisionFilter !== "all") {
      if (divisionFilter === "non-standard") {
        // Filter for non-standard divisions
        filtered = filtered.filter((athlete) => !standardDivisions.includes(athlete.division))
      } else if (divisionFilter === "empty") {
        // Filter for empty divisions
        filtered = filtered.filter((athlete) => !athlete.division || athlete.division.trim() === "")
      } else {
        // Filter for specific division
        filtered = filtered.filter((athlete) => athlete.division === divisionFilter)
      }
    }

    setFilteredAthletes(filtered)
  }

  const updateDivision = async (id: string, division: string) => {
    setUpdateLoading(id)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/manual-standardize-division", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, division }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update division")
      }

      const data = await response.json()
      setResult(data)

      // Update local state
      setAthletes((prev) => prev.map((athlete) => (athlete.id === id ? { ...athlete, division } : athlete)))
    } catch (err) {
      console.error("Error updating division:", err)
      setError(err instanceof Error ? err.message : "Failed to update division")
    } finally {
      setUpdateLoading(null)
    }
  }

  return (
    <AuthGuard>
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-4">Manual Division Standardization</h1>
        <p className="text-gray-600 mb-8">
          Use this tool to manually standardize division names for individual athletes.
        </p>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search by name, college, or division..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Select value={divisionFilter} onValueChange={setDivisionFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by division" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Divisions</SelectItem>
                <SelectItem value="non-standard">Non-Standard Divisions</SelectItem>
                <SelectItem value="empty">Empty Divisions</SelectItem>
                <SelectItem value="Division I">Division I</SelectItem>
                <SelectItem value="Division II">Division II</SelectItem>
                <SelectItem value="Division III">Division III</SelectItem>
                <SelectItem value="NAIA">NAIA</SelectItem>
                <SelectItem value="NJCAA">NJCAA</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={fetchAthletes} variant="outline" className="whitespace-nowrap">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Data
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <Alert className="mb-6" variant="default">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{result.message}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Athletes ({filteredAthletes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : filteredAthletes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No athletes found matching your criteria</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>College</TableHead>
                      <TableHead>Current Division</TableHead>
                      <TableHead>Set Division</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAthletes.map((athlete) => (
                      <TableRow key={athlete.id}>
                        <TableCell className="font-medium">{athlete.name}</TableCell>
                        <TableCell>{athlete.college}</TableCell>
                        <TableCell>
                          <span
                            className={
                              standardDivisions.includes(athlete.division)
                                ? "text-green-600 font-medium"
                                : "text-red-600"
                            }
                          >
                            {athlete.division || "Empty"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Select
                              defaultValue={standardDivisions.includes(athlete.division) ? athlete.division : ""}
                              onValueChange={(value) => updateDivision(athlete.id, value)}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent>
                                {standardDivisions.map((div) => (
                                  <SelectItem key={div} value={div}>
                                    {div}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {updateLoading === athlete.id && (
                              <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                            )}
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
      </div>
    </AuthGuard>
  )
}
