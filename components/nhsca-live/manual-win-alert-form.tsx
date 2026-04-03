"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { createWinAlert } from "@/app/nhsca/live/actions/win-alert-actions"
import { Trophy } from "lucide-react"

export function ManualWinAlertForm() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    const formData = new FormData(e.currentTarget)

    const result = await createWinAlert({
      wrestlerName: formData.get("wrestlerName") as string,
      weightClass: formData.get("weightClass") as string,
      opponentName: formData.get("opponentName") as string,
      opponentSeed: formData.get("opponentSeed") ? Number.parseInt(formData.get("opponentSeed") as string) : undefined,
      winType: formData.get("winType") as string,
      score: formData.get("score") as string,
    })

    if (result.success) {
      setMessage("✅ Win alert posted!")
      ;(e.target as HTMLFormElement).reset()
    } else {
      setMessage(`❌ Error: ${result.error}`)
    }

    setLoading(false)
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="h-5 w-5 text-green-600" />
        <h3 className="text-lg font-bold text-green-900">Post Win Alert</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="wrestlerName">Wrestler Name</Label>
            <Input id="wrestlerName" name="wrestlerName" placeholder="Sammy Gantt" required />
          </div>

          <div>
            <Label htmlFor="weightClass">Weight Class</Label>
            <Input id="weightClass" name="weightClass" placeholder="138" required />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="opponentName">Opponent Name</Label>
            <Input id="opponentName" name="opponentName" placeholder="John Smith" required />
          </div>

          <div>
            <Label htmlFor="opponentSeed">Opponent Seed (optional)</Label>
            <Input id="opponentSeed" name="opponentSeed" type="number" placeholder="3" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="winType">Win Type</Label>
            <Input id="winType" name="winType" placeholder="Pin, Decision, Tech Fall" required />
          </div>

          <div>
            <Label htmlFor="score">Score</Label>
            <Input id="score" name="score" placeholder="10-5" required />
          </div>
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Posting..." : "Post Win Alert"}
        </Button>

        {message && <p className="text-sm text-center font-medium">{message}</p>}
      </form>
    </Card>
  )
}
