"use client"

import { useState } from "react"
import { MessageSquareHeart } from "lucide-react"

const RATINGS = [
  { value: "great", label: "Love it" },
  { value: "good", label: "It's good" },
  { value: "needs_work", label: "Needs work" },
] as const

/**
 * "How are we doing?" on the Command Center home (Matt, 6 Nov 2026: "our goal is elite... tell
 * us how we are doing or what would be helpful"). One tap and an optional note; it reaches staff
 * by text the moment it is sent.
 */
export function FamilyFeedback({ athleteId }: { athleteId: string | null }) {
  const [rating, setRating] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle")

  const send = async () => {
    setState("sending")
    const res = await fetch("/api/my-recruiting/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ rating, message, athleteId, page: window.location.pathname }),
    }).catch(() => null)
    setState(res?.ok ? "sent" : "error")
  }

  if (state === "sent") {
    return (
      <section className="mt-6 rounded-xl border border-[#D3B574]/40 bg-[#D3B574]/[0.06] p-5">
        <p className="text-base font-black text-white">Thank you. We read every one.</p>
        <p className="mt-1 text-sm text-white/60">Your note went straight to our team.</p>
      </section>
    )
  }

  return (
    <section aria-labelledby="cc-feedback" className="mt-6 rounded-xl border border-white/10 bg-[#0f1c2e] p-5">
      <div className="flex items-center gap-2">
        <MessageSquareHeart className="h-5 w-5 text-[#D3B574]" aria-hidden />
        <h2 id="cc-feedback" className="text-sm font-black uppercase tracking-[0.14em] text-white">
          How are we doing?
        </h2>
      </div>
      <p className="mt-1 text-sm text-white/60">Our goal is to be the best recruiting help your family has. Tell us what is working, what is not, or what would help.</p>
      <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="How are we doing">
        {RATINGS.map((r) => (
          <button
            key={r.value}
            type="button"
            role="radio"
            aria-checked={rating === r.value}
            onClick={() => setRating(rating === r.value ? null : r.value)}
            className={`min-h-[40px] rounded-full border px-4 text-sm font-bold transition ${
              rating === r.value ? "border-[#D3B574] bg-[#D3B574] text-[#0A1628]" : "border-white/20 text-white/80 hover:border-[#D3B574]/60"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <label className="mt-3 block">
        <span className="sr-only">Your feedback</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 2000))}
          rows={3}
          placeholder="What would make this more helpful for your family?"
          className="w-full rounded-lg border border-white/15 bg-[#0A1628] p-3 text-sm text-white placeholder:text-white/35 focus:border-[#D3B574] focus:outline-none"
        />
      </label>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          disabled={state === "sending" || (!rating && message.trim().length < 3)}
          onClick={() => void send()}
          className="min-h-[40px] rounded-lg bg-[#D3B574] px-5 text-sm font-black text-[#0A1628] hover:bg-[#e0c68a] disabled:opacity-40"
        >
          {state === "sending" ? "Sending…" : "Send feedback"}
        </button>
        {state === "error" ? <p className="text-sm text-red-300">That did not send. Try again.</p> : null}
      </div>
    </section>
  )
}
