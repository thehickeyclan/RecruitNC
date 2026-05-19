import { notFound } from "next/navigation"
import type { Metadata } from "next"
import type { ReactNode } from "react"
import { Check } from "lucide-react"
import QRCode from "qrcode"
import { createAdminClient } from "@/lib/supabase/admin"
import { resolveFundraisingAthletePublicBySlugForRequest } from "@/lib/fundraising/athlete-fundraising-profiles"
import {
  ATHLETE_PUBLIC_GIFTS_NO_ROW_CAP,
  getAthleteFundraisingPublicSnapshot,
  getAthleteOwnerThankYouRowsForLedgerCodes,
  getAthleteHubLeaderboardAlignedTotals,
  type AthleteFundraisingPublicStats,
} from "@/lib/fundraising/athlete-public-stats"
import { HardLink } from "@/components/hard-link"
import { createClient } from "@/lib/supabase/server"
import { FUNDRAISING_GIVE_PAGE_PATH } from "@/lib/fundraising/campaign-registry"
import { formatUsdWhole } from "@/app/fundraising/components/FundraisingHero"
import { userCanManageFundraisingForAthlete, userIsRecruitNcAdmin } from "@/lib/fundraising/athlete-fundraising-access"
import { FundraisingAthleteQrCard } from "./fundraising-athlete-qr-card"
import { FundraisingAthleteEmbeddedCheckout } from "./fundraising-athlete-embedded-checkout"
import { FundraisingAthleteGoalSection } from "./fundraising-athlete-goal"
import { FundraisingAthleteMessageSection } from "./fundraising-athlete-message"
import { FundraisingSteppedProgress } from "./fundraising-stepped-progress"
import { FundraisingOwnerPanel } from "./fundraising-owner-panel"
import { FundraisingAdminAssignmentPanel } from "./fundraising-admin-assignment-panel"
import { VerifiedBadge } from "@/components/fundraising/verified-badge"
import { UnactivatedAthleteGivingPromo } from "@/components/fundraising/unactivated-athlete-giving-promo"
import { recruitingProfilePhotoFromRow } from "@/lib/recruiting-profile-photo"
import { fetchThankYouAckLedgerKeys } from "@/lib/fundraising/supporter-thank-you-ack"
import { getFundraisingWiringAdminSnapshot } from "@/lib/fundraising/fundraising-wiring-status"
import { fetchPendingActivationUserIdsForSlug } from "@/lib/fundraising/fundraising-activation-status"
import { isProfileCheckoutLive } from "@/lib/fundraising/fundraising-checkout-live"
import {
  createFundraisingVideoSignedUrl,
  FUNDRAISING_VIDEO_SIGNED_URL_TTL,
} from "@/lib/fundraising/fundraising-video-storage"
import { getFundraisingAthletePageWalletRowForViewer } from "@/lib/parent-spartan-fundraising-totals"
import { FundraisingPublicVideo } from "@/components/fundraising/fundraising-public-video"
import { FundraisingAthleteWalletPanel } from "./fundraising-athlete-wallet-panel"
import { FundraisingAthleteVideosSection } from "./fundraising-athlete-videos-section"
import { normalizeFundraisingSchoolDisplay } from "@/lib/fundraising/normalize-fundraising-school-display"
import { isFundraisingAthletePageDonationsDisabled } from "@/lib/fundraising/fundraising-pause"
import { athletePageSupportHelpParagraph } from "@/lib/fundraising/donor-facing-disclosures"

const HERO_FALLBACK_SILHOUETTE = "/wrestler-silhouette.png"

const PRIMARY_DONATE_CTA_CLASS =
  "font-[family-name:var(--font-fundraising-display)] flex min-h-[52px] w-full touch-manipulation items-center justify-center rounded-sm bg-[#CC0000] px-8 text-sm font-extrabold uppercase tracking-[0.14em] text-white shadow-[0_14px_44px_-10px_rgba(204,0,0,0.55)] hover:bg-[#a80000] sm:inline-flex sm:w-auto sm:min-w-[240px]"

