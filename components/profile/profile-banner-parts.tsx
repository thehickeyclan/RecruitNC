"use client"

/**
 * The profile banner's pieces (Matt's mock, 1 Oct 2026): an eyebrow, the name set large in two
 * weights, a gold ribbon for the ranking, a stat row, a card per key finish, and a Competes bar.
 * Shared by the phone and desktop heroes so the two cannot drift.
 */

import type { ReactNode } from "react"
import { ArrowLeftRight, Crown, FileText, Medal, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Credential } from "@/lib/profile/credentials"
import { STYLE_LABEL, type CompetitionSummary } from "@/lib/wrestling-style"

const GOLD = "#D3B574"

export function BannerEyebrow({ className }: { className?: string }) {
  return (
    <p className={cn("text-[10px] font-semibold uppercase tracking-[0.45em] text-[#D3B574] lg:text-xs", className)}>
      North Carolina Wrestling
    </p>
  )
}

/** "Aaron" light over "ELLISON" heavy; suffixes stay with the surname ("Smith Jr."). */
export function BannerName({ name, className }: { name: string; className?: string }) {
  const words = name.trim().split(/\s+/)
  const suffix = words.length > 2 && /^(jr\.?|sr\.?|ii|iii|iv)$/i.test(words[words.length - 1]) ? 2 : 1
  const first = words.slice(0, -suffix).join(" ")
  const last = words.slice(-suffix).join(" ")
  return (
    <h1 className={cn("uppercase leading-[0.9] text-white", className)}>
      {first ? (
        <span className="block text-[2rem] font-semibold tracking-tight text-white/90 sm:text-5xl lg:text-6xl">{first}</span>
      ) : null}
      <span className="block text-[2.75rem] font-black tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)] sm:text-6xl lg:text-7xl">
        {last}
      </span>
    </h1>
  )
}

export function BannerRibbon({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md bg-[#D3B574] px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.25em] text-[#0A1628] shadow-lg shadow-black/30 lg:px-5 lg:py-2 lg:text-sm",
        className,
      )}
    >
      {children}
    </div>
  )
}

/**
 * Nationally ranked, beside the gold RecruitNC ribbon: the same shape, inverted - navy with a gold
 * edge - so the two read as a pair and the outlet's number is never mistaken for ours.
 */
export function NationalRankingRibbon({ label, className }: { label: string; className?: string }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-md border border-[#D3B574] bg-[#0A1628] px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.2em] text-white shadow-lg shadow-black/30 lg:px-5 lg:py-2 lg:text-sm",
        className,
      )}
      title="National ranking"
    >
      <span className="text-[#D3B574]" aria-hidden>
        ★
      </span>
      <span className="text-[#D3B574]">National</span>
      <span>{label}</span>
    </div>
  )
}

export type BannerStat = { label: string; value: ReactNode; sub?: ReactNode; action?: ReactNode }

export function BannerStats({ stats, className }: { stats: BannerStat[]; className?: string }) {
  return (
    // Two to a row on a phone - school and club are words, not numbers, and need the width -
    // and a divided row from desktop up.
    <dl className={cn("grid grid-cols-2 gap-y-4 lg:flex lg:flex-wrap lg:items-stretch", className)}>
      {stats.map((s, i) => (
        <div
          key={s.label}
          className={cn(
            // Never squeezed: a label cut to "YE..." says nothing. A long club wraps inside its cap.
            "min-w-0 pr-4 lg:max-w-[15rem] lg:shrink-0 lg:pr-8",
            i % 2 === 1 && "border-l border-white/15 pl-4",
            i > 0 && "lg:border-l lg:border-white/15 lg:pl-8",
          )}
        >
          <dt className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-white/60 lg:gap-2 lg:text-xs lg:tracking-[0.3em]">
            <span className="whitespace-nowrap">{s.label}</span>
            {s.action}
          </dt>
          <dd className="mt-1 text-xl font-black leading-none text-white lg:text-[2rem]">{s.value}</dd>
          {s.sub ? <dd className="mt-1 text-[11px] leading-snug text-white/65 lg:text-sm">{s.sub}</dd> : null}
        </div>
      ))}
    </dl>
  )
}

/** North Carolina's outline, for the NCHSAA cards. */
function NcShape({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 42" fill="none" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M0 38 L7 33 L13 31 L17 26 L24 22 L29 16 L35 12 L41 9 L47 7 L96 2 L99 6 L95 9 L98 13 L93 18 L96 21 L89 26 L85 31 L79 34 L72 40 L62 34 L53 30 L45 30 L40 32 L24 33 Z"
      />
    </svg>
  )
}

