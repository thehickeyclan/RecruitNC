"use client"

import { useCallback, useEffect, useState } from "react"

/**
 * The deck, on screen. Arrow keys and clicks move; F goes full screen; N shows the notes.
 *
 * Each slide is a 1920x1080 <section> scaled to fit, so the HTML is exactly what the artifact
 * held and exactly what the PDF prints. The slides arrive as HTML strings from the server, which
 * is why this sets them with dangerouslySetInnerHTML: they are ours, built in
 * lib/business/deck/, and never anything a user typed.
 */

export type ViewerSlide = { id: string; html: string; notes: string; live?: boolean }

export function DeckViewer({ slides, pdfHref }: { slides: ViewerSlide[]; pdfHref: string }) {
  const [i, setI] = useState(0)
  const [showNotes, setShowNotes] = useState(false)
  const [scale, setScale] = useState(0.5)

  const go = useCallback(
    (delta: number) => setI((n) => Math.min(slides.length - 1, Math.max(0, n + delta))),
    [slides.length],
  )

  useEffect(() => {
    const fit = () => {
      const pad = 48
      const w = (window.innerWidth - pad) / 1920
      const h = (window.innerHeight - pad - 72) / 1080
      setScale(Math.max(0.15, Math.min(w, h)))
    }
    fit()
    window.addEventListener("resize", fit)
    return () => window.removeEventListener("resize", fit)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") { e.preventDefault(); go(1) }
      else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); go(-1) }
      else if (e.key === "Home") setI(0)
      else if (e.key === "End") setI(slides.length - 1)
      else if (e.key.toLowerCase() === "n") setShowNotes((v) => !v)
      else if (e.key.toLowerCase() === "f") {
        if (document.fullscreenElement) document.exitFullscreen()
        else document.documentElement.requestFullscreen().catch(() => {})
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [go, slides.length])

  const slide = slides[i]
  if (!slide) return null

  return (
    <div className="admin-dark-page flex min-h-screen flex-col bg-[#060f1f] text-white">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
        <button onClick={() => go(-1)} disabled={i === 0} className="rounded-lg bg-white/10 px-3 py-1.5 font-semibold disabled:opacity-30">
          ← Back
        </button>
        <button onClick={() => go(1)} disabled={i === slides.length - 1} className="rounded-lg bg-[#A3E635] px-3 py-1.5 font-bold text-[#060f1f] disabled:opacity-30">
          Next →
        </button>
        <span className="tabular-nums text-white/55">
          {i + 1} / {slides.length}
        </span>
        {slide.live ? (
          <span className="rounded-full bg-[#A3E635]/20 px-3 py-1 text-xs font-bold text-[#A3E635]">Live · not in the PDF</span>
        ) : null}
        <span className="flex-1" />
        <button onClick={() => setShowNotes((v) => !v)} className="rounded-lg bg-white/10 px-3 py-1.5 font-semibold">
          {showNotes ? "Hide notes" : "Notes"} <span className="text-white/40">N</span>
        </button>
        <button
          onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {}))}
          className="rounded-lg bg-white/10 px-3 py-1.5 font-semibold"
        >
          Full screen <span className="text-white/40">F</span>
        </button>
        <a href={pdfHref} className="rounded-lg border border-white/20 px-3 py-1.5 font-semibold hover:bg-white/10">
          Download the PDF
        </a>
      </div>

      <div className="flex flex-1 items-start justify-center overflow-hidden px-4 pb-4" onClick={() => go(1)}>
        <div style={{ width: 1920 * scale, height: 1080 * scale }} className="shrink-0 overflow-hidden rounded-xl">
          <div
            style={{ width: 1920, height: 1080, transform: `scale(${scale})`, transformOrigin: "top left" }}
            dangerouslySetInnerHTML={{ __html: slide.html }}
          />
        </div>
      </div>

      {showNotes ? (
        <div className="border-t border-white/10 bg-[#0d1d36] px-6 py-4 text-sm leading-relaxed text-white/75">{slide.notes}</div>
      ) : null}
    </div>
  )
}
