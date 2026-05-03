import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { createAdminClient } from "@/lib/supabase/admin"
import { getFundraisingAthleteEntries } from "@/lib/spartan-fundraising-code"
import { resolveFundraisingAthletePublic } from "@/lib/fundraising/athlete-fundraising-profiles"
import { getAthleteFundraisingPublicStats, getAthleteRecentGifts } from "@/lib/fundraising/athlete-public-stats"
import { HardLink } from "@/components/hard-link"
import { DEFAULT_FUNDRAISING_CAMPAIGN } from "@/lib/fundraising/campaign-registry"
import { formatUsdWhole } from "@/app/fundraising/components/FundraisingHero"

type Props = { params: Promise<{ slug: string }> }

function publicTitleName(
  resolved: NonNullable<Awaited<ReturnType<typeof resolveFundraisingAthletePublic>>>,
): string {
  if (resolved.entry?.fullName?.trim()) return resolved.entry.fullName.trim()
  if (resolved.entry?.label?.trim()) return resolved.entry.label.trim()
  if (resolved.fallbackDisplayName?.trim()) return resolved.fallbackDisplayName.trim()
  if (resolved.code) return resolved.code
  return "Athlete"
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const admin = createAdminClient()
  const entries = await getFundraisingAthleteEntries(admin)
  const resolved = await resolveFundraisingAthletePublic(admin, slug, entries)
  if (!resolved) return { title: "Athlete | NC United Fundraising" }

  const name = publicTitleName(resolved)
  return {
    title: `Support ${name} | NC United Fundraising`,
    description: `Tax-deductible NC United 501(c)(3) support — ${name}. Give securely through our nonprofit checkout.`,
  }
}

