"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { HardLink } from "@/components/hard-link"
import { Loader2, ArrowLeft } from "lucide-react"

export default function NHSCADuals2026AccessPage() {
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const trimmed = code.trim()
    if (!trimmed) {
      setError("Please enter your access code.")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/national-team/hub/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
        credentials: "include",
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success) {
        window.location.href = "/national-team/nhsca-duals-2026"
        return
      }
      setError(typeof data.error === "string" ? data.error : "Invalid access code.")
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#002147] flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md border-2 border-[#CBAF5D]/40 bg-white shadow-xl">
        <CardHeader className="text-center pb-2">
          <h1 className="text-xl font-bold text-[#002147]">NHSCA Duals 2026</h1>
          <p className="text-sm text-gray-600">Enter your access code to view the team hub (roster, gear &amp; team chat).</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              type="text"
              placeholder="Access code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={loading}
              className="font-mono"
              autoFocus
              autoComplete="off"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#002147] hover:bg-[#003366] text-[#CBAF5D] font-semibold"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Continue to team hub"}
            </Button>
          </form>
          <p className="text-center">
            <HardLink href="/national-team" className="inline-flex items-center gap-1 text-sm text-[#002147] hover:underline">
              <ArrowLeft className="w-4 h-4" /> Back to National Team
            </HardLink>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
