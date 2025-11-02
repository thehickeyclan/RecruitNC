"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"

export default function TestBulkImportPage() {
  const [testData, setTestData] = useState<string>(`[
  {
    "name": "Test Athlete 1",
    "highSchool": "Test High School",
    "wrestlingClub": "Test Wrestling Club",
    "college": "Test College",
    "division": "NCAA D1",
    "commitmentDate": "2023-06-15",
    "achievements": ["State Champion", "Regional Champion"],
    "weightClass": "157",
    "graduationYear": 2025,
    "gender": "Male",
    "ncUnitedTeam": "blue"
  }
]`)
  const [result, setResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleTest = async () => {
    setIsLoading(true)
    try {
      const data = JSON.parse(testData)

      const response = await fetch("/api/athletes/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const result = await response.json()
      setResult(result)

      if (response.ok) {
        toast({
          title: "Test Successful",
          description: "The bulk import API returned a successful response",
        })
      } else {
        toast({
          title: "Test Failed",
          description: "The bulk import API returned an error",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      setResult({ error: error.message })
      toast({
        title: "Test Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="mb-6 text-3xl font-bold">Test Bulk Import</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test Data</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea value={testData} onChange={(e) => setTestData(e.target.value)} rows={15} className="font-mono" />
          <Button onClick={handleTest} disabled={isLoading} className="mt-4">
            {isLoading ? "Testing..." : "Test Import"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>API Response</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded-md overflow-auto">{JSON.stringify(result, null, 2)}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
