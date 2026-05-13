"use client"

import { ExpenseRequestSection } from "@/components/profile/expense-request-section"
import { GuildCreditAllocationSection } from "@/components/profile/guild-credit-allocation-section"
import { ProfileFundraiseThankYousSection } from "@/components/profile/profile-fundraise-thank-yous-section"
import { DEFAULT_FUNDRAISING_CAMPAIGN } from "@/lib/fundraising/campaign-registry"
import type { ProfileSpartanSupportersAthletePayload } from "@/app/api/profile/spartan-fundraising-supporters/route"
import { Loader2, Wallet } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

const LOOKBACK_DAYS = DEFAULT_FUNDRAISING_CAMPAIGN.defaultLookbackDays

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
  /** False until the parent triggers wallet loads (tab open or linked athlete). */
  walletPanelActivated: boolean
  spartanFundraising: { athletes: SpartanRow[] } | null
  spartanFundraisingLoading: boolean
  supporterContactsLoading: boolean
  supporterContacts: ProfileSpartanSupportersAthletePayload[] | null
  supporterLookbackDays: number | null
  linkedLoading: boolean
  linkedCount: number
  linkedAthletes: LinkedAthlete[]
  onSpartanTotalsRefresh?: () => void | Promise<void>
}

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100)
}

function spentSubLabel(reimb: number, guild: number): string {
  const parts: string[] = []
  if (reimb > 0) parts.push("Reimbursements")
  if (guild > 0) parts.push("Guild")
  return parts.length > 0 ? parts.join(" · ") : "None yet"
}

