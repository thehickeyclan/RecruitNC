"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { processFloUpdates } from "@/app/nhsca/live/actions/flo-actions"
import { Loader2 } from "lucide-react"

export function FloUpdateForm() {
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const result = await processFloUpdates(text)

      if (result.success) {
        setMessage({ type: "success", text: result.message })
        setText("") // Clear the form
      } else {
        setMessage({ type: "error", text: result.message })
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to process updates" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="glass rounded-lg p-6 border border-border space-y-4">
      <div>
        <label htmlFor="flo-updates" className="block text-sm font-medium text-foreground mb-2">
          Paste FloSports Updates
        </label>
        <Textarea
          id="flo-updates"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="FloSports: [5th Place] Liam N English (Journeymen) won by MD over Dominic Hittepole (Combat Ath.) 9-1 https://go.flo.zone/cBaOIc3H"
          rows={10}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground mt-2">
          Paste one or multiple FloSports text updates. The system will automatically parse and publish NC United
          results.
        </p>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg ${message.type === "success" ? "bg-[#B31B1B]/10 text-[#B31B1B]" : "bg-destructive/10 text-destructive"}`}
        >
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      <Button type="submit" disabled={loading || !text.trim()} className="w-full">
        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Process Updates
      </Button>
    </form>
  )
}
