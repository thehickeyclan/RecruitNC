import { notFound } from "next/navigation"
import type { Metadata } from "next"
import QRCode from "qrcode"
import { createAdminClient } from "@/lib/supabase/admin"
import { resolveFundraisingAthletePublicBySlugForRequest } from "@/lib/fundraising/athlete-fundraising-profiles"
import {
  ATHLETE_PUBLIC_GIFTS_NO_ROW_CAP,
  getAthleteFundraisingPublicSnapshot,
  getAthleteOwnerThankYouRowsForLedgerCodes,
  type AthleteFundraisingPublicStats,
} from "@/lib/fundraising/athlete-public-stats"
import { HardLink } from "@/components/hard-link"
import { createClient } from "@/lib/supabase/server"
import { DEFAULT_FUNDRAISING_CAMPAIGN, FUNDRAISING_GIVE_PAGE_PATH } from "@/lib/fundraising/campaign-registry"
import { formatUsdWhole } from "@/app/fundraising/components/FundraisingHero"
import { userCanManageFundraisingForAthlete, userIsRecruitNcAdmin } from "@/lib/fundraising/athlete-fundraising-access"
import { FundraisingAthleteQrCard } from "./fundraising-athlete-qr-card"
import { FundraisingAthleteEmbeddedCheckout } from "./fundraising-athlete-embedded-checkout"
import { FundraisingAthleteGoalSection } from "./fundraising-athlete-goal"
import { FundraisingAthleteMessageSection } from "./fundraising-athlete-message"
import { FundraisingMilestoneFunnel } from "./fundraising-milestone-funnel"
import { FundraisingOwnerPanel } from "./fundraising-owner-panel"
import { FundraisingAdminAssignmentPanel } from "./fundraising-admin-assignment-panel"
import { FundraisingPublicationBanner } from "./fundraising-publication-banner"
import { recruitingProfilePhotoFromRow } from "@/lib/recruiting-profile-photo"
import { fetchThankYouAckLedgerKeys } from "@/lib/fundraising/supporter-thank-you-ack"
import { getFundraisingWiringAdminSnapshot } from "@/lib/fundraising/fundraising-wiring-status"
import { fetchPendingActivationUserIdsForSlug } from "@/lib/fundraising/fundraising-activation-status"
import { isProfileCheckoutLive } from "@/lib/fundraising/fundraising-checkout-live"
import { getFundraisingAthletePageWalletRowForViewer } from "@/lib/parent-spartan-fundraising-totals"
import { FundraisingAthleteWalletPanel } from "./fundraising-athlete-wallet-panel"

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
  const showOwnerHints = isFundraisingManager || viewerIsRecruitNcAdmin
  /** Roster credit codes are operational — don’t surface to casual donors. */
  const showInternalCodes = showOwnerHints

  const slugNorm = slug.trim().toLowerCase()

  const snapshotLedger =
    resolved.ledgerCodes.length > 0 ? resolved.ledgerCodes : code != null ? [code] : []
  const [snapshot, recruitingPhotoUrl, ownerThankYouRows, thankAckLedgerKeys, wiringSnapshot, pendingActivationUserIds, managerWalletRow] =
    await Promise.all([
      snapshotLedger.length > 0
        ? getAthleteFundraisingPublicSnapshot(snapshotLedger, ATHLETE_PUBLIC_GIFTS_NO_ROW_CAP)
        : Promise.resolve(null),
      athleteId ? fetchRecruitingProfilePhoto(admin, athleteId) : Promise.resolve(null),
      isFundraisingManager && snapshotLedger.length > 0
        ? getAthleteOwnerThankYouRowsForLedgerCodes(snapshotLedger)
        : Promise.resolve([]),
      isFundraisingManager && athleteId ? fetchThankYouAckLedgerKeys(admin, athleteId) : Promise.resolve(new Set<string>()),
      athleteId ? getFundraisingWiringAdminSnapshot(admin, athleteId) : Promise.resolve(null),
      fetchPendingActivationUserIdsForSlug(admin, slugNorm),
      user?.id && athleteId && isFundraisingManager
        ? getFundraisingAthletePageWalletRowForViewer(admin, user.id, athleteId, resolved.guildLookupAthleteIds).catch(
            (e) => {
              console.error("[fundraising-athlete-public] wallet row", e)
              return null
            },
          )
        : Promise.resolve(null),
    ])

  const slugHasPendingActivation = pendingActivationUserIds.length > 0
  const latestActivationStatus: "none" | "pending" = slugHasPendingActivation ? "pending" : "none"
  const viewerHasPendingActivation = !!(user?.id && pendingActivationUserIds.includes(user.id))
  const checkoutLive = isProfileCheckoutLive(profile)

  const ownerThankYouRowsWithAck = ownerThankYouRows.map((r) => ({
    ...r,
    thanked: thankAckLedgerKeys.has(r.ledgerKey),
  }))

  /** Totals use the same corrected Stripe aggregate as `/spartan` (via cached campaign session list — typically within 60–120s of live). If Stripe + mirror fail, show zeros — do not substitute `profile.total_raised_cents`. */
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

  return (
    <div
      className="min-h-screen bg-[#061224] px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] text-white sm:px-6 sm:py-12"
      style={{ fontFamily: "var(--font-fundraising-body), system-ui, sans-serif" }}
    >
      <div className="mx-auto w-full max-w-lg sm:max-w-2xl">
        {cancelledCheckout && checkoutLive ? (
          <div className="mt-6 rounded-lg border border-amber-400/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/95">
            Checkout was cancelled — nothing was charged. You can finish a gift in secure checkout at the bottom when you&apos;re
            ready.
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

        <FundraisingPublicationBanner
          athletePagePath={athletePagePath}
          fundraisingSlug={slugNorm}
          athleteId={athleteId}
          displayName={displayName}
          checkoutLive={checkoutLive}
          viewerHasPendingActivation={viewerHasPendingActivation}
          viewerUserId={user?.id ?? null}
        />

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
        {code && showInternalCodes ? <p className="mt-2 font-mono text-xs text-white/40">{code}</p> : null}

        {code && checkoutLive ? (
          <div className="mt-5 flex flex-col items-stretch gap-2 sm:items-center">
            <HardLink href={giveOnThisPageHref} className={PRIMARY_DONATE_CTA_CLASS}>
              Donate now
            </HardLink>
            <p className="text-center text-[11px] leading-snug text-white/50 sm:max-w-md">
              Secure checkout is on this page below. Most people finish in a couple of minutes — you&apos;ll get a receipt by email.
            </p>
          </div>
        ) : code && !checkoutLive ? (
          <div className="mt-5 rounded-lg border border-white/15 bg-black/25 px-4 py-3 text-center text-sm text-white/65">
            Gifts on this URL are not turned on yet. Use{" "}
            <HardLink href="/fundraising/give" className="font-semibold text-[#C8A94A] underline-offset-2 hover:underline">
              Make a gift
            </HardLink>{" "}
            for the training fund or another active athlete page, or see the status note above if you&apos;re family.
          </div>
        ) : null}

        <div className="mt-8 rounded-xl border border-[#C8A94A]/25 bg-[#0B2545]/55 px-4 py-5 sm:px-6 sm:py-6">
          <p className="font-[family-name:var(--font-fundraising-display)] text-xs font-bold uppercase tracking-[0.2em] text-[#C8A94A]">
            {code ? "Why give through this page" : "Why donors choose NC United"}
          </p>
          {code ? (
            <p className="mt-4 text-sm leading-relaxed text-white/85">
              {checkoutLive ? (
                <>
                  Your gift goes directly to {athleteFirstName}&apos;s training, travel, and competition costs — credited to their account,
                  applied to approved wrestling expenses, and fully tax-deductible.
                </>
              ) : (
                <>
                  Families often use NC United to offset travel, training, and tournament costs. Checkout on this link is off until NC United
                  finishes activation—the banner above explains next steps for families. You can still read how giving works below.
                </>
              )}
            </p>
          ) : null}
          <ul className="mt-4 list-none space-y-3 text-sm leading-relaxed text-white/85">
            <li>
              <strong className="text-white">Tax-deductible.</strong> NC United Wrestling is a 501(c)(3). Your email receipt is your record (check spam or
              promotions).
            </li>
            <li>
              <strong className="text-white">100% of your payment is credited to {displayName}</strong>
              {code ? (
                checkoutLive ? (
                  <> — the full amount you give counts toward their campaign here.</>
                ) : (
                  <> — once NC United activates gifts on this page, the amount you give will count toward their campaign here.</>
                )
              ) : (
                <> when you complete a gift to this campaign.</>
              )}
            </li>
            <li>
              <strong className="text-white">NC United covers card processing fees</strong> so what&apos;s credited isn&apos;t reduced by the processor.
            </li>
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-white/50">
            EIN <span className="tabular-nums">99-3757238</span>
            {" · "}
            <HardLink href={hubGiveHref} className="text-[#C8A94A] underline-offset-4 hover:underline">
              Other ways to give
            </HardLink>
          </p>
        </div>

        {athleteId ? (
          <>
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
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#C8A94A]">Gift mix</p>
                <p className="mt-2 text-xs leading-snug text-white/80">
                  {stats.payerTypeBreakdownKnown ? (
                    <>
                      <span className="font-semibold text-white">{stats.individualGiftCount}</span> individual gifts
                      <span className="text-white/40"> · </span>
                      <span className="font-semibold text-white">{stats.organizationGiftCount}</span> from organizations
                    </>
                  ) : (
                    <span className="text-white/50">—</span>
                  )}
                </p>
              </div>
            </div>
            <FundraisingMilestoneFunnel
              raisedCents={stats.raisedCents}
              goalCents={goalCents}
              athleteLabel={displayName}
              showOwnerHints={showOwnerHints && checkoutLive}
            />
          </>
        ) : null}

        {managerWalletRow ? (
          <FundraisingAthleteWalletPanel
            row={managerWalletRow}
            firstName={athleteFirstName}
            ledgerPublicStats={stats}
          />
        ) : null}

        {code && stats && checkoutLive && stats.giftCount === 0 ? (
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
            lookbackDays={DEFAULT_FUNDRAISING_CAMPAIGN.defaultLookbackDays}
          />
        ) : null}

        {checkoutLive ? (
          <div className="mt-10 flex justify-center lg:mt-8">
            <FundraisingAthleteQrCard
              qrSrc={athleteQrDataUrl}
              donateUrl={athleteAbsoluteUrl}
              athleteDisplayName={displayName}
            />
          </div>
        ) : null}

        <section
          id={checkoutAnchor}
          className="mt-10 scroll-mt-28 rounded-xl border border-[#C8A94A]/25 bg-[#0B2545]/35 p-4 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.45)] backdrop-blur-sm sm:p-6"
        >
          <h2 className="font-[family-name:var(--font-fundraising-display)] text-center text-lg font-bold uppercase tracking-wide text-white">
            {checkoutLive ? "Secure checkout" : "Gifts not available on this link yet"}
          </h2>
          {checkoutLive ? (
            <>
              <p className="mx-auto mt-2 max-w-md text-center text-[13px] leading-snug text-white/70">
                <strong className="font-semibold text-white/85">Tax-deductible</strong> gift (minimum $5). You&apos;ll complete payment in secure checkout and
                receive an <strong className="font-semibold text-white/85">email receipt</strong> — typically just a couple of minutes.
              </p>
              <div className="mt-6 w-full text-left">
                <FundraisingAthleteEmbeddedCheckout
                  athleteCode={code}
                  athleteDirectoryLabel={directoryLabelForCheckout}
                  fundraisingSlug={slug}
                  checkoutLive
                />
              </div>
            </>
          ) : (
            <p className="mx-auto mt-3 max-w-md text-center text-sm leading-relaxed text-white/65">
              NC United turns on Stripe checkout here only after a parent or athlete completes activation and staff approves. Until then, use{" "}
              <HardLink href="/fundraising/give" className="font-semibold text-[#C8A94A] underline-offset-2 hover:underline">
                Make a gift
              </HardLink>{" "}
              to support the training fund or another activated athlete.
            </p>
          )}
        </section>

        <p className="mt-12 border-t border-white/10 pt-8 text-center text-xs text-white/45">
          NC United Wrestling — North Carolina 501(c)(3). Thank you for supporting {displayName}.
        </p>
      </div>
    </div>
  )
}
