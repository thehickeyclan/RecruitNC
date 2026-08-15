"use client"

import { ExpenseRequestSection } from "@/components/profile/expense-request-section"
import { GuildCreditAllocationSection } from "@/components/profile/guild-credit-allocation-section"
import { ProfileFundraiseThankYousSection } from "@/components/profile/profile-fundraise-thank-yous-section"
import type { ProfileSpartanSupportersAthletePayload } from "@/app/api/profile/spartan-fundraising-supporters/route"
import { walletBalanceFromRow } from "@/lib/fundraising/wallet-balance"
import { Button } from "@/components/ui/button"
import { Loader2, Wallet, TrendingUp, TrendingDown, UserMinus } from "lucide-react"

type SpartanRow = {
  athleteId: string
  name: string
  fundraisingCode: string | null
  ledgerCodes?: string[]
  /** Lifetime gross (mirror) — reimbursements/net use this. */
  totalCents: number
  giftCount?: number
  /** When set, matches `/fundraising` athlete leaderboard (hub lookback window). */
  hubWindowRaisedCents?: number
  hubWindowGiftCount?: number
  hubLookbackDays?: number
  raceSignupCount?: number
  codeUnavailable?: boolean
  reimbursementsPaidCents?: number
  netAfterReimbursementsCents?: number
  guildAllocationsCents?: number
}

type LinkedAthlete = { id: string; name: string; canUnlink?: boolean; isProfilePrimaryAthlete?: boolean }

type ProfileFundraiseTabProps = {
  walletPanelActivated: boolean
  spartanFundraising: { athletes: SpartanRow[] } | null
  spartanFundraisingLoading: boolean
  /** Present when GET /api/profile/spartan-fundraising-totals failed (not an empty wallet). */
  spartanWalletError?: string | null
  supporterContactsLoading: boolean
  supporterContacts: ProfileSpartanSupportersAthletePayload[] | null
  linkedLoading: boolean
  linkedCount: number
  linkedAthletes: LinkedAthlete[]
  /** Same handler as Family tab — removes a `parent_athlete_links` row. */
  unlinkAthlete?: (athleteId: string) => void
  unlinkAthleteId?: string | null
  onSpartanTotalsRefresh?: () => void | Promise<void>
}

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100)
}

