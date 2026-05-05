"use client"

import { useCallback, useState } from "react"
import { HardLink } from "@/components/hard-link"
import { Button } from "@/components/ui/button"
import { Loader2, Heart, Copy, Check } from "lucide-react"
import type { ProfileSpartanSupportersAthletePayload } from "@/app/api/profile/spartan-fundraising-supporters/route"

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100)
}

function supporterEmail(r: ProfileSpartanSupportersAthletePayload["rows"][number]): string | null {
  const e = r.donorEmail?.trim() || r.notificationEmail?.trim()
  return e || null
}

export function ProfileFundraiseThankYousSection(props: {
  loading: boolean
  lookbackDays: number | null
  athletes: ProfileSpartanSupportersAthletePayload[] | null
}) {
  const { loading, lookbackDays, athletes } = props
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const copyText = useCallback(async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(key)
      window.setTimeout(() => setCopiedKey(null), 2000)
    } catch {
      /* ignore */
    }
  }, [])

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] overflow-hidden">
        <div className="px-4 py-5 sm:px-6 sm:py-6 flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-[#03154C]" aria-hidden />
          Loading supporter contacts…
        </div>
      </section>
    )
  }

  if (!athletes || athletes.length === 0) {
    return null
  }

  const hasAnyRow = athletes.some((a) => a.rows.length > 0)
  const eligibleAthletes = athletes.filter((a) => a.fundraisingCode && !a.codeUnavailable)

  if (eligibleAthletes.length === 0 && !hasAnyRow) {
    return null
  }

  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] overflow-hidden">
      <div className="border-b border-slate-100 bg-gradient-to-br from-slate-50 via-white to-[#f8fafc] px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex items-start gap-3 sm:gap-4">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#03154C] text-[#e8d5a3] shadow-sm"
            aria-hidden
          >
            <Heart className="h-5 w-5" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">Thank your supporters</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              For each linked athlete, checkout contact info from the last{" "}
              {lookbackDays != null ? (
                <span className="font-medium text-slate-800">{lookbackDays} days</span>
              ) : (
                "campaign window"
              )}
              . Use it only for personal thank-yous — don&apos;t add people to mailing lists or share their details.
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 sm:px-6 sm:py-6 space-y-8">
        {!hasAnyRow ? (
          <p className="text-sm text-slate-600">
            When gifts come in, donor email (and phone when Stripe collected it) will show here so you can say thanks.
          </p>
        ) : null}

        {athletes.map((a) => {
          if (a.rows.length === 0) return null
          return (
            <div key={a.athleteId} className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
                <h3 className="text-base font-semibold text-slate-900">{a.name?.trim() || "Athlete"}</h3>
                {a.giftPagePath ? (
                  <HardLink href={a.giftPagePath} className="text-sm font-medium text-[#03154C] underline-offset-2 hover:underline">
                    Open public gift page
                  </HardLink>
                ) : null}
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-200/90 bg-slate-50/30">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-white/80 text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Date</th>
                      <th className="px-3 py-2 font-semibold">Name</th>
                      <th className="px-3 py-2 font-semibold">Email</th>
                      <th className="px-3 py-2 font-semibold">Phone</th>
                      <th className="px-3 py-2 font-semibold text-right">Amount</th>
                      <th className="px-3 py-2 font-semibold text-right w-24"> </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {a.rows.map((r, i) => {
                      const email = supporterEmail(r)
                      const copyKey = `${a.athleteId}-${i}-${r.createdIso}`
                      return (
                        <tr key={copyKey} className="text-slate-800">
                          <td className="whitespace-nowrap px-3 py-2.5 text-xs tabular-nums text-slate-500">
                            {r.createdIso
                              ? new Date(r.createdIso).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : "—"}
                          </td>
                          <td className="max-w-[140px] truncate px-3 py-2.5" title={r.donorName ?? ""}>
                            {r.donorName ?? "—"}
                          </td>
                          <td className="max-w-[200px] truncate px-3 py-2.5 text-slate-700" title={email ?? ""}>
                            {email ?? "—"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{r.donorPhone ?? "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums text-emerald-800">
                            {formatUsd(r.amountCents)}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <div className="flex justify-end gap-1">
                              {email ? (
                                <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                                  <a href={`mailto:${encodeURIComponent(email)}`}>Email</a>
                                </Button>
                              ) : null}
                              {email ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2"
                                  title="Copy email"
                                  onClick={() => void copyText(copyKey, email)}
                                >
                                  {copiedKey === copyKey ? (
                                    <Check className="h-4 w-4 text-emerald-600" aria-hidden />
                                  ) : (
                                    <Copy className="h-4 w-4" aria-hidden />
                                  )}
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Email is from checkout. If a donor chose to stay private on the public gift list, you may still see contact
                details here for your own thank-yous.
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
