"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function ForceUpdatePage() {
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const forceUpdate = async () => {
    setLoading(true)
    setStatus("Updating Hayden's image...")

    try {
      const response = await fetch("/api/debug/force-update-hayden")

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }

      const data = await response.json()
      setStatus(`Success! ${data.message}`)
    } catch (error) {
      setStatus(`Failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Force Update Hayden's Image</h1>

      <Card>
        <CardHeader>
          <CardTitle>Force Update to Local Image</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">This will force update Hayden's image to use the local wrestler-profile.png file.</p>
          <Button onClick={forceUpdate} disabled={loading}>
            {loading ? "Updating..." : "Force Update Image"}
          </Button>

          {status && (
            <div className={`mt-4 p-3 rounded ${status.includes("Success") ? "bg-green-100" : "bg-amber-100"}`}>
              {status}
            </div>
          )}

          <div className="mt-6">
            <h3 className="font-medium mb-2">After updating:</h3>
            <ol className="list-decimal list-inside space-y-2">
              <li>
                Visit{" "}
                <a href="/debug/hayden-page" className="text-blue-600 underline">
                  Hayden Debug Page
                </a>{" "}
                to see if the image appears
              </li>
              <li>
                Visit{" "}
                <a href="/athletes" className="text-blue-600 underline">
                  Athletes Page
                </a>{" "}
                and click on Hayden to see if the image appears on the regular page
              </li>
              <li>Clear your browser cache if needed</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
