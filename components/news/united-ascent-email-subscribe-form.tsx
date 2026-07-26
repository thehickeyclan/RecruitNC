"use client"

import { useState, type FormEvent } from "react"
import { CheckCircle2, Loader2 } from "lucide-react"

type Props = {
  source?: string
  compact?: boolean
}

export function UnitedAscentEmailSubscribeForm({ source = "united_ascent_cta", compact = false }: Props) {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [error, setError] = useState("")

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError("")
    const trimmed = email.trim()

    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus("error")
      setError("Enter a valid email address.")
      return
    }

    setStatus("loading")
    try {
      const res = await fetch("/api/news/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          source,
          segment: "united_ascent",
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        setStatus("error")
        setError(data.error || "Could not subscribe. Try again.")
        return
      }
      setEmail("")
      setStatus("success")
    } catch {
      setStatus("error")
      setError("Network error — try again.")
    }
  }

  if (status === "success") {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-[#D3B574]/35 bg-[#D3B574]/10 px-4 py-3 text-sm font-semibold text-[#F5DF9A]">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        You’re subscribed to United Ascent. No RecruitNC account required.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={compact ? "space-y-2" : "flex flex-col gap-3 sm:flex-row"}>
      <div className="min-w-0 flex-1">
        <label htmlFor={`united-ascent-email-${source}`} className="sr-only">
          Email address
        </label>
        <input
          id={`united-ascent-email-${source}`}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          disabled={status === "loading"}
          className="h-12 w-full rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-medium text-white outline-none placeholder:text-white/40 focus:border-[#D3B574] focus:ring-2 focus:ring-[#D3B574]/20"
        />
        {error ? <p className="mt-1 text-xs font-medium text-red-300">{error}</p> : null}
      </div>
      <button
        type="submit"
        disabled={status === "loading"}
        className="inline-flex h-12 items-center justify-center rounded-xl bg-[#D3B574] px-5 text-sm font-black text-[#071529] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
      >
        {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Subscribe Free"}
      </button>
    </form>
  )
}
