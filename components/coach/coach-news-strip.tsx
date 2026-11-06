"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Radio, X } from "lucide-react"

/**
 * What is new on the platform, at the top of My Recruits (Matt, 5 Nov 2026: "so their My Recruits
 * dashboard looks like a cockpit"). A new id shows again to every coach; closing one hides it in
 * this browser. Add each state here the day it goes live, not before.
 */
const NEWS = {
  id: "2026-11-05-sc-va-tn-ga",
  items: [
    { text: "South Carolina profiles are live", href: "/prospects/all?state=SC", cta: "See SC wrestlers" },
    { text: "Virginia profiles are live", href: "/prospects/all?state=VA", cta: "See VA wrestlers" },
    { text: "Tennessee profiles are live", href: "/prospects/all?state=TN", cta: "See TN wrestlers" },
    { text: "Georgia profiles are live", href: "/prospects/all?state=GA", cta: "See GA wrestlers" },
    { text: "South Carolina rankings are published", href: "/public-rankings?state=SC", cta: "See SC rankings" },
  ],
}
const KEY = "coach-news-closed"

export function CoachNewsStrip() {
  // Hidden until read, so a coach who closed it never sees it flash on load.
  const [closed, setClosed] = useState(true)
  useEffect(() => {
    try {
      setClosed(window.localStorage.getItem(KEY) === NEWS.id)
    } catch {
      setClosed(false)
    }
  }, [])
  if (closed) return null
  const close = () => {
    setClosed(true)
    try {
      window.localStorage.setItem(KEY, NEWS.id)
    } catch {}
  }
  return (
    <section className="mt-6 rounded-xl border border-[#D3B574]/40 bg-gradient-to-r from-[#D3B574]/15 to-transparent p-4" aria-labelledby="coach-news">
      <div className="flex items-start justify-between gap-3">
        <h2 id="coach-news" className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#F3DCA4]">
          <Radio className="h-3.5 w-3.5" aria-hidden /> New this week
        </h2>
        <button type="button" onClick={close} className="-m-1 rounded p-1 text-white/40 hover:text-white" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {NEWS.items.map((n) => (
          <li key={n.href}>
            <Link href={n.href} className="flex h-full flex-col justify-between gap-1 rounded-lg border border-white/10 bg-[#0f1c2e] px-3 py-2.5 hover:border-[#D3B574]/50">
              <span className="text-sm font-bold text-white">{n.text}</span>
              <span className="text-xs font-bold text-[#D3B574]">{n.cta} →</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
