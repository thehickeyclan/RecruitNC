"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Database, CheckCircle, AlertCircle } from "lucide-react"

export default function AddLastLoginColumnPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const addColumn = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/admin/add-last-login-column", {
        method: "POST",
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        message: "Failed to add column: " + (error as Error).message,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-6 w-6" />
            Add Last Login Column
          </CardTitle>
          <CardDescription>
            Add the last_login_at column to the user_profiles table to track user login times.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {result && (
            <Alert className={`mb-4 ${result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
              {result.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={result.success ? "text-green-800" : "text-red-800"}>
                {result.message}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <p className="text-gray-600">
              This will add a timestamp column to track when users last logged in. This is optional and the system will
              work without it.
            </p>

            <Button onClick={addColumn} disabled={loading} className="w-full">
              {loading ? "Adding Column..." : "Add Last Login Column"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
