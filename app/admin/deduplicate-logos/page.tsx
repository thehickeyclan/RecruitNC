"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Trash2, RefreshCw, AlertTriangle } from "lucide-react"
import Image from "next/image"

interface LogoMapping {
  id: string
  entity_name: string
  entity_type: string
  logo_url: string
  created_at: string
}

interface DuplicateGroup {
  key: string
  count: number
  mappings: LogoMapping[]
}

interface DuplicateResponse {
  success: boolean
  totalMappings: number
  duplicateGroups: number
  duplicates: DuplicateGroup[]
}

export default function DeduplicateLogos() {
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [totalMappings, setTotalMappings] = useState(0)

  const loadDuplicates = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/deduplicate-logos")
      const data: DuplicateResponse = await response.json()

      if (data.success) {
        setDuplicates(data.duplicates)
        setTotalMappings(data.totalMappings)
      }
    } catch (error) {
      console.error("Failed to load duplicates:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDuplicates()
  }, [])

  const deduplicateGroup = async (group: DuplicateGroup) => {
    setProcessing(true)
    try {
      // Keep the first (oldest) mapping, delete the rest
      const idsToDelete = group.mappings.slice(1).map((m) => m.id)

      const response = await fetch("/api/admin/deduplicate-logos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idsToDelete }),
      })

      const result = await response.json()
      if (result.success) {
        await loadDuplicates() // Refresh the list
      }
    } catch (error) {
      console.error("Failed to deduplicate:", error)
    } finally {
      setProcessing(false)
    }
  }

  const deduplicateAll = async () => {
    setProcessing(true)
    try {
      // Collect all IDs to delete (keep first of each group)
      const allIdsToDelete: string[] = []

      duplicates.forEach((group) => {
        const idsToDelete = group.mappings.slice(1).map((m) => m.id)
        allIdsToDelete.push(...idsToDelete)
      })

      const response = await fetch("/api/admin/deduplicate-logos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idsToDelete: allIdsToDelete }),
      })

      const result = await response.json()
      if (result.success) {
        await loadDuplicates() // Refresh the list
      }
    } catch (error) {
      console.error("Failed to deduplicate all:", error)
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Scanning for duplicate logos...</span>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            🔧 Logo Deduplication Tool
            <Button onClick={loadDuplicates} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{totalMappings}</div>
              <div className="text-sm text-blue-600">Total Logo Mappings</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{duplicates.length}</div>
              <div className="text-sm text-orange-600">Duplicate Groups</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {duplicates.reduce((sum, group) => sum + (group.count - 1), 0)}
              </div>
              <div className="text-sm text-red-600">Extra Mappings to Remove</div>
            </div>
          </div>

          {duplicates.length > 0 && (
            <div className="flex justify-center">
              <Button onClick={deduplicateAll} variant="destructive" disabled={processing} className="mb-4">
                <Trash2 className="h-4 w-4 mr-2" />
                {processing ? "Processing..." : "Remove All Duplicates"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {duplicates.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>🔍 Duplicate Logo Groups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {duplicates.map((group, groupIndex) => (
                <div key={group.key} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-medium">{group.key.split(":")[1]}</h4>
                      <Badge variant="outline">{group.key.split(":")[0]}</Badge>
                      <Badge variant="destructive" className="ml-2">
                        {group.count} duplicates
                      </Badge>
                    </div>
                    <Button
                      onClick={() => deduplicateGroup(group)}
                      variant="destructive"
                      size="sm"
                      disabled={processing}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove {group.count - 1} Duplicates
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {group.mappings.map((mapping, index) => (
                      <div
                        key={mapping.id}
                        className={`flex items-center gap-4 p-3 rounded border ${
                          index === 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                        }`}
                      >
                        <div className="w-12 h-12 border rounded overflow-hidden bg-white">
                          <Image
                            src={mapping.logo_url || "/placeholder.svg"}
                            alt={mapping.entity_name}
                            width={48}
                            height={48}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{mapping.entity_name}</div>
                          <div className="text-sm text-muted-foreground">
                            Created: {new Date(mapping.created_at).toLocaleDateString()}
                          </div>
                          <div className="text-xs font-mono bg-white p-1 rounded mt-1">{mapping.logo_url}</div>
                        </div>
                        <div className="text-right">
                          {index === 0 ? (
                            <Badge variant="default">✅ Keep This</Badge>
                          ) : (
                            <Badge variant="destructive">🗑️ Will Delete</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>✅ No duplicate logo mappings found! Your logo database is clean.</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
