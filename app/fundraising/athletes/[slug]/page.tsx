import { notFound } from "next/navigation"
import type { Metadata } from "next"
import QRCode from "qrcode"
import { createAdminClient } from "@/lib/supabase/admin"
import { getFundraisingAthleteEntries } from "@/lib/spartan-fundraising-code"
import { resolveFundraisingAthletePublic } from "@/lib/fundraising/athlete-fundraising-profiles"
import { getAthleteFundraisingPublicStats, getAthleteRecentGifts } from "@/lib/fundraising/athlete-public-stats"
import { HardLink } from "@/components/hard-link"
import { DEFAULT_FUNDRAISING_CAMPAIGN, FUNDRAISING_GIVE_PAGE_PATH } from "@/lib/fundraising/campaign-registry"
import { formatUsdWhole } from "@/app/fundraising/components/FundraisingHero"

const PLACEHOLDER_ATHLETE_PHOTOS = new Set<string>(["/wrestler-silhouette.png"])

function isUsablePublicAthletePhoto(raw: string | null | undefined): boolean {
  const u = (raw ?? "").trim()
  if (!u || PLACEHOLDER_ATHLETE_PHOTOS.has(u)) return false
  return true
}

function recruitingPhotoFromAthleteRow(row: {
  image_url?: string | null
  photourl?: string | null
  photo_url?: string | null
}): string | null {
  for (const k of ["image_url", "photourl", "photo_url"] as const) {
    const v = row[k]
    if (isUsablePublicAthletePhoto(v)) return v!.trim()
  }
  return null
}

async function fetchRecruitingProfilePhoto(admin: ReturnType<typeof createAdminClient>, athleteId: string): Promise<string | null> {
  const { data, error } = await admin
    .from("athletes")
    .select("image_url, photourl, photo_url")
    .eq("id", athleteId)
    .maybeSingle()
  if (error || !data) return null
  return recruitingPhotoFromAthleteRow(data as { image_url?: string | null; photourl?: string | null; photo_url?: string | null })
}

