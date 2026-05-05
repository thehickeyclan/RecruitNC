import { notFound } from "next/navigation"
import type { Metadata } from "next"
import QRCode from "qrcode"
import { createAdminClient } from "@/lib/supabase/admin"
import { resolveFundraisingAthletePublicBySlugForRequest } from "@/lib/fundraising/athlete-fundraising-profiles"
import { getAthleteFundraisingPublicSnapshot, type AthleteFundraisingPublicStats } from "@/lib/fundraising/athlete-public-stats"
import { HardLink } from "@/components/hard-link"
import { createClient } from "@/lib/supabase/server"
import { DEFAULT_FUNDRAISING_CAMPAIGN, FUNDRAISING_GIVE_PAGE_PATH } from "@/lib/fundraising/campaign-registry"
import { formatUsdWhole } from "@/app/fundraising/components/FundraisingHero"
import { userCanManageFundraisingForAthlete, userIsRecruitNcAdmin } from "@/lib/fundraising/athlete-fundraising-access"
import { FundraisingAthleteQrCard } from "./fundraising-athlete-qr-card"
import { FundraisingAthleteEmbeddedCheckout } from "./fundraising-athlete-embedded-checkout"
import { FundraisingAthleteMessageSection } from "./fundraising-athlete-message"
import { FundraisingMilestoneTrophy } from "./fundraising-milestone-trophy"
import { recruitingProfilePhotoFromRow } from "@/lib/recruiting-profile-photo"

const HERO_FALLBACK_SILHOUETTE = "/wrestler-silhouette.png"

const PRIMARY_DONATE_CTA_CLASS =
  "font-[family-name:var(--font-fundraising-display)] flex min-h-[52px] w-full touch-manipulation items-center justify-center rounded-sm bg-[#CC0000] px-8 text-sm font-extrabold uppercase tracking-[0.14em] text-white shadow-[0_14px_44px_-10px_rgba(204,0,0,0.55)] hover:bg-[#a80000] sm:inline-flex sm:w-auto sm:min-w-[240px]"

