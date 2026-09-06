"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Loader2, Check, ArrowRight } from "lucide-react"
import type { ProfileGap, ProfileReveal } from "@/lib/profile-reveal"

/**
 * "Found you" — the record we already hold, shown before anything is asked for.
 *
 * A wrestler landing here usually does not know NC United already built their profile, so
 * opening with a form asks them to type a high school we have their state placement for. The
 * record earns the answers that come after it, and the gap list turns "fill in your profile"
 * into "these two things are what a college coach asks for and we do not have them".
 */
export function RevealStep({
  athleteId,
  onConfirm,
  onReject,
}: {
  athleteId: string
  onConfirm: (reveal: ProfileReveal) => void
  onReject: () => void
}) {
  const [reveal, setReveal] = useState<ProfileReveal | null>(null)
  const [gaps, setGaps] = useState<ProfileGap[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/profiles/${encodeURIComponent(athleteId)}/reveal`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        setReveal(d.reveal ?? null)
        setGaps(Array.isArray(d.gaps) ? d.gaps : [])
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [athleteId])

  if (loading) {
    return (
      <div className="mx-auto flex max-w-lg items-center justify-center py-20 text-white/60">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Looking you up…
      </div>
    )
  }

  if (!reveal) {
    return (
      <div className="mx-auto max-w-lg text-center text-white/70">
        <p>We could not load that profile.</p>
        <button onClick={onReject} className="mt-4 text-sm font-semibold text-[#D3B574] hover:underline">
          Go back
        </button>
      </div>
    )
  }

  const firstName = reveal.name.trim().split(/\s+/)[0]

  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-sm border border-white/10 bg-[#0f1c2e] p-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D3B574]">
          {reveal.hasRecord ? "Found you" : "Is this you?"}
        </p>

        <div className="mt-3 flex items-start gap-4">
          {reveal.photoUrl ? (
            <Image
              src={reveal.photoUrl}
              alt={reveal.name}
              width={72}
              height={90}
              className="h-[90px] w-[72px] shrink-0 rounded-sm border border-white/10 object-cover object-top"
              unoptimized
            />
          ) : null}
          <div className="min-w-0">
            <h2 className="text-2xl font-black leading-tight text-white">{reveal.name}</h2>
            <p className="mt-1 text-sm text-white/60">
              {[
                reveal.graduationYear ? `Class of ${reveal.graduationYear}` : null,
                reveal.highSchool,
                reveal.club,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {reveal.prospectRanking ? (
              <span className="mt-2 inline-block bg-[#D3B574] px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-[#0A1628]">
                Ranked #{reveal.prospectRanking} in the class
              </span>
            ) : null}
          </div>
        </div>

        {reveal.credentials.length > 0 ? (
          <div className="mt-5">
            <p className="text-sm text-white/70">
              We have already been tracking {firstName}&rsquo;s results:
            </p>
            <ul className="mt-2 space-y-1.5">
              {reveal.credentials.map((c, i) => (
                <li
                  key={i}
                  className="flex flex-wrap items-baseline gap-x-2 rounded-sm bg-white/5 px-3 py-2 text-sm"
                >
                  <span className="font-mono text-xs text-white/40">{c.year}</span>
                  <span className="font-semibold text-white">{c.label}</span>
                  <span className="text-white/70">{c.detail}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-5 text-sm text-white/60">
            We do not have results on file for this profile yet — they get added as we import
            tournaments.
          </p>
        )}

        {gaps.length > 0 ? (
          <div className="mt-5 rounded-sm border border-[#D3B574]/30 bg-[#D3B574]/5 p-3">
            <p className="text-sm font-semibold text-[#D3B574]">
              What college coaches ask for that we don&rsquo;t have
            </p>
            <ul className="mt-2 space-y-1">
              {gaps.map((g) => (
                <li key={g.field} className="text-sm text-white/70">
                  <span className="font-semibold text-white">{g.label}</span> — {g.why}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={() => onConfirm(reveal)}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-sm bg-[#B31B1B] px-4 text-sm font-bold text-white hover:bg-[#8f1616]"
          >
            <Check className="h-4 w-4" />
            {reveal.hasRecord ? `That's me — claim this profile` : "Yes, this is me"}
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={onReject}
            className="min-h-[44px] text-sm text-white/50 hover:text-white/80"
          >
            Not me — start a new profile
          </button>
        </div>
      </div>
    </div>
  )
}
