"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface LogoMapping {
  id: string
  entity_name: string
  entity_type: string
  logo_url: string
}

export default function LogoDatabaseCheck() {
  const [logoMappings, setLogoMappings] = useState<LogoMapping[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("Appalachian")

  const fetchLogoMappings = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/logo-mappings-detailed")
      const data = await response.json()
      setLogoMappings(data.mappings || [])
    } catch (error) {
      console.error("Error fetching logo mappings:", error)
    } finally {
      setLoading(false)
    }
  }

  const testSpecificLogo = async (type: string, name: string) => {
    console.log(`🧪 Testing logo fetch for ${type} - ${name}`)
    try {
      const response = await fetch(`/api/logo-mappings/by-entity/${type}/${encodeURIComponent(name)}`)
      const data = await response.json()
      console.log(`🧪 Result:`, data)
    } catch (error) {
      console.error(`🧪 Error:`, error)
    }
  }

  useEffect(() => {
    fetchLogoMappings()
  }, [])

  const filteredMappings = logoMappings.filter(
    (mapping) =>
      mapping.entity_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mapping.entity_type.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const groupedMappings = filteredMappings.reduce(
    (acc, mapping) => {
      if (!acc[mapping.entity_type]) {
        acc[mapping.entity_type] = []
      }
      acc[mapping.entity_type].push(mapping)
      return acc
    },
    {} as Record<string, LogoMapping[]>,
  )

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Logo Database Check</h1>

      <div className="mb-6 space-y-4">
        <div>
          <input
            type="text"
            placeholder="Search entity names or types..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => testSpecificLogo("college", "Appalachian State")}>
            Test: Appalachian State (college)
          </Button>
          <Button onClick={() => testSpecificLogo("college", "appalachian state")}>
            Test: appalachian state (lowercase)
          </Button>
          <Button onClick={() => testSpecificLogo("college", "Appalachian State University")}>
            Test: Appalachian State University
          </Button>
          <Button onClick={() => testSpecificLogo("highschool", "Cardinal Gibbons")}>
            Test: Cardinal Gibbons (highschool)
          </Button>
        </div>

        <Button onClick={fetchLogoMappings} disabled={loading}>
          {loading ? "Loading..." : "Refresh Data"}
        </Button>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Total Mappings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{logoMappings.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Entity Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {Object.keys(groupedMappings).map((type) => (
                  <div key={type} className="flex justify-between">
                    <span>{type}</span>
                    <span className="font-bold">{groupedMappings[type].length}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Filtered Results</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{filteredMappings.length}</p>
            </CardContent>
          </Card>
        </div>

        {Object.entries(groupedMappings).map(([entityType, mappings]) => (
          <Card key={entityType}>
            <CardHeader>
              <CardTitle>
                {entityType} ({mappings.length} entries)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-96 overflow-y-auto">
                {mappings.map((mapping) => (
                  <div key={mapping.id} className="p-2 border rounded text-sm">
                    <div className="font-medium truncate" title={mapping.entity_name}>
                      {mapping.entity_name}
                    </div>
                    <div className="text-gray-500 text-xs truncate" title={mapping.logo_url}>
                      {mapping.logo_url}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-1 text-xs bg-transparent"
                      onClick={() => testSpecificLogo(entityType, mapping.entity_name)}
                    >
                      Test
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
