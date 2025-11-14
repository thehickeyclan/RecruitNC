"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react"

export default function AddNameFieldsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const runScript = async () => {
    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/run-script/add-name-fields-to-user-profiles", {
        method: "POST",
      })

      const data = await response.json()

      if (response.ok) {
        setResult({ success: true, message: data.message })
      } else {
        setResult({ success: false, message: data.error || "Failed to run script" })
      }
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "An unexpected error occurred",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Add Name Fields to User Profiles</CardTitle>
          <CardDescription>
            This will add first_name, last_name, full_name, and role columns to the user_profiles table and migrate
            existing data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800 mb-2">What this script does:</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Adds first_name, last_name, full_name, and role columns</li>
              <li>• Migrates existing name data by splitting into first/last names</li>
              <li>• Creates performance indexes</li>
              <li>• Safe to run multiple times</li>
            </ul>
          </div>

          {result && (
            <Alert variant={result.success ? "default" : "destructive"}>
              {result.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertDescription>{result.message}</AlertDescription>
            </Alert>
          )}

          <Button onClick={runScript} disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running Script...
              </>
            ) : (
              "Run Database Migration"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
