"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { deleteWrestlerMatches } from "@/app/nhsca/live/actions/quick-fix-actions"
import { Trash2 } from "lucide-react"

export function QuickFixPanel() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  async function handleDeleteGingerich() {
    setLoading(true)
    setMessage("")

    const result = await deleteWrestlerMatches("gingerich")
    setMessage(result.message)
    setLoading(false)

    // Refresh the page after 1 second
    setTimeout(() => window.location.reload(), 1000)
  }

  return (
    <div className="glass rounded-lg p-6 border border-red-500 bg-red-500/10">
      <h2 className="text-xl font-bold text-foreground mb-2">🚨 Quick Fix</h2>
      <p className="text-sm text-muted-foreground mb-4">Delete incorrect match data immediately</p>

      <div className="space-y-3">
        <Button onClick={handleDeleteGingerich} disabled={loading} variant="destructive" className="w-full">
          <Trash2 className="w-4 h-4 mr-2" />
          {loading ? "Deleting..." : "Delete Thomas Gingerich Matches"}
        </Button>

        {message && (
          <p className={`text-sm ${message.includes("Failed") ? "text-red-500" : "text-green-500"}`}>{message}</p>
        )}
      </div>
    </div>
  )
}
