"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"

export default function CollegeDivisionMappingPage() {
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState("")

  const fetchMapping = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/debug/generate-college-division-mapping", {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      })
      if (!response.ok) {
        throw new Error("Failed to fetch mapping")
      }
      const data = await response.json()
      setMapping(data.mapping || {})
    } catch (err) {
      console.error("Error fetching mapping:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMapping()
  }, [])

  const copyToClipboard = () => {
    const text = JSON.stringify(mapping, null, 2)
    navigator.clipboard
      .writeText(text)
      .then(() => {
        alert("Mapping copied to clipboard!")
      })
      .catch((err) => {
        console.error("Failed to copy:", err)
        alert("Failed to copy to clipboard")
      })
  }

  const downloadMapping = () => {
    const text = JSON.stringify(mapping, null, 2)
    const blob = new Blob([text], { type: "application/json" })
    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = "college-division-mapping.json"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const filteredMapping = Object.entries(mapping)
    .filter(([college]) => college.toLowerCase().includes(filter.toLowerCase()))
    .sort(([a], [b]) => a.localeCompare(b))

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">College-to-Division Mapping</h1>

      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <Button onClick={fetchMapping} disabled={loading} className="w-full md:w-auto">
          {loading ? "Loading..." : "Refresh Mapping"}
        </Button>

        <Button
          onClick={copyToClipboard}
          disabled={loading || Object.keys(mapping).length === 0}
          className="w-full md:w-auto"
        >
          Copy to Clipboard
        </Button>

        <Button
          onClick={downloadMapping}
          disabled={loading || Object.keys(mapping).length === 0}
          className="w-full md:w-auto"
        >
          Download JSON
        </Button>

        <div className="flex-1">
          <Input
            placeholder="Filter by college name..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>Error: {error}</AlertDescription>
        </Alert>
      )}

      {!loading && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">
            Colleges ({filteredMapping.length} of {Object.keys(mapping).length})
          </h2>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">College</th>
                  <th className="px-4 py-2 text-left">Division</th>
                </tr>
              </thead>
              <tbody>
                {filteredMapping.map(([college, division]) => (
                  <tr key={college} className="border-t">
                    <td className="px-4 py-2">{college}</td>
                    <td className="px-4 py-2">{division}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredMapping.length === 0 && (
            <div className="text-center py-4 text-gray-500">No colleges found matching your filter</div>
          )}
        </div>
      )}

      {loading && <div className="text-center py-8">Loading...</div>}
    </div>
  )
}
