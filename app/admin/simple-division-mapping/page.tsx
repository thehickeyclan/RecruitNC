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
import { CheckCircle, AlertCircle, Search, RefreshCw, Save, Plus, Trash2, Wand2 } from "lucide-react"

// Define the standard division options
const STANDARD_DIVISIONS = ["Division I", "Division II", "Division III", "NAIA", "NJCAA"]

// NC Colleges with their divisions
const NC_COLLEGES = [
  // Division I
  { college_name: "UNC Chapel Hill", division: "Division I" },
  { college_name: "NC State", division: "Division I" },
  { college_name: "Duke", division: "Division I" },
  { college_name: "Appalachian State", division: "Division I" },
  { college_name: "East Carolina", division: "Division I" },
  { college_name: "UNC Charlotte", division: "Division I" },
  { college_name: "UNC Greensboro", division: "Division I" },
  { college_name: "UNC Wilmington", division: "Division I" },
  { college_name: "Campbell", division: "Division I" },
  { college_name: "Davidson", division: "Division I" },
  { college_name: "Elon", division: "Division I" },
  { college_name: "Gardner-Webb", division: "Division I" },
  { college_name: "High Point", division: "Division I" },
  { college_name: "North Carolina A&T", division: "Division I" },
  { college_name: "North Carolina Central", division: "Division I" },
  { college_name: "Western Carolina", division: "Division I" },

  // Division II
  { college_name: "UNC Pembroke", division: "Division II" },
  { college_name: "Mount Olive", division: "Division II" },
  { college_name: "Belmont Abbey", division: "Division II" },
  { college_name: "Barton", division: "Division II" },
  { college_name: "Catawba", division: "Division II" },
  { college_name: "Chowan", division: "Division II" },
  { college_name: "Elizabeth City State", division: "Division II" },
  { college_name: "Fayetteville State", division: "Division II" },
  { college_name: "Johnson C. Smith", division: "Division II" },
  { college_name: "Lenoir-Rhyne", division: "Division II" },
  { college_name: "Livingstone", division: "Division II" },
  { college_name: "Mars Hill", division: "Division II" },
  { college_name: "Queens University of Charlotte", division: "Division II" },
  { college_name: "Shaw", division: "Division II" },
  { college_name: "St. Augustine's", division: "Division II" },
  { college_name: "Winston-Salem State", division: "Division II" },
  { college_name: "Wingate", division: "Division II" },

  // Division III
  { college_name: "Greensboro College", division: "Division III" },
  { college_name: "Guilford College", division: "Division III" },
  { college_name: "Methodist", division: "Division III" },
  { college_name: "North Carolina Wesleyan", division: "Division III" },
  { college_name: "William Peace", division: "Division III" },
  { college_name: "Brevard", division: "Division III" },
  { college_name: "Meredith", division: "Division III" },
  { college_name: "Marymount", division: "Division III" },
  { college_name: "Salem", division: "Division III" },

  // NAIA
  { college_name: "Montreat College", division: "NAIA" },
  { college_name: "St. Andrews University", division: "NAIA" },
  { college_name: "Bluefield College", division: "NAIA" },
  { college_name: "Columbia International", division: "NAIA" },
  { college_name: "Mid-Atlantic Christian", division: "NAIA" },

  // NJCAA
  { college_name: "Wake Tech", division: "NJCAA" },
  { college_name: "Louisburg College", division: "NJCAA" },
  { college_name: "Alamance Community College", division: "NJCAA" },
  { college_name: "Caldwell Community College", division: "NJCAA" },
  { college_name: "Cape Fear Community College", division: "NJCAA" },
  { college_name: "Catawba Valley Community College", division: "NJCAA" },
  { college_name: "Central Carolina Community College", division: "NJCAA" },
  { college_name: "Cleveland Community College", division: "NJCAA" },
  { college_name: "Davidson County Community College", division: "NJCAA" },
  { college_name: "Durham Technical Community College", division: "NJCAA" },
  { college_name: "Fayetteville Technical Community College", division: "NJCAA" },
  { college_name: "Guilford Technical Community College", division: "NJCAA" },
  { college_name: "Johnston Community College", division: "NJCAA" },
  { college_name: "Lenoir Community College", division: "NJCAA" },
  { college_name: "Pitt Community College", division: "NJCAA" },
  { college_name: "Rockingham Community College", division: "NJCAA" },
  { college_name: "Sandhills Community College", division: "NJCAA" },
  { college_name: "Southeastern Community College", division: "NJCAA" },
  { college_name: "Southwestern Community College", division: "NJCAA" },
  { college_name: "Surry Community College", division: "NJCAA" },
  { college_name: "Vance-Granville Community College", division: "NJCAA" },
  { college_name: "Wayne Community College", division: "NJCAA" },
  { college_name: "Western Piedmont Community College", division: "NJCAA" },
  { college_name: "Wilkes Community College", division: "NJCAA" },
]

