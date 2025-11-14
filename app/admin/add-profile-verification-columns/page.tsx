"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, AlertCircle, Database } from "lucide-react"

export default function AddProfileVerificationColumnsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleAddColumns = async () => {
    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/run-script/add-profile-verification-columns", {
        method: "POST",
      })

      const data = await response.json()

      if (response.ok) {
        setResult({
          success: true,
          message: data.message || "Columns added successfully!",
        })
      } else {
        setResult({
          success: false,
          message: data.error || "Failed to add columns",
        })
      }
    } catch (error) {
      setResult({
        success: false,
        message: "Network error occurred",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-6 w-6" />
              Add Profile Verification Columns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">This will add:</h3>
                <ul className="text-blue-800 text-sm space-y-1">
                  <li>
                    • <code>claimed_at</code> - Timestamp when profile was claimed
                  </li>
                  <li>
                    • <code>profile_verified</code> - Boolean for verification status
                  </li>
                  <li>
                    • <code>verified_at</code> - Timestamp when profile was verified
                  </li>
                  <li>• Database indexes for better performance</li>
                </ul>
              </div>

              <Button onClick={handleAddColumns} disabled={isLoading} className="w-full">
                {isLoading ? "Adding Columns..." : "Add Profile Verification Columns"}
              </Button>

              {result && (
                <div
                  className={`rounded-lg p-4 ${
                    result.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span className={`font-medium ${result.success ? "text-green-800" : "text-red-800"}`}>
                      {result.success ? "Success!" : "Error"}
                    </span>
                  </div>
                  <p className={`mt-1 text-sm ${result.success ? "text-green-700" : "text-red-700"}`}>
                    {result.message}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