function CredentialIcon({ tier }: { tier: Credential["tier"] }) {
  const cls = "h-6 w-6 text-[#D3B574] lg:h-7 lg:w-7"
  if (tier === "toc") return <Crown className={cls} aria-hidden />
  if (tier === "state") return <NcShape className="h-5 w-8 text-[#D3B574] lg:h-7 lg:w-11" />
  if (tier === "olympic-state") return <Medal className={cls} aria-hidden />
  return <Trophy className={cls} aria-hidden />
}

export function CredentialCards({ credentials, className }: { credentials: Credential[]; className?: string }) {
  if (!credentials.length) return null
  return (
    <ul className={cn("grid grid-cols-2 gap-2 lg:gap-2.5 xl:grid-cols-3", className)} aria-label="Key results">
      {credentials.map((c) => (
        <li
          key={c.label}
          className="flex items-center gap-3 rounded-xl border border-[#D3B574]/50 bg-[#0A1628]/60 px-3.5 py-3.5 backdrop-blur-sm lg:gap-3.5 lg:px-4 lg:py-4"
        >
          <span className="flex w-7 shrink-0 justify-center lg:w-10">
            <CredentialIcon tier={c.tier} />
          </span>
          <span className="min-w-0">
            <span
              className={cn(
                "block text-[12.5px] font-extrabold uppercase leading-tight tracking-[0.08em] lg:text-[15px] lg:tracking-[0.1em]",
                c.tier === "national" ? "text-[#D3B574]" : "text-white",
              )}
            >
              {c.title}
            </span>
            <span className="mt-1 block text-[11px] font-bold uppercase tracking-[0.06em] text-white/90 lg:text-[13px] lg:tracking-[0.1em]">
              {c.detail}
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}

/** The scouting report, where a coach looks for an action: in the banner, beside Share. */
export function ScoutingReportAction({ href, className }: { href: string; className?: string }) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg bg-[#D3B574] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#0A1628] shadow-lg shadow-black/30 transition-colors hover:bg-[#e2c98d]",
        className,
      )}
    >
      <FileText className="h-4 w-4" aria-hidden />
      View scouting report
    </a>
  )
}

/**
 * Compare this wrestler with another - beside the scouting report, where a coach's eye already is.
 * The bottom-of-page card was the only way in, below every result. Callers gate it to verified
 * college coaches and admins (lib/compare-access.ts); the page arrives with this wrestler picked.
 */
export function CompareAction({ athleteId, className }: { athleteId: string; className?: string }) {
  return (
    <a
      href={`/compare?left=${encodeURIComponent(athleteId)}&src=profile`}
      className={cn(
        "inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg border border-[#D3B574] bg-[#D3B574]/10 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#D3B574] transition-colors hover:bg-[#D3B574]/20",
        className,
      )}
    >
      <ArrowLeftRight className="h-4 w-4" aria-hidden />
      Compare
    </a>
  )
}

export function CompetesBar({
  competition,
  contact,
  className,
}: {
  competition?: CompetitionSummary | null
  contact?: ReactNode
  className?: string
}) {
  if (!competition && !contact) return null
  return (
    <div
      className={cn(
        // Contact sits under Competes, not beside it: side by side, three contact buttons squeezed
        // the styles into a one-word column.
        "rounded-xl border border-white/10 bg-[#0A1628]/70 p-4 backdrop-blur-md lg:px-6",
        className,
      )}
    >
      {competition ? (
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/60 lg:text-xs">Competes</span>
            <span className="hidden h-4 w-px bg-[#D3B574]/60 sm:block" aria-hidden />
            <span className="text-sm font-extrabold uppercase tracking-[0.12em] text-white lg:text-base">
              {competition.scope === "national" ? "Nationally" : "North Carolina only"}
            </span>
            {competition.styles.map((st) => (
              <span key={st} className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.12em] text-[#D3B574] lg:text-base">
                <span className="h-1 w-1 rounded-full" style={{ background: GOLD }} aria-hidden />
                {STYLE_LABEL[st]}
              </span>
            ))}
          </div>
          {competition.scope === "national" && competition.nationalEvents.length ? (
            <p className="mt-2 text-xs leading-relaxed text-white/50 lg:text-[13px]">{competition.nationalEvents.join(", ")}</p>
          ) : null}
        </div>
      ) : null}
      {contact ? (
        <div className={cn(competition && "mt-3 border-t border-white/10 pt-3")}>
          {contact}
        </div>
      ) : null}
    </div>
  )
}
