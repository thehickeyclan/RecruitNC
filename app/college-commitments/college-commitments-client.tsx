"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Building2, GraduationCap, LayoutGrid, List, PlusCircle, Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { HardLink } from "@/components/hard-link"
import { QuickChip, QuickGroup } from "@/components/ui/quick-chip"
import { ProfessionalCommitmentCard } from "@/components/professional-commitment-card"
import { normalizeAthleteList } from "@/lib/professional-athlete"
import { prefetchAthleteProfile } from "@/lib/prefetch-athlete-profile"
import { getDivisionDisplayShort } from "@/lib/division-display"
import type { CommitmentAthleteListItem } from "@/lib/athletes-commitments-fetch"

type Commitment = CommitmentAthleteListItem & { top_honor?: string | null }
type Gender = "all" | "male" | "female"
type SortChoice = "newest" | "name" | "college"
type ViewMode = "list" | "cards"

const DIVISIONS = ["D1", "D2", "D3", "NAIA", "NJCAA"] as const
type Division = (typeof DIVISIONS)[number]

const isFemale = (c: Commitment) => /^(f|female|women)$/i.test(c.gender.trim())

function divisionOf(c: Commitment): Division | null {
  const short = getDivisionDisplayShort(c.division)
  return (DIVISIONS as readonly string[]).includes(short) ? (short as Division) : null
}

/** "2025-11-12" reads "Nov 2025". Parsed by hand: new Date() on a bare date shifts it a day west of UTC. */
function commitMonth(raw: string): string | null {
  const m = /^(\d{4})-(\d{2})/.exec(raw)
  if (!m) return null
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(m[2]) - 1]
  return month ? `${month} ${m[1]}` : null
}

