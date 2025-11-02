"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import Image from "next/image"

export default function EntityLogosDebugPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/debug/entity-logos")
      if (!response.ok) {
        throw new Error(`Error fetching data: ${response.statusText}`)
      }
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error("Error fetching data:", err)
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Entity Logos Debug</h1>
        <Button onClick={fetchData} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Refresh
        </Button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : data ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Logo Lookup Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-muted">
                      <th className="border px-4 py-2 text-left">Type</th>
                      <th className="border px-4 py-2 text-left">Name</th>
                      <th className="border px-4 py-2 text-left">Found</th>
                      <th className="border px-4 py-2 text-left">Logo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.results.map((result: any, index: number) => (
                      <tr key={index} className={result.found ? "bg-green-50" : "bg-red-50"}>
                        <td className="border px-4 py-2">{result.type}</td>
                        <td className="border px-4 py-2">{result.name}</td>
                        <td className="border px-4 py-2">
                          {result.found ? (
                            <span className="text-green-600">✓</span>
                          ) : (
                            <span className="text-red-600">✗</span>
                          )}
                        </td>
                        <td className="border px-4 py-2">
                          {result.logoUrl ? (
                            <div className="flex items-center">
                              <div className="h-10 w-10 relative mr-2">
                                <Image
                                  src={result.logoUrl || "/placeholder.svg"}
                                  alt={result.name}
                                  fill
                                  className="object-contain"
                                />
                              </div>
                              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {result.logoUrl}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">No logo</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hayden's Data</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs">
                {JSON.stringify(data.hayden, null, 2)}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Liam's Data</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs">
                {JSON.stringify(data.liam, null, 2)}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>All Logo Mappings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-muted">
                      <th className="border px-4 py-2 text-left">ID</th>
                      <th className="border px-4 py-2 text-left">Entity Type</th>
                      <th className="border px-4 py-2 text-left">Entity Name</th>
                      <th className="border px-4 py-2 text-left">Logo URL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.allMappings.map((mapping: any) => (
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
