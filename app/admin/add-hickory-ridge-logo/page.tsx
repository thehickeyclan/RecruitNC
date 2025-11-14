"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AddHickoryRidgeLogoPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleAddLogo = async () => {
    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/admin/add-hickory-ridge-logo", {
        method: "POST",
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ success: false, error: "Failed to add logo mapping" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Add Hickory Ridge High School Logo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleAddLogo} disabled={isLoading}>
            {isLoading ? "Adding..." : "Add Hickory Ridge Logo Mapping"}
          </Button>

          {result && (
            <div className={`p-4 rounded ${result.success ? "bg-green-100" : "bg-red-100"}`}>
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
