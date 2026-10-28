"use client"

import { useEffect, useState } from "react"
import { ArrowRight, Compass, ListChecks, MessageSquare, PlayCircle, Scale, Send, Sparkles, X } from "lucide-react"

const SEEN = "cc-tour-seen-v1"

type Slide = { icon: typeof Compass; title: string; text: string }

/**
 * The one-minute first-visit tour (Matt, 28 Oct 2026). Five cards, one per step of the path, with
 * Scout on the last. It opens by itself on a family's first Command Center visit, once per browser,
 * and is always a tap away from "Take the tour".
 */
export function CommandCenterTour({ firstName, autoOpen }: { firstName: string; autoOpen: boolean }) {
  const [open, setOpen] = useState(false)
  const [i, setI] = useState(0)
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
    setI(0)
    try {
      localStorage.setItem(SEEN, "1")
    } catch {
      /* fine */
    }
  }

  const slides: Slide[] = [
    { icon: Compass, title: "Welcome to the Command Center", text: `Everything for ${firstName}'s college recruiting, in five steps. The step to do now is outlined on your home page.` },
    { icon: ListChecks, title: "1 and 2: Research, then select", text: "Explore every level on the map, then build My List toward 10 schools across levels." },
    { icon: Scale, title: "3: Know the rules", text: `One line tells you what college coaches may do right now for ${firstName}'s class, from the NCAA, NAIA and NJCAA's own rules.` },
    { icon: Send, title: "4: Reach out", text: "Three moves for every school: tell the coaches you're interested, fill out the interest form, and email the coach. Each is one tap." },
    { icon: MessageSquare, title: "5: Monitor and engage", text: "Answer messages, keep the schedule current, plan visits and set reminders so nothing slips." },
    { icon: Sparkles, title: "Scout helps at every step", text: "Every step has a question ready for Scout, your recruiting assistant. Ask it anything about the rules, the colleges or your next move." },
  ]
  const s = slides[i]
  const Icon = s.icon
  const last = i === slides.length - 1

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-xs font-bold text-white/70 hover:text-white" data-tour="start">
        <PlayCircle className="h-4 w-4 text-[#D3B574]" aria-hidden /> Take the 1-minute tour
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Command Center tour">
          <div className="w-full max-w-md rounded-t-2xl border border-white/10 bg-[#0f1c2e] p-6 text-white sm:rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-widest text-[#D3B574]">
                {i + 1} of {slides.length}
              </span>
              <button type="button" onClick={close} aria-label="Close the tour" className="rounded p-1 text-white/50 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <Icon className="mt-4 h-10 w-10 text-[#D3B574]" aria-hidden />
            <p className="mt-3 text-xl font-black">{s.title}</p>
            <p className="mt-2 text-sm leading-6 text-white/70">{s.text}</p>
            <div className="mt-5 flex gap-1.5" aria-hidden>
              {slides.map((_, k) => (
                <span key={k} className={`h-1.5 flex-1 rounded-full ${k <= i ? "bg-[#D3B574]" : "bg-white/15"}`} />
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between">
              <button type="button" onClick={() => (i ? setI(i - 1) : close())} className="text-sm font-semibold text-white/55 hover:text-white">
                {i ? "Back" : "Skip"}
              </button>
              <button
                type="button"
                onClick={() => (last ? close() : setI(i + 1))}
                className="inline-flex items-center gap-1 rounded-lg bg-[#D3B574] px-4 py-2 text-sm font-black text-[#0A1628] hover:bg-[#e2c98d]"
              >
                {last ? "Get started" : "Next"} <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
            {last ? (
              <a href="/recruiting/learn/how-to-use-command-center" className="mt-4 block text-center text-xs font-semibold text-[#D3B574] hover:underline">
                Read the full guide
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  )
}
