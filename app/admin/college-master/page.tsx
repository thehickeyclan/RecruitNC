"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Plus, AlertCircle } from "lucide-react"

interface College {
  id: number
  canonical_name: string
  display_name: string
  division: string | null
  state: string
  created_at: string
  updated_at: string
}

const DIVISIONS = ["Division I", "Division II", "Division III", "NAIA", "NJCAA"]

export default function CollegeMasterPage() {
  const [colleges, setColleges] = useState<College[]>([])
  const [unmappedColleges, setUnmappedColleges] = useState<College[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedColleges, setSelectedColleges] = useState<number[]>([])
  const [bulkDivision, setBulkDivision] = useState("")
  const [newCollege, setNewCollege] = useState({
    canonical_name: "",
    display_name: "",
    division: "",
    state: "North Carolina",
  })
  const { toast } = useToast()

  useEffect(() => {
    loadColleges()
    loadUnmappedColleges()
  }, [])

  async function loadColleges() {
    try {
      const response = await fetch("/api/college-master")
      const result = await response.json()

      if (result.success) {
        setColleges(result.colleges)
      } else {
        throw new Error(result.error || "Failed to load colleges")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load colleges",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function loadUnmappedColleges() {
    try {
      const response = await fetch("/api/college-master/unmapped")
      const result = await response.json()

      if (result.success) {
        setUnmappedColleges(result.colleges)
      }
    } catch (error) {
      console.error("Error loading unmapped colleges:", error)
    }
  }

  async function updateCollege(id: number, updates: Partial<College>) {
    try {
      setSaving(true)

      const response = await fetch(`/api/college-master/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      const result = await response.json()

      if (result.success) {
        setColleges((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)))
        toast({
          title: "Success",
          description: "College updated successfully",
        })
        loadUnmappedColleges() // Refresh unmapped list
      } else {
        throw new Error(result.error || "Failed to update college")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update college",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  async function bulkUpdateColleges() {
    if (selectedColleges.length === 0 || !bulkDivision) {
      toast({
        title: "Error",
        description: "Please select colleges and a division",
        variant: "destructive",
      })
      return
    }

    try {
      setSaving(true)

      const response = await fetch("/api/college-master/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          college_ids: selectedColleges,
          division: bulkDivision,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        })
        setSelectedColleges([])
        setBulkDivision("")
        loadColleges()
        loadUnmappedColleges()
      } else {
        throw new Error(result.error || "Failed to bulk update")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to bulk update",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  async function createCollege() {
    if (!newCollege.canonical_name || !newCollege.display_name) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive",
      })
      return
    }

    try {
      setSaving(true)

      const response = await fetch("/api/college-master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCollege),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Success",
          description: "College created successfully",
        })
        setNewCollege({
          canonical_name: "",
          display_name: "",
          division: "",
          state: "North Carolina",
        })
        loadColleges()
      } else {
        throw new Error(result.error || "Failed to create college")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create college",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  function toggleCollegeSelection(collegeId: number) {
    setSelectedColleges((prev) =>
      prev.includes(collegeId) ? prev.filter((id) => id !== collegeId) : [...prev, collegeId],
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading colleges...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">College Master Management</h1>
        <p className="text-gray-600 mt-2">Manage college divisions and aliases.</p>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Colleges ({colleges.length})</TabsTrigger>
          <TabsTrigger value="unmapped">
            Unmapped ({unmappedColleges.length})
            {unmappedColleges.length > 0 && <AlertCircle className="h-4 w-4 ml-1 text-orange-500" />}
          </TabsTrigger>
          <TabsTrigger value="add">Add New</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          {/* Bulk Operations */}
          <Card>
            <CardHeader>
              <CardTitle>Bulk Operations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label>Division for Selected Colleges</Label>
                  <Select value={bulkDivision} onValueChange={setBulkDivision}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select division" />
                    </SelectTrigger>
                    <SelectContent>
                      {DIVISIONS.map((division) => (
                        <SelectItem key={division} value={division}>
                          {division}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={bulkUpdateColleges}
                  disabled={selectedColleges.length === 0 || !bulkDivision || saving}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Update Selected ({selectedColleges.length})
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Colleges List */}
          <div className="grid gap-4">
            {colleges.map((college) => (
              <Card key={college.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Checkbox
                      checked={selectedColleges.includes(college.id)}
                      onCheckedChange={() => toggleCollegeSelection(college.id)}
                    />
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Canonical Name</Label>
                        <Input
                          value={college.canonical_name}
                          onChange={(e) =>
                            setColleges((prev) =>
                              prev.map((c) => (c.id === college.id ? { ...c, canonical_name: e.target.value } : c)),
                            )
                          }
                          onBlur={() => updateCollege(college.id, { canonical_name: college.canonical_name })}
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Display Name</Label>
                        <Input
                          value={college.display_name}
                          onChange={(e) =>
                            setColleges((prev) =>
                              prev.map((c) => (c.id === college.id ? { ...c, display_name: e.target.value } : c)),
                            )
                          }
                          onBlur={() => updateCollege(college.id, { display_name: college.display_name })}
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Division</Label>
                        <Select
                          value={college.division || ""}
                          onValueChange={(value) => updateCollege(college.id, { division: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select division" />
                          </SelectTrigger>
                          <SelectContent>
                            {DIVISIONS.map((division) => (
                              <SelectItem key={division} value={division}>
                                {division}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="unmapped" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Colleges Without Divisions ({unmappedColleges.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {unmappedColleges.map((college) => (
                  <div key={college.id} className="flex items-center gap-4 p-4 border rounded">
                    <div className="flex-1">
                      <div className="font-medium">{college.display_name}</div>
                      <div className="text-sm text-gray-500">{college.canonical_name}</div>
                    </div>
                    <Select
                      value={college.division || ""}
                      onValueChange={(value) => updateCollege(college.id, { division: value })}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select division" />
                      </SelectTrigger>
                      <SelectContent>
                        {DIVISIONS.map((division) => (
                          <SelectItem key={division} value={division}>
                            {division}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                {unmappedColleges.length === 0 && (
                  <div className="text-center py-8 text-gray-500">All colleges have divisions assigned! 🎉</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="add" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add New College</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Canonical Name *</Label>
                  <Input
                    value={newCollege.canonical_name}
                    onChange={(e) => setNewCollege((prev) => ({ ...prev, canonical_name: e.target.value }))}
                    placeholder="e.g., UNC Chapel Hill"
                  />
                </div>
                <div>
                  <Label>Display Name *</Label>
                  <Input
                    value={newCollege.display_name}
                    onChange={(e) => setNewCollege((prev) => ({ ...prev, display_name: e.target.value }))}
                    placeholder="e.g., University of North Carolina at Chapel Hill"
                  />
                </div>
                <div>
                  <Label>Division</Label>
                  <Select
                    value={newCollege.division}
                    onValueChange={(value) => setNewCollege((prev) => ({ ...prev, division: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select division" />
                    </SelectTrigger>
                    <SelectContent>
                      {DIVISIONS.map((division) => (
                        <SelectItem key={division} value={division}>
                          {division}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>State</Label>
                  <Input
                    value={newCollege.state}
                    onChange={(e) => setNewCollege((prev) => ({ ...prev, state: e.target.value }))}
                  />
                </div>
              </div>
              <Button onClick={createCollege} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Create College
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
