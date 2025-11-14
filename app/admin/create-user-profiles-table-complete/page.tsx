"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Database } from "lucide-react"

export default function CreateUserProfilesTablePage() {
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const runScript = async () => {
    setIsRunning(true)
    setResult(null)

    try {
      const response = await fetch("/api/run-script/create-user-profiles-table-complete", {
        method: "POST",
      })

      const data = await response.json()
      setResult(data)
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || "Failed to run script",
      })
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-6 w-6" />
            Create User Profiles Table
          </CardTitle>
          <CardDescription>
            This will create the complete user_profiles table with all necessary columns including last_login_at
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">This script will create:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Complete user_profiles table with all columns</li>
              <li>last_login_at column for tracking user activity</li>
              <li>Performance indexes</li>
              <li>Row Level Security policies</li>
              <li>Auto-updating timestamps</li>
              <li>Role validation constraints</li>
            </ul>
          </div>

          <Button onClick={runScript} disabled={isRunning} className="w-full">
            {isRunning ? "Creating Table..." : "Run Script"}
          </Button>

          {result && (
            <Alert className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
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

          {result?.success && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">Next Steps:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700">
                <li>
                  Go to <code>/admin/users</code> to manage users
                </li>
                <li>The authentication system will now work properly</li>
                <li>Last login tracking is now enabled</li>
              </ol>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
