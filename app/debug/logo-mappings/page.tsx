"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import Image from "next/image"

export default function LogoMappingsDebugPage() {
  const [mappings, setMappings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMappings = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/logo-mappings")
      if (!response.ok) {
        throw new Error(`Error fetching mappings: ${response.statusText}`)
      }
      const data = await response.json()
      setMappings(data)
    } catch (err) {
      console.error("Error fetching mappings:", err)
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMappings()
  }, [])

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Logo Mappings Debug</h1>
        <Button onClick={fetchMappings} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Refresh
        </Button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Logo Mappings</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : mappings.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground">No logo mappings found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted">
                    <th className="border px-4 py-2 text-left">ID</th>
                    <th className="border px-4 py-2 text-left">Entity Type</th>
                    <th className="border px-4 py-2 text-left">Entity Name</th>
                    <th className="border px-4 py-2 text-left">Logo</th>
                    <th className="border px-4 py-2 text-left">Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.map((mapping) => (
                    <tr key={mapping.id} className="hover:bg-muted/50">
                      <td className="border px-4 py-2">{mapping.id}</td>
                      <td className="border px-4 py-2">{mapping.entity_type}</td>
                      <td className="border px-4 py-2">{mapping.entity_name}</td>
                      <td className="border px-4 py-2">
                        <div className="flex items-center">
                          <div className="h-10 w-10 relative mr-2">
                            <Image
                              src={mapping.logo_url || "/placeholder.svg"}
                              alt={mapping.entity_name}
                              fill
                              className="object-contain"
                            />
                          </div>
                          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {mapping.logo_url}
                          </span>
                        </div>
                      </td>
                      <td className="border px-4 py-2">{new Date(mapping.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
