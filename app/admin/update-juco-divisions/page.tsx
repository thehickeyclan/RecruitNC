"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminHeader } from "@/components/admin-header"
import { AuthGuard } from "@/components/auth-guard"

export default function UpdateJucoDivisionsPage() {
  const [isUpdating, setIsUpdating] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleUpdateDivisions = async () => {
    setIsUpdating(true)
    setError(null)

    try {
      const response = await fetch("/api/update-juco-to-njcaa")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update divisions")
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message || "An error occurred")
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <AuthGuard>
      <div className="container mx-auto py-6">
        <AdminHeader title="Update JuCo to NJCAA" />

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Update JuCo Divisions to NJCAA</CardTitle>
            <CardDescription>
              This tool will update all athletes with JuCo, Junior College, or similar divisions to use the standardized
              "NJCAA" label.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              This will ensure consistency across the application and fix the division breakdown on the homepage.
            </p>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>
            )}

            {result && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                <p className="font-bold">{result.message}</p>
                <p className="mt-2">Updated {result.updates.length} athletes</p>

                {result.updates.length > 0 && (
                  <div className="mt-4 max-h-60 overflow-y-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr>
                          <th className="text-left">ID</th>
                          <th className="text-left">College</th>
                          <th className="text-left">Old Division</th>
                          <th className="text-left">New Division</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.updates.map((update: any) => (
                          <tr key={update.id}>
                            <td>{update.id}</td>
                            <td>{update.college}</td>
                            <td>{update.oldDivision}</td>
                            <td>{update.newDivision}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={handleUpdateDivisions} disabled={isUpdating}>
              {isUpdating ? "Updating..." : "Update JuCo to NJCAA"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </AuthGuard>
  )
}
