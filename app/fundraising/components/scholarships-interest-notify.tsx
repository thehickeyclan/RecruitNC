"use client"

import { GraduationCap } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

function displayFont(c: string) {
  return `font-[family-name:var(--font-fundraising-display)] ${c}`
}

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
    <li
      className="relative flex h-full flex-col rounded-xl border border-white/[0.06] bg-[#050d18]/85 p-6 opacity-[0.92] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
    >
      <span
        className={`${displayFont(
          "absolute right-4 top-4 rounded border border-[#C8A94A]/45 bg-[#C8A94A]/12 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-[#f0dc9a]",
        )}`}
      >
        COMING SOON
      </span>

      <div className="flex items-start gap-4 pr-[6.5rem]">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-white/12 bg-white/[0.06] text-white/55">
          <GraduationCap className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className={`${displayFont("text-lg font-black uppercase leading-snug tracking-tight text-white/88")}`}>
            Training Scholarships
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-white/62">
            Need-based and merit scholarships for NC wrestlers — funded by the community, awarded by NC United.
          </p>
        </div>
      </div>

      {done === "saved" ? (
        <p className={`${displayFont("mt-6 text-xs font-bold uppercase tracking-[0.14em] text-emerald-300/95")}`}>
          Thanks — we&apos;ll email you when this opens.
        </p>
      ) : done === "duplicate" ? (
        <p className={`${displayFont("mt-6 text-xs font-bold uppercase tracking-[0.14em] text-[#C8A94A]/90")}`}>
          You&apos;re already on the list.
        </p>
      ) : (
        <form
          className="mt-6 flex min-h-[44px] flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-stretch"
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <Input
            type="email"
            name="email"
            autoComplete="email"
            placeholder="Email for updates"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
            className="min-h-11 border-white/15 bg-black/35 text-white placeholder:text-white/35 focus-visible:ring-[#C8A94A]/40 sm:max-w-[14rem] sm:flex-1"
          />
          <Button
            type="submit"
            disabled={busy || !email.trim()}
            className={`${displayFont(
              "min-h-11 shrink-0 bg-[#C8A94A] px-4 text-xs font-extrabold uppercase tracking-[0.14em] text-[#061224] hover:bg-[#b89740] disabled:opacity-40",
            )}`}
          >
            {busy ? "Sending…" : "Notify me"}
          </Button>
        </form>
      )}
      {err ? (
        <p className="mt-2 text-xs leading-snug text-red-300/95" role="alert">
          {err}
        </p>
      ) : null}
    </li>
  )
}
