"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react"

export default function UpdateUserProfilesCellPhonePage() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<string>("")
  const [error, setError] = useState<string>("")

  const runUpdate = async () => {
    setIsLoading(true)
    setResult("")
    setError("")

    try {
      const response = await fetch("/api/run-script/update-user-profiles-add-cell-phone", {
        method: "POST",
      })

      const data = await response.json()

      if (response.ok) {
        setResult("User profiles table updated successfully! Cell phone column added.")
      } else {
        setError(data.error || "Failed to update table")
      }
    } catch (error) {
      setError("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Update User Profiles Table</CardTitle>
          <CardDescription>Add cell phone column to user_profiles table</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{result}</AlertDescription>
            </Alert>
          )}

          <Button onClick={runUpdate} disabled={isLoading} className="w-full">
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
