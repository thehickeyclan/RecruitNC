"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { BarChart3, FileText, GraduationCap, Users, X } from "lucide-react"

/**
 * What a college coach sees the moment their account is created.
 *
 * Access has never been the problem — 44 coaches could open a scouting report for months and not
 * one ever did, because nothing ever pointed at it. A coach arrives knowing they want North
 * Carolina wrestlers and not which of four pages holds them, and a first visit that ends on a
 * rankings table teaches them this site is a rankings table.
 *
 * Three destinations, because there are three things worth doing here and naming a fourth would
 * dilute all of them.
 *
 * Shown from `?welcome=coach`, which only the sign-up redirect sets. That makes it a first-run
 * message by construction rather than by remembering — there is no flag to store, nothing to
 * migrate, and no way for it to reappear on an ordinary visit. Dismissing strips the parameter so
 * a refresh or a shared URL does not bring it back.
 */

const DESTINATIONS = [
  {
    href: "/rankings",
    icon: BarChart3,
    title: "Rankings",
    body: "Every class ranked, and the Top 75 College Prospects board across the classes.",
  },
  {
    href: "/prospects/all",
    icon: Users,
    title: "Athlete profiles",
    body: "All 500+ wrestlers, filterable by class, weight, school and credential. Results verified from source.",
  },
  {
    href: "/athletes",
    icon: GraduationCap,
    title: "College commitments",
    body: "Who has signed where, this class and last — so you know who is off the board.",
  },
]

export function CoachWelcomeModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    /*
     * Read from the URL directly rather than through useSearchParams: this mounts in the root
     * layout, and that hook forces every page under it into a Suspense bailout.
     */
    if (typeof window === "undefined") return
    if (new URLSearchParams(window.location.search).get("welcome") === "coach") setOpen(true)
  }, [])

  const dismiss = () => {
    setOpen(false)
    if (typeof window === "undefined") return
    const url = new URL(window.location.href)
    url.searchParams.delete("welcome")
    window.history.replaceState({}, "", url.toString())
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="coach-welcome-title"
    >
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#D3B574]/30 bg-[#0f1c2e] p-6 shadow-2xl">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D3B574]">NC United · RecruitNC</p>
        <h2 id="coach-welcome-title" className="mt-2 text-2xl font-black text-white">
          You&apos;re in, Coach
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-white/70">
          Full access, no charge. Here is where North Carolina&apos;s wrestlers actually live.
        </p>

        <div className="mt-5 space-y-3">
          {DESTINATIONS.map(({ href, icon: Icon, title, body }) => (
            <Link
              key={href}
              href={href}
              onClick={dismiss}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-[#D3B574]/50 hover:bg-white/10"
            >
              <Icon className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#D3B574]" />
              <span>
                <span className="block text-sm font-bold text-white">{title}</span>
                <span className="mt-1 block text-xs leading-relaxed text-white/60">{body}</span>
              </span>
            </Link>
          ))}
        </div>

        {/* The thing they would never find on their own, and the reason the account is worth having. */}
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#D3B574]/30 bg-[#D3B574]/10 p-4">
          <FileText className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#D3B574]" />
          <p className="text-xs leading-relaxed text-white/80">
            <span className="font-bold text-[#D3B574]">Scouting reports are included.</span> Open any
            wrestler and export a one-page dossier — results, significant wins and losses, strength of
            competition. Free to college staff.
          </p>
        </div>

        <button
          type="button"
          onClick={dismiss}
          className="mt-5 w-full rounded-lg bg-[#D3B574] px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-[#0A1628] transition-colors hover:bg-[#e2c98d]"
        >
          Start browsing
        </button>
      </div>
    </div>
  )
}
