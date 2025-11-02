"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, RefreshCw } from "lucide-react"
import { AdminHeader } from "@/components/admin-header"
import { AuthGuard } from "@/components/auth-guard"

export default function StandardizeDivisionsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const standardizeDivisions = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/admin/standardize-divisions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to standardize divisions")
      }

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthGuard>
      <div className="container py-8">
        <AdminHeader
          title="Standardize Division Names"
          description="Ensure consistent division naming across all athletes"
        />

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Standardize Division Names</CardTitle>
            <CardDescription>
              This utility will standardize all division names to the format "Division I", "Division II", "Division
              III", "NAIA", and "NJCAA" across all athletes in the database.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-amber-800">
                <h3 className="font-medium mb-2">How This Works</h3>
                <p className="text-sm mb-2">This utility will:</p>
                <ol className="list-decimal pl-5 text-sm space-y-1">
                  <li>Scan all athlete records in the database</li>
                  <li>Convert division names to the standardized format</li>
                  <li>Update records where the division name needs to be changed</li>
                  <li>Use college names to determine divisions when the division is unknown</li>
                </ol>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-blue-800">
                <h3 className="font-medium mb-2">Standardized Format</h3>
                <ul className="list-disc pl-5 text-sm">
                  <li>"Division I" (not DI, D1, NCAA D1, etc.)</li>
                  <li>"Division II" (not DII, D2, NCAA D2, etc.)</li>
                  <li>"Division III" (not DIII, D3, NCAA D3, etc.)</li>
                  <li>"NAIA" (National Association of Intercollegiate Athletics)</li>
                  <li>"NJCAA" (National Junior College Athletic Association)</li>
                </ul>
              </div>

              <Button onClick={standardizeDivisions} disabled={isLoading} className="mb-4">
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Standardizing divisions...
                  </>
                ) : (
                  "Standardize All Division Names"
                )}
              </Button>
            </div>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {result && (
              <Alert className="mt-4" variant={result.success ? "default" : "destructive"}>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Result</AlertTitle>
                <AlertDescription>
                  {result.message}
                  {result.updates && result.updates.length > 0 && (
                    <div className="mt-2">
                      <p className="font-semibold">Updated entries:</p>
                      <div className="mt-1 max-h-60 overflow-y-auto border rounded-md p-2">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-1">ID</th>
                              <th className="text-left p-1">Old Division</th>
                              <th className="text-left p-1">New Division</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.updates.map((update: any, index: number) => (
                              <tr key={index} className="border-b">
                                <td className="p-1">{update.id}</td>
                                <td className="p-1">{update.oldDivision || "None"}</td>
                                <td className="p-1">{update.newDivision}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {result.errors && result.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="font-semibold text-red-600">Errors:</p>
                      <div className="mt-1 max-h-40 overflow-y-auto border border-red-200 rounded-md p-2 bg-red-50">
                        <ul className="list-disc pl-5">
                          {result.errors.map((err: any, index: number) => (
                            <li key={index} className="text-red-600">
                              Athlete ID {err.id}: {err.error}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Division Format Reference</CardTitle>
            <CardDescription>Use this reference to understand the standardized division formats</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="border rounded-md p-4 bg-blue-50">
                <h3 className="font-bold text-blue-700">Division I</h3>
                <p className="text-sm text-gray-600 mt-1">NCAA's highest division</p>
                <p className="text-xs text-gray-500 mt-2">Examples: NC State, UNC, Ohio University</p>
              </div>

              <div className="border rounded-md p-4 bg-green-50">
                <h3 className="font-bold text-green-700">Division II</h3>
                <p className="text-sm text-gray-600 mt-1">NCAA's middle division</p>
                <p className="text-xs text-gray-500 mt-2">Examples: Queens University, UNC Pembroke</p>
              </div>

              <div className="border rounded-md p-4 bg-purple-50">
                <h3 className="font-bold text-purple-700">Division III</h3>
                <p className="text-sm text-gray-600 mt-1">NCAA's third division</p>
                <p className="text-xs text-gray-500 mt-2">Examples: Greensboro College, Guilford College</p>
              </div>

              <div className="border rounded-md p-4 bg-orange-50">
                <h3 className="font-bold text-orange-700">NAIA</h3>
                <p className="text-sm text-gray-600 mt-1">National Association of Intercollegiate Athletics</p>
                <p className="text-xs text-gray-500 mt-2">Separate athletic association from NCAA</p>
              </div>

              <div className="border rounded-md p-4 bg-red-50">
                <h3 className="font-bold text-red-700">NJCAA</h3>
                <p className="text-sm text-gray-600 mt-1">National Junior College Athletic Association</p>
                <p className="text-xs text-gray-500 mt-2">For two-year colleges and community colleges</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  )
}
