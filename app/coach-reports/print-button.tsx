"use client"

import { Download } from "lucide-react"

/** "Download PDF": the browser's print dialog with Save as PDF, the page's title as the file name. */
export function PrintButton({ filename }: { filename: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        const before = document.title
        document.title = filename
        window.print()
        document.title = before
      }}
      className="inline-flex items-center gap-1.5 rounded-lg bg-[#d4af55] px-3 py-2 text-sm font-semibold text-[#0b1730] hover:brightness-105"
    >
      <Download className="h-4 w-4" /> Download PDF
    </button>
  )
}
