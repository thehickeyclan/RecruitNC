"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function DirectImageTest() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const runTest = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/test-direct-image", {
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
        error: "Failed to run test",
        details: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  const runDiagnostics = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/test-direct-image", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        error: "Failed to run diagnostics",
        details: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  const uploadSampleData = async () => {
    setLoading(true)
    try {
      const sampleData = {
        wrestler_id: "liam_hickey_2025",
        first_name: "Liam",
        last_name: "Hickey",
        season: "2024-25",
        grade: "12",
        high_school: "Cardinal Gibbons",
        total_matches: 25,
        wins: 22,
        losses: 3,
        pins: 15,
        tech_falls: 4,
        decisions: 3,
        major_decisions: 0,
        forfeits_won: 0,
        pin_percentage: 68.18,
        tf_percentage: 18.18,
        finishing_percentage: 86.36,
        matches: [
          {
            date: "2024-12-01",
            opponent: "John Smith",
            result: "Win",
            method: "Pin",
            time: "2:15",
          },
        ],
      }

      const response = await fetch("/api/test-direct-image", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sampleData),
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        error: "Failed to upload sample data",
        details: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  const copyCreateTableSQL = () => {
    const sql = `-- Drop and recreate matches table with proper permissions
DROP TABLE IF EXISTS matches;

CREATE TABLE matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wrestler_id TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  season TEXT,
  grade TEXT,
  high_school TEXT,
  total_matches INTEGER,
  wins INTEGER,
  losses INTEGER,
  pins INTEGER,
  tech_falls INTEGER,
  decisions INTEGER,
  major_decisions INTEGER,
  forfeits_won INTEGER,
  pin_percentage DECIMAL(5,2),
  tf_percentage DECIMAL(5,2),
  finishing_percentage DECIMAL(5,2),
  matches JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Set up proper permissions
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Create policy for service role
CREATE POLICY "Allow service role full access" ON matches
FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON matches TO authenticated;
GRANT ALL ON matches TO anon;
GRANT ALL ON matches TO service_role;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO service_role;`

    navigator.clipboard.writeText(sql)
    alert("Complete table creation SQL copied! This will recreate the table with proper API access.")
  }

  return (
    <div className="container mx-auto p-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>🔧 Complete Table Recreation</CardTitle>
          <CardDescription>
            Since the table exists in dashboard but API can't see it, let's recreate it properly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-red-500 bg-red-50">
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">The API still can't see your matches table</p>
                <p className="text-sm">
                  This suggests the table was created in a way that the API can't access. Let's recreate it properly.
                </p>
              </div>
            </AlertDescription>
          </Alert>

          <Button onClick={copyCreateTableSQL} className="w-full bg-red-600 hover:bg-red-700">
            📋 Copy Complete Table Recreation SQL
          </Button>

          <div className="text-xs text-gray-500 space-y-1">
            <p>This will:</p>
            <p>1. Drop the existing matches table</p>
            <p>2. Recreate it with proper API permissions</p>
            <p>3. Set up all necessary grants and policies</p>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>🔍 Run Full Diagnostics</CardTitle>
          <CardDescription>Check what tables the API can actually see</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={runDiagnostics} disabled={loading} className="w-full">
            {loading ? "Running..." : "Run Full Database Diagnostics"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Database Access</CardTitle>
          <CardDescription>Test the matches table after recreation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={runTest} disabled={loading} className="w-full">
            {loading ? "Testing..." : "Test Matches Table Access"}
          </Button>

          <Button onClick={uploadSampleData} disabled={loading} className="w-full bg-transparent" variant="outline">
            {loading ? "Uploading..." : "Upload Sample Liam Hickey Data"}
          </Button>

          {result && (
            <div className="mt-4">
              <div className="mb-2 text-sm font-medium">{result.success ? "✅ Success" : "❌ Failed"}</div>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
