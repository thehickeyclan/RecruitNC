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
      <section className="overflow-hidden rounded-2xl border border-[#003366]/12 bg-white shadow-md shadow-[#003366]/5">
        <div className="flex items-center gap-2 px-4 py-5 text-sm text-slate-600 sm:px-6">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#03154C]" aria-hidden />
          Loading…
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

  const windowLabel = lookbackDays != null ? `${lookbackDays}-day window` : "campaign window"

  return (
    <section className="overflow-hidden rounded-2xl border border-[#003366]/12 bg-white shadow-md shadow-[#003366]/5">
      <div className="h-1 w-full bg-gradient-to-r from-[#03154C] via-[#B31B1B] to-[#CBAF5D]" aria-hidden />
      <div className="border-b border-[#003366]/8 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#03154C] text-[#CBAF5D] shadow-sm">
            <Heart className="h-5 w-5" strokeWidth={2} aria-hidden />
          </span>
          <div>
            <h2 className="text-base font-bold tracking-tight text-[#03154C] sm:text-lg">Thank your supporters</h2>
            <p className="text-xs text-slate-600">
              Open each gift page while signed in to thank donors privately.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 px-4 py-5 sm:px-6 sm:py-6">
        {!hasAnySupporters ? (
          <p className="text-sm text-slate-600">Supporter counts appear when gifts credit in the last {windowLabel}.</p>
        ) : null}

        <ul className="m-0 list-none space-y-3 p-0">
          {eligibleAthletes.map((a) => {
            const hasGifts = a.supporterCount > 0
            const thankedCount = typeof a.thankedCount === "number" ? a.thankedCount : 0
            const remainingThanks = hasGifts ? Math.max(0, a.supporterCount - thankedCount) : 0
            const allMarkedThanked = hasGifts && remainingThanks === 0

            return (
              <li
                key={a.athleteId}
                className="flex flex-col gap-3 rounded-xl border border-[#003366]/10 bg-slate-50/50 p-4 sm:flex-row sm:items-center sm:justify-between"
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
                    <p className="font-semibold text-[#03154C]">{a.name?.trim() || "Athlete"}</p>
                    <p className="mt-1 text-xs leading-snug text-slate-600">
                      {hasGifts ? (
                        <>
                          {a.supporterCount} supporter{a.supporterCount === 1 ? "" : "s"} · {thankedCount} thanked
                          {remainingThanks > 0 ? ` · ${remainingThanks} left` : allMarkedThanked ? " · all set" : ""}
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
                    Gift page →
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
