"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

function displayFont(c: string) {
  return `font-[family-name:var(--font-fundraising-display)] ${c}`
}

/** Optional email alerts — new scholarship rounds / deadlines (hub links to live scholarships page). */
export function ScholarshipsInterestNotifyCard() {
  const [email, setEmail] = useState("")
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<"saved" | "duplicate" | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const submit = async () => {
    setErr(null)
    setBusy(true)
    try {
      const res = await fetch("/api/fundraising/scholarship-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = (await res.json()) as { ok?: boolean; duplicate?: boolean; error?: string }
      if (!res.ok || !data.ok) {
        setErr(data.error ?? "Something went wrong.")
        return
      }
      setDone(data.duplicate ? "duplicate" : "saved")
      if (!data.duplicate) setEmail("")
    } catch {
      setErr("Network error — try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#0B2545]/70 px-4 py-5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:px-6 sm:py-6">
      {done === "saved" ? (
        <p className={`${displayFont("text-center text-xs font-bold uppercase tracking-[0.14em] text-emerald-300/95 sm:text-left")}`}>
          Thanks — we&apos;ll email you when new scholarship rounds or deadlines post.
        </p>
      ) : done === "duplicate" ? (
        <p className={`${displayFont("text-center text-xs font-bold uppercase tracking-[0.14em] text-[#C8A94A]/90 sm:text-left")}`}>
          You&apos;re already on the list.
        </p>
      ) : (
        <form
          className="flex w-full flex-col gap-3 sm:flex-row sm:items-stretch"
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <div className="min-w-0 flex-1">
            <label htmlFor="scholarship-notify-email" className="sr-only">
              Email for optional scholarship alerts
            </label>
            <Input
              id="scholarship-notify-email"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="Optional — email for new rounds & deadlines"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              className="min-h-[48px] w-full border-white/15 bg-black/35 text-base text-white placeholder:text-white/35 focus-visible:ring-[#C8A94A]/40"
            />
          </div>
          <Button
            type="submit"
            disabled={busy || !email.trim()}
            className={`${displayFont(
              "h-auto min-h-[48px] w-full shrink-0 touch-manipulation whitespace-nowrap bg-[#C8A94A] px-5 text-xs font-extrabold uppercase tracking-[0.14em] text-[#061224] hover:bg-[#b89740] disabled:opacity-40 sm:w-auto sm:self-stretch",
            )}`}
          >
            {busy ? "Sending…" : "Notify me"}
          </Button>
        </form>
      )}
      {err ? (
        <p className="mt-3 text-xs leading-snug text-red-300/95" role="alert">
          {err}
        </p>
      ) : null}
    </div>
  )
}
