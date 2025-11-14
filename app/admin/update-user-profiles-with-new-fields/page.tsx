"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react"

export default function UpdateUserProfilesPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const runScript = async () => {
    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/run-script/update-user-profiles-with-new-fields", {
        method: "POST",
      })

      const data = await response.json()

      if (response.ok) {
        setResult({ success: true, message: data.message })
      } else {
        setResult({ success: false, message: data.error || "Failed to update table" })
      }
    } catch (error) {
      setResult({ success: false, message: "Network error occurred" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Update User Profiles Table</CardTitle>
          <CardDescription>
            Add required fields (first_name, last_name, cell_phone, role) to the user_profiles table
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">This script will:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li>Add first_name, last_name, cell_phone, and role columns</li>
              <li>Split existing name field into first_name and last_name</li>
              <li>Set default role as 'fan' for existing users</li>
              <li>Create performance indexes</li>
              <li>Add data validation constraints</li>
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
                Updating Table...
              </>
            ) : (
              "Update User Profiles Table"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