export default function SimpleDivisionMappingPage() {
  const [mappings, setMappings] = useState<any[]>([])
  const [filteredMappings, setFilteredMappings] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [newCollege, setNewCollege] = useState("")
  const [newDivision, setNewDivision] = useState("Division I")
  const [updateStatus, setUpdateStatus] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    fetchMappings()
  }, [])

  useEffect(() => {
    filterMappings()
  }, [mappings, searchTerm])

  const fetchMappings = async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Robust existence check: if the table is missing, error.code is often "42P01" (undefined_table)
      // or message includes "relation ... does not exist".
      const { error: checkError } = await supabase
        .from("college_divisions")
        .select("id", { head: true, count: "exact" })
        .limit(1)

      const isMissingTable =
        !!checkError &&
        (checkError.code === "42P01" ||
          (typeof checkError.message === "string" &&
            checkError.message.toLowerCase().includes("relation") &&
            checkError.message.toLowerCase().includes("does not exist")))

      if (isMissingTable) {
        const created = await createTable()
        if (!created) {
          throw new Error("Failed to create college_divisions table")
        }
        // Small delay to let DDL settle before first read:
        await new Promise((r) => setTimeout(r, 400))
      }

      // Fetch mappings
      const { data, error } = await supabase.from("college_divisions").select("*").order("college_name")

      if (error) throw error

      setMappings(data || [])
    } catch (err) {
      console.error("Error fetching mappings:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch college division mappings")
    } finally {
      setLoading(false)
    }
  }

  const createTable = async () => {
    try {
      const response = await fetch("/api/create-simple-divisions-table", {
        method: "POST",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create table")
      }

      return true
    } catch (err) {
      console.error("Error creating table:", err)
      setError(err instanceof Error ? err.message : "Failed to create college divisions table")
      return false
    }
  }

  const filterMappings = () => {
    if (!searchTerm) {
      setFilteredMappings([...mappings])
      return
    }

    const term = searchTerm.toLowerCase()
    const filtered = mappings.filter(
      (mapping) => mapping.college_name.toLowerCase().includes(term) || mapping.division.toLowerCase().includes(term),
    )

    setFilteredMappings(filtered)
  }

  const updateDivision = async (id: number, division: string) => {
    setUpdateStatus((prev) => ({ ...prev, [id]: "saving" }))
    setError(null)

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("college_divisions")
        .update({ division, updated_at: new Date().toISOString() })
        .eq("id", id)

      if (error) throw error

      // Update local state
      setMappings((prev) => prev.map((mapping) => (mapping.id === id ? { ...mapping, division } : mapping)))

      setUpdateStatus((prev) => ({ ...prev, [id]: "success" }))

      // Clear success status after 2 seconds
      setTimeout(() => {
        setUpdateStatus((prev) => {
          const newStatus = { ...prev }
          delete newStatus[id]
          return newStatus
        })
      }, 2000)
    } catch (err) {
      console.error("Error updating division:", err)
      setError(err instanceof Error ? err.message : "Failed to update division")
      setUpdateStatus((prev) => ({ ...prev, [id]: "error" }))
    }
  }

  const addNewMapping = async () => {
    if (!newCollege.trim()) {
      setError("College name cannot be empty")
      return
    }

    setSaving(true)
    setError(null)

    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("college_divisions")
        .insert({
          college_name: newCollege.trim(),
          division: newDivision,
        })
        .select()

      if (error) throw error

      // Update local state
      setMappings((prev) => [...prev, data[0]])

      // Reset form
      setNewCollege("")
      setNewDivision("Division I")

      setResult({
        success: true,
        message: `Added "${newCollege}" as ${newDivision}`,
      })

      // Clear success message after 3 seconds
      setTimeout(() => setResult(null), 3000)
    } catch (err) {
      console.error("Error adding mapping:", err)
      setError(err instanceof Error ? err.message : "Failed to add college mapping")
    } finally {
      setSaving(false)
    }
  }

  const deleteMapping = async (id: number, collegeName: string) => {
    if (!confirm(`Are you sure you want to delete the mapping for "${collegeName}"?`)) {
      return
    }

    setError(null)

    try {
      const supabase = createClient()

      const { error } = await supabase.from("college_divisions").delete().eq("id", id)

      if (error) throw error

      // Update local state
      setMappings((prev) => prev.filter((mapping) => mapping.id !== id))

      setResult({
        success: true,
        message: `Deleted mapping for "${collegeName}"`,
      })

      // Clear success message after 3 seconds
      setTimeout(() => setResult(null), 3000)
    } catch (err) {
      console.error("Error deleting mapping:", err)
      setError(err instanceof Error ? err.message : "Failed to delete college mapping")
    }
  }

  const updateAllAthletes = async () => {
    if (!confirm("This will update ALL athletes' division values based on the current mappings. Continue?")) {
      return
    }

    setSaving(true)
    setError(null)

    try {
      const response = await fetch("/api/update-divisions-from-simple-table", {
        method: "POST",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update athletes")
      }

      const data = await response.json()

      setResult({
        success: true,
        message: `Updated ${data.updatedCount} athletes with correct divisions`,
        details: `${data.unknownCount} colleges not found in mappings.`,
      })
    } catch (err) {
      console.error("Error updating athletes:", err)
      setError(err instanceof Error ? err.message : "Failed to update athletes")
    } finally {
      setSaving(false)
    }
  }

  const addNCColleges = async () => {
    setSaving(true)
    setError(null)

    try {
      const supabase = createClient()

      // Add colleges in batches to avoid timeouts
      const batchSize = 10
      for (let i = 0; i < NC_COLLEGES.length; i += batchSize) {
        const batch = NC_COLLEGES.slice(i, i + batchSize)

        const { error } = await supabase.from("college_divisions").upsert(
          batch.map((college) => ({
            college_name: college.college_name,
            division: college.division,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })),
          { onConflict: "college_name" },
        )

        if (error) throw error
      }

      setResult({
        success: true,
        message: `Added ${NC_COLLEGES.length} North Carolina colleges`,
      })

      // Refresh the list
      fetchMappings()
    } catch (err) {
      console.error("Error adding NC colleges:", err)
      setError(err instanceof Error ? err.message : "Failed to add NC colleges")
    } finally {
      setSaving(false)
    }
  }

  async function fixArcadiaToD3() {
    setSaving(true)
    setError(null)
    try {
      const supabase = createClient()

      // Ensure both common variants exist in the simple mapping table.
      const upsertItems = [
        {
          college_name: "Arcadia University",
          division: "Division III",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          college_name: "Arcadia",
          division: "Division III",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]

      const { error: upsertError } = await supabase
        .from("college_divisions")
        .upsert(upsertItems, { onConflict: "college_name" })

      if (upsertError) throw upsertError

      // Call existing API to update athletes and the server-side mapping too.
      const response = await fetch("/api/update-college-divisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ college: "Arcadia", division: "Division III" }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || "Failed to update athletes for Arcadia")
      }

      // Refresh list so the UI reflects the change.
      await fetchMappings()

      setResult({
        success: true,
        message: 'Updated "Arcadia" to Division III',
        details: data?.athleteCount !== undefined ? `Updated ${data.athleteCount} athlete records.` : undefined,
      })

      // Auto-clear success message
      setTimeout(() => setResult(null), 3000)
    } catch (err) {
      console.error("Error fixing Arcadia:", err)
      setError(err instanceof Error ? err.message : "Failed to update Arcadia to Division III")
    } finally {
      setSaving(false)
    }
  }

  return (
    <AuthGuard>
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-4">College Division Mappings</h1>
        <p className="text-gray-600 mb-8">
          Manage the mapping between colleges and their NCAA/NAIA/NJCAA divisions. These mappings will be used
          throughout the application.
        </p>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <Alert className="mb-6" variant={result.success ? "default" : "destructive"}>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>{result.success ? "Success" : "Error"}</AlertTitle>
            <AlertDescription>
              {result.message}
              {result.details && <div className="mt-2 text-sm">{result.details}</div>}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Add New College Mapping</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="College Name (e.g., UNC Chapel Hill)"
                    value={newCollege}
                    onChange={(e) => setNewCollege(e.target.value)}
                  />
                </div>
                <div className="w-full md:w-48">
                  <Select value={newDivision} onValueChange={setNewDivision}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Division" />
                    </SelectTrigger>
                    <SelectContent>
                      {STANDARD_DIVISIONS.map((division) => (
                        <SelectItem key={division} value={division}>
                          {division}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={addNewMapping} disabled={saving || !newCollege.trim()} className="whitespace-nowrap">
                  <Plus className="mr-2 h-4 w-4" />
                  Add College
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>College Mappings</CardTitle>
              <div className="flex gap-2">
                <Button
                  onClick={updateAllAthletes}
                  disabled={saving || loading || mappings.length === 0}
                  variant="default"
                >
                  {saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Update All Athletes
                </Button>
                <Button onClick={fixArcadiaToD3} variant="secondary" disabled={saving || loading}>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Fix Arcadia → DIII
                </Button>
                <Button onClick={addNCColleges} variant="outline" disabled={saving}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add NC Colleges
                </Button>
                <Button onClick={fetchMappings} variant="outline" disabled={loading}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Search colleges..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : filteredMappings.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm ? "No colleges found matching your search" : "No college mappings found"}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>College Name</TableHead>
                        <TableHead>Division</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMappings.map((mapping) => (
                        <TableRow key={mapping.id}>
                          <TableCell className="font-medium">{mapping.college_name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Select
                                defaultValue={mapping.division}
                                onValueChange={(value) => updateDivision(mapping.id, value)}
                              >
                                <SelectTrigger className="w-[140px]">
                                  <SelectValue placeholder="Select Division" />
                                </SelectTrigger>
                                <SelectContent>
                                  {STANDARD_DIVISIONS.map((division) => (
                                    <SelectItem key={division} value={division}>
                                      {division}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              {updateStatus[mapping.id] === "saving" && (
                                <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                              )}
                              {updateStatus[mapping.id] === "success" && (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              )}
                              {updateStatus[mapping.id] === "error" && <AlertCircle className="h-4 w-4 text-red-500" />}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteMapping(mapping.id, mapping.college_name)}
                              className="h-8 w-8 p-0"
                            >
                              <span className="sr-only">Delete</span>
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
      </div>
    </AuthGuard>
  )
}
