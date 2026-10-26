"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import { PlusCircle, Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"

/**
 * The frame the three commitment pages share - /college-commitments, /colleges and /high-schools -
 * so they read as one place with three views, not three pages built at different times. Each page
 * keeps its own data; the header, tabs, tiles, filter panel and result bar come from here.
 */

const VIEWS = [
  { href: "/college-commitments", label: "All commitments" },
  { href: "/colleges", label: "By college" },
  { href: "/high-schools", label: "By high school" },
] as const

export function CommitsHero({ icon: Icon, title, subtitle }: { icon: LucideIcon; title: string; subtitle: string }) {
  const pathname = usePathname() ?? ""
  return (
    <section className="relative overflow-hidden border-b border-white/10">
      <div className="absolute inset-0">
        <Image src="/hero-banner-nchsaa-2026-arena.png" alt="" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A1628]/95 via-[#0A1628]/85 to-[#0A1628]/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A1628] via-transparent to-transparent" />
      </div>
      <div className="container relative mx-auto px-4 pt-10 md:pt-14">
        <div className="mb-3 flex items-center gap-4">
          <div className="rounded-xl bg-[#D3B574]/10 p-3 backdrop-blur-sm">
            <Icon className="h-7 w-7 text-[#D3B574] md:h-8 md:w-8" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white md:text-5xl">{title}</h1>
        </div>
        <p className="max-w-2xl text-base leading-relaxed text-white/70 md:text-lg">{subtitle}</p>
        <Link
          href="/submit-commitment"
          className="mt-6 inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-[#D3B574] px-4 text-sm font-bold text-[#0A1628] transition-colors hover:bg-[#c4a665]"
        >
          <PlusCircle className="h-4 w-4" />
          Add a commitment
        </Link>
        <nav aria-label="Commitment views" className="-mx-4 mt-8 flex overflow-x-auto px-4">
          {VIEWS.map((v) => {
            const active = pathname === v.href || pathname.startsWith(`${v.href}/`)
            return (
              <Link
                key={v.href}
                href={v.href}
                aria-current={active ? "page" : undefined}
                className={`shrink-0 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-bold transition-colors ${
                  active ? "border-[#D3B574] text-white" : "border-transparent text-white/55 hover:text-white"
                }`}
              >
                {v.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </section>
  )
}

/** A number and its label. With onClick it is a filter: tapping shows what it counts. */
export function StatTile({
  value,
  label,
  active = false,
  onClick,
}: {
  value: number | string
  label: string
  active?: boolean
  onClick?: () => void
}) {
  const body = (
    <>
      <div className={`text-2xl font-black tabular-nums sm:text-3xl ${active ? "text-[#D3B574]" : "text-white"}`}>{value}</div>
      <div className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-white/50">{label}</div>
    </>
  )
  const frame = `rounded-xl border px-3 py-3 text-left sm:px-4 sm:py-4 ${
    active ? "border-[#D3B574] bg-[#D3B574]/10" : "border-white/10 bg-[#0f1c2e]"
  }`
  if (!onClick) return <div className={frame}>{body}</div>
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={`${frame} transition-colors ${active ? "" : "hover:border-white/25"}`}>
      {body}
    </button>
  )
}

export function FilterPanel({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-end gap-x-6 gap-y-4 rounded-xl border border-white/10 bg-[#0f1c2e] p-4">{children}</div>
}

export function SearchField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="flex w-full flex-col gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/45 lg:w-72">
      Search
      <span className="relative block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" aria-hidden />
        <Input
          type="search"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[36px] border-white/20 bg-[#0A1628] pl-9 text-sm normal-case tracking-normal text-white placeholder:text-white/30 focus:border-[#D3B574]"
        />
      </span>
    </label>
  )
}

export function SortField<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: ReadonlyArray<readonly [T, string]>
}) {
  return (
    <label className="flex flex-col gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/45 sm:ml-auto">
      Sort by
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="min-h-[36px] rounded-lg border border-white/20 bg-[#0A1628] px-3 text-sm font-semibold normal-case tracking-normal text-white focus:border-[#D3B574] focus:outline-none"
      >
        {options.map(([v, label]) => (
          <option key={v} value={v}>
            {label}
          </option>
        ))}
      </select>
    </label>
  )
}

/** "42 commitments · Clear filters" on the left, the view switch (if any) on the right. */
export function ResultBar({
  count,
  noun,
  filtered,
  onClear,
  children,
}: {
  count: number | null
  noun: string
  filtered: boolean
  onClear: () => void
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-white/60">
        {count == null ? (
          "Loading…"
        ) : (
          <>
            <span className="font-bold text-white">{count}</span> {noun}
            {count === 1 ? "" : "s"}
          </>
        )}
        {filtered ? (
          <button type="button" onClick={onClear} className="ml-3 inline-flex items-center gap-1 font-semibold text-[#D3B574] hover:underline">
            <X className="h-3.5 w-3.5" />
            Clear filters
          </button>
        ) : null}
      </p>
      {children}
    </div>
  )
}

export function ViewToggle<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: ReadonlyArray<readonly [T, string, LucideIcon]>
}) {
  return (
    <div className="inline-flex rounded-lg border border-white/15 p-0.5" role="group" aria-label="View">
      {options.map(([v, label, Icon]) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-md px-3 text-sm font-semibold transition-colors ${
            value === v ? "bg-[#D3B574] text-[#0A1628]" : "text-white/60 hover:text-white"
          }`}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  )
}
