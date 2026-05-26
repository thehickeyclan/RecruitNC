"use client"

import { useState, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export function NhscaDualsCollapsibleSection({
  id,
  title,
  subtitle,
  count,
  defaultOpen = true,
  icon,
  children,
  className,
}: {
  id?: string
  title: string
  subtitle?: string
  count?: number
  defaultOpen?: boolean
  icon?: ReactNode
  children: ReactNode
  className?: string
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-28 rounded-2xl border border-white/10 bg-[#0a2040]/40 overflow-hidden",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-4 sm:px-5 text-left border-b border-white/10 bg-white/[0.03] hover:bg-white/[0.05] transition-colors"
        aria-expanded={open}
        aria-controls={id ? `${id}-panel` : undefined}
      >
        {icon ? (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#CBAF5D]/20 text-[#CBAF5D]">
            {icon}
          </span>
        ) : null}
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-bold text-white tracking-tight">{title}</span>
          {subtitle ? (
            <span className="block text-xs text-white/55 mt-0.5 leading-relaxed">{subtitle}</span>
          ) : null}
        </span>
        {typeof count === "number" ? (
          <span className="shrink-0 rounded-full bg-[#CBAF5D]/15 px-2.5 py-1 text-sm font-black tabular-nums text-[#CBAF5D]">
            {count}
          </span>
        ) : null}
        <ChevronDown
          className={cn("h-5 w-5 text-white/45 shrink-0 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open ? (
        <div id={id ? `${id}-panel` : undefined} className="p-4 sm:p-5">
          {children}
        </div>
      ) : null}
    </section>
  )
}
