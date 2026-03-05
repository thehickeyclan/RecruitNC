"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

export function EnrichAthleteButton({ signupId }: { signupId: string }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const handleEnrich = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/blue/signups/${encodeURIComponent(signupId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Failed to enrich athlete" })
        return
      }
      const athleteId = data.athleteId
      setMessage({
        type: "success",
        text: data.message ?? "Athlete profile updated.",
      })
      if (athleteId) {
        setTimeout(() => {
          window.location.href = `/view-profile?id=${encodeURIComponent(athleteId)}`
        }, 1500)
      }
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Request failed" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="default"
        size="sm"
        onClick={handleEnrich}
        disabled={loading}
        className="bg-[#003366] hover:bg-[#002147]"
      >
        {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
        {loading ? " Updating…" : "Push signup data to athlete profile"}
      </Button>
      {message && (
        <p className={`text-sm ${message.type === "success" ? "text-green-700" : "text-red-600"}`}>
          {message.text}
        </p>
      )}
    </div>
  )
}
