"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, RefreshCw, Search, Plus, Settings } from "lucide-react"
import Link from "next/link"

const STANDARD_DIVISIONS = ["Division I", "Division II", "Division III", "NAIA", "NJCAA"]

interface CollegeMapping {
  id: number
  college_name: string
  division: string
  created_at: string
}

export default function CollegeDivisionMappingPage() {
  const [mappings, setMappings] = useState<CollegeMapping[]>([])
  const [loading, setLoading] = useState(true)
  const [addingCollege, setAddingCollege] = useState(false)
  const [newCollegeName, setNewCollegeName] = useState("")
  const [newDivision, setNewDivision] = useState("Division I")
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadMappings = async () => {
    try {
      const response = await fetch("/api/debug/college-mappings")
      if (!response.ok) {
        throw new Error("Failed to load mappings")
      }
      const data = await response.json()
      setMappings(data.mappings || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load mappings")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMappings()
  }, [])

  const addCollege = async () => {
    if (!newCollegeName.trim()) {
      setError("College name is required")
      return
    }

    setAddingCollege(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("/api/debug/college-mappings-insert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          college_name: newCollegeName.trim(),
          division: newDivision,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(`${data.error}: ${data.details}`)
        return
      }

      setSuccess(`Successfully added ${newCollegeName}`)
      setNewCollegeName("")
      setNewDivision("Division I")
      await loadMappings()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add college")
    } finally {
      setAddingCollege(false)
    }
  }

  const filteredMappings = mappings.filter((mapping) =>
    mapping.college_name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getDivisionColor = (division: string) => {
    switch (division) {
      case "Division I":
        return "bg-red-100 text-red-800"
      case "Division II":
        return "bg-blue-100 text-blue-800"
      case "Division III":
        return "bg-green-100 text-green-800"
      case "NAIA":
        return "bg-purple-100 text-purple-800"
      case "NJCAA":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">College Division Mapping</h1>
          <p className="text-gray-600">Manage college division assignments for accurate statistics</p>
        </div>
        <Link href="/debug/college-mappings-test">
          <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Debug Tool
          </Button>
        </Link>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6">
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Plus className="mr-2 h-5 w-5" />
              Add New College
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">College Name</label>
                <Input
                  placeholder="Enter college name"
                  value={newCollegeName}
                  onChange={(e) => setNewCollegeName(e.target.value)}
                  disabled={addingCollege}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Division</label>
                <Select value={newDivision} onValueChange={setNewDivision} disabled={addingCollege}>
                  <SelectTrigger>
                    <SelectValue />
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

              <Button onClick={addCollege} disabled={addingCollege || !newCollegeName.trim()} className="w-full">
                {addingCollege ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                {addingCollege ? "Adding..." : "Add College"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Mappings ({mappings.length})</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search colleges..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading mappings...</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredMappings.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    {searchTerm ? "No colleges match your search" : "No mappings found"}
                  </p>
                ) : (
                  filteredMappings.map((mapping) => (
                    <div key={mapping.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{mapping.college_name}</p>
                        <p className="text-sm text-gray-500">
                          Added {new Date(mapping.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge className={getDivisionColor(mapping.division)}>{mapping.division}</Badge>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
