import { Wallet } from "lucide-react"

import { HardLink } from "@/components/hard-link"
import type { ParentSpartanFundraisingAthleteRow } from "@/lib/parent-spartan-fundraising-totals"
import { walletBalanceFromRow } from "@/lib/fundraising/wallet-balance"

function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100)
}

function spentSubLabel(reimb: number, guild: number): string {
  const parts: string[] = []
  if (reimb > 0) parts.push("Reimbursements")
  if (guild > 0) parts.push("Program reserve")
  return parts.length > 0 ? parts.join(" · ") : "None yet"
}

type Props = {
  row: ParentSpartanFundraisingAthleteRow
  /** First name for headings — same derivation as goal section */
  firstName: string
}

/**
 * Family / staff only — Raised uses lifetime mirror gross so it matches Available math; Training Fund hub window total shown when it differs from lifetime.
 */
export function FundraisingAthleteWalletPanel({ row, firstName }: Props) {
  const lifetimeRaised = row.totalCents
  const lifetimeGiftCount = row.giftCount
  const hubRaised = row.hubWindowRaisedCents
  const hubGiftCount = row.hubWindowGiftCount

  const reimb = row.reimbursementsPaidCents ?? 0
  const guildAlloc = row.guildAllocationsCents ?? 0
  const { availableCents: remainingAfterGuild, spentCents: usedTotal } = walletBalanceFromRow(row)
  const showCodeHint = !row.fundraisingCode || row.codeUnavailable
  const hubPresent = typeof hubRaised === "number"

  return (
    <section
      className="mt-8 rounded-xl border border-[#C8A94A]/35 bg-gradient-to-b from-[#0B2545]/80 to-[#061224]/90 px-4 py-5 shadow-[0_20px_60px_-28px_rgba(200,169,74,0.35)] sm:px-6 sm:py-6"
      aria-label={`${firstName} digital wallet summary`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#C8A94A]/40 bg-[#061224] text-[#C8A94A] shadow-inner">
            <Wallet className="h-5 w-5" strokeWidth={2} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-[family-name:var(--font-fundraising-display)] text-[10px] font-bold uppercase tracking-[0.2em] text-[#C8A94A]/90">
              Family view
            </p>
            <h2 className="font-[family-name:var(--font-fundraising-display)] mt-1 text-base font-black uppercase tracking-wide text-white sm:text-lg">
              {firstName}&apos;s digital wallet
            </h2>
            <p className="mt-1 text-xs leading-snug text-white/55">
              <strong className="text-white/65">Raised</strong> is lifetime credited gross so it nets with Spend and Available; a hub
              line appears when Stripe differs from ledger. Submit reimbursement requests from your parent profile under{" "}
              <span className="text-white/70">Fundraise</span>.
              {!hubPresent ? (
                <>
                  {" "}
                  If the totals look off, confirm you&apos;re viewing the right athlete under{" "}
                  <span className="text-white/70">Family &amp; athletes</span>.
                </>
              ) : null}
            </p>
          </div>
        </div>
        <HardLink
          href="/profile?tab=fundraise"
          className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-md border border-[#C8A94A]/50 bg-[#C8A94A]/15 px-4 text-center text-xs font-bold uppercase tracking-wide text-[#C8A94A] hover:bg-[#C8A94A]/25 sm:min-h-0 sm:self-center"
        >
          Request reimbursement
        </HardLink>
      </div>

      {showCodeHint ? (
        <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-950/25 px-3 py-2 text-xs leading-snug text-amber-100/90">
          Add or verify graduation year under <strong className="text-white">Family &amp; athletes</strong> on your profile if gifts should match this
          wrestler.
        </p>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-black/25 px-4 py-3 sm:py-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#C8A94A]">Raised</p>
          <p className="mt-1 text-xl font-black tabular-nums text-white sm:text-2xl">{formatUsd(lifetimeRaised)}</p>
          <p className="mt-1 text-[11px] leading-snug text-white/45">
            {lifetimeGiftCount} gift{lifetimeGiftCount !== 1 ? "s" : ""} · lifetime credited
          </p>
          {hubPresent ? (
            hubRaised !== lifetimeRaised ||
            (typeof hubGiftCount === "number" && hubGiftCount !== lifetimeGiftCount) ? (
              <p className="mt-1 text-[10px] leading-snug text-white/35">
                Training Fund hub window total {formatUsd(hubRaised)}
                {typeof hubGiftCount === "number"
                  ? ` · ${hubGiftCount} gift${hubGiftCount !== 1 ? "s" : ""}`
                  : ""}{" "}
                (Stripe window)
              </p>
            ) : (
              <p className="mt-1 text-[10px] text-emerald-400/70">Matches Training Fund leaderboard gross for this wrestler</p>
            )
          ) : null}
        </div>
        <div className="rounded-lg border border-white/10 bg-black/25 px-4 py-3 sm:py-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#ff6b6b]">Spent</p>
          <p className="mt-1 text-xl font-black tabular-nums text-white sm:text-2xl">
            {usedTotal > 0 ? formatUsd(usedTotal) : "—"}
          </p>
          <p className="mt-1 text-[11px] leading-snug text-white/45">{spentSubLabel(reimb, guildAlloc)}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/25 px-4 py-3 sm:py-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-300/90">Available</p>
          <p className="mt-1 text-2xl font-black tabular-nums tracking-tight text-emerald-300 sm:text-3xl">
            {formatUsd(remainingAfterGuild)}
          </p>
          <p className="mt-1 text-[11px] leading-snug text-white/45">What&apos;s left after spending and reimbursements</p>
        </div>
      </div>
    </section>
  )
}
