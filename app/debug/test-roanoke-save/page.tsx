"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestRoanokeSavePage() {
  const [results, setResults] = useState<any>({})
  const [loading, setLoading] = useState<string | null>(null)

  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    setLoading(testName)
    try {
      const result = await testFn()
      setResults((prev) => ({ ...prev, [testName]: { success: true, data: result } }))
    } catch (error) {
      setResults((prev) => ({ ...prev, [testName]: { success: false, error: error.message } }))
    } finally {
      setLoading(null)
    }
  }

  const testMediaItemsTable = async () => {
    const response = await fetch("/api/media-manager/search")
    const data = await response.json()
    return data
  }

  const testCollegeMappingsTable = async () => {
    const response = await fetch("/api/debug/college-mappings")
    const data = await response.json()
    return data
  }

  const testCreateMediaTable = async () => {
    const response = await fetch("/api/create-media-table-direct", { method: "POST" })
    const data = await response.json()
    return data
  }

  const testUploadSampleLogo = async () => {
    // Create a simple test image
    const canvas = document.createElement("canvas")
    canvas.width = 100
    canvas.height = 100
    const ctx = canvas.getContext("2d")
    ctx.fillStyle = "#0066cc"
    ctx.fillRect(0, 0, 100, 100)
    ctx.fillStyle = "white"
    ctx.font = "12px Arial"
    ctx.fillText("ROANOKE", 20, 50)

    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        const formData = new FormData()
        formData.append("file", blob, "roanoke-test.png")
        formData.append("college_name", "Roanoke College")
        formData.append("alt_text", "Roanoke, RC")
        formData.append("division", "NCAA Division III")
        formData.append("entity_type", "college")
        formData.append("description", "Test logo for Roanoke College")

        const response = await fetch("/api/media-manager/upload", {
          method: "POST",
          body: formData,
        })
        const data = await response.json()
        resolve(data)
      })
    })
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Test Roanoke Save Functionality</h1>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Check Media Items Table</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => runTest("mediaTable", testMediaItemsTable)} disabled={loading === "mediaTable"}>
              {loading === "mediaTable" ? "Testing..." : "Test Media Items Table"}
            </Button>
            {results.mediaTable && (
              <div className="mt-4 p-4 bg-gray-100 rounded">
                <pre>{JSON.stringify(results.mediaTable, null, 2)}</pre>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Step 2: Create Media Table (if needed)</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => runTest("createTable", testCreateMediaTable)} disabled={loading === "createTable"}>
              {loading === "createTable" ? "Creating..." : "Create Media Table"}
            </Button>
            {results.createTable && (
              <div className="mt-4 p-4 bg-gray-100 rounded">
                <pre>{JSON.stringify(results.createTable, null, 2)}</pre>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Step 3: Upload Sample Roanoke Logo</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => runTest("uploadLogo", testUploadSampleLogo)} disabled={loading === "uploadLogo"}>
              {loading === "uploadLogo" ? "Uploading..." : "Upload Test Logo"}
            </Button>
            {results.uploadLogo && (
              <div className="mt-4 p-4 bg-gray-100 rounded">
                <pre>{JSON.stringify(results.uploadLogo, null, 2)}</pre>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Step 4: Check College Mappings</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => runTest("collegeMappings", testCollegeMappingsTable)}
              disabled={loading === "collegeMappings"}
            >
              {loading === "collegeMappings" ? "Testing..." : "Test College Mappings"}
            </Button>
            {results.collegeMappings && (
              <div className="mt-4 p-4 bg-gray-100 rounded">
                <pre>{JSON.stringify(results.collegeMappings, null, 2)}</pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Next Steps:</h2>
        <ol className="list-decimal list-inside space-y-2">
          <li>Run "Test Media Items Table" - if it fails, the table doesn't exist</li>
          <li>If table doesn't exist, run "Create Media Table"</li>
          <li>Run "Upload Test Logo" to add a sample Roanoke logo</li>
          <li>Go back to /admin/enhanced-media-manager and see if the logo appears</li>
          <li>Try editing the logo's division and see if it saves</li>
        </ol>
      </div>
    </div>
  )
}
