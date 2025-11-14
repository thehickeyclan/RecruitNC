"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export default function FixColtHickoryRidgePage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleFix = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/fix-colt-hickory-ridge", {
        method: "POST",
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ error: "Failed to update" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Fix Colt Campbell High School</h1>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <p>
          This will update Colt Campbell's high school from "Hickory Ridge High School" to "Hickory Ridge" to match
          Brady Donovan's format.
        </p>
      </div>

      <Button onClick={handleFix} disabled={loading}>
        {loading ? "Updating..." : "Fix Colt Campbell's High School"}
      </Button>

      {result && (
        <div
          className={`mt-4 p-4 rounded-lg ${result.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
        >
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