function publicGiftSiteOrigin(): string {
  const u = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    ""
  ).trim()
  if (u) return u.replace(/\/$/, "")
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return "http://localhost:3000"
}

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
  const athleteId = resolved.profile?.athlete_id ?? resolved.entry?.id ?? null
  const profile = resolved.profile

  const [stats, recent, recruitingPhotoUrl] = await Promise.all([
    code != null ? getAthleteFundraisingPublicStats(code) : Promise.resolve(null),
    code != null ? getAthleteRecentGifts(code, 12) : Promise.resolve([]),
    athleteId ? fetchRecruitingProfilePhoto(admin, athleteId) : Promise.resolve(null),
  ])

  const displayName = publicTitleName(resolved)
  const schoolLine =
    resolved.entry && resolved.entry.label.includes("·")
      ? resolved.entry.label.split("·").slice(1).join("·").trim()
      : null

  const viewProfileHref = athleteId ? `/view-profile?id=${encodeURIComponent(athleteId)}` : null
  const rawFundraisingPhoto = profile?.photo_url?.trim() ?? null
  const fundraisingPhoto =
    rawFundraisingPhoto && isUsablePublicAthletePhoto(rawFundraisingPhoto) ? rawFundraisingPhoto : null
  const heroPhotoSrc = recruitingPhotoUrl ?? fundraisingPhoto
  /** Shared with `/fundraising/give` so the embedded wizard can scroll to checkout. */
  const checkoutAnchor = "spartan-checkout"
  const athleteQ = DEFAULT_FUNDRAISING_CAMPAIGN.athleteQueryParam
  /** Campaign-agnostic gift flow only — not `/spartan` race landing. */
  const giveHref = code
    ? `${FUNDRAISING_GIVE_PAGE_PATH}?${athleteQ}=${encodeURIComponent(code)}#${checkoutAnchor}`
    : `${FUNDRAISING_GIVE_PAGE_PATH}#${checkoutAnchor}`
  const giveAbsoluteUrl = `${publicGiftSiteOrigin()}${giveHref}`
  const qrPixelSize = 144
  const giveQrDataUrl = await QRCode.toDataURL(giveAbsoluteUrl, {
    margin: 1,
    width: qrPixelSize,
    errorCorrectionLevel: "M",
  })

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

        {heroPhotoSrc ? (
          viewProfileHref ? (
            <HardLink
              href={viewProfileHref}
              className="group mt-6 block overflow-hidden rounded-xl border border-white/10 bg-[#0B2545]/50 outline-none ring-offset-2 ring-offset-[#061224] focus-visible:ring-2 focus-visible:ring-[#C8A94A]"
              aria-label={`View ${displayName} recruiting profile on RecruitNC`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroPhotoSrc}
                alt=""
                className="h-auto max-h-[min(420px,55vh)] w-full object-cover object-top transition duration-300 group-hover:opacity-92"
              />
            </HardLink>
          ) : (
            <div className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-[#0B2545]/50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroPhotoSrc}
                alt=""
                className="h-auto max-h-[min(420px,55vh)] w-full object-cover object-top"
              />
            </div>
          )
        ) : null}

        <h1 className="font-[family-name:var(--font-fundraising-display)] mt-6 text-3xl font-black uppercase leading-tight tracking-tight text-white sm:text-4xl">
          {viewProfileHref ? (
            <HardLink
              href={viewProfileHref}
              className="text-white decoration-[#C8A94A] decoration-2 underline-offset-4 hover:text-[#C8A94A] hover:underline"
            >
              {displayName}
            </HardLink>
          ) : (
            displayName
          )}
        </h1>
        {schoolLine ? <p className="mt-2 text-base text-white/65">{schoolLine}</p> : null}
        {code ? <p className="mt-2 font-mono text-xs text-white/40">{code}</p> : null}

        {profile?.bio?.trim() ? (
          <p className="mt-6 max-w-xl text-base leading-relaxed text-white/80">{profile.bio.trim()}</p>
        ) : null}

        <p className="mt-6 max-w-xl text-sm leading-relaxed text-white/75">
          Support NC United Wrestling (501(c)(3), EIN 99-3757238).{" "}
          {code ? (
            <>
              <strong className="text-white/90">Give now</strong> opens our <strong className="text-white/90">campaign-neutral</strong>,{" "}
              tax-deductible checkout with <strong className="text-white/90">{displayName}</strong> pre-selected ({code}) — the same flow as the
              fundraising hub, not a race signup page.
            </>
          ) : (
            <>
              <strong className="text-white/90">Give now</strong> opens the same year-round, campaign-neutral checkout as the hub.
              Add an NCU credit code on this profile so share links credit the right athlete automatically.
            </>
          )}
        </p>

        <HardLink
          href={giveHref}
          className="font-[family-name:var(--font-fundraising-display)] mt-8 inline-flex min-h-[52px] items-center justify-center rounded-sm bg-[#CC0000] px-10 text-sm font-extrabold uppercase tracking-[0.14em] text-white shadow-[0_14px_44px_-10px_rgba(204,0,0,0.55)] hover:bg-[#a80000]"
        >
          Give now
        </HardLink>

        <div className="mx-auto mt-8 max-w-[220px] rounded-xl border border-white/10 bg-white px-3 py-3 text-center shadow-[0_12px_40px_-12px_rgba(0,0,0,0.45)]">
          <p className="font-[family-name:var(--font-fundraising-display)] text-[10px] font-bold uppercase tracking-[0.18em] text-[#061224]/70">
            Scan to give
          </p>
          <p className="mx-auto mt-1 max-w-[200px] text-center text-[10px] leading-snug text-[#061224]/50">
            Same link as Give now · campaign-neutral checkout
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={giveQrDataUrl}
            alt={`Open NC United donation checkout for ${displayName}`}
            className="mx-auto mt-2 h-36 w-36"
            width={144}
            height={144}
          />
          <p className="mx-auto mt-2 max-w-[200px] text-center font-mono text-[9px] leading-snug text-[#061224]/55 break-all">
            {giveAbsoluteUrl}
          </p>
        </div>

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
          {viewProfileHref ? (
            <>
              <strong className="font-semibold text-white/55">Recruiting profile:</strong> use the name or photo link for commitments,
              school info, and match history on RecruitNC. This page is NC United fundraising only.
            </>
          ) : (
            <>
              College recruiting bios live elsewhere on RecruitNC when we can match this page to an athlete id. This page is only
              for NC United fundraising.
            </>
          )}
        </p>
      </div>
    </div>
  )
}
