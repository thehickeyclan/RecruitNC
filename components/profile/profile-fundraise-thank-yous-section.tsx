"use client"

import { HardLink } from "@/components/hard-link"
import { Loader2, Heart, CheckCircle2, Mail } from "lucide-react"
import type { ProfileSpartanSupportersAthletePayload } from "@/app/api/profile/spartan-fundraising-supporters/route"

export function ProfileFundraiseThankYousSection(props: {
  loading: boolean
  lookbackDays: number | null
  athletes: ProfileSpartanSupportersAthletePayload[] | null
}) {
  const { loading, lookbackDays, athletes } = props

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] overflow-hidden">
        <div className="px-4 py-5 sm:px-6 sm:py-6 flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-[#03154C]" aria-hidden />
          Loading supporter summaries…
        </div>
      </section>
    )
  }

  if (!athletes || athletes.length === 0) {
    return null
  }

  const eligibleAthletes = athletes.filter((a) => a.fundraisingCode && !a.codeUnavailable)
  const hasAnySupporters = athletes.some((a) => a.supporterCount > 0)

  if (eligibleAthletes.length === 0 && !hasAnySupporters) {
    return null
  }

  const windowLabel =
    lookbackDays != null ? `${lookbackDays}-day campaign window` : "campaign window"

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
              Email and phone from checkout stay off your profile for privacy. Open each athlete&apos;s gift page while logged in —
              same accounts as <span className="font-medium text-slate-800">Family &amp; Fundraise</span> (linked parent, athlete on
              their own login, or RecruitNC admin) — to copy contacts and send thanks.
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 sm:px-6 sm:py-6 space-y-4">
        {!hasAnySupporters ? (
          <p className="text-sm text-slate-600">
            When gifts arrive in the last {windowLabel}, you&apos;ll see a count here with a shortcut to the private list on the
            gift page.
          </p>
        ) : null}

        <ul className="space-y-3 list-none p-0 m-0">
          {eligibleAthletes.map((a) => {
            const hasGifts = a.supporterCount > 0
            const thankedCount = typeof a.thankedCount === "number" ? a.thankedCount : 0
            const remainingThanks = hasGifts ? Math.max(0, a.supporterCount - thankedCount) : 0
            const allMarkedThanked = hasGifts && remainingThanks === 0

            return (
              <li
                key={a.athleteId}
                className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="mt-0.5 shrink-0" aria-hidden>
                    {hasGifts ? (
                      allMarkedThanked ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-700/85" />
                      ) : (
                        <Mail className="h-5 w-5 text-amber-700/90" />
                      )
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-slate-400/90" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{a.name?.trim() || "Athlete"}</p>
                    <p className="mt-1 text-xs leading-snug text-slate-600">
                      {hasGifts ? (
                        <>
                          <span className="font-medium text-slate-800">{a.supporterCount}</span> supporter
                          {a.supporterCount === 1 ? "" : "s"} in the last {windowLabel}.{" "}
                          <span className="font-medium text-slate-800">{thankedCount}</span> marked thanked on the gift page
                          {remainingThanks > 0 ? (
                            <>
                              {" "}
                              · <span className="font-medium text-slate-800">{remainingThanks}</span> not marked yet
                            </>
                          ) : (
                            " · all marked"
                          )}
                          . Checkout email &amp; phone stay on that page (managers only).
                        </>
                      ) : (
                        <>No credited gifts in the last {windowLabel}.</>
                      )}
                    </p>
                  </div>
                </div>
                {a.giftPagePath ? (
                  <HardLink
                    href={a.giftPagePath}
                    className="shrink-0 text-sm font-semibold text-[#03154C] underline-offset-2 hover:underline sm:text-right"
                  >
                    Private thank-you list →
                  </HardLink>
                ) : null}
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
