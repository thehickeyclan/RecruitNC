import { Bebas_Neue } from "next/font/google"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

const bebas = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
})

/** Patriotic navy / white / red — mirrors Championship jacket. */
export const TOC_THEME = {
  navy: "#0B1D3A",
  navyDeep: "#060f1f",
  red: "#CC0000",
  redHover: "#a80000",
  white: "#FFFFFF",
} as const

export function tocDisplayClass(): string {
  return `${bebas.className} tracking-wide uppercase`
}

/** Mobile-first section spacing — default padding is phone-sized. */
export function tocSectionClass(): string {
  return "py-12 sm:py-16 md:py-20"
}

export function tocContainerClass(maxWidth = "max-w-6xl"): string {
  return cn("container mx-auto w-full px-4 sm:px-6", maxWidth)
}

/** Full-width tap targets on phones; inline from sm up. */
export function tocMobileCtaClass(variant: "primary" | "secondary" | "ghost" = "primary"): string {
  const base =
    "inline-flex w-full sm:w-auto items-center justify-center min-h-11 px-6 py-3 text-base font-semibold transition-colors rounded-sm"
  if (variant === "primary") {
    return cn(base, "bg-[#CC0000] text-white hover:bg-[#a80000] shadow-lg", tocDisplayClass())
  }
  if (variant === "secondary") {
    return cn(base, "border-2 border-white text-white hover:bg-white/10", tocDisplayClass())
  }
  return cn(base, "border-2 border-white/40 text-white/90 hover:border-white")
}

/** Red · white · red sleeve-stripe bar */
export function TocPatrioticBar({ className = "" }: { className?: string }) {
  return (
    <div className={`flex h-1.5 w-full ${className}`} aria-hidden>
      <div className="flex-[2] bg-white" />
      <div className="w-1 bg-[#CC0000]" />
      <div className="flex-1 bg-white" />
      <div className="w-1 bg-[#CC0000]" />
      <div className="flex-[2] bg-white" />
    </div>
  )
}

export function TocVarsityHeading({
  children,
  className = "",
  as: Tag = "h2",
}: {
  children: ReactNode
  className?: string
  as?: "h1" | "h2" | "h3"
}) {
  return (
    <Tag className={cn(tocDisplayClass(), "text-[#0B1D3A] text-3xl sm:text-4xl md:text-5xl leading-tight", className)}>
      {children}
    </Tag>
  )
}

export function TocLayoutShell({ children }: { children: ReactNode }) {
  return <div className="toc-page-root">{children}</div>
}
