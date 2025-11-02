"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"

export default function AddClaimedByUserIdColumn() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState("")

  const handleAddColumn = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/run-script/add-claimed-by-user-id-to-athletes", {
        method: "POST",
      })
      const data = await response.json()
      setResult(JSON.stringify(data, null, 2))
    } catch (error) {
      setResult(`Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Add Claimed By User ID Column</h1>

      <Button onClick={handleAddColumn} disabled={loading}>
        {loading ? "Adding Column..." : "Add Column"}
      </Button>

      {result && <pre className="mt-4 p-4 bg-gray-100 rounded overflow-auto">{result}</pre>}
    </div>
  )
}
