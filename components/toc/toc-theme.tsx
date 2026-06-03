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
    <Tag className={cn(tocDisplayClass(), "text-[#0B1D3A]", className)}>
      {children}
    </Tag>
  )
}

export function TocLayoutShell({ children }: { children: ReactNode }) {
  return <div className="toc-page-root">{children}</div>
}
