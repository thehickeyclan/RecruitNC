import { cn } from "@/lib/utils"
import { TOC_AI_RENDERING_CAPTION } from "@/lib/toc/constants"

type Props = {
  className?: string
  /** Light sections use muted text; dark sections use white/50 */
  variant?: "light" | "dark"
}

export function TocAiRenderingCaption({ className, variant = "light" }: Props) {
  return (
    <p
      className={cn(
        "mt-2 text-[10px] md:text-xs italic leading-snug",
        variant === "dark" ? "text-white/45" : "text-[#0B1D3A]/55",
        className,
      )}
    >
      {TOC_AI_RENDERING_CAPTION}
    </p>
  )
}
