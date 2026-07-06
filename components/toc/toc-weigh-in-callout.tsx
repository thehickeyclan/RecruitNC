import { Scale } from "lucide-react"
import { TOC_WEIGH_IN } from "@/lib/toc/constants"
import { tocDisplayClass } from "@/components/toc/toc-theme"

type Props = {
  variant?: "light" | "dark"
  className?: string
}

export function TocWeighInCallout({ variant = "light", className = "" }: Props) {
  const isDark = variant === "dark"

  return (
    <div
      className={`rounded-sm border-2 overflow-hidden ${
        isDark
          ? "border-[#CC0000]/60 bg-[#060f1f] text-white"
          : "border-[#CC0000] bg-white text-[#0B1D3A]"
      } ${className}`}
      role="note"
      aria-label="Weigh-in policy"
    >
      <div className={`flex gap-3 sm:gap-4 px-4 sm:px-5 py-4 sm:py-5 ${isDark ? "" : "bg-[#CC0000]/5"}`}>
        <Scale
          className={`h-6 w-6 shrink-0 mt-0.5 ${isDark ? "text-[#CC0000]" : "text-[#CC0000]"}`}
          aria-hidden
        />
        <div className="min-w-0">
          <p className={`text-lg sm:text-xl text-[#CC0000] ${tocDisplayClass()}`}>{TOC_WEIGH_IN.headline}</p>
          <p className={`mt-1 text-sm sm:text-base font-semibold ${isDark ? "text-white" : "text-[#0B1D3A]"}`}>
            {TOC_WEIGH_IN.time}
          </p>
          <p className={`mt-2 text-sm leading-relaxed ${isDark ? "text-white/75" : "text-[#0B1D3A]/80"}`}>
            {TOC_WEIGH_IN.detail}
          </p>
        </div>
      </div>
    </div>
  )
}
