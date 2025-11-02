"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, AlertCircle, Upload } from "lucide-react"

interface LogoMapping {
  id: string
  entity_name: string
  entity_type: string
  logo_url: string
}

interface GeneratedMapping {
  entity_type: string
  entity_name: string
  logo_url: string
  division: string | null
}

export default function LogoManagementSystem() {
  const [mappings, setMappings] = useState<LogoMapping[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedType, setSelectedType] = useState<string>("all")
  const [generatedMappings, setGeneratedMappings] = useState<GeneratedMapping[]>([])
  const [showGenerated, setShowGenerated] = useState(false)
  const [updateForm, setUpdateForm] = useState({
    entityType: "",
    entityName: "",
    logoUrl: "",
  })
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    loadMappings()
  }, [])

  const loadMappings = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/logo-mappings")
      const data = await response.json()
      if (data.success) {
        setMappings(data.mappings || [])
      }
    } catch (error) {
      console.error("Error loading mappings:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAutoGenerate = async () => {
    setIsLoading(true)
    setMessage(null)
    setGeneratedMappings([])
    setShowGenerated(false)

    try {
      const response = await fetch("/api/admin/auto-generate-missing-logos", {
        method: "POST",
      })

      const data = await response.json()

      if (data.success) {
        setMessage({ type: "success", text: data.message })
        setGeneratedMappings(data.mappings || [])
        setShowGenerated(true)
        loadMappings() // Reload the mappings
      } else {
        setMessage({ type: "error", text: data.error || "Failed to generate mappings" })
      }
    } catch (err) {
      setMessage({ type: "error", text: "Network error occurred" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateLogo = async () => {
    if (!updateForm.entityType || !updateForm.entityName || !updateForm.logoUrl) {
      setMessage({ type: "error", text: "All fields are required" })
      return
    }

    setIsLoading(true)
    setMessage(null)

    try {
      const response = await fetch("/api/admin/update-specific-logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateForm),
      })

      const data = await response.json()

      if (data.success) {
        setMessage({ type: "success", text: data.message })
        setUpdateForm({ entityType: "", entityName: "", logoUrl: "" })
        loadMappings() // Reload the mappings
      } else {
        setMessage({ type: "error", text: data.error || "Failed to update logo" })
      }
    } catch (err) {
      setMessage({ type: "error", text: "Network error occurred" })
    } finally {
      setIsLoading(false)
    }
  }

  const filteredMappings = mappings.filter((mapping) => {
    const matchesSearch = mapping.entity_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = selectedType === "all" || mapping.entity_type === selectedType
    return matchesSearch && matchesType
  })

  const getEntityTypeColor = (type: string) => {
    switch (type) {
      case "highschool":
        return "bg-blue-100 text-blue-800"
      case "college":
        return "bg-green-100 text-green-800"
      case "club":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getEntityTypeLabel = (type: string) => {
    switch (type) {
      case "highschool":
        return "High School"
      case "college":
        return "College"
      case "club":
        return "Wrestling Club"
      default:
        return type
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Logo Management System</CardTitle>
          <CardDescription>Manage logo mappings for high schools, colleges, and wrestling clubs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleAutoGenerate} disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Auto-Generating Missing Logos...
              </>
            ) : (
              "Auto-Generate Missing Logo Mappings"
            )}
          </Button>

          {message && (
            <Alert variant={message.type === "error" ? "destructive" : "default"}>
              {message.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          {showGenerated && generatedMappings.length > 0 && (
            <Card className="bg-green-50 border-green-200">
              <CardHeader>
                <CardTitle className="text-green-800 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Generated Logo Mappings ({generatedMappings.length})
                </CardTitle>
                <CardDescription className="text-green-700">
                  The following entities now have generic logo mappings:
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {generatedMappings.map((mapping, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                      <div className="flex items-center gap-2">
                        <Badge className={getEntityTypeColor(mapping.entity_type)}>
                          {getEntityTypeLabel(mapping.entity_type)}
                        </Badge>
                        <span className="font-medium">{mapping.entity_name}</span>
                      </div>
                      <span className="text-sm text-gray-600">{mapping.logo_url}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Update Specific Logo</CardTitle>
          <CardDescription>Add or update a logo for a specific entity</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="entityType">Entity Type</Label>
              <Select
                value={updateForm.entityType}
                onValueChange={(value) => setUpdateForm((prev) => ({ ...prev, entityType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="highschool">High School</SelectItem>
                  <SelectItem value="college">College</SelectItem>
                  <SelectItem value="club">Wrestling Club</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="entityName">Entity Name</Label>
              <Input
                id="entityName"
                value={updateForm.entityName}
                onChange={(e) => setUpdateForm((prev) => ({ ...prev, entityName: e.target.value }))}
                placeholder="e.g., Hickory Ridge High School"
              />
            </div>
            <div>
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input
                id="logoUrl"
                value={updateForm.logoUrl}
                onChange={(e) => setUpdateForm((prev) => ({ ...prev, logoUrl: e.target.value }))}
                placeholder="e.g., /hickory-ridge-logo.png"
              />
            </div>
          </div>
          <Button onClick={handleUpdateLogo} disabled={isLoading}>
            <Upload className="mr-2 h-4 w-4" />
            Update Logo Mapping
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Logo Mappings ({filteredMappings.length})</CardTitle>
          <CardDescription>Search and filter existing logo mappings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="Search by entity name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="highschool">High Schools</SelectItem>
                <SelectItem value="college">Colleges</SelectItem>
                <SelectItem value="club">Wrestling Clubs</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="max-h-96 overflow-y-auto">
            <div className="grid gap-2">
              {filteredMappings.map((mapping) => (
                <div key={mapping.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-2">
                    <Badge className={getEntityTypeColor(mapping.entity_type)}>
                      {getEntityTypeLabel(mapping.entity_type)}
                    </Badge>
                    <span className="font-medium">{mapping.entity_name}</span>
                  </div>
                  <div className="text-sm text-gray-600">{mapping.logo_url}</div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