export default async function FundraisingAthletePublicPage({ params }: Props) {
  const { slug } = await params
  const admin = createAdminClient()
  const entries = await getFundraisingAthleteEntries(admin)
  const resolved = await resolveFundraisingAthletePublic(admin, slug, entries)
  if (!resolved) notFound()

  const code = resolved.code
  const [stats, recent] =
    code != null
      ? await Promise.all([getAthleteFundraisingPublicStats(code), getAthleteRecentGifts(code, 12)])
      : [null, []]

  const displayName = publicTitleName(resolved)
  const schoolLine =
    resolved.entry && resolved.entry.label.includes("·")
      ? resolved.entry.label.split("·").slice(1).join("·").trim()
      : null

  const profile = resolved.profile
  const giveHref = code
    ? `${DEFAULT_FUNDRAISING_CAMPAIGN.publicPagePath}?${DEFAULT_FUNDRAISING_CAMPAIGN.athleteQueryParam}=${encodeURIComponent(code)}`
    : DEFAULT_FUNDRAISING_CAMPAIGN.publicPagePath

  const goalCents = profile?.campaign_goal_cents ?? null
  const raisedForBar = stats?.raisedCents ?? 0
  const progressPct =
    goalCents != null && goalCents > 0 ? Math.min(100, Math.round((raisedForBar / goalCents) * 100)) : null

  return (
    <div
      className="min-h-screen bg-[#061224] px-4 py-12 text-white"
      style={{ fontFamily: "var(--font-fundraising-body), system-ui, sans-serif" }}
    >
      <div className="mx-auto max-w-2xl">
        <HardLink
          href="/fundraising/athletes"
          className="text-sm font-semibold text-[#C8A94A] underline-offset-4 hover:underline"
        >
          ← All athletes
        </HardLink>

        <p className="font-[family-name:var(--font-fundraising-display)] mt-8 text-[11px] font-bold uppercase tracking-[0.28em] text-[#CC0000]">
          NC United — donor page
        </p>

        {profile?.photo_url ? (
          <div className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-[#0B2545]/50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={profile.photo_url}
              alt=""
              className="h-auto max-h-[min(420px,55vh)] w-full object-cover object-top"
            />
          </div>
        ) : null}

        <h1 className="font-[family-name:var(--font-fundraising-display)] mt-6 text-3xl font-black uppercase leading-tight tracking-tight text-white sm:text-4xl">
          {displayName}
        </h1>
        {schoolLine ? <p className="mt-2 text-base text-white/65">{schoolLine}</p> : null}
        {code ? <p className="mt-2 font-mono text-xs text-white/40">{code}</p> : null}

        {profile?.bio?.trim() ? (
          <p className="mt-6 max-w-xl text-base leading-relaxed text-white/80">{profile.bio.trim()}</p>
        ) : null}

        <p className="mt-6 max-w-xl text-sm leading-relaxed text-white/75">
          Support NC United Wrestling (501(c)(3), EIN 99-3757238). Your gift can be credited to this athlete at
          checkout — search their name or open the button below
          {code ? " with their code ready." : "."}
        </p>

        <HardLink
          href={giveHref}
          className="font-[family-name:var(--font-fundraising-display)] mt-8 inline-flex min-h-[52px] items-center justify-center rounded-sm bg-[#CC0000] px-10 text-sm font-extrabold uppercase tracking-[0.14em] text-white shadow-[0_14px_44px_-10px_rgba(204,0,0,0.55)] hover:bg-[#a80000]"
        >
          Give now
        </HardLink>

        {goalCents != null && goalCents > 0 ? (
          <div className="mt-10 rounded-xl border border-white/10 bg-[#0B2545]/70 px-5 py-5">
            <h2 className="font-[family-name:var(--font-fundraising-display)] text-sm font-bold uppercase tracking-wide text-[#C8A94A]">
              Campaign goal
            </h2>
            <p className="mt-2 text-sm text-white/60">
              {formatUsdWhole(raisedForBar)} raised of {formatUsdWhole(goalCents)}
              {progressPct != null ? ` · ${progressPct}%` : ""}
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#C8A94A] transition-[width] duration-500"
                style={{ width: `${progressPct ?? 0}%` }}
              />
            </div>
          </div>
        ) : null}

        {code && stats && (stats.giftCount > 0 || stats.raisedCents > 0) ? (
          <div className="mt-12 rounded-xl border border-white/10 bg-[#0B2545]/70 px-5 py-5">
            <h2 className="font-[family-name:var(--font-fundraising-display)] text-sm font-bold uppercase tracking-wide text-[#C8A94A]">
              Credit to this athlete (Stripe mirror)
            </h2>
            <p className="mt-3 text-2xl font-black tabular-nums text-white">{formatUsdWhole(stats.raisedCents)}</p>
            <p className="mt-1 text-sm text-white/55">{stats.giftCount} gifts recorded to this NCU code</p>
            <p className="mt-2 text-xs text-white/40">
              Totals mirror paid checkouts. Admin credit corrections may adjust public leaderboards separately.
            </p>
          </div>
        ) : code ? (
          <p className="mt-10 text-sm text-white/50">Be the first gift credited to this code in our live Stripe data.</p>
        ) : (
          <p className="mt-10 text-sm text-white/50">
            Checkout is live — use Give now to complete a gift. (This page does not yet have an NCU credit code on file.)
          </p>
        )}

        {recent.length > 0 ? (
          <div className="mt-10">
            <h2 className="font-[family-name:var(--font-fundraising-display)] text-sm font-bold uppercase tracking-wide text-white">
              Recent gifts
            </h2>
            <ul className="mt-3 divide-y divide-white/10 rounded-lg border border-white/10 bg-black/20">
              {recent.map((r, i) => (
                <li key={`${r.created_at}-${i}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
                  <span className="text-xs tabular-nums text-white/40">
                    {new Date(r.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                  <span className="flex-1 text-white/85">{r.donorLabel}</span>
                  <span className="font-semibold text-[#C8A94A] tabular-nums">{formatUsdWhole(r.amountCents)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="mt-12 border-t border-white/10 pt-8 text-xs text-white/45">
          College recruiting bios live elsewhere on RecruitNC. This page is only for NC United fundraising.
        </p>
      </div>
    </div>
  )
}