export function ProfileFundraiseTab({
  walletPanelActivated,
  spartanFundraising,
  spartanFundraisingLoading,
  supporterContactsLoading,
  supporterContacts,
  supporterLookbackDays,
  linkedLoading,
  linkedCount,
  linkedAthletes,
  onSpartanTotalsRefresh,
}: ProfileFundraiseTabProps) {
  /** First open: hide expense / Guild / thank-yous so the tab doesn’t look “empty but ready” while Stripe sync runs. */
  const deferFundraiseExtras =
    walletPanelActivated && spartanFundraisingLoading && spartanFundraising === null

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-[#003366]/12 bg-white shadow-md shadow-[#003366]/8">
        <div className="h-1 w-full bg-gradient-to-r from-[#03154C] via-[#B31B1B] to-[#CBAF5D]" aria-hidden />
        <div className="px-4 py-5 sm:px-6 sm:py-6">
          <div className="mb-5 flex items-center gap-3 sm:gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#03154C] text-[#CBAF5D] shadow-inner">
              <Wallet className="h-6 w-6" strokeWidth={2} aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 className="text-xl font-bold tracking-tight text-[#03154C] sm:text-2xl">Digital Wallet</h2>
              <p className="mt-0.5 text-xs text-slate-600">Campaign gifts · last {LOOKBACK_DAYS} days</p>
            </div>
          </div>

          {spartanFundraisingLoading ? (
            <div
              role="status"
              aria-live="polite"
              className="rounded-xl border-2 border-[#03154C]/20 bg-gradient-to-b from-[#03154C]/[0.06] to-slate-50/90 px-4 py-6 shadow-inner sm:px-6 sm:py-8"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#03154C] text-[#CBAF5D] shadow-md">
                  <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
                </span>
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-base font-semibold text-[#03154C] sm:text-lg">Loading your wallet…</p>
                  <p className="text-sm leading-relaxed text-slate-700">
                    Syncing gifts for your wrestlers from payment records. This usually completes in a few seconds.
                  </p>
                </div>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="space-y-2 rounded-lg bg-white/80 px-4 py-4 ring-1 ring-[#003366]/10">
                  <Skeleton className="h-3 w-24 bg-slate-200/90" />
                  <Skeleton className="h-9 w-28 max-w-full bg-slate-200/90" />
                  <Skeleton className="h-3 w-full bg-slate-200/70" />
                </div>
                <div className="space-y-2 rounded-lg bg-white/80 px-4 py-4 ring-1 ring-[#003366]/10">
                  <Skeleton className="h-3 w-20 bg-slate-200/90" />
                  <Skeleton className="h-8 w-24 max-w-full bg-slate-200/90" />
                  <Skeleton className="h-3 w-full bg-slate-200/70" />
                </div>
                <div className="space-y-2 rounded-lg bg-white/80 px-4 py-4 ring-1 ring-[#003366]/10">
                  <Skeleton className="h-3 w-16 bg-slate-200/90" />
                  <Skeleton className="h-8 w-20 max-w-full bg-slate-200/90" />
                  <Skeleton className="h-3 w-full bg-slate-200/70" />
                </div>
              </div>
            </div>
          ) : !walletPanelActivated ? (
            <div className="rounded-xl border border-[#003366]/10 bg-slate-50/80 px-4 py-6 text-sm text-slate-600">
              Open <span className="font-semibold text-[#03154C]">Digital wallet</span> above to load campaign balances (Stripe-backed; may take a few seconds the first time).
            </div>
          ) : !spartanFundraising || spartanFundraising.athletes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#003366]/20 bg-slate-50/60 px-4 py-10 text-center">
              <p className="mx-auto max-w-md text-sm leading-relaxed text-slate-600">
                {!linkedLoading && linkedCount === 0
                  ? "Link wrestlers under Family & athletes to see balances."
                  : "Nothing to show yet. Add graduation year under Family & athletes if gifts should appear."}
              </p>
            </div>
          ) : (
            <ul className="m-0 list-none space-y-4 p-0">
              {spartanFundraising.athletes.map((row) => {
                const net = row.netAfterReimbursementsCents ?? row.totalCents
                const guildAlloc = row.guildAllocationsCents ?? 0
                const remainingAfterGuild = net - guildAlloc
                const reimb = row.reimbursementsPaidCents ?? 0
                const usedTotal = reimb + guildAlloc
                const showSetupHint = !row.fundraisingCode || row.codeUnavailable

                return (
                  <li
                    key={row.athleteId}
                    className="rounded-xl border border-[#003366]/10 bg-gradient-to-b from-white to-slate-50/40 p-4 shadow-sm sm:p-5"
                  >
                    <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                      <p className="text-lg font-semibold leading-snug text-[#03154C] sm:text-xl">
                        {row.name?.trim() ? row.name : "—"}
                      </p>
                      {showSetupHint ? (
                        <p className="text-xs font-medium text-[#B31B1B]">
                          Add graduation year under Family & athletes to match gifts.
                        </p>
                      ) : null}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg bg-white px-4 py-3 ring-1 ring-[#003366]/10 sm:py-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#B31B1B]">Available</p>
                        <p
                          className={`mt-1 text-2xl font-bold tabular-nums tracking-tight sm:text-3xl ${
                            remainingAfterGuild < 0 ? "text-red-600" : "text-emerald-700"
                          }`}
                        >
                          {formatUsd(remainingAfterGuild)}
                        </p>
                        <p className="mt-1 text-[11px] leading-snug text-slate-500">After reimbursements & Guild holds</p>
                      </div>
                      <div className="rounded-lg bg-white px-4 py-3 ring-1 ring-[#003366]/10 sm:py-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#03154C]/65">Raised</p>
                        <p className="mt-1 text-xl font-bold tabular-nums text-[#03154C] sm:text-2xl">{formatUsd(row.totalCents)}</p>
                        <p className="mt-1 text-[11px] leading-snug text-slate-500">Started with · credited gifts</p>
                      </div>
                      <div className="rounded-lg bg-white px-4 py-3 ring-1 ring-[#003366]/10 sm:py-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#03154C]/65">Spent</p>
                        <p className="mt-1 text-xl font-bold tabular-nums text-[#03154C] sm:text-2xl">
                          {usedTotal > 0 ? formatUsd(usedTotal) : "—"}
                        </p>
                        <p className="mt-1 text-[11px] leading-snug text-slate-500">{spentSubLabel(reimb, guildAlloc)}</p>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>

      {deferFundraiseExtras ? null : (
        <>
          <ExpenseRequestSection linkedAthletes={linkedAthletes} />

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

          <ProfileFundraiseThankYousSection
            loading={supporterContactsLoading}
            lookbackDays={supporterLookbackDays}
            athletes={supporterContacts}
          />
        </>
      )}
    </div>
  )
}