export function ProfileFundraiseTab({
  walletPanelActivated,
  spartanFundraising,
  spartanFundraisingLoading,
  spartanWalletError = null,
  supporterContactsLoading,
  supporterContacts,
  linkedLoading,
  linkedCount,
  linkedAthletes,
  unlinkAthlete,
  unlinkAthleteId,
  onSpartanTotalsRefresh,
}: ProfileFundraiseTabProps) {
  const deferFundraiseExtras =
    walletPanelActivated &&
    (linkedLoading || (spartanFundraisingLoading && spartanFundraising === null))

  return (
    <div className="space-y-6">
      {/* Digital Wallet Card */}
      <div className="overflow-hidden rounded-xl bg-[#0A1628] shadow-lg">
        {/* Header */}
        <div className="border-b border-white/10 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#D3B574]/20">
              <Wallet className="h-5 w-5 text-[#D3B574]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white">Digital Wallet</h2>
              <p className="text-sm text-white/55">
                Raised, spent, and available balance for each linked athlete.
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6">
          {spartanWalletError ? (
            <div className="py-8 text-center">
              <p className="text-sm text-red-300">{spartanWalletError}</p>
              {onSpartanTotalsRefresh && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4 border-white/20 text-white hover:bg-white/10"
                  onClick={() => void onSpartanTotalsRefresh()}
                >
                  Try again
                </Button>
              )}
            </div>
          ) : spartanFundraisingLoading || (walletPanelActivated && linkedLoading) ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#D3B574]" />
                <p className="mt-3 text-sm text-white/60">
                  {linkedLoading ? "Loading your linked athletes…" : "Loading wallet data…"}
                </p>
              </div>
            </div>
          ) : !walletPanelActivated ? (
            <div className="py-8 text-center">
              <p className="text-sm text-white/50">Select this tab to load your wallet balances.</p>
            </div>
          ) : !spartanFundraising || spartanFundraising.athletes.length === 0 ? (
            <div className="py-8 text-center">
              <Wallet className="mx-auto h-10 w-10 text-white/20" />
              <p className="mt-3 text-sm text-white/50">
                {!linkedLoading && linkedCount === 0
                  ? "Link athletes under Family & Athletes to see balances."
                  : "No fundraising data yet. Add graduation year under Family & Athletes so we can match NCU gift codes to this roster."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {spartanFundraising.athletes.map((row) => {
                const lifetimeRaised = row.totalCents
                const lifetimeGifts = row.giftCount ?? 0
                const hubRaised = row.hubWindowRaisedCents
                const hubGiftCount = row.hubWindowGiftCount
                const reimb = row.reimbursementsPaidCents ?? 0
                const guildAlloc = row.guildAllocationsCents ?? 0
                const { availableCents: available, spentCents: spent } = walletBalanceFromRow(row)
                const showSetupHint = !row.fundraisingCode || row.codeUnavailable
                const linkMeta = linkedAthletes.find((a) => a.id === row.athleteId)
                const showWalletRemove = Boolean(unlinkAthlete && linkMeta?.canUnlink)

                return (
                  <div
                    key={row.athleteId}
                    className="rounded-xl border border-white/10 bg-white/[0.04] p-4 sm:p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold text-white sm:text-lg">
                          {row.name?.trim() || "Athlete"}
                        </h3>
                        <p className="mt-0.5 text-xs text-white/45 sm:text-sm">
                          {row.fundraisingCode ? (
                            <>
                              <span className="font-medium text-white/60">{row.fundraisingCode}</span>
                              <span className="text-white/30"> · </span>
                            </>
                          ) : null}
                          {lifetimeGifts} gift{lifetimeGifts !== 1 ? "s" : ""}
                          {showSetupHint ? (
                            <span className="ml-2 text-amber-400/90">· add grad year to match gifts</span>
                          ) : null}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-lg bg-[#D3B574]/10 px-4 py-3">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-[#D3B574]/80">
                        Available
                      </p>
                      <p className="mt-0.5 text-2xl font-bold tabular-nums text-[#D3B574] sm:text-3xl">
                        {formatUsd(available)}
                      </p>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-[#13294B]/40 px-3 py-2.5">
                        <div className="flex items-center gap-1.5 text-white/45">
                          <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                          <span className="text-[11px] font-medium uppercase tracking-wide">Raised</span>
                        </div>
                        <p className="mt-1 text-base font-semibold tabular-nums text-white sm:text-lg">
                          {formatUsd(lifetimeRaised)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-[#13294B]/40 px-3 py-2.5">
                        <div className="flex items-center gap-1.5 text-white/45">
                          <TrendingDown className="h-3.5 w-3.5 shrink-0" />
                          <span className="text-[11px] font-medium uppercase tracking-wide">Spent</span>
                        </div>
                        <p className="mt-1 text-base font-semibold tabular-nums text-red-300 sm:text-lg">
                          {spent > 0 ? formatUsd(spent) : "$0.00"}
                        </p>
                        {spent > 0 ? (
                          <p className="mt-0.5 text-[10px] text-white/35">
                            {reimb > 0 && guildAlloc > 0
                              ? "Reimbursements + Guild"
                              : reimb > 0
                                ? "Reimbursements"
                                : "Guild holds"}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {typeof hubRaised === "number" &&
                    typeof hubGiftCount === "number" &&
                    (hubRaised !== lifetimeRaised || hubGiftCount !== lifetimeGifts) ? (
                      <p className="mt-3 text-[11px] leading-snug text-white/40">
                        Public leaderboard shows {formatUsd(hubRaised)} for the current season window.
                      </p>
                    ) : null}

                    {showWalletRemove ? (
                      <div className="mt-4 border-t border-white/10 pt-3">
                        <button
                          type="button"
                          disabled={unlinkAthleteId === row.athleteId}
                          className="inline-flex items-center gap-1.5 text-xs text-white/40 transition-colors hover:text-red-300 disabled:opacity-50"
                          onClick={() => unlinkAthlete!(row.athleteId)}
                        >
                          {unlinkAthleteId === row.athleteId ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Removing…
                            </>
                          ) : (
                            <>
                              <UserMinus className="h-3.5 w-3.5" />
                              Not your athlete? Remove from account
                            </>
                          )}
                        </button>
                      </div>
                    ) : linkMeta?.isProfilePrimaryAthlete ? (
                      <p className="mt-4 border-t border-white/10 pt-3 text-[11px] text-white/35">
                        This athlete is tied to your login on Account settings.
                      </p>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Additional Sections */}
      {!deferFundraiseExtras && (
        <>
          <ExpenseRequestSection linkedAthletes={linkedAthletes} />

          <GuildCreditAllocationSection
            onSpartanTotalsRefresh={onSpartanTotalsRefresh}
            spartanLoading={spartanFundraisingLoading}
            spartanAthletes={
              spartanFundraising?.athletes?.map((a) => ({
                athleteId: a.athleteId,
                name: a.name,
                netAfterReimbursementsCents:
                  a.netAfterReimbursementsCents ?? a.totalCents - (a.reimbursementsPaidCents ?? 0),
                codeUnavailable: a.codeUnavailable,
              })) ?? []
            }
          />

          <ProfileFundraiseThankYousSection loading={supporterContactsLoading} athletes={supporterContacts} />
        </>
      )}
    </div>
  )
}