function CollegeMark({ c, size = 32 }: { c: Commitment; size?: number }) {
  const [failed, setFailed] = useState(false)
  if (c.collegeLogoUrl && !failed) {
    return (
      // Logos come from several hosts; a plain img keeps them out of next/image's allow-list.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={c.collegeLogoUrl}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        onError={() => setFailed(true)}
        className="shrink-0 rounded-md bg-white object-contain p-0.5"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-md bg-white/10 text-white/50"
      style={{ width: size, height: size }}
    >
      <Building2 className="h-4 w-4" />
    </span>
  )
}

function DivisionBadge({ c }: { c: Commitment }) {
  const d = divisionOf(c)
  if (!d) return <span className="text-white/30">—</span>
  return (
    <span className="inline-flex min-w-[44px] justify-center rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-xs font-bold text-white">
      {d}
    </span>
  )
}

export function CollegeCommitmentsClient({ commitments }: { commitments: Commitment[] }) {
  const [search, setSearch] = useState("")
  const [gender, setGender] = useState<Gender>("all")
  const [classYear, setClassYear] = useState<string>("all")
  const [division, setDivision] = useState<Division | "all">("all")
  const [sort, setSort] = useState<SortChoice>("newest")
  /* The list answers what people arrive with (who went where); cards are a tap away. */
  const [view, setView] = useState<ViewMode>("list")

  /* Written out from the commitments on file, never typed: a hand list goes stale every summer. */
  const classYears = useMemo(
    () => [...new Set(commitments.map((c) => c.graduationyear).filter((y) => y > 0))].sort((a, b) => b - a).map(String),
    [commitments],
  )

  /* Everything but the division, so each tile counts what tapping it would show. */
  const beforeDivision = useMemo(() => {
    const q = search.trim().toLowerCase()
    return commitments.filter((c) => {
      if (gender === "female" && !isFemale(c)) return false
      if (gender === "male" && isFemale(c)) return false
      if (classYear !== "all" && String(c.graduationyear) !== classYear) return false
      if (!q) return true
      return [c.name, c.college, c.highschool, c.wrestlingClub].some((v) => (v ?? "").toLowerCase().includes(q))
    })
  }, [commitments, search, gender, classYear])

  const divisionCounts = useMemo(() => {
    const counts: Record<Division, number> = { D1: 0, D2: 0, D3: 0, NAIA: 0, NJCAA: 0 }
    for (const c of beforeDivision) {
      const d = divisionOf(c)
      if (d) counts[d]++
    }
    return counts
  }, [beforeDivision])

  const shown = useMemo(() => {
    const rows = division === "all" ? beforeDivision : beforeDivision.filter((c) => divisionOf(c) === division)
    if (sort === "name") return [...rows].sort((a, b) => (a.last_name || a.name).localeCompare(b.last_name || b.name))
    if (sort === "college") return [...rows].sort((a, b) => a.college.localeCompare(b.college) || a.name.localeCompare(b.name))
    return rows // the server sends newest commitment first
  }, [beforeDivision, division, sort])

  const genderCounts = useMemo(() => {
    const female = commitments.filter(isFemale).length
    return { all: commitments.length, male: commitments.length - female, female }
  }, [commitments])

  const filtered = search.trim() !== "" || gender !== "all" || classYear !== "all" || division !== "all"
  const clearAll = () => {
    setSearch("")
    setGender("all")
    setClassYear("all")
    setDivision("all")
  }

  return (
    <main className="min-h-screen bg-[#0A1628]">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0">
          <Image src="/hero-banner-nchsaa-2026-arena.png" alt="" fill className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A1628]/95 via-[#0A1628]/85 to-[#0A1628]/70" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A1628] via-transparent to-transparent" />
        </div>
        <div className="container relative mx-auto px-4 py-10 md:py-14">
          <div className="mb-3 flex items-center gap-4">
            <div className="rounded-xl bg-[#D3B574]/10 p-3 backdrop-blur-sm">
              <GraduationCap className="h-7 w-7 text-[#D3B574] md:h-8 md:w-8" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white md:text-5xl">College Commitments</h1>
          </div>
          <p className="max-w-2xl text-base leading-relaxed text-white/70 md:text-lg">
            Where North Carolina wrestlers are wrestling next.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/submit-commitment"
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-[#D3B574] px-4 text-sm font-bold text-[#0A1628] transition-colors hover:bg-[#c4a665]"
            >
              <PlusCircle className="h-4 w-4" />
              Add a commitment
            </Link>
            <Link
              href="/colleges"
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-[#D3B574] px-4 text-sm font-bold text-[#D3B574] transition-colors hover:bg-[#D3B574] hover:text-[#0A1628]"
            >
              <Building2 className="h-4 w-4" />
              By college
            </Link>
          </div>
        </div>
      </section>

      <div className="container mx-auto space-y-6 px-4 py-8">
        {/* The division breakdown is the division filter: tap a number to see who it counts. */}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
          {(["all", ...DIVISIONS] as const).map((d) => {
            const active = division === d
            const count = d === "all" ? beforeDivision.length : divisionCounts[d]
            return (
              <button
                key={d}
                type="button"
                aria-pressed={active}
                onClick={() => setDivision(d)}
                className={`rounded-xl border px-3 py-3 text-left transition-colors sm:px-4 sm:py-4 ${
                  active ? "border-[#D3B574] bg-[#D3B574]/10" : "border-white/10 bg-[#0f1c2e] hover:border-white/25"
                }`}
              >
                <div className={`text-2xl font-black tabular-nums sm:text-3xl ${active ? "text-[#D3B574]" : "text-white"}`}>{count}</div>
                <div className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-white/50">{d === "all" ? "All" : d}</div>
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap items-end gap-x-6 gap-y-4 rounded-xl border border-white/10 bg-[#0f1c2e] p-4">
          <label className="flex w-full flex-col gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/45 lg:w-72">
            Search
            <span className="relative block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" aria-hidden />
              <Input
                type="search"
                placeholder="Wrestler, college or high school"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="min-h-[36px] border-white/20 bg-[#0A1628] pl-9 text-sm normal-case tracking-normal text-white placeholder:text-white/30 focus:border-[#D3B574]"
              />
            </span>
          </label>
          <QuickGroup label="Wrestling">
            {([
              ["all", "All"],
              ["male", "Men"],
              ["female", "Women"],
            ] as const).map(([value, label]) => (
              <QuickChip key={value} active={gender === value} onClick={() => setGender(value)}>
                {label} <span className="ml-1 tabular-nums opacity-60">{genderCounts[value]}</span>
              </QuickChip>
            ))}
          </QuickGroup>
          <QuickGroup label="Class">
            <QuickChip active={classYear === "all"} onClick={() => setClassYear("all")}>
              All
            </QuickChip>
            {classYears.map((y) => (
              <QuickChip key={y} active={classYear === y} onClick={() => setClassYear(y)}>
                {y}
              </QuickChip>
            ))}
          </QuickGroup>
          <label className="flex flex-col gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/45 sm:ml-auto">
            Sort by
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortChoice)}
              className="min-h-[36px] rounded-lg border border-white/20 bg-[#0A1628] px-3 text-sm font-semibold normal-case tracking-normal text-white focus:border-[#D3B574] focus:outline-none"
            >
              <option value="newest">Newest commitment</option>
              <option value="name">Wrestler (A to Z)</option>
              <option value="college">College (A to Z)</option>
            </select>
          </label>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-white/60">
            <span className="font-bold text-white">{shown.length}</span> commitment{shown.length === 1 ? "" : "s"}
            {filtered ? (
              <button type="button" onClick={clearAll} className="ml-3 inline-flex items-center gap-1 font-semibold text-[#D3B574] hover:underline">
                <X className="h-3.5 w-3.5" />
                Clear filters
              </button>
            ) : null}
          </p>
          <div className="inline-flex rounded-lg border border-white/15 p-0.5" role="group" aria-label="View">
            {([
              ["list", "List", List],
              ["cards", "Cards", LayoutGrid],
            ] as const).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                aria-pressed={view === value}
                onClick={() => setView(value)}
                className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-md px-3 text-sm font-semibold transition-colors ${
                  view === value ? "bg-[#D3B574] text-[#0A1628]" : "text-white/60 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {shown.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-[#0f1c2e] px-6 py-16 text-center">
            <p className="font-semibold text-white">No commitments match these filters.</p>
            {filtered ? (
              <button type="button" onClick={clearAll} className="mt-3 text-sm font-semibold text-[#D3B574] hover:underline">
                Clear filters
              </button>
            ) : null}
          </div>
        ) : view === "cards" ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {normalizeAthleteList(shown).map((athlete) => (
              <ProfessionalCommitmentCard key={athlete.id} athlete={athlete} listMode />
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0f1c2e]">
            {/* Phone: one stacked row per wrestler, nothing to scroll sideways. */}
            <ul className="divide-y divide-white/5 md:hidden">
              {shown.map((c) => {
                const month = commitMonth(c.commitmentdate)
                return (
                  <li key={c.id}>
                    <HardLink
                      href={`/view-profile?id=${encodeURIComponent(c.id)}`}
                      className="flex items-center gap-3 px-4 py-3 active:bg-white/5"
                    >
                      <CollegeMark c={c} size={40} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-white">{c.name}</span>
                        <span className="block truncate text-sm text-white/70">
                          {c.college}
                          {divisionOf(c) ? <span className="text-white/45"> · {divisionOf(c)}</span> : null}
                        </span>
                        <span className="block truncate text-xs text-white/45">
                          {[c.graduationyear ? `Class of ${c.graduationyear}` : null, c.highschool || null, month].filter(Boolean).join(" · ")}
                        </span>
                        {c.top_honor ? <span className="mt-0.5 block truncate text-xs font-semibold text-[#D3B574]">{c.top_honor}</span> : null}
                      </span>
                    </HardLink>
                  </li>
                )
              })}
            </ul>
            <table className="hidden w-full text-sm md:table">
              <thead className="border-b border-white/10">
                <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-white/45">
                  <th className="px-4 py-3">Wrestler</th>
                  <th className="px-4 py-3">College</th>
                  <th className="px-4 py-3">Division</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Weight</th>
                  <th className="px-4 py-3">Top achievement</th>
                  <th className="whitespace-nowrap px-4 py-3">Committed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {shown.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-white/[0.03]" onMouseEnter={() => prefetchAthleteProfile(c.id)}>
                    <td className="px-4 py-3">
                      <HardLink href={`/view-profile?id=${encodeURIComponent(c.id)}`} className="font-semibold text-white hover:text-[#D3B574]">
                        {c.name}
                      </HardLink>
                      {c.highschool ? <div className="text-xs text-white/45">{c.highschool}</div> : null}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2.5">
                        <CollegeMark c={c} />
                        <span className="text-white/85">{c.college}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <DivisionBadge c={c} />
                    </td>
                    <td className="px-4 py-3 tabular-nums text-white/70">{c.graduationyear || "—"}</td>
                    <td className="px-4 py-3 tabular-nums text-white/70">{c.weightclass || "—"}</td>
                    <td className="px-4 py-3 font-semibold text-[#D3B574]">{c.top_honor || <span className="font-normal text-white/30">—</span>}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-white/60">{commitMonth(c.commitmentdate) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