async function fetchRecruitingProfilePhoto(admin: ReturnType<typeof createAdminClient>, athleteId: string): Promise<string | null> {
  const { data, error } = await admin.from("athletes").select("*").eq("id", athleteId).maybeSingle()
  if (error || !data) return null
  return recruitingProfilePhotoFromRow(data as Record<string, unknown>)
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

type PageProps = { params: Promise<{ slug: string }>; searchParams?: Promise<{ cancelled?: string }> }

function publicTitleName(
  resolved: NonNullable<Awaited<ReturnType<typeof resolveFundraisingAthletePublicBySlugForRequest>>>,
): string {
  if (resolved.entry?.fullName?.trim()) return resolved.entry.fullName.trim()
  if (resolved.entry?.label?.trim()) return resolved.entry.label.trim()
  if (resolved.fallbackDisplayName?.trim()) return resolved.fallbackDisplayName.trim()
  if (resolved.code) return resolved.code
  return "Athlete"
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const resolved = await resolveFundraisingAthletePublicBySlugForRequest(slug)
  if (!resolved) return { title: "Athlete | NC United Fundraising" }

  const name = publicTitleName(resolved)
  return {
    title: `Support ${name} | NC United Fundraising`,
    description: `Support ${name} and NC United Wrestling — tax-deductible 501(c)(3) gifts help North Carolina wrestlers and teams. Secure checkout.`,
  }
}

export default async function FundraisingAthletePublicPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const sp = (await searchParams) ?? {}
  const cancelledCheckout = sp.cancelled === "1"
  const admin = createAdminClient()
  const resolved = await resolveFundraisingAthletePublicBySlugForRequest(slug)
  if (!resolved) notFound()

  const code = resolved.code
  const athleteId = resolved.profile?.athlete_id ?? resolved.entry?.id ?? null
  const profile = resolved.profile

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isFundraisingManager =
    !!(user?.id && athleteId && (await userCanManageFundraisingForAthlete(admin, user.id, athleteId)))
  const viewerIsRecruitNcAdmin = !!(user?.id && (await userIsRecruitNcAdmin(admin, user.id)))

  const [snapshot, recruitingPhotoUrl] = await Promise.all([
    code != null ? getAthleteFundraisingPublicSnapshot(code, 250) : Promise.resolve(null),
    athleteId ? fetchRecruitingProfilePhoto(admin, athleteId) : Promise.resolve(null),
  ])

  /** Spartan-parity totals come from uncached Stripe (see `getAthleteFundraisingPublicSnapshot`). If both Stripe and mirror fail, show zeros — do not substitute `profile.total_raised_cents` (often drifts from `/spartan`). */
  const EMPTY_STATS: AthleteFundraisingPublicStats = {
    raisedCents: 0,
    giftCount: 0,
    avgGiftCents: null,
    organizationGiftCount: 0,
    individualGiftCount: 0,
    payerTypeBreakdownKnown: false,
  }
  const stats = snapshot?.stats ?? (code != null ? EMPTY_STATS : null)
  const publicGifts = snapshot?.gifts ?? []

  const displayName = publicTitleName(resolved)
  const schoolLine =
    resolved.entry && resolved.entry.label.includes("·")
      ? resolved.entry.label.split("·").slice(1).join("·").trim()
      : null

  const viewProfileHref = athleteId ? `/view-profile?id=${encodeURIComponent(athleteId)}` : null
  const fundraisingPhoto = profile?.photo_url
    ? recruitingProfilePhotoFromRow({ photo_url: profile.photo_url })
    : null
  const heroFromAthleteOrProfile = recruitingPhotoUrl ?? fundraisingPhoto
  const heroPhotoSrc = heroFromAthleteOrProfile ?? HERO_FALLBACK_SILHOUETTE
  const heroIsCustomPhoto = heroFromAthleteOrProfile != null
  const checkoutAnchor = "spartan-checkout"
  const athletePagePath = `/fundraising/athletes/${encodeURIComponent(slug)}`
  const athleteAbsoluteUrl = `${publicGiftSiteOrigin()}${athletePagePath}`
  const giveOnThisPageHref = `${athletePagePath}#${checkoutAnchor}`
  /** Hub URL if donor wants training fund or directory search */
  const hubGiveHref = `${FUNDRAISING_GIVE_PAGE_PATH}#${checkoutAnchor}`
  const athleteQrDataUrl = await QRCode.toDataURL(athleteAbsoluteUrl, {
    margin: 2,
    width: 320,
    errorCorrectionLevel: "H",
    color: { dark: "#000000", light: "#FFFFFF" },
  })

  const directoryLabelForCheckout =
    resolved.entry?.label?.trim() || (schoolLine ? `${displayName} · ${schoolLine}` : displayName)

  const goalCents = profile?.campaign_goal_cents ?? null
  const raisedForBar = stats?.raisedCents ?? 0
  const progressPct =
    goalCents != null && goalCents > 0 ? Math.min(100, Math.round((raisedForBar / goalCents) * 100)) : null

  return (
    <div
      className="min-h-screen bg-[#061224] px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] text-white sm:px-6 sm:py-12"
      style={{ fontFamily: "var(--font-fundraising-body), system-ui, sans-serif" }}
    >
      <div className="mx-auto w-full max-w-lg sm:max-w-2xl">
        {cancelledCheckout ? (
          <div className="mt-6 rounded-lg border border-amber-400/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/95">
            Checkout was cancelled — nothing was charged. You can finish a gift in secure checkout at the bottom when you&apos;re
            ready.
          </div>
        ) : null}

        <HardLink
          href="/fundraising/athletes"
          className="text-sm font-semibold text-[#C8A94A] underline-offset-4 hover:underline"
        >
          ← All athletes
        </HardLink>

        <p className="font-[family-name:var(--font-fundraising-display)] mt-8 text-[11px] font-bold uppercase tracking-[0.28em] text-[#CC0000]">
          Official NC United gift page
        </p>

        <div className="mt-6 mx-auto w-full max-w-full lg:max-w-[min(100%,20rem)]">
          {viewProfileHref && heroIsCustomPhoto ? (
            <HardLink
              href={viewProfileHref}
              className="group block overflow-hidden rounded-xl border border-white/10 bg-[#0B2545]/50 outline-none ring-offset-2 ring-offset-[#061224] focus-visible:ring-2 focus-visible:ring-[#C8A94A]"
              aria-label={`View ${displayName} recruiting profile`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroPhotoSrc}
                alt={`${displayName} — recruiting photo`}
                className="h-auto max-h-[min(480px,60vh)] w-full object-cover object-center transition duration-300 group-hover:opacity-92 lg:max-h-[min(340px,45vh)]"
              />
            </HardLink>
          ) : (
            <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0B2545]/50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroPhotoSrc}
                alt={heroIsCustomPhoto ? `${displayName} — recruiting photo` : ""}
                className={`h-auto max-h-[min(480px,60vh)] w-full object-cover object-center lg:max-h-[min(340px,45vh)] ${heroIsCustomPhoto ? "" : "opacity-80"}`}
              />
            </div>
          )}
        </div>

        <h1 className="font-[family-name:var(--font-fundraising-display)] mt-6 text-2xl font-black uppercase leading-tight tracking-tight text-white sm:text-4xl">
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

        {code ? (
          <div className="mt-5 flex flex-col items-stretch gap-2 sm:items-center">
            <HardLink href={giveOnThisPageHref} className={PRIMARY_DONATE_CTA_CLASS}>
              Donate now
            </HardLink>
            <p className="text-center text-[11px] leading-snug text-white/45 sm:max-w-md">
              Opens secure checkout on this page (below). Everything underneath is optional context.
            </p>
          </div>
        ) : null}

        {athleteId ? (
          <FundraisingAthleteMessageSection
            key={profile ? `${profile.updated_at}-msg` : `${slug}-msg`}
            displayName={displayName}
            athleteId={athleteId}
            hasFundraisingProfile={profile != null}
            canEdit={isFundraisingManager}
            isRecruitNcAdmin={viewerIsRecruitNcAdmin}
            initialBio={profile?.bio?.trim() ?? ""}
          />
        ) : null}

        <div className="mt-8 rounded-xl border border-white/10 bg-[#0B2545]/55 px-4 py-4 sm:px-5 sm:py-5">
          <p className="text-sm leading-relaxed text-white/80">
            <span className="font-[family-name:var(--font-fundraising-display)] font-bold uppercase tracking-wide text-[#C8A94A]">
              New to NC United?
            </span>{" "}
            We&apos;re a North Carolina-based nonprofit that helps young wrestlers and local teams—covering real costs like
            travel, events, and training. This link is for rooting for{" "}
            <strong className="text-white/95">{displayName}</strong> with a gift that also supports our programs.
          </p>
          <div className="mt-4 space-y-3 border-t border-white/10 pt-4 text-sm leading-relaxed text-white/78">
            <p>
              <strong className="text-white/92">Email receipt.</strong> After payment you&apos;ll get an email receipt—check spam
              or promotions if needed.
            </p>
            {code ? (
              <p>
                <strong className="text-white/92">Every dollar on this page</strong> is credited to{" "}
                <strong className="text-white/92">{displayName}</strong> for this campaign when checkout uses their NCU code.
              </p>
            ) : null}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-white/55">
            501(c)(3) EIN <span className="tabular-nums">99-3757238</span>. Need the{" "}
            <HardLink href={hubGiveHref} className="text-[#C8A94A] underline-offset-4 hover:underline">
              full gift hub
            </HardLink>{" "}
            (training fund or directory)?
          </p>
        </div>

        <p className="mt-6 text-sm leading-snug text-white/70">
          {code ? (
            <>
              <strong className="text-[#C8A94A]">How giving works.</strong>{" "}
              <strong className="text-white/90">{displayName}</strong> is already selected for credit. When you&apos;re ready,
              use <strong className="text-white/90">secure checkout at the bottom</strong> of this page — you&apos;ll finish
              payment on <strong className="text-white/90">Stripe</strong>, then see our thank-you page.
            </>
          ) : (
            <>
              This page needs an NC United credit code to show checkout here. Use the{" "}
              <HardLink href={hubGiveHref} className="text-[#C8A94A] underline-offset-4 hover:underline">
                gift hub
              </HardLink>{" "}
              to search athletes or give to the training fund.
            </>
          )}
        </p>

        {goalCents != null && goalCents > 0 ? (
          <div className="mt-8 rounded-xl border border-white/10 bg-[#0B2545]/70 px-5 py-5">
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

        {code && stats ? (
          <>
            <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-white/10 bg-[#0B2545]/70 px-4 py-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#C8A94A]">Total raised</p>
                <p className="mt-2 text-lg font-black tabular-nums text-white sm:text-xl">{formatUsdWhole(stats.raisedCents)}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#0B2545]/70 px-4 py-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#C8A94A]">Gifts</p>
                <p className="mt-2 text-lg font-black tabular-nums text-white sm:text-xl">{stats.giftCount}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#0B2545]/70 px-4 py-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#C8A94A]">Avg gift</p>
                <p className="mt-2 text-lg font-black tabular-nums text-white sm:text-xl">
                  {stats.avgGiftCents != null ? formatUsdWhole(stats.avgGiftCents) : "—"}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#0B2545]/70 px-4 py-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#C8A94A]">Receipt type</p>
                <p className="mt-2 text-xs leading-snug text-white/80">
                  {stats.payerTypeBreakdownKnown ? (
                    <>
                      <span className="font-semibold text-white">{stats.individualGiftCount}</span> individual
                      <span className="text-white/40"> · </span>
                      <span className="font-semibold text-white">{stats.organizationGiftCount}</span> org
                    </>
                  ) : (
                    <span className="text-white/55">Org vs individual — shown when available</span>
                  )}
                </p>
              </div>
            </div>
            <FundraisingMilestoneTrophy
              raisedCents={stats.raisedCents}
              goalCents={goalCents}
              athleteLabel={displayName}
            />
          </>
        ) : null}

        {code ? (
          <p className="mt-8 text-center text-xs text-white/45">
            Totals and gift list use the same credit rules and campaign scope as our{" "}
            <HardLink href="/spartan" className="text-[#C8A94A] underline-offset-4 hover:underline">
              team fundraiser page
            </HardLink>{" "}
            ({DEFAULT_FUNDRAISING_CAMPAIGN.campaignDisplayName}). They load from our donation ledger and typically appear within
            a short time after checkout; live Stripe totals may update slightly sooner.
          </p>
        ) : null}

        {code && stats && stats.giftCount === 0 ? (
          <p className="mt-4 text-center text-sm text-white/50">
            Be the first to support {displayName} — your gift will appear here after checkout.
          </p>
        ) : null}

        {!code ? (
          <p className="mt-4 text-center text-sm text-white/50">
            Add a fundraising credit code to enable giving on this page, or use the hub link above.
          </p>
        ) : null}

        {publicGifts.length > 0 ? (
          <div className="mt-10">
            <h2 className="font-[family-name:var(--font-fundraising-display)] text-sm font-bold uppercase tracking-wide text-white">
              Gift activity
            </h2>
            <p className="mt-1 text-xs text-white/45">Public names only — up to {publicGifts.length} recent gifts shown.</p>
            <div className="mt-3 overflow-hidden rounded-lg border border-white/10 bg-black/20">
              <div className="hidden grid-cols-[5.25rem_minmax(0,10.5rem)_minmax(0,1fr)_auto] gap-x-3 border-b border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-white/40 sm:grid">
                <span>Date</span>
                <span>Campaign</span>
                <span>Supporter</span>
                <span className="text-right">Amount</span>
              </div>
              <ul className="divide-y divide-white/10">
                {publicGifts.map((r, i) => (
                  <li
                    key={`${r.created_at}-${i}`}
                    className="grid grid-cols-1 gap-y-1 px-3 py-3 text-sm sm:grid-cols-[5.25rem_minmax(0,10.5rem)_minmax(0,1fr)_auto] sm:items-center sm:gap-x-3 sm:gap-y-0 sm:py-2.5"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 sm:contents">
                      <span className="text-xs tabular-nums text-white/40">
                        {new Date(r.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <span className="font-semibold text-[#C8A94A] tabular-nums sm:hidden">{formatUsdWhole(r.amountCents)}</span>
                    </div>
                    <span className="text-xs leading-snug text-white/55 sm:min-w-0">{r.campaignLabel}</span>
                    <span className="min-w-0 text-white/85">{r.donorLabel}</span>
                    <span className="hidden font-semibold text-[#C8A94A] tabular-nums sm:block sm:text-right">{formatUsdWhole(r.amountCents)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        <div className="mt-10 flex justify-center lg:mt-8">
          <FundraisingAthleteQrCard
            qrSrc={athleteQrDataUrl}
            donateUrl={athleteAbsoluteUrl}
            athleteDisplayName={displayName}
          />
        </div>

        <section
          id={checkoutAnchor}
          className="mt-10 scroll-mt-28 rounded-xl border border-[#C8A94A]/25 bg-[#0B2545]/35 p-4 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.45)] backdrop-blur-sm sm:p-6"
        >
          <h2 className="font-[family-name:var(--font-fundraising-display)] text-center text-lg font-bold uppercase tracking-wide text-white">
            Secure checkout
          </h2>
          <p className="mx-auto mt-2 max-w-md text-center text-[13px] leading-snug text-white/70">
            <strong className="font-semibold text-white/85">Tax-deductible</strong> gift ($5 minimum). You finish on Stripe;
            your receipt arrives by email.
          </p>
          <div className="mt-6 w-full text-left">
            <FundraisingAthleteEmbeddedCheckout
              athleteCode={code}
              athleteDirectoryLabel={directoryLabelForCheckout}
              fundraisingSlug={slug}
            />
          </div>
        </section>

        <p className="mt-12 border-t border-white/10 pt-8 text-center text-xs text-white/45">
          Your gift supports NC United Wrestling, a North Carolina 501(c)(3) nonprofit.
        </p>
      </div>
    </div>
  )
}
