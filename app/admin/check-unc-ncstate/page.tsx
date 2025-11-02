"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminHeader } from "@/components/admin-header"

export default function CheckUncNcStatePage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const runCheck = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/check-unc-ncstate")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to run check")
      }

      setResults(data)
    } catch (err: any) {
      setError(err.message || "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <AdminHeader
        title="Check UNC & NC State Athletes"
        description="Check and fix division values for UNC and NC State athletes"
      />

      <div className="mb-8">
        <Button onClick={runCheck} disabled={loading}>
          {loading ? "Running Check..." : "Check & Fix UNC/NC State Athletes"}
        </Button>
      </div>

      {error && <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">{error}</div>}

      {results && (
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>NC State Athletes</CardTitle>
              <CardDescription>
                Found {results.ncStateAthletes.length} athletes, updated {results.ncStateUpdates.length} with incorrect
                divisions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {results.ncStateAthletes.length > 0 ? (
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Name</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">College</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Division</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {results.ncStateAthletes.map((athlete: any) => (
                        <tr key={athlete.id}>
                          <td className="px-4 py-2 text-sm">{athlete.name}</td>
                          <td className="px-4 py-2 text-sm">{athlete.college}</td>
                          <td className="px-4 py-2 text-sm">{athlete.division}</td>
                          <td className="px-4 py-2 text-sm">
                            {athlete.division === "Division I" ? (
                              <span className="text-green-600">Correct</span>
                            ) : (
                              <span className="text-red-600">Updated to Division I</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No NC State athletes found</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>UNC Athletes</CardTitle>
              <CardDescription>
                Found {results.uncAthletes.length} athletes, updated {results.uncUpdates.length} with incorrect
                divisions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {results.uncAthletes.length > 0 ? (
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Name</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">College</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Division</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {results.uncAthletes.map((athlete: any) => (
                        <tr key={athlete.id}>
                          <td className="px-4 py-2 text-sm">{athlete.name}</td>
                          <td className="px-4 py-2 text-sm">{athlete.college}</td>
                          <td className="px-4 py-2 text-sm">{athlete.division}</td>
                          <td className="px-4 py-2 text-sm">
                            {athlete.division === "Division I" ? (
                              <span className="text-green-600">Correct</span>
                            ) : (
                              <span className="text-red-600">Updated to Division I</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No UNC athletes found</p>
              )}
            </CardContent>
          </Card>

          {(results.ncStateUpdates.length > 0 || results.uncUpdates.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>Updates Made</CardTitle>
                <CardDescription>
                  {results.ncStateUpdates.length + results.uncUpdates.length} athletes were updated
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Name</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Old Division</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">New Division</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {[...results.ncStateUpdates, ...results.uncUpdates].map((update: any) => (
                        <tr key={update.id}>
                          <td className="px-4 py-2 text-sm">{update.name}</td>
                          <td className="px-4 py-2 text-sm">{update.oldDivision || "None"}</td>
                          <td className="px-4 py-2 text-sm">{update.newDivision}</td>
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