function WhyGiveBullet({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-3.5 text-sm leading-snug text-white/85 sm:leading-relaxed">
      <span
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-400/40"
        aria-hidden
      >
        <Check className="h-3.5 w-3.5" strokeWidth={2.75} />
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </li>
  )
}

async function fetchRecruitingProfilePhoto(admin: ReturnType<typeof createAdminClient>, athleteId: string): Promise<string | null> {
  const { data, error } = await admin.from("athletes").select("photourl, headshot_url, commitmentPhotoUrl").eq("id", athleteId).maybeSingle()
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

/** Gift pages personalize edit controls from auth — avoid serving a cached anonymous shell. */
export const dynamic = "force-dynamic"

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
    description: `Make a charitable gift to NC United Wrestling (501(c)(3)) and express support for wrestlers—including ${name}—consistent with donor-preference guidelines. Secure nonprofit checkout.`,
  }
}

export default async function FundraisingAthletePublicPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const sp = (await searchParams) ?? {}
  const cancelledCheckout = sp.cancelled === "1"
  const admin = createAdminClient()

  // Parallelize slug resolution + auth check — these are independent
  const [resolved, supabase] = await Promise.all([
    resolveFundraisingAthletePublicBySlugForRequest(slug),
    createClient(),
  ])
  if (!resolved) notFound()

  const code = resolved.code
  const athleteId = resolved.profile?.athlete_id ?? resolved.entry?.id ?? null
  const profile = resolved.profile

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const viewerIsRecruitNcAdmin = !!(user?.id && (await userIsRecruitNcAdmin(admin, user.id)))
  /** Admins manage any athlete page; families need a linked athlete id. */
  const isFundraisingManager = !!(
    user?.id &&
    (viewerIsRecruitNcAdmin || (!!athleteId && (await userCanManageFundraisingForAthlete(admin, user.id, athleteId))))
  )
  const showOwnerHints = isFundraisingManager || viewerIsRecruitNcAdmin
  /** Roster credit codes are operational — don't surface to casual donors. */
  const showInternalCodes = showOwnerHints

  const slugNorm = slug.trim().toLowerCase()

  const snapshotLedger =
    resolved.ledgerCodes.length > 0 ? resolved.ledgerCodes : code != null ? [code] : []

  // Core public data — always fetched in parallel
  const publicDataPromise = Promise.all([
    snapshotLedger.length > 0
      ? getAthleteFundraisingPublicSnapshot(snapshotLedger, ATHLETE_PUBLIC_GIFTS_NO_ROW_CAP, {
          mirrorFundraisingSlugs: [slugNorm],
        })
      : Promise.resolve(null),
    snapshotLedger.length > 0
      ? getAthleteHubLeaderboardAlignedTotals(snapshotLedger, { mirrorFundraisingSlugs: [slugNorm] })
      : Promise.resolve(null),
    athleteId ? fetchRecruitingProfilePhoto(admin, athleteId) : Promise.resolve(null),
    fetchPendingActivationUserIdsForSlug(admin, slugNorm),
  ])

  // Manager-only data — only fetched when needed (saves ~3 DB round-trips for public visitors)
  const managerDataPromise = isFundraisingManager
    ? Promise.all([
        snapshotLedger.length > 0
          ? getAthleteOwnerThankYouRowsForLedgerCodes(snapshotLedger, { mirrorFundraisingSlugs: [slugNorm] })
          : Promise.resolve([]),
        athleteId ? fetchThankYouAckLedgerKeys(admin, athleteId) : Promise.resolve(new Set<string>()),
        athleteId ? getFundraisingWiringAdminSnapshot(admin, athleteId) : Promise.resolve(null),
        user?.id && athleteId
          ? getFundraisingAthletePageWalletRowForViewer(admin, user.id, athleteId, resolved.guildLookupAthleteIds).catch(
              (e) => {
                console.error("[fundraising-athlete-public] wallet row", e)
                return null
              },
            )
          : Promise.resolve(null),
      ])
    : Promise.resolve([
        [] as Awaited<ReturnType<typeof getAthleteOwnerThankYouRowsForLedgerCodes>>,
        new Set<string>(),
        athleteId ? getFundraisingWiringAdminSnapshot(admin, athleteId) : null,
        null,
      ] as const)

  const [[snapshot, hubLeaderboardTotals, recruitingPhotoUrl, pendingActivationUserIds], [ownerThankYouRows, thankAckLedgerKeys, wiringSnapshot, managerWalletRow]] =
    await Promise.all([publicDataPromise, managerDataPromise])

  const slugHasPendingActivation = pendingActivationUserIds.length > 0
  const latestActivationStatus: "none" | "pending" = slugHasPendingActivation ? "pending" : "none"
  const viewerHasPendingActivation = !!(user?.id && pendingActivationUserIds.includes(user.id))
  const checkoutLive = isProfileCheckoutLive(profile)
  const athleteDonationsPaused = isFundraisingAthletePageDonationsDisabled()
  /** Public donate UI (CTA, embedded checkout, QR) — separate from profile “live” for owners. */
  const showAthleteDonationUi = checkoutLive && !athleteDonationsPaused
  const showFullGivingExperience = checkoutLive
  /** Goal, note, video: public when checkout live; managers (incl. RecruitNC admin) may edit before/during live. */
  const showFundraisingStoryBlock = !!athleteId && (showFullGivingExperience || isFundraisingManager)

  const ownerThankYouRowsWithAck = ownerThankYouRows.map((r) => ({
    ...r,
    thanked: thankAckLedgerKeys.has(r.ledgerKey),
  }))

  /** Lifetime mirror stats for gift tables / race counts; headline raised uses {@link hubLeaderboardTotals} when present. */
  const EMPTY_STATS: AthleteFundraisingPublicStats = {
    raisedCents: 0,
    giftCount: 0,
    raceSignupCount: 0,
    avgGiftCents: null,
    organizationGiftCount: 0,
    individualGiftCount: 0,
    payerTypeBreakdownKnown: false,
  }
  const stats = snapshot?.stats ?? (snapshotLedger.length > 0 ? EMPTY_STATS : null)
  const publicGifts = snapshot?.gifts ?? []

  const displayName = publicTitleName(resolved)
  const athleteFirstName = (displayName.split(/\s+/).filter(Boolean)[0] ?? displayName).trim()
  const schoolLineRaw =
    resolved.entry && resolved.entry.label.includes("·")
      ? resolved.entry.label.split("·").slice(1).join("·").trim()
      : null
  const schoolLine = schoolLineRaw ? normalizeFundraisingSchoolDisplay(schoolLineRaw) : null

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
  const athleteQrDataUrl = checkoutLive
    ? await QRCode.toDataURL(athleteAbsoluteUrl, {
        margin: 2,
        width: 320,
        errorCorrectionLevel: "H",
        color: { dark: "#000000", light: "#FFFFFF" },
      })
    : ""

  const directoryLabelForCheckout =
    resolved.entry?.label?.trim() || (schoolLine ? `${displayName} · ${schoolLine}` : displayName)

  const goalCents = profile?.campaign_goal_cents ?? null
  /** Headline raised + goal progress: same hub Stripe basis as `/fundraising` leaderboard (not lifetime-only mirror). */
  const raisedForBar = hubLeaderboardTotals?.raisedCents ?? stats?.raisedCents ?? 0
  const milestoneGiftCount = hubLeaderboardTotals?.giftCount ?? stats?.giftCount ?? 0

  let fundraisingVideoSignedUrl: string | null = null
  let fundraisingThumbSignedUrl: string | null = null
  const rawVideoPath = profile?.fundraising_video_url?.trim() ?? ""
  if (checkoutLive && rawVideoPath) {
    fundraisingVideoSignedUrl = await createFundraisingVideoSignedUrl(
      admin,
      profile!.fundraising_video_url,
      FUNDRAISING_VIDEO_SIGNED_URL_TTL,
    )
    if (profile?.fundraising_video_thumbnail_url?.trim()) {
      fundraisingThumbSignedUrl = await createFundraisingVideoSignedUrl(
        admin,
        profile.fundraising_video_thumbnail_url,
        FUNDRAISING_VIDEO_SIGNED_URL_TTL,
      )
    }
    if (!fundraisingVideoSignedUrl) {
      console.warn(
        "[fundraising-athlete-public] fundraising_video_url set but signed URL failed — check storage bucket/paths",
        slugNorm,
        rawVideoPath.slice(0, 120),
      )
    }
  }

  return (
    <div
      className="min-h-screen bg-[#061224] px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] text-white sm:px-6 sm:py-12"
      style={{ fontFamily: "var(--font-fundraising-body), system-ui, sans-serif" }}
    >
      <div className="mx-auto w-full max-w-lg sm:max-w-2xl">
        {cancelledCheckout && showAthleteDonationUi ? (
          <div className="mt-6 rounded-lg border border-amber-400/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/95">
            Checkout was cancelled — nothing was charged. You can finish a gift in secure checkout at the bottom when you&apos;re
            ready.
          </div>
        ) : null}

        {athleteDonationsPaused && checkoutLive ? (
          <div className="mt-6 rounded-lg border border-amber-400/40 bg-amber-500/15 px-4 py-3 text-sm text-amber-100/95">
            <strong className="font-semibold">Gifts paused:</strong> online checkout on athlete pages is temporarily turned off.
            Donor acknowledgment emails may also be on hold. Other ways to support NC United (hub, training fund) may still be
            available — thank you for your patience.
          </div>
        ) : null}

        <div className="mt-6">
          <HardLink
            href="/fundraising/athletes"
            className="text-sm font-semibold text-[#C8A94A] underline-offset-4 hover:underline"
          >
            ← All athletes
          </HardLink>
        </div>

        {viewerIsRecruitNcAdmin ? (
          <FundraisingAdminAssignmentPanel
            fundraisingSlug={slug}
            profileId={profile?.id ?? null}
            athleteId={athleteId}
            athleteDisplayLabel={displayName}
            ncuHint={profile?.primary_fundraising_code ?? code}
            wiringSnapshot={wiringSnapshot}
            latestActivationStatus={latestActivationStatus}
          />
        ) : null}

        {!checkoutLive ? (
          <UnactivatedAthleteGivingPromo
            athletePagePath={athletePagePath}
            fundraisingSlug={slugNorm}
            athleteId={athleteId}
            displayName={displayName}
            viewerUserId={user?.id ?? null}
            viewerHasPendingActivation={viewerHasPendingActivation}
          />
        ) : null}

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

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <h1 className="font-[family-name:var(--font-fundraising-display)] text-2xl font-black uppercase leading-tight tracking-tight text-white sm:text-4xl">
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
          {checkoutLive ? <VerifiedBadge /> : null}
        </div>
        {schoolLine ? <p className="mt-2 text-base text-white/65">{schoolLine}</p> : null}
        {code && showInternalCodes ? <p className="mt-2 font-mono text-xs text-white/40">{code}</p> : null}

        {code && showAthleteDonationUi ? (
          <div className="mt-5 flex flex-col items-stretch gap-2 sm:items-center">
            <HardLink href={giveOnThisPageHref} className={PRIMARY_DONATE_CTA_CLASS}>
              Donate now
            </HardLink>
            <p className="text-center text-[11px] leading-snug text-white/50 sm:max-w-md">
              Secure checkout is on this page below. Most people finish in a couple of minutes — you&apos;ll get a receipt by email.
            </p>
          </div>
        ) : null}

        <div className="mt-8 rounded-xl border border-[#C8A94A]/25 bg-[#0B2545]/55 px-4 py-5 sm:px-6 sm:py-6">
          <p className="font-[family-name:var(--font-fundraising-display)] text-xs font-bold uppercase tracking-[0.2em] text-[#C8A94A]">
            {code ? "How your support helps" : "How NC United honors your gift"}
          </p>
          <ul className="mt-4 list-none space-y-3.5 sm:space-y-4">
            {code && checkoutLive ? (
              <WhyGiveBullet>{athletePageSupportHelpParagraph(displayName, athleteFirstName)}</WhyGiveBullet>
            ) : null}
            {code && !checkoutLive ? (
              <>
                <WhyGiveBullet>
                  Many families use NC United to ease travel, training, and tournament costs — we&apos;re glad you&apos;re reading along.
                </WhyGiveBullet>
                <WhyGiveBullet>
                  <span className="block">
                    We haven&apos;t turned on giving for this link quite yet. If you&apos;re a linked parent or athlete, you can tap{" "}
                    <strong className="text-white">Request activation</strong> at the top when you&apos;re ready.
                  </span>
                  <span className="mt-1.5 block text-white/70">
                    The notes below still walk through how NC United handles gifts and receipts.
                  </span>
                </WhyGiveBullet>
              </>
            ) : null}
            <WhyGiveBullet>
              <strong className="text-white">Receipts & taxes.</strong> NC United Wrestling is a 501(c)(3); you&apos;ll get email acknowledgment for
              qualifying gifts (check spam). Whether and how much you may deduct depends on IRS rules — ask your tax professional.
            </WhyGiveBullet>
            <WhyGiveBullet>
              <strong className="text-white">Payment processing.</strong> Where possible NC United absorbs card-processing costs so donor intent isn&apos;t
              eaten by checkout fees — that does not convert your gift into a contribution held for any one individual apart from nonprofit discretion.
            </WhyGiveBullet>
          </ul>
          <p className="mt-5 text-xs leading-relaxed text-white/50">
            EIN <span className="tabular-nums">99-3757238</span>
            {" · "}
            <HardLink href={hubGiveHref} className="text-[#C8A94A] underline-offset-4 hover:underline">
              More ways to support NC United
            </HardLink>
          </p>
        </div>

        {showFundraisingStoryBlock ? (
          <>
            {viewerIsRecruitNcAdmin && checkoutLive && rawVideoPath && !fundraisingVideoSignedUrl ? (
              <div className="mt-8 rounded-lg border border-amber-400/40 bg-amber-500/15 px-4 py-3 text-xs text-amber-100/95">
                <strong className="font-semibold">Admin:</strong> This profile has a fundraising video path in the database, but
                creating a signed URL failed. Confirm the <code className="rounded bg-black/30 px-1">fundraising-videos</code> bucket
                and that <code className="rounded bg-black/30 px-1">fundraising_video_url</code> is a storage object path (e.g.{" "}
                <code className="rounded bg-black/30 px-1">athlete/…/fundraising.mp4</code>), not a full URL.
              </div>
            ) : null}
            <FundraisingAthleteVideosSection
              fundraisingSlug={slug}
              athleteFirstName={athleteFirstName}
              hasFundraisingProfile={profile != null}
              canEdit={isFundraisingManager}
              isRecruitNcAdmin={viewerIsRecruitNcAdmin}
              checkoutLive={checkoutLive}
              fundraisingVideoPath={profile?.fundraising_video_url ?? null}
              fundraisingThumbPath={profile?.fundraising_video_thumbnail_url ?? null}
            />
            {fundraisingVideoSignedUrl ? (
              <div className="mt-8">
                <FundraisingPublicVideo
                  videoUrl={fundraisingVideoSignedUrl}
                  posterUrl={fundraisingThumbSignedUrl}
                  athleteFirstName={athleteFirstName}
                />
              </div>
            ) : null}
            <FundraisingAthleteGoalSection
              key={
                profile
                  ? `${profile.updated_at}-${goalCents ?? "none"}-goal`
                  : `${slug}-${goalCents ?? "none"}-goal`
              }
              displayName={displayName}
              athleteId={athleteId}
              hasFundraisingProfile={profile != null}
              canEdit={isFundraisingManager}
              isRecruitNcAdmin={viewerIsRecruitNcAdmin}
              checkoutLive={checkoutLive}
              initialGoalCents={goalCents}
              raisedCents={raisedForBar}
            />
            <FundraisingAthleteMessageSection
              key={profile ? `${profile.updated_at}-msg` : `${slug}-msg`}
              displayName={displayName}
              athleteId={athleteId}
              hasFundraisingProfile={profile != null}
              canEdit={isFundraisingManager}
              isRecruitNcAdmin={viewerIsRecruitNcAdmin}
              checkoutLive={checkoutLive}
              initialBio={profile?.bio?.trim() ?? ""}
            />
          </>
        ) : null}

        {!code ? (
          <p className="mt-6 text-center text-sm leading-snug text-white/60">
            Online giving isn&apos;t turned on for this link yet.{" "}
            <HardLink href={hubGiveHref} className="font-semibold text-[#C8A94A] underline-offset-4 hover:underline">
              Make a gift
            </HardLink>{" "}
            to find {displayName} or support NC United another way.
          </p>
        ) : null}

        {code && stats && checkoutLive ? (
          <FundraisingSteppedProgress
            raisedCents={raisedForBar}
            goalCents={goalCents}
            athleteLabel={displayName}
            showOwnerHints={showOwnerHints && checkoutLive}
            giftCount={milestoneGiftCount}
          />
        ) : null}

        {showFullGivingExperience && managerWalletRow ? (
          <FundraisingAthleteWalletPanel row={managerWalletRow} firstName={athleteFirstName} />
        ) : null}

        {code && stats && checkoutLive && stats.giftCount === 0 && showAthleteDonationUi ? (
          <p className="mt-4 text-center text-sm text-white/50">
            Be the first to support {displayName} — your gift will appear here after checkout.
          </p>
        ) : null}

        {checkoutLive && publicGifts.length > 0 ? (
          <div className="mt-10">
            <h2 className="font-[family-name:var(--font-fundraising-display)] text-sm font-bold uppercase tracking-wide text-white">
              Recent supporters
            </h2>
            <p className="mt-1 text-xs text-white/45">Shown when people choose to be listed publicly. Newest first.</p>
            <div className="mt-3 max-h-[min(70vh,28rem)] overflow-y-auto overflow-x-hidden rounded-lg border border-white/10 bg-black/20">
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

        {checkoutLive && isFundraisingManager && athleteId && snapshotLedger.length > 0 ? (
          <FundraisingOwnerPanel
            athleteId={athleteId}
            fundraisingSlug={slug}
            showBioEditor={false}
            canEditStory={false}
            initialBio=""
            donorRows={ownerThankYouRowsWithAck}
          />
        ) : null}

        {/* QR code hidden on mobile - users don't scan their own screen */}
        {checkoutLive && showAthleteDonationUi ? (
          <div className="mt-10 hidden justify-center lg:mt-8 lg:flex">
            <FundraisingAthleteQrCard
              qrSrc={athleteQrDataUrl}
              donateUrl={athleteAbsoluteUrl}
              athleteDisplayName={displayName}
            />
          </div>
        ) : null}

        {showAthleteDonationUi && code ? (
          <section
            id={checkoutAnchor}
            className="mt-10 scroll-mt-28 rounded-xl border border-[#C8A94A]/25 bg-[#0B2545]/35 p-4 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.45)] backdrop-blur-sm sm:p-6"
          >
            <h2 className="font-[family-name:var(--font-fundraising-display)] text-center text-lg font-bold uppercase tracking-wide text-white">
              Secure checkout
            </h2>
            <p className="mx-auto mt-2 max-w-md text-center text-[13px] leading-snug text-white/70">
              You&apos;re donating to NC United Wrestling (minimum $5). You may indicate a supporter preference toward this athlete&apos;s program costs at
              checkout — NC United applies gifts under its exempt purpose and policies. You&apos;ll get an acknowledgment by email shortly after checkout.
              Consult your tax advisor about deductions.
            </p>
            <div className="mt-6 w-full text-left">
              <FundraisingAthleteEmbeddedCheckout
                athleteCode={code}
                athleteDirectoryLabel={directoryLabelForCheckout}
                fundraisingSlug={slug}
                checkoutLive
              />
            </div>
          </section>
        ) : null}

        <p className="mt-12 border-t border-white/10 pt-8 text-center text-xs text-white/45">
          NC United Wrestling — North Carolina 501(c)(3). Thank you for supporting {displayName}.
        </p>
      </div>
    </div>
  )
}
