"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ExpenseRequestSection } from "@/components/profile/expense-request-section"
import { Loader2, Coins } from "lucide-react"

type SpartanRow = {
  athleteId: string
  name: string
  fundraisingCode: string | null
  totalCents: number
  giftCount?: number
  raceSignupCount?: number
  codeUnavailable?: boolean
  reimbursementsPaidCents: number
  netAfterReimbursementsCents: number
}

type LinkedAthlete = { id: string; name: string }

type ProfileFundraiseTabProps = {
  spartanFundraising: { athletes: SpartanRow[] } | null
  spartanFundraisingLoading: boolean
  linkedLoading: boolean
  linkedCount: number
  linkedAthletes: LinkedAthlete[]
}

function formatRaised(cents: number) {
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
          <CardDescription className="text-slate-600 text-sm leading-relaxed">
            Per linked wrestler, last 120 days — for your information, not a bank balance. Link kids on{" "}
            <span className="font-medium text-slate-700">Family &amp; athletes</span> if someone’s missing. We email you
            (and may text) when a reimbursement is updated.
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
                  ? "Link your athletes on the Family tab to see totals here."
                  : "Nothing to show yet, or a wrestler needs a graduation year on their profile for us to list a code."}
              </p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto rounded-xl border border-[#003366]/10 bg-slate-50/50">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-[#003366]/10">
                    <TableHead className="min-w-[8rem] text-[#03154C] font-semibold">Athlete</TableHead>
                    <TableHead className="w-[5.5rem] text-right text-[#03154C] font-semibold">Raised</TableHead>
                    <TableHead className="w-[5.5rem] text-right text-[#03154C] font-semibold">Reimb. paid</TableHead>
                    <TableHead className="w-[5.5rem] text-right text-[#03154C] font-semibold">Net</TableHead>
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
                            <p className="text-xs text-[#B31B1B] mt-0.5">Add graduation year on the athlete profile to show a code.</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold tabular-nums text-[#003366]">{formatRaised(row.totalCents)}</TableCell>
                      <TableCell className="text-right tabular-nums text-slate-700">
                        {row.reimbursementsPaidCents > 0 ? formatRaised(row.reimbursementsPaidCents) : "—"}
                      </TableCell>
                      <TableCell
                        className={`text-right font-bold tabular-nums ${
                          row.netAfterReimbursementsCents < 0 ? "text-[#B31B1B]" : "text-[#0f5132]"
                        }`}
                      >
                        {formatRaised(row.netAfterReimbursementsCents)}
                      </TableCell>
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

      <ExpenseRequestSection linkedAthletes={linkedAthletes} />
    </div>
  )
}
