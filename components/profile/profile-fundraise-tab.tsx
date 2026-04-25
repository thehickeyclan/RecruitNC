"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Coins, Sparkles } from "lucide-react"

type SpartanRow = {
  athleteId: string
  name: string
  fundraisingCode: string | null
  totalCents: number
  giftCount?: number
  raceSignupCount?: number
  codeUnavailable?: boolean
}

type ProfileFundraiseTabProps = {
  spartanFundraising: { athletes: SpartanRow[] } | null
  spartanFundraisingLoading: boolean
  linkedLoading: boolean
  linkedCount: number
}

function formatRaised(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100)
}

export function ProfileFundraiseTab({
  spartanFundraising,
  spartanFundraisingLoading,
  linkedLoading,
  linkedCount,
}: ProfileFundraiseTabProps) {
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-[#003366]/12 bg-gradient-to-br from-white via-slate-50/80 to-[#B31B1B]/[0.06] p-1 shadow-sm">
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#CBAF5D]/20 blur-2xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-4 bottom-0 h-24 w-24 rounded-full bg-[#003366]/10 blur-2xl"
          aria-hidden
        />
        <div className="relative rounded-[0.9rem] bg-white/90 px-4 py-4 sm:px-5 sm:py-5 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#03154C] to-[#003366] text-[#CBAF5D] shadow-md">
              <Sparkles className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-[#03154C] sm:text-lg">Spartan 2026 fundraising</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Totals match Admin → Fundraising (Stripe + credit fixes). This is a team snapshot for your family — not a
                personal balance or payout guarantee. Link athletes on the <strong>Family &amp; athletes</strong> tab
                to see per-wrestler rows.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Card className="border-[#003366]/12 shadow-md shadow-[#003366]/5 overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-[#03154C] via-[#B31B1B] to-[#CBAF5D]" aria-hidden />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg text-[#03154C]">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#03154C] text-[#CBAF5D]">
              <Coins className="h-4 w-4" strokeWidth={2} />
            </div>
            Your family&apos;s raised totals
          </CardTitle>
          <CardDescription className="text-slate-600">
            120-day window consistent with the admin leaderboard.
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
                  ? "Link your athletes on the Family tab to see fundraising totals per wrestler here."
                  : "No fundraising rows yet for your linked athletes, or codes need name + grad year in our system."}
              </p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto rounded-xl border border-[#003366]/10 bg-slate-50/50">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-[#003366]/10">
                    <TableHead className="min-w-[8rem] text-[#03154C] font-semibold">Athlete</TableHead>
                    <TableHead className="w-[5.5rem] text-right text-[#03154C] font-semibold">Raised</TableHead>
                    <TableHead className="w-16 text-right text-[#03154C] font-semibold">Gifts</TableHead>
                    <TableHead className="w-28 text-right text-[#03154C] font-semibold">Race signups</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {spartanFundraising.athletes.map((row) => (
                    <TableRow key={row.athleteId} className="border-[#003366]/5 hover:bg-white/80">
                      <TableCell>
                        <div>
                          <p className="font-semibold text-[#03154C]">{row.name}</p>
                          {row.fundraisingCode ? (
                            <p className="text-xs text-slate-500 font-mono mt-0.5">{row.fundraisingCode}</p>
                          ) : (
                            <p className="text-xs text-[#B31B1B] mt-0.5">No NCU code (needs name + grad year in our system).</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold tabular-nums text-[#003366]">{formatRaised(row.totalCents)}</TableCell>
                      <TableCell className="text-right tabular-nums text-slate-600">{row.giftCount ?? 0}</TableCell>
                      <TableCell className="text-right tabular-nums text-slate-600">{row.raceSignupCount ?? 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
