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
import { CheckCircle, AlertCircle, Search, RefreshCw, Save, Plus, Trash2 } from "lucide-react"

// Define the standard division options
const STANDARD_DIVISIONS = ["Division I", "Division II", "Division III", "NAIA", "NJCAA"]

// NC Colleges with their divisions
const NC_COLLEGES = [
  // Division I
  { name: "UNC Chapel Hill", division: "Division I" },
  { name: "NC State", division: "Division I" },
  { name: "Duke", division: "Division I" },
  { name: "Appalachian State", division: "Division I" },
  { name: "East Carolina", division: "Division I" },
  { name: "UNC Charlotte", division: "Division I" },
  { name: "UNC Greensboro", division: "Division I" },
  { name: "UNC Wilmington", division: "Division I" },
  { name: "Campbell", division: "Division I" },
  { name: "Davidson", division: "Division I" },
  { name: "Elon", division: "Division I" },
  { name: "Gardner-Webb", division: "Division I" },
  { name: "High Point", division: "Division I" },
  { name: "North Carolina A&T", division: "Division I" },
  { name: "North Carolina Central", division: "Division I" },
  { name: "Western Carolina", division: "Division I" },

  // Division II
  { name: "UNC Pembroke", division: "Division II" },
  { name: "Mount Olive", division: "Division II" },
  { name: "University of Mount Olive", division: "Division II" },
  { name: "Belmont Abbey", division: "Division II" },
  { name: "Barton", division: "Division II" },
  { name: "Catawba", division: "Division II" },
  { name: "Chowan", division: "Division II" },
  { name: "Elizabeth City State", division: "Division II" },
  { name: "Fayetteville State", division: "Division II" },
  { name: "Johnson C. Smith", division: "Division II" },
  { name: "Lenoir-Rhyne", division: "Division II" },
  { name: "Livingstone", division: "Division II" },
  { name: "Mars Hill", division: "Division II" },
  { name: "Queens University of Charlotte", division: "Division II" },
  { name: "Shaw", division: "Division II" },
  { name: "St. Augustine's", division: "Division II" },
  { name: "Winston-Salem State", division: "Division II" },
  { name: "Wingate", division: "Division II" },

  // Division III
  { name: "Greensboro College", division: "Division III" },
  { name: "Guilford College", division: "Division III" },
  { name: "Methodist", division: "Division III" },
  { name: "North Carolina Wesleyan", division: "Division III" },
  { name: "William Peace", division: "Division III" },
  { name: "Brevard", division: "Division III" },
  { name: "Meredith", division: "Division III" },
  { name: "Salem", division: "Division III" },

  // NAIA
  { name: "Montreat College", division: "NAIA" },
  { name: "St. Andrews University", division: "NAIA" },
  { name: "Bluefield College", division: "NAIA" },
  { name: "Columbia International", division: "NAIA" },
  { name: "Mid-Atlantic Christian", division: "NAIA" },

  // NJCAA
  { name: "Wake Tech", division: "NJCAA" },
  { name: "Louisburg College", division: "NJCAA" },
  { name: "Alamance Community College", division: "NJCAA" },
  { name: "Caldwell Community College", division: "NJCAA" },
  { name: "Cape Fear Community College", division: "NJCAA" },
  { name: "Catawba Valley Community College", division: "NJCAA" },
  { name: "Central Carolina Community College", division: "NJCAA" },
  { name: "Cleveland Community College", division: "NJCAA" },
  { name: "Davidson County Community College", division: "NJCAA" },
  { name: "Durham Technical Community College", division: "NJCAA" },
  { name: "Fayetteville Technical Community College", division: "NJCAA" },
  { name: "Guilford Technical Community College", division: "NJCAA" },
  { name: "Johnston Community College", division: "NJCAA" },
  { name: "Lenoir Community College", division: "NJCAA" },
  { name: "Pitt Community College", division: "NJCAA" },
  { name: "Rockingham Community College", division: "NJCAA" },
  { name: "Sandhills Community College", division: "NJCAA" },
  { name: "Southeastern Community College", division: "NJCAA" },
  { name: "Southwestern Community College", division: "NJCAA" },
  { name: "Surry Community College", division: "NJCAA" },
  { name: "Vance-Granville Community College", division: "NJCAA" },
  { name: "Wayne Community College", division: "NJCAA" },
  { name: "Western Piedmont Community College", division: "NJCAA" },
  { name: "Wilkes Community College", division: "NJCAA" },
]

export default function UltraSimpleDivisionsPage() {
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

      // First, try to create the table if it doesn't exist
      await createTableDirectly()

      // Now fetch the mappings
      const { data, error } = await supabase.from("divisions").select("*").order("name")

      if (error) throw error

      setMappings(data || [])
    } catch (err) {
      console.error("Error fetching mappings:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch college division mappings")
    } finally {
      setLoading(false)
    }
  }

  const createTableDirectly = async () => {
    try {
      const supabase = createClient()

      // Try to create the table directly with SQL
      const { error } = await supabase.rpc("create_divisions_table")

      // If there's an error, it might be because the function doesn't exist
      // In that case, we'll try to create the table by inserting a record
      if (error) {
        console.log("Error creating table with RPC, trying direct insert:", error)

        // Try to insert a record, which will create the table if it doesn't exist
        const { error: insertError } = await supabase.from("divisions").insert({
          name: "TEMP_RECORD",
          division: "TEMP",
        })

        // If there's an error and it's not because the table already exists, log it
        if (insertError && !insertError.message.includes("does not exist")) {
          console.error("Error creating table with insert:", insertError)
        }

        // Try to delete the temp record
        if (!insertError) {
          await supabase.from("divisions").delete().eq("name", "TEMP_RECORD")
        }
      }

      return true
    } catch (err) {
      console.error("Error creating table:", err)
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
      (mapping) => mapping.name.toLowerCase().includes(term) || mapping.division.toLowerCase().includes(term),
    )

    setFilteredMappings(filtered)
  }

  const updateDivision = async (id: number, division: string) => {
    setUpdateStatus((prev) => ({ ...prev, [id]: "saving" }))
    setError(null)

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("divisions")
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
        .from("divisions")
        .insert({
          name: newCollege.trim(),
          division: newDivision,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
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

      const { error } = await supabase.from("divisions").delete().eq("id", id)

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
      const response = await fetch("/api/update-athletes-from-divisions", {
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
      let addedCount = 0

      for (let i = 0; i < NC_COLLEGES.length; i += batchSize) {
        const batch = NC_COLLEGES.slice(i, i + batchSize)

        const { error } = await supabase.from("divisions").upsert(
          batch.map((college) => ({
            name: college.name,
            division: college.division,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })),
          { onConflict: "name" },
        )

        if (error) {
          console.error("Error adding batch:", error)
          continue
        }

        addedCount += batch.length
      }

      setResult({
        success: true,
        message: `Added ${addedCount} North Carolina colleges`,
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
                          <TableCell className="font-medium">{mapping.name}</TableCell>
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
                              onClick={() => deleteMapping(mapping.id, mapping.name)}
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
