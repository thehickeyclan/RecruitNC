import { cn } from "@/lib/utils"

/** Shared NHSCA team hub — full-page navy, spaced panels (no white body + stacked blue headers). */
export const hubPageClass = "min-h-screen bg-[#001428] text-white"

export const hubMainClass = "container mx-auto px-4 sm:px-6 py-8 md:py-12 max-w-4xl space-y-10 md:space-y-14"

export const hubSectionHeadingClass = "space-y-2 mb-6"

export const hubSectionTitleClass = "text-xl md:text-2xl font-bold text-white tracking-tight"

export const hubSectionDescClass = "text-sm text-white/70 leading-relaxed"

export const hubPanelClass =
  "rounded-2xl border border-white/10 bg-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.35)] overflow-hidden"

export const hubPanelHeaderClass =
  "border-b border-white/10 bg-white/[0.04] px-5 py-4 md:px-6 md:py-5"

export const hubPanelTitleClass = "text-lg font-bold text-white"

export const hubPanelDescClass = "text-sm text-white/70 mt-0.5"

export const hubSubteamLabelClass =
  "text-sm font-semibold text-[#D3B574] px-5 pt-5 pb-2 tracking-wide uppercase"

export const hubInfoBannerClass =
  "rounded-2xl border border-[#CBAF5D]/40 bg-[#CBAF5D]/15 px-5 py-4 text-sm text-white/95 leading-relaxed"

/** Wrap NHSCA2026EventBlock cards for dark hub panels */
export const hubEventDetailsInnerClass = cn(
  "space-y-5 p-5 md:p-6",
  "[&_h3]:text-white [&_h4]:text-white",
  "[&_.text-\\[\\#002147\\]]:text-white",
  "[&_.text-gray-600]:text-white/65",
  "[&_.text-gray-700]:text-white/85",
  "[&_.text-gray-800]:text-white/90",
  "[&_.border-gray-200]:border-white/15",
  "[&_.rounded-lg.border]:rounded-xl [&_.rounded-lg.border]:border-white/10 [&_.rounded-lg.border]:bg-white/[0.05]",
  "[&_.bg-\\[\\#003366\\]\\/5]:bg-white/[0.08]",
  "[&_.bg-\\[\\#D3B574\\]\\/20]:bg-[#CBAF5D]/20 [&_.bg-\\[\\#D3B574\\]\\/20]:text-white",
  "[&_.bg-gray-100]:bg-white/10",
  "[&_a.text-\\[\\#003366\\]]:text-[#D3B574] [&_a]:hover:text-white",
  "[&_strong]:text-white"
)
