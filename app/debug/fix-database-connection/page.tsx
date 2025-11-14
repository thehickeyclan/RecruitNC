"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function FixDatabaseConnection() {
  const [envCheck, setEnvCheck] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const checkEnvironment = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/environment-check", {
        method: "POST",
      })
      const data = await response.json()
      setEnvCheck(data)
    } catch (error) {
      setEnvCheck({
        success: false,
        error: "Failed to check environment",
        details: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🔧 Fix Database Connection</CardTitle>
          <CardDescription>
            Your app is connected to a different database than your Supabase dashboard. Let's fix this.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-red-500 bg-red-50">
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">❌ Problem Identified:</p>
                <p className="text-sm">
                  Your Next.js app is connecting to a different Supabase database than the one you're viewing in your
                  dashboard. This is why the SQL scripts you run in the dashboard don't affect your app.
                </p>
              </div>
            </AlertDescription>
          </Alert>

          <Button onClick={checkEnvironment} disabled={loading} className="w-full">
            {loading ? "Checking..." : "🔍 Check Current Environment Variables"}
          </Button>

          {envCheck && (
            <div className="space-y-4">
              <Alert className="border-blue-500 bg-blue-50">
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">Current Environment Variables:</p>
                    <div className="text-sm space-y-1">
                      <div>
                        <strong>SUPABASE_URL:</strong> {envCheck.supabase_url || "Not set"}
                      </div>
                      <div>
                        <strong>Project ID:</strong> {envCheck.project_id || "Cannot extract"}
                      </div>
                      <div>
                        <strong>Has Service Key:</strong> {envCheck.has_service_key ? "✅ Yes" : "❌ No"}
                      </div>
                      <div>
                        <strong>Has Anon Key:</strong> {envCheck.has_anon_key ? "✅ Yes" : "❌ No"}
                      </div>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">How to Fix This:</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">1. Find Your Correct Supabase Project</h4>
                    <p className="text-sm text-gray-600">
                      In your Supabase dashboard, go to <strong>Settings → API</strong> and copy:
                    </p>
                    <ul className="text-sm list-disc list-inside space-y-1 ml-4">
                      <li>
                        <strong>Project URL</strong> (should look like: https://abcdefgh.supabase.co)
                      </li>
                      <li>
                        <strong>anon/public key</strong> (starts with "eyJ...")
                      </li>
                      <li>
                        <strong>service_role key</strong> (starts with "eyJ..." but longer)
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">2. Update Your Environment File</h4>
                    <p className="text-sm text-gray-600">
                      In your project root, find <code>.env.local</code> (or create it) and update:
                    </p>
                    <div className="bg-gray-100 p-3 rounded text-sm font-mono">
                      <div>NEXT_PUBLIC_SUPABASE_URL=https://[your-project-id].supabase.co</div>
                      <div>NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ[your-anon-key]</div>
                      <div>SUPABASE_SERVICE_ROLE_KEY=eyJ[your-service-role-key]</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">3. Restart Your Development Server</h4>
                    <p className="text-sm text-gray-600">
                      Stop your dev server (Ctrl+C) and restart it with <code>npm run dev</code> or{" "}
                      <code>yarn dev</code>
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">4. Verify the Fix</h4>
                    <p className="text-sm text-gray-600">
                      After restarting, go back to <code>/debug/database-identity</code> and check if the databases now
                      match.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {envCheck.project_id && (
                <Alert className="border-yellow-500 bg-yellow-50">
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">🔍 Current Project ID: {envCheck.project_id}</p>
                      <p className="text-sm">
                        Make sure this matches the project ID in your Supabase dashboard URL. Your dashboard URL should
                        be: https://supabase.com/dashboard/project/{envCheck.project_id}
                      </p>
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
          <CardTitle>🎯 Quick Test</CardTitle>
          <CardDescription>After fixing your environment variables, test the connection</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Button
              onClick={() => window.open("/debug/database-identity", "_blank")}
              variant="outline"
              className="w-full"
            >
              🔍 Re-check Database Identity
            </Button>
            <Button onClick={() => window.open("/test/direct-image", "_blank")} variant="outline" className="w-full">
              🧪 Test Database Access
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
