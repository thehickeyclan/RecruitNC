"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { EntityLogo } from "@/components/entity-logo"
import { getLogoUrl } from "@/lib/logo-mappings"

export default function LogoSystemTestPage() {
  const [testResults, setTestResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Test cases that should work (from homepage)
  const testCases = [
    { name: "Liam Hickey", college: "UNC Chapel Hill", highschool: "Cardinal Gibbons", club: "Darkhorse" },
    { name: "Colt Campbell", college: "Campbell University", highschool: "Hickory Ridge", club: "RAW" },
    { name: "Lorenzo Alston", college: "NC State", highschool: "McDowell", club: "Team Savage" },
  ]

  const runTests = async () => {
    setLoading(true)
    const results = []

    for (const testCase of testCases) {
      console.log(`🧪 Testing logos for ${testCase.name}`)

      const result = {
        athlete: testCase.name,
        tests: {},
      }

      // Test college logo
      try {
        const collegeLogo = await getLogoUrl("college", testCase.college)
        result.tests.college = {
          entity: testCase.college,
          logoUrl: collegeLogo,
          success: !!collegeLogo,
        }
        console.log(`College ${testCase.college}:`, collegeLogo)
      } catch (error) {
        result.tests.college = {
          entity: testCase.college,
          error: error.message,
          success: false,
        }
      }

      // Test high school logo
      try {
        const hsLogo = await getLogoUrl("highschool", testCase.highschool)
        result.tests.highschool = {
          entity: testCase.highschool,
          logoUrl: hsLogo,
          success: !!hsLogo,
        }
        console.log(`High School ${testCase.highschool}:`, hsLogo)
      } catch (error) {
        result.tests.highschool = {
          entity: testCase.highschool,
          error: error.message,
          success: false,
        }
      }

      // Test club logo
      try {
        const clubLogo = await getLogoUrl("club", testCase.club)
        result.tests.club = {
          entity: testCase.club,
          logoUrl: clubLogo,
          success: !!clubLogo,
        }
        console.log(`Club ${testCase.club}:`, clubLogo)
      } catch (error) {
        result.tests.club = {
          entity: testCase.club,
          error: error.message,
          success: false,
        }
      }

      results.push(result)
    }

    setTestResults(results)
    setLoading(false)
  }

  const testDatabaseDirectly = async () => {
    try {
      const response = await fetch("/api/debug/logo-mappings-detailed")
      const data = await response.json()
      console.log("🗄️ Database contents:", data)
    } catch (error) {
      console.error("Database test failed:", error)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Logo System Debug</h1>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Test Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button onClick={runTests} disabled={loading}>
                {loading ? "Running Tests..." : "Run Logo Tests"}
              </Button>
              <Button onClick={testDatabaseDirectly} variant="outline">
                Check Database
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Visual Test */}
        <Card>
          <CardHeader>
            <CardTitle>Visual Logo Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {testCases.map((testCase) => (
                <div key={testCase.name} className="border p-4 rounded">
                  <h3 className="font-bold mb-2">{testCase.name}</h3>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <EntityLogo entityName={testCase.college} entityType="college" size={24} />
                      <span className="text-sm">{testCase.college}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <EntityLogo entityName={testCase.highschool} entityType="highschool" size={24} />
                      <span className="text-sm">{testCase.highschool}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <EntityLogo entityName={testCase.club} entityType="club" size={24} />
                      <span className="text-sm">{testCase.club}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Test Results */}
        {testResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {testResults.map((result, index) => (
                  <div key={index} className="border p-4 rounded">
                    <h3 className="font-bold mb-2">{result.athlete}</h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {Object.entries(result.tests).map(([type, test]: [string, any]) => (
                        <div key={type} className="bg-gray-50 p-2 rounded">
                          <div className="font-medium capitalize">{type}</div>
                          <div className="text-sm text-gray-600">{test.entity}</div>
                          <div className={`text-sm ${test.success ? "text-green-600" : "text-red-600"}`}>
                            {test.success ? "✅ Found" : "❌ Not Found"}
                          </div>
                          {test.logoUrl && <div className="text-xs text-blue-600 break-all">{test.logoUrl}</div>}
                          {test.error && <div className="text-xs text-red-600">{test.error}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Raw Database Query Test */}
        <Card>
          <CardHeader>
            <CardTitle>Raw Database Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Check browser console for database contents</p>
              <div className="bg-gray-100 p-2 rounded text-xs">
                <div>Expected entities:</div>
                <div>• College: UNC Chapel Hill, Campbell University, NC State</div>
                <div>• High School: Cardinal Gibbons, Hickory Ridge, McDowell</div>
                <div>• Club: Darkhorse, RAW, Team Savage</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
