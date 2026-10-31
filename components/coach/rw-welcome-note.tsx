"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"

const KEY = "rw-coach-welcome"

/**
 * Shown to a college coach handed across from NC United (?from=ncu, app/auth/rw-handoff) until he
 * closes it (Matt, 29 Oct 2026): why My Recruits is on RecruitWrestlers now, and that signing in at
 * NC United still works.
 */
export function RwWelcomeNote() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    try {
      const fromNcu = new URLSearchParams(window.location.search).get("from") === "ncu"
      if (fromNcu && localStorage.getItem(KEY) !== "done") localStorage.setItem(KEY, "pending")
      setShow(localStorage.getItem(KEY) === "pending")
    } catch {
      setShow(new URLSearchParams(window.location.search).get("from") === "ncu")
    }
  }, [])
  if (!show) return null
  const close = () => {
    try {
      localStorage.setItem(KEY, "done")
    } catch {}
    setShow(false)
  }
  return (
    <div className="national-only">
      <div className="mx-auto mt-4 flex max-w-7xl items-start gap-3 rounded-xl border border-[#A3E635]/50 bg-[#A3E635]/10 px-4 py-3 text-sm text-white sm:px-5">
        <p className="flex-1 leading-6">
          <span className="font-black text-[#A3E635]">Welcome to RecruitWrestlers.com.</span> With South Carolina live and more states
          coming, My Recruits now lives here: your board, stars, reports and messages came with you, across every live state.
          Signing in at NC United still works and brings you straight here.
        </p>
        <button type="button" onClick={close} aria-label="Close" className="rounded p-1 text-white/60 hover:bg-white/10 hover:text-white">
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}
