"use client"

import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, CheckCircle2 } from "lucide-react"

type Props = {
  source?: string
}

export function TocEmailSignup({ source = "hero" }: Props) {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [error, setError] = useState("")

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    const trimmed = email.trim()
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Enter a valid email address")
      return
    }
    setStatus("loading")
    try {
      const res = await fetch("/api/toc/email-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, source }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus("error")
        setError(data.error || "Something went wrong")
        return
      }
      setStatus("success")
      setEmail("")
    } catch {
      setStatus("error")
      setError("Network error — try again")
    }
  }

  if (status === "success") {
    return (
      <div className="flex items-center gap-2 text-[#CBAF5D] font-medium">
        <CheckCircle2 className="h-5 w-5" />
        You&apos;re on the list — check your inbox for a confirmation.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-md sm:max-w-lg mx-auto sm:mx-0">
      <div className="flex-1 space-y-1 w-full">
        <Label htmlFor="toc-email" className="sr-only">
          Email
        </Label>
        <Input
          id="toc-email"
          type="email"
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-white/10 border-white/20 text-white placeholder:text-white/50 h-11"
          disabled={status === "loading"}
        />
        {error ? <p className="text-red-300 text-xs">{error}</p> : null}
      </div>
      <Button
        type="submit"
        disabled={status === "loading"}
        className="bg-[#CC0000] hover:bg-[#a80000] h-11 w-full sm:w-auto px-6 shrink-0 font-semibold uppercase tracking-wide"
      >
        {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Notify me"}
      </Button>
    </form>
  )
}
