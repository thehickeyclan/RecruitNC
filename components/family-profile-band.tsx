"use client"

/**
 * "Your profile" on the NC United community site: one band, on the rankings and at the foot of
 * the community pages (Matt, 15 Oct 2026: a claim / create / edit your profile and see college
 * views button "should be many places throughout nc united community site").
 *
 * - Signed out, or signed in with no wrestler: claim the profile (most NC wrestlers already have
 *   one), or create it, and the reason to - college coaches look at them.
 * - A family: each wrestler, how many college programs viewed them, and Open / Edit.
 * - Coaches and admins: nothing. It is a family's band.
 */
import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowRight, Eye, Pencil, Search, UserPlus } from "lucide-react"

import { useAuth } from "@/contexts/auth-context"
import { isPlaceholderAthletePhoto } from "@/lib/recruiting-profile-photo"
import type { FamilyProfileResponse } from "@/app/api/me/family-profile/route"

const GOLD = "inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[#D3B574] px-3.5 text-sm font-bold text-[#0A1628] hover:bg-[#e2c98d]"
const OUTLINE = "inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-white/25 px-3.5 text-sm font-bold text-white hover:border-[#D3B574] hover:text-[#D3B574]"

export function FamilyProfileBand({ className = "" }: { className?: string }) {
  const { user, isLoading } = useAuth()
  const [data, setData] = useState<FamilyProfileResponse | null>(null)

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      setData({ kind: "signed-out" })
      return
    }
    let cancelled = false
    fetch("/api/me/family-profile", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: FamilyProfileResponse | null) => !cancelled && setData(d))
      .catch(() => !cancelled && setData(null))
    return () => {
      cancelled = true
    }
  }, [user, isLoading])

  if (!data || data.kind === "staff") return null
  const wrestlers = data.kind === "family" ? data.wrestlers : []

  return (
    <section aria-label="Your profile" className={`border-y border-white/10 bg-[#0A1628] px-4 py-5 text-white ${className}`}>
      <div className="mx-auto max-w-6xl">
        {wrestlers.length ? (
          <ul className="grid gap-3 md:grid-cols-2">
            {wrestlers.map((w) => (
              <li key={w.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-[#0f1c2e] p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={w.photo && !isPlaceholderAthletePhoto(w.photo) ? w.photo : "/wrestler-silhouette.png"} alt="" className="h-12 w-12 shrink-0 rounded-lg bg-[#13294B] object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-black">{w.name}</p>
                  <Link href={`/athletes/${w.id}#college-views`} className="inline-flex items-center gap-1 text-sm text-[#D3B574] hover:underline">
                    <Eye className="h-3.5 w-3.5" aria-hidden />
                    {w.programs ? `${w.programs} college program${w.programs === 1 ? "" : "s"} viewed` : "See college views"}
                  </Link>
                </div>
                <div className="flex gap-2">
                  <Link href={`/athletes/${w.id}`} className={GOLD}>
                    Open profile <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                  <Link href={`/athletes/${w.id}/edit`} className={OUTLINE} aria-label={`Edit ${w.firstName}'s profile`}>
                    <Pencil className="h-4 w-4" aria-hidden /> Edit
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-widest text-[#D3B574]">Wrestlers &amp; parents</p>
              <p className="mt-1 text-lg font-black">Your results are probably already here. Claim your profile, free.</p>
              <p className="text-sm text-white/65">College coaches look at NC wrestler profiles here. See which programs viewed yours.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {/* /create-profile searches for the existing profile first and only creates one when there is none. */}
              <Link href="/create-profile" className={GOLD}>
                <Search className="h-4 w-4" aria-hidden /> Claim your profile
              </Link>
              <Link href="/create-profile" className={OUTLINE}>
                <UserPlus className="h-4 w-4" aria-hidden /> Create one
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
