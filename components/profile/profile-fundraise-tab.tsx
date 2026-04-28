"use client"

import { ExpenseRequestSection } from "@/components/profile/expense-request-section"
import { GuildCreditAllocationSection } from "@/components/profile/guild-credit-allocation-section"
import { Loader2, Coins } from "lucide-react"

/** Fayetteville 2026 parent-facing reporting cutoff (aligned with ops). */
const SPARTAN_FUNDRAISE_THROUGH_LABEL = "September 1, 2026"

type SpartanRow = {
  athleteId: string
  name: string
  fundraisingCode: string | null
  totalCents: number
  giftCount?: number
  raceSignupCount?: number
  codeUnavailable?: boolean
  reimbursementsPaidCents?: number
  netAfterReimbursementsCents?: number
  guildAllocationsCents?: number
}

type LinkedAthlete = { id: string; name: string }

type ProfileFundraiseTabProps = {
  spartanFundraising: { athletes: SpartanRow[] } | null
  spartanFundraisingLoading: boolean
  linkedLoading: boolean
  linkedCount: number
  linkedAthletes: LinkedAthlete[]
  onSpartanTotalsRefresh?: () => void | Promise<void>
}

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100)
}

function usedBreakdownCaption(reimb: number, guild: number): string | null {
  if (reimb > 0 && guild > 0) return "Reimbursements and Guild credits"
  if (reimb > 0) return "Reimbursements paid"
  if (guild > 0) return "Moved to Guild credits"
  return null
}

export function ProfileFundraiseTab({
  spartanFundraising,
  spartanFundraisingLoading,
  linkedLoading,
  linkedCount,
  linkedAthletes,
  onSpartanTotalsRefresh,
}: ProfileFundraiseTabProps) {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] overflow-hidden">
        <div className="border-b border-slate-100 bg-gradient-to-br from-slate-50 via-white to-[#f8fafc] px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex items-start gap-3 sm:gap-4">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#03154C] text-[#e8d5a3] shadow-sm"
              aria-hidden
            >
              <Coins className="h-5 w-5" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <h2 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">Spartan fundraising</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Gifts from the last <span className="font-medium text-slate-800">120 days</span>. Totals are estimates
                through <span className="font-medium text-slate-800">{SPARTAN_FUNDRAISE_THROUGH_LABEL}</span> — not a bank
                balance.
              </p>
              <p className="text-xs text-slate-500 leading-relaxed pt-0.5">
                <span className="font-medium text-slate-600">Available</span> is what&apos;s left after reimbursements and
                any amounts moved to Guild. Update wrestler details under{" "}
                <span className="font-medium text-slate-700">Family &amp; athletes</span> if something looks off.
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 py-5 sm:px-6 sm:py-6">
          {spartanFundraisingLoading ? (
            <p className="text-sm text-slate-500 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-[#03154C]" aria-hidden />
              Loading…
            </p>
          ) : !spartanFundraising || spartanFundraising.athletes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">
              <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
                {!linkedLoading && linkedCount === 0
                  ? "Link athletes under Family & athletes to see fundraising totals here."
                  : "No totals yet. If someone is linked but shows zero, add their graduation year on Family & athletes so we can match their gifts."}
              </p>
            </div>
          ) : (
            <ul className="space-y-4 list-none p-0 m-0">
              {spartanFundraising.athletes.map((row) => {
                const net = row.netAfterReimbursementsCents ?? row.totalCents
                const guildAlloc = row.guildAllocationsCents ?? 0
                const remainingAfterGuild = net - guildAlloc
                const reimb = row.reimbursementsPaidCents ?? 0
                const usedTotal = reimb + guildAlloc
                const breakdown = usedBreakdownCaption(reimb, guildAlloc)
                const showSetupHint = !row.fundraisingCode || row.codeUnavailable

                return (
                  <li
                    key={row.athleteId}
                    className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4 sm:p-5 ring-1 ring-slate-900/[0.03]"
                  >
                    <div className="space-y-4">
                      <div>
                        <p className="text-base font-semibold text-slate-900 leading-snug sm:text-lg">
                          {row.name?.trim() ? row.name : "—"}
                        </p>
                        {showSetupHint ? (
                          <p className="mt-2 text-sm text-amber-800/90 leading-relaxed">
                            Add their graduation year under <span className="font-medium">Family &amp; athletes</span> so
                            we can match gifts to this wrestler.
                          </p>
                        ) : null}
                      </div>

                      <div className="rounded-xl bg-white px-4 py-4 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)] sm:px-5 sm:py-5">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-slate-500">Available</span>
                          <span
                            className={`text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl ${
                              remainingAfterGuild < 0 ? "text-red-600" : "text-emerald-700"
                            }`}
                          >
                            {formatUsd(remainingAfterGuild)}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 sm:gap-4">
                          <div>
                            <span className="text-xs font-medium text-slate-500">Raised (this window)</span>
                            <p className="mt-0.5 text-base font-medium tabular-nums text-slate-900">
                              {formatUsd(row.totalCents)}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-slate-500">Used</span>
                            <p className="mt-0.5 text-base font-medium tabular-nums text-slate-900">
                              {usedTotal > 0 ? formatUsd(usedTotal) : "—"}
                            </p>
                            {breakdown && usedTotal > 0 ? (
                              <p className="mt-1 text-xs text-slate-500 leading-snug">{breakdown}</p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>

      <GuildCreditAllocationSection
        onSpartanTotalsRefresh={onSpartanTotalsRefresh}
        spartanLoading={spartanFundraisingLoading}
        spartanAthletes={
          spartanFundraising?.athletes?.map((a) => ({
            athleteId: a.athleteId,
            name: a.name,
            netAfterReimbursementsCents: a.netAfterReimbursementsCents ?? a.totalCents,
            codeUnavailable: a.codeUnavailable,
          })) ?? []
        }
      />

      <ExpenseRequestSection linkedAthletes={linkedAthletes} />
    </div>
  )
}
