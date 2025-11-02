"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function DatabaseIdentityCheck() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const checkDatabaseIdentity = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/database-identity", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        error: "Failed to check database identity",
        details: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  const dashboardResult = {
    current_database: "postgres",
    current_user: "postgres",
    version: "PostgreSQL 17.4 on aarch64-unknown-linux-gnu, compiled by gcc (GCC) 13.2.0, 64-bit",
  }

  const isMatch =
    result?.success &&
    result?.database_info &&
    result.database_info.current_database === dashboardResult.current_database &&
    result.database_info.current_user === dashboardResult.current_user &&
    result.database_info.version === dashboardResult.version

  return (
    <div className="container mx-auto p-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>🔍 Database Identity Verification</CardTitle>
          <CardDescription>
            Let's verify your app is connected to the same database as your Supabase dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-blue-500 bg-blue-50">
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Dashboard Query Result:</p>
                <pre className="text-xs bg-white p-2 rounded border">{JSON.stringify(dashboardResult, null, 2)}</pre>
              </div>
            </AlertDescription>
          </Alert>

          <Button onClick={checkDatabaseIdentity} disabled={loading} className="w-full">
            {loading ? "Checking..." : "Check API Database Connection"}
          </Button>

          {result && (
            <div className="space-y-4">
              <Alert className={`${isMatch ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}`}>
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">{isMatch ? "✅ DATABASES MATCH!" : "❌ DATABASES DON'T MATCH!"}</p>
                    {isMatch ? (
                      <p className="text-sm">Your app and dashboard are connected to the same database.</p>
                    ) : (
                      <p className="text-sm">Your app and dashboard are connected to different databases!</p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <p className="font-medium text-sm">API Query Result:</p>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>

              {!isMatch && result?.success && (
                <Alert className="border-yellow-500 bg-yellow-50">
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">Next Steps:</p>
                      <ul className="text-sm space-y-1 list-disc list-inside">
                        <li>Check your environment variables (.env.local)</li>
                        <li>Verify NEXT_PUBLIC_SUPABASE_URL matches your dashboard project</li>
                        <li>Confirm you're using the right Supabase project</li>
                        <li>Restart your development server after env changes</li>
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Environment Variables Check</CardTitle>
          <CardDescription>Verify your connection settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Expected format:</strong>
            </p>
            <p>NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co</p>
            <p>SUPABASE_SERVICE_ROLE_KEY=eyJ... (long key)</p>
            <p className="text-gray-500 mt-2">
              Make sure the [project-id] in your URL matches the project you're looking at in the dashboard.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
