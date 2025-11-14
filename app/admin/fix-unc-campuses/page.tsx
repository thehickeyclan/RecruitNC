"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function FixUncCampusesPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const runFix = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/api/fix-unc-campuses")
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }
      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(`Failed to run fix: ${err instanceof Error ? err.message : String(err)}`)
      console.error("Error running fix:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Fix UNC Campus Divisions</h1>
      <p className="mb-6 text-gray-600">This tool will correctly set divisions for different UNC campuses:</p>
      <ul className="list-disc pl-6 mb-6 space-y-1 text-gray-600">
        <li>UNC Chapel Hill - Division I</li>
        <li>UNC Charlotte - Division I</li>
        <li>UNC Pembroke - Division II</li>
        <li>UNC Greensboro - Division I</li>
        <li>UNC Wilmington - Division I</li>
        <li>UNC Asheville - Division I</li>
        <li>NC State - Division I</li>
      </ul>

      <div className="mb-6">
        <Button onClick={runFix} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Run Fix"}
        </Button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p>
                  <span className="font-medium">Athletes Updated:</span> {result.totalUpdated}
                </p>
                <p>
                  <span className="font-medium">Message:</span> {result.message}
                </p>
              </div>
            </CardContent>
          </Card>

          {result.updates && result.updates.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Updated Athletes</CardTitle>
                {result.updates.length === 100 && <p className="text-sm text-gray-500">Showing first 100 updates</p>}
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          College
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Old Division
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          New Division
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {result.updates.map((update: any) => (
                        <tr key={update.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{update.id}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {update.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{update.college}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{update.oldDivision}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{update.newDivision}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
