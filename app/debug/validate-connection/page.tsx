"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function ValidateConnection() {
  const [result, setResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const testConnection = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/debug/validate-connection")
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        error: "Failed to test connection",
        details: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Database Connection Validation</h1>
        <p className="text-gray-600">Test if API can access your correct database</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Step 1: Run SQL in Dashboard</CardTitle>
          <CardDescription>Copy and run this SQL in your Supabase dashboard:</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-100 p-4 rounded font-mono text-sm overflow-x-auto">
            <pre>{`-- Create a simple test table to validate connection
CREATE TABLE IF NOT EXISTS connection_test (
  id SERIAL PRIMARY KEY,
  test_message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert a test record
INSERT INTO connection_test (test_message) 
VALUES ('Database connection validated at ' || NOW());

-- Check it was created
SELECT * FROM connection_test;`}</pre>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Step 2: Test API Connection</CardTitle>
          <CardDescription>Click to test if the API can see the table you just created</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={testConnection} disabled={isLoading} className="w-full">
            {isLoading ? "Testing Connection..." : "Test API Connection"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Connection Test Result</CardTitle>
          </CardHeader>
          <CardContent>
            {result.success ? (
              <Alert className="border-green-500 bg-green-50">
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold text-green-800">✅ {result.message}</p>
                    <p>Your API is now connected to the correct database!</p>
                    {result.data && result.data.length > 0 && (
                      <div className="mt-2">
                        <p className="font-medium">Test record found:</p>
                        <div className="bg-white p-2 rounded border text-sm">
                          <pre>{JSON.stringify(result.data[0], null, 2)}</pre>
                        </div>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-red-500 bg-red-50">
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold text-red-800">❌ Connection Failed</p>
                    <p>
                      <strong>Error:</strong> {result.error}
                    </p>
                    <p>
                      <strong>Details:</strong> {result.details}
                    </p>
                    {result.code && (
                      <p>
                        <strong>Code:</strong> {result.code}
                      </p>
                    )}
                    <p className="text-sm text-red-600 mt-2">
                      Make sure you ran the SQL in the correct database and your environment variables point to the same
                      database.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
