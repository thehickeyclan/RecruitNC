"use client"

import { useEffect, useState } from "react"
import { ArrowRight, Lightbulb, X } from "lucide-react"

const SEEN = "cc-welcome-seen-v1"

/**
 * The first-visit welcome (Matt, 5 Nov 2026): by name, we're here to help, recruiting leaves
 * parents guessing and we turn the lights on, the goal is the right college athletically,
 * academically and financially. One button: start "What matters to your family". Once per browser,
 * never in a preview. It replaces the tour's own first-visit pop-up (the tour stays one tap away).
 */
export function WelcomeModal({ name, wrestler, athleteId, parent, autoOpen }: { name: string | null; wrestler: string; athleteId: string; parent: boolean; autoOpen: boolean }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!autoOpen) return
    try {
      if (localStorage.getItem(SEEN)) return
    } catch {
      /* private window: still show it once */
    }
    setOpen(true)
  }, [autoOpen])
  const close = () => {
    setOpen(false)
    try {
      localStorage.setItem(SEEN, "1")
    } catch {
      /* fine */
    }
  }
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="cc-welcome-title">
      <div className="w-full max-w-md rounded-t-2xl border border-white/10 bg-[#0f1c2e] p-6 text-white sm:rounded-2xl">
        <div className="flex justify-end">
          <button type="button" onClick={close} aria-label="Close" className="rounded p-1 text-white/50 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <Lightbulb className="h-10 w-10 text-[#D3B574]" aria-hidden />
        <h2 id="cc-welcome-title" className="mt-3 text-2xl font-black">
          {name ? `Welcome, ${name}.` : "Welcome."} We&apos;re here to help.
        </h2>
        <p className="mt-3 text-sm leading-6 text-white/75">
          Recruiting leaves a lot of {parent ? "parents" : "families"} guessing. We turn the lights on: what&apos;s real, what&apos;s next, and where to put your time.
        </p>
        <p className="mt-3 text-sm leading-6 text-white/75">
          The goal is the right opportunity for {parent ? wrestler : "you"}: one that fits athletically, academically and financially.
        </p>
        <p className="mt-3 text-sm leading-6 text-white/75">It starts with what matters to your family. About 3 minutes.</p>
        <div className="mt-6 flex items-center justify-between gap-3">
          <button type="button" onClick={close} className="text-sm font-semibold text-white/55 hover:text-white">
            Not now
          </button>
          <a
            href={`/my-recruiting/priorities?w=${athleteId}`}
            onClick={close}
            className="inline-flex items-center gap-1 rounded-lg bg-[#D3B574] px-5 py-3 text-sm font-black text-[#0A1628] hover:bg-[#e2c98d]"
          >
            Get started now <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
        </div>
      </div>
    </div>
  )
}
