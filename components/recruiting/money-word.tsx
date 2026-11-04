"use client"

/**
 * A money word with its definition one tap away (Matt, 31 Oct 2026: "can't assume familes are
 * educated"). The ⓘ opens a sheet with the plain-English definition, whether it is paid back, where
 * to go, and the official source (lib/recruiting/learn/money-words.ts). A sheet from the bottom on
 * a phone, a card in the middle on a computer.
 *
 * `tone="light"` is for the RecruitWrestlers article's white page; the portal is dark. Gold classes
 * are the ones app/recruit-brand.css remaps to lime on recruitwrestlers.com.
 */
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { ExternalLink, Info, X } from "lucide-react"

import { CHECKED, SOURCES } from "@/lib/recruiting/learn/content"
import { MONEY_CHECKED, MONEY_WORDS_HREF, moneyWord, type MoneyWordId } from "@/lib/recruiting/learn/money-words"

const dateLabel = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })

export function MoneyWord({ id, children, tone = "dark", className = "" }: { id: MoneyWordId; children?: React.ReactNode; tone?: "dark" | "light"; className?: string }) {
  const [open, setOpen] = useState(false)
  const w = moneyWord(id)
  const light = tone === "light"
  return (
    <>
      <span className={`inline ${className}`}>
        {children ?? w.term}
        <button
          type="button"
          // Inside a form label, a tap here must open the definition, not focus the input.
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setOpen(true)
          }}
          aria-label={`What is ${w.term}?`}
          className={`ml-0.5 inline-flex translate-y-[1px] items-center rounded-full p-0.5 align-baseline ${light ? "text-[#65a30d] hover:text-[#0b1730]" : "text-[#D3B574] hover:text-white"}`}
        >
          <Info className="h-3.5 w-3.5" aria-hidden />
        </button>
      </span>
      {/* Portalled: inside a form label, a tap on the sheet would otherwise focus the input. */}
      {open ? createPortal(<MoneySheet id={id} light={light} onClose={() => setOpen(false)} />, document.body) : null}
    </>
  )
}

function MoneySheet({ id, light, onClose }: { id: MoneyWordId; light: boolean; onClose: () => void }) {
  const w = moneyWord(id)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])
  const external = w.go.href.startsWith("http")
  const muted = light ? "text-gray-500" : "text-white/55"
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 sm:items-center" role="dialog" aria-modal="true" aria-label={w.term} onClick={onClose}>
      <div
        className={`w-full rounded-t-2xl p-5 text-left shadow-2xl sm:max-w-md sm:rounded-2xl ${light ? "bg-white text-[#0b1730]" : "border border-white/10 bg-[#0d1d36] text-white"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <p className="flex-1 text-lg font-black leading-6">{w.term}</p>
          <button type="button" onClick={onClose} aria-label="Close" className={`rounded p-1 ${light ? "text-gray-400 hover:bg-gray-100" : "text-white/50 hover:bg-white/10 hover:text-white"}`}>
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <p className={`mt-2 text-[15px] leading-6 ${light ? "text-gray-800" : "text-white/85"}`}>{w.means}</p>
        <dl className="mt-3 space-y-2 text-sm">
          <div>
            <dt className={`text-[11px] font-black uppercase tracking-wide ${muted}`}>Paid back?</dt>
            <dd className="font-semibold">{w.paidBack}</dd>
          </div>
          {w.yearly ? (
            <div>
              <dt className={`text-[11px] font-black uppercase tracking-wide ${muted}`}>This year&apos;s figure</dt>
              <dd className="font-semibold">{w.yearly.fact}</dd>
              <dd className={`text-xs ${muted}`}>{w.yearly.year}. Changes every year.</dd>
            </div>
          ) : null}
        </dl>
        <a
          href={w.go.href}
          {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
          className={`mt-4 inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-bold ${light ? "bg-[#0b1730] text-white hover:bg-[#13244a]" : "bg-[#D3B574] text-[#0A1628] hover:bg-[#e2c98d]"}`}
        >
          {w.go.label} {external ? <ExternalLink className="h-3.5 w-3.5" aria-hidden /> : null}
        </a>
        <p className={`mt-4 text-[11px] leading-4 ${muted}`}>
          Source:{" "}
          {w.sources.map((k, i) => (
            <span key={k}>
              {i ? "; " : ""}
              <a href={SOURCES[k].url} target="_blank" rel="noreferrer" className="underline hover:no-underline">
                {SOURCES[k].label}
              </a>
            </span>
          ))}
          . Checked {dateLabel(w.library ? CHECKED : MONEY_CHECKED)}.{" "}
          <a href={MONEY_WORDS_HREF} className="underline hover:no-underline">
            All money words
          </a>
        </p>
      </div>
    </div>
  )
}
