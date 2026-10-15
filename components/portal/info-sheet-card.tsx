"use client"

import { useState } from "react"
import { Check, ClipboardCopy } from "lucide-react"

/** The recruiting info sheet with one copy button: paste it into any college's questionnaire. */
export function InfoSheetCard({ sheet, name }: { sheet: string; name: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(sheet)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }
  return (
    <section className="rounded-xl border border-white/10 bg-[#0f1c2e] p-5" aria-labelledby="cc-sheet">
      <div className="flex items-center justify-between gap-3">
        <h2 id="cc-sheet" className="text-sm font-black uppercase tracking-widest text-[#D3B574]">
          {name}&apos;s info sheet
        </h2>
        <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-lg bg-[#D3B574] px-3 py-1.5 text-xs font-bold text-[#0A1628] hover:bg-[#e2c98d]">
          {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <ClipboardCopy className="h-3.5 w-3.5" aria-hidden />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="mt-1 text-xs text-white/55">Every college questionnaire asks the same things. Copy this and paste it in.</p>
      <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-[#0A1628] p-3 font-sans text-xs leading-5 text-white/80">{sheet}</pre>
    </section>
  )
}
