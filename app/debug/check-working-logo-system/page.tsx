"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function CheckWorkingLogoSystem() {
  const [testResults, setTestResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const runTest = async () => {
    setLoading(true)
    try {
      // Test the exact same API calls that work for Jackson Rowling
      const tests = [
        { name: "Jackson Rowling - Darkhorse", type: "club", entity: "Darkhorse" },
        { name: "Boedi Kirkland - Darkhorse", type: "club", entity: "Darkhorse" },
        { name: "Liam Hickey - Cardinal Gibbons", type: "highschool", entity: "Cardinal Gibbons High School" },
        { name: "Colt Campbell - App State", type: "college", entity: "Appalachian State University" },
      ]

      const results = []
      for (const test of tests) {
        try {
          const response = await fetch(`/api/logo-mappings/by-entity/${test.type}/${encodeURIComponent(test.entity)}`)
          const data = await response.json()
          results.push({
            ...test,
            success: data.success,
            logo_url: data.logo_url,
            error: data.error,
            raw_response: data
          })
        } catch (error) {
          results.push({
            ...test,
            success: false,
            error: error.message,
            raw_response: null
          })
        }
      }

      setTestResults(results)
    } catch (error) {
      console.error("Test error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Working Logo System Test</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={runTest} disabled={loading} className="mb-4">
            {loading ? "Testing..." : "Test Logo System"}
          </Button>

          {testResults && (
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <div key={index} className={`p-4 border rounded ${result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  <h3 className="font-bold">{result.name}</h3>
                  <p>Type: {result.type}, Entity: {result.entity}</p>
                  <p>Success: {result.success ? '✅' : '❌'}</p>
                  {result.logo_url && <p>Logo URL: {result.logo_url}</p>}
                  {result.error && <p className="text-red-600">Error: {result.error}</p>}
                  
                  {result.logo_url && (
                    <div className="mt-2">
                      <img 
                        src={result.logo_url || "/placeholder.svg"} 
                        alt={`${result.entity} logo`}
                        className="w-12 h-12 object-contain border"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                  
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-gray-600">Raw Response</summary>
                    <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                      {JSON.stringify(result.raw_response, null, 2)}
                    </pre>
                  </details>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
