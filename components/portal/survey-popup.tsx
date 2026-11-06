"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"

import { PrioritiesApp } from "@/app/my-recruiting/priorities/priorities-app"

/**
 * "What matters" opens by itself on the Command Center home until this login has finished its set
 * for this wrestler (Matt, 6 Nov 2026). "Not now" closes it for the rest of this browser session;
 * the next visit after that opens it again. The page decides who gets it: the family's own login
 * only, never a preview, a business account or a coach.
 */
export function SurveyPopup({ athleteId }: { athleteId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const laterKey = `cc-survey-later:${athleteId}`

  useEffect(() => {
    try {
      if (sessionStorage.getItem(laterKey)) return
    } catch {
      // Private mode without storage: open it anyway.
    }
    setOpen(true)
  }, [laterKey])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close()
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener("keydown", onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const close = () => {
    try {
      sessionStorage.setItem(laterKey, "1")
    } catch {}
    setOpen(false)
    // Answers save as they go: whatever was answered now shapes the home page.
    router.refresh()
  }

  if (!open) return null
  return (
    <div role="dialog" aria-modal="true" aria-label="What matters to your family" className="fixed inset-0 z-[100] overflow-y-auto bg-[#050b14]/85 px-3 py-6 backdrop-blur-sm sm:py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-2 flex justify-end">
          <button type="button" onClick={close} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-bold text-white/75 hover:text-white">
            Not now <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <PrioritiesApp athleteId={athleteId} onClose={close} />
      </div>
    </div>
  )
}
