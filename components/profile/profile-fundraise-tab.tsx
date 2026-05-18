"use client"

import { ExpenseRequestSection } from "@/components/profile/expense-request-section"
import { GuildCreditAllocationSection } from "@/components/profile/guild-credit-allocation-section"
import { ProfileFundraiseThankYousSection } from "@/components/profile/profile-fundraise-thank-yous-section"
import type { ProfileSpartanSupportersAthletePayload } from "@/app/api/profile/spartan-fundraising-supporters/route"
import { Button } from "@/components/ui/button"
import { Loader2, Wallet, TrendingUp, TrendingDown, DollarSign, UserMinus } from "lucide-react"

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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#D3B574]/20">
              <Wallet className="h-5 w-5 text-[#D3B574]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Digital Wallet</h2>
              <p className="text-xs text-white/50">
                <strong className="text-white/70">Raised</strong> matches the NC United fundraising hub leaderboard (same rolling
                window of athlete-credited paid gifts as <span className="text-white/70">/fundraising</span>).{" "}
                <strong className="text-white/70">Available</strong> is after all-time reimbursements and Guild holds. Wrong name on a
                card? Use <strong className="text-white/70">Remove from my account</strong> on that row (or under{" "}
                <strong className="text-white/70">Family &amp; athletes</strong>).
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
                const raisedShown = row.hubWindowRaisedCents ?? row.totalCents
                const giftsShown = row.hubWindowGiftCount ?? row.giftCount ?? 0
                const reimb = row.reimbursementsPaidCents ?? 0
                const net = row.netAfterReimbursementsCents ?? row.totalCents - reimb
                const guildAlloc = row.guildAllocationsCents ?? 0
                const available = net - guildAlloc
                const spent = reimb + guildAlloc
                const showSetupHint = !row.fundraisingCode || row.codeUnavailable
                const linkMeta = linkedAthletes.find((a) => a.id === row.athleteId)
                const showWalletRemove = Boolean(unlinkAthlete && linkMeta?.canUnlink)

                return (
                  <div
                    key={row.athleteId}
                    className="rounded-lg bg-white/5 p-4"
                  >
                    {/* Athlete Name */}
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <h3 className="text-base font-semibold text-white">
                        {row.name?.trim() || "Athlete"}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 justify-end">
                        {showSetupHint && (
                          <span className="text-xs text-amber-400">
                            Add grad year to match gifts
                          </span>
                        )}
                        {showWalletRemove ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={unlinkAthleteId === row.athleteId}
                            className="h-8 border-red-900/60 text-red-300 hover:bg-red-950/40 hover:text-red-100"
                            onClick={() => unlinkAthlete!(row.athleteId)}
                          >
                            {unlinkAthleteId === row.athleteId ? (
                              <>
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                Removing…
                              </>
                            ) : (
                              <>
                                <UserMinus className="mr-1.5 h-3.5 w-3.5" />
                                Remove from my account
                              </>
                            )}
                          </Button>
                        ) : linkMeta?.isProfilePrimaryAthlete ? (
                          <span className="text-[11px] text-white/40 max-w-[220px] text-right">
                            Set on <strong className="text-white/60">Account</strong> if this login shouldn&apos;t be their parent.
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-3">
                      {/* Raised */}
                      <div className="rounded-lg bg-[#13294B]/50 p-3">
                        <div className="flex items-center gap-1.5 text-white/50">
                          <TrendingUp className="h-3.5 w-3.5" />
                          <span className="text-[10px] font-medium uppercase tracking-wide">Raised</span>
                        </div>
                        <p className="mt-1 text-lg font-bold tabular-nums text-white sm:text-xl">
                          {formatUsd(raisedShown)}
                        </p>
                        <p className="mt-0.5 text-[10px] text-white/40">
                          {giftsShown} gift{giftsShown !== 1 ? "s" : ""}
                          {typeof row.hubLookbackDays === "number"
                            ? ` · hub window (${row.hubLookbackDays}d)`
                            : ""}
                        </p>
                      </div>

                      {/* Spent */}
                      <div className="rounded-lg bg-[#13294B]/50 p-3">
                        <div className="flex items-center gap-1.5 text-white/50">
                          <TrendingDown className="h-3.5 w-3.5" />
                          <span className="text-[10px] font-medium uppercase tracking-wide">Spent</span>
                        </div>
                        <p className="mt-1 text-lg font-bold tabular-nums text-red-400 sm:text-xl">
                          {spent > 0 ? formatUsd(spent) : "$0.00"}
                        </p>
                        <p className="mt-0.5 text-[10px] text-white/40">
                          {reimb > 0 && guildAlloc > 0
                            ? "Reimb + Guild"
                            : reimb > 0
                              ? "Reimbursements"
                              : guildAlloc > 0
                                ? "Guild holds"
                                : "None yet"}
                        </p>
                      </div>

                      {/* Available */}
                      <div className="rounded-lg bg-[#D3B574]/10 p-3">
                        <div className="flex items-center gap-1.5 text-[#D3B574]/70">
                          <DollarSign className="h-3.5 w-3.5" />
                          <span className="text-[10px] font-medium uppercase tracking-wide">Available</span>
                        </div>
                        <p className={`mt-1 text-lg font-bold tabular-nums sm:text-xl ${
                          available < 0 ? "text-red-400" : "text-[#D3B574]"
                        }`}>
                          {formatUsd(available)}
                        </p>
                        <p className="mt-0.5 text-[10px] text-white/40">
                          After holds
                        </p>
                      </div>
                    </div>
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
                netAfterReimbursementsCents: a.netAfterReimbursementsCents ?? a.totalCents,
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
