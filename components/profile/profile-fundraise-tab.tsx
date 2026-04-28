"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  /** Net after reimbursements; omit only on stale clients—Guild UI falls back to totalCents. */
  netAfterReimbursementsCents?: number
}

type LinkedAthlete = { id: string; name: string }

type ProfileFundraiseTabProps = {
  spartanFundraising: { athletes: SpartanRow[] } | null
  spartanFundraisingLoading: boolean
  linkedLoading: boolean
  linkedCount: number
  linkedAthletes: LinkedAthlete[]
}

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100)
}

export function ProfileFundraiseTab({
  spartanFundraising,
  spartanFundraisingLoading,
  linkedLoading,
  linkedCount,
  linkedAthletes,
}: ProfileFundraiseTabProps) {
  return (
    <div className="space-y-6">
      <Card className="border-[#003366]/12 shadow-md shadow-[#003366]/5 overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-[#03154C] via-[#B31B1B] to-[#CBAF5D]" aria-hidden />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg text-[#03154C]">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#03154C] text-[#CBAF5D]">
              <Coins className="h-4 w-4" strokeWidth={2} />
            </div>
            Spartan 2026 fundraising
          </CardTitle>
          <CardDescription className="text-slate-600 text-sm leading-snug space-y-1">
            <p>
              Paid gifts in the last 120 days. Reporting through{" "}
              <strong className="text-slate-800">{SPARTAN_FUNDRAISE_THROUGH_LABEL}</strong>.
            </p>
            <p className="text-slate-500 text-xs">
              Estimates only — not a bank balance. Update linked wrestlers under{" "}
              <span className="font-medium text-slate-600">Family &amp; athletes</span>.
            </p>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {spartanFundraisingLoading ? (
            <p className="text-sm text-slate-500 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-[#003366]" />
              Loading totals…
            </p>
          ) : !spartanFundraising || spartanFundraising.athletes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#CBAF5D]/40 bg-[#CBAF5D]/5 px-4 py-6 text-center">
              <p className="text-sm text-slate-700">
                {!linkedLoading && linkedCount === 0
                  ? "Link athletes under Family & athletes to see their totals here."
                  : "No totals yet. If a wrestler is linked but shows zero, add their graduation year on their profile so we can match their fundraising code."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {spartanFundraising.athletes.map((row) => (
                <div
                  key={row.athleteId}
                  className="rounded-xl border border-[#003366]/10 bg-slate-50/80 px-3 py-3 sm:px-4 sm:py-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[#03154C] leading-tight">{row.name}</p>
                      {row.fundraisingCode ? (
                        <p className="text-[11px] text-slate-500 font-mono mt-1 truncate" title={row.fundraisingCode}>
                          {row.fundraisingCode}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-600 mt-1">
                          Add their graduation year under Family &amp; athletes so we can match gifts to this wrestler.
                        </p>
                      )}
                    </div>
                    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-x-5 lg:shrink-0 lg:text-right w-full lg:w-auto">
                      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-start sm:gap-0.5">
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:order-2">Starting</dt>
                        <dd className="text-sm font-bold tabular-nums text-[#003366] sm:order-1">{formatUsd(row.totalCents)}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-start sm:gap-0.5">
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:order-2">Spent</dt>
                        <dd className="text-sm tabular-nums text-slate-800 sm:order-1">
                          {(row.reimbursementsPaidCents ?? 0) > 0 ? formatUsd(row.reimbursementsPaidCents ?? 0) : "—"}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-start sm:gap-0.5">
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:order-2">Remaining</dt>
                        <dd
                          className={`text-sm font-bold tabular-nums sm:order-1 ${
                            (row.netAfterReimbursementsCents ?? row.totalCents) < 0
                              ? "text-[#B31B1B]"
                              : "text-[#0f5132]"
                          }`}
                        >
                          {formatUsd(row.netAfterReimbursementsCents ?? row.totalCents)}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-start sm:gap-0.5 border-t border-[#003366]/10 pt-2 sm:border-0 sm:pt-0">
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:order-2">Ends</dt>
                        <dd className="text-xs font-semibold text-slate-800 tabular-nums sm:order-1 sm:max-w-[9rem] sm:text-right leading-snug">
                          {SPARTAN_FUNDRAISE_THROUGH_LABEL}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <GuildCreditAllocationSection
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
