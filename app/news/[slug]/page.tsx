import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import { ArrowLeft, MessageCircle, Calendar, User, Clock } from "lucide-react"
import { getAnnouncementBySlug, getAnnouncementSlugs } from "@/lib/news"
import { newsArticleNeedsStoryArt } from "@/lib/news-image-guidelines"
import { NcUnitedRecruitingAwards2026Content } from "../content/nc-united-recruiting-awards-2026"
import { FirstFlight2026Content } from "../content/first-flight-2026-nc-united-shoe"
import { NhscaMostOutstandingWrestlerAward2026Content } from "../content/nhsca-most-outstanding-wrestler-award-2026"
import { NhscaNationalsRecap2026Content } from "../content/nhsca-nationals-recap-2026"
import { ClassOf2026SeniorSendoffContent } from "../content/class-of-2026-senior-sendoff"
import { LynchburgBuildingAProgramWithIntentionContent } from "../content/lynchburg-building-a-program-with-intention"
import { RealCostEliteWrestlingNcSmarterBuildContent } from "../content/real-cost-elite-wrestling-nc-smarter-build"
import { FindingFlowOnTheMatTheZoneContent } from "../content/finding-flow-on-the-mat-the-zone"
import { JumpingLevelsWhatDrivesRapidImprovementContent } from "../content/jumping-levels-what-drives-rapid-improvement"
import { AauScholasticDuals2026FloridaContent } from "../content/aau-scholastic-duals-2026-florida"
import { UnitedAscent20260718Content } from "../content/united-ascent-2026-07-18"
import { UnitedAscent20260725Content } from "../content/united-ascent-2026-07-25"
import { UnitedAscent20260801Content } from "../content/united-ascent-2026-08-01"
import { UnitedAscent20260808Content } from "../content/united-ascent-2026-08-08"
import { UnitedAscent20260816Content } from "../content/united-ascent-2026-08-16"
import { UnitedAscent20260824Content } from "../content/united-ascent-2026-08-24"
import { TournamentOfChampionsAnnouncedContent } from "../content/tournament-of-champions-announced"
import { TheWeightOfTheScaleContent } from "../content/the-weight-of-the-scale"
import { CadenPerryWarriorScholarshipAnnouncedContent } from "../content/caden-perry-warrior-scholarship-announced"
import { RecruitNcInteractiveWrestlingClubMapContent } from "../content/recruitnc-interactive-wrestling-club-map"
import { NcUnitedNcMatOfficialMediaPartnerContent } from "../content/nc-united-nc-mat-official-media-partner"
import { NcUnitedWrestlingGuildPremierPartnerContent } from "../content/nc-united-wrestling-guild-premier-partner"
import { CalebSmithGivesBackContent } from "../content/caleb-smith-gives-back"
import { EthanOakleyMissionAccNcaaChampionshipsContent } from "../content/ethan-oakley-mission-acc-ncaa-championships"
import { JoshWilsonDefendingNationalTitleHodgeTrophyContent } from "../content/josh-wilson-defending-national-title-hodge-trophy"
import { ClassOf2025Top25CollegeProspectsContent } from "../content/class-of-2025-top-25-college-prospects"
import { ClassOf2026Top20CollegeProspectsContent } from "../content/class-of-2026-top-20-college-prospects"
import { ClassOf2027TopSophomoresToWatchContent } from "../content/class-of-2027-top-sophomores-to-watch"
import { ClassOf2026NcWomensWrestlingProspectsContent } from "../content/class-of-2026-nc-womens-wrestling-prospects"
import { NorthCarolinaReady2025NhscaNationalsContent } from "../content/north-carolina-ready-2025-nhsca-nationals"
import { NhscaSeedingAnalysisNcRise2025Content } from "../content/nhsca-seeding-analysis-nc-rise-2025"
import { UpdatedSeeding2025NhscaNationalsContent } from "../content/updated-seeding-2025-nhsca-nationals"
import { NorthCarolinaFreshmenHistoricImpact2025NhscaContent } from "../content/north-carolina-freshmen-historic-impact-2025-nhsca"
import { NorthCarolinaSophomoresBreakout2025NhscaContent } from "../content/north-carolina-sophomores-breakout-2025-nhsca"
import { NorthCarolinaJuniorsTurnHeads2025NhscaContent } from "../content/north-carolina-juniors-turn-heads-2025-nhsca"
import { NorthCarolinaSeniorsLedNation2025NhscaContent } from "../content/north-carolina-seniors-led-nation-2025-nhsca"
import { NcWomenBreakthrough2025NhscaContent } from "../content/nc-women-breakthrough-2025-nhsca"
import { RoadToFargo2025NorthCarolinaGuideContent } from "../content/road-to-fargo-2025-north-carolina-guide"
import { TylerTracyBronzeJamaica2025U23PanAmsContent } from "../content/tyler-tracy-bronze-jamaica-2025-u23-pan-ams"
import { NcUnitedGoldLaunch2025Content } from "../content/nc-united-gold-launch-2025"
import { NcUnitedGoldInaugural2025PracticeContent } from "../content/nc-united-gold-inaugural-2025-practice"
import { NcUnitedGoldSecond2025PracticeContent } from "../content/nc-united-gold-second-2025-practice"
import { WrestlersUnitedInBusinessLaunch2025Content } from "../content/wrestlers-united-in-business-launch-2025"
import { MovingForwardFutureBrightNcWrestlingPart4Content } from "../content/moving-forward-future-bright-nc-wrestling-part-4"
import { TeamNorthCarolinaWomenFargo2025Part3Content } from "../content/team-north-carolina-women-fargo-2025-part-3"
import { AreasForGrowthTeamNcFargo2025Part2Content } from "../content/areas-for-growth-team-nc-fargo-2025-part-2"
import { TeamNorthCarolinaFargo2025Part1Content } from "../content/team-north-carolina-fargo-2025-part-1"
import { NcUnitedNwoaRefereePartnership2025Content } from "../content/nc-united-nwoa-referee-partnership-2025"
import { ClassOf2025CollegeCommitsContent } from "../content/class-of-2025-college-commits"
import { TylerTracyJuniorPanAmGamesBronze2025Content } from "../content/tyler-tracy-junior-pan-am-games-bronze-2025"
import { NcUnitedTrainsUvaRtc2025Content } from "../content/nc-united-trains-uva-rtc-2025"
import { NcUnitedCompetitiveIdentityUcd2025Content } from "../content/nc-united-competitive-identity-ucd-2025"
import { NcUnitedInauguralWomensUcdTeam2025Content } from "../content/nc-united-inaugural-womens-ucd-team-2025"
import { Top10ProblemsNcWrestlingTournaments2025Content } from "../content/top-10-problems-nc-wrestling-tournaments-2025"
import { NcUnitedBlueElevatingNcWrestling2024Content } from "../content/nc-united-blue-elevating-nc-wrestling-2024"
import { WrestlingCommunityHurricaneRelief2025Content } from "../content/wrestling-community-hurricane-relief-2025"
import { NcUnitedBlueBreakingBarriers2025Content } from "../content/nc-united-blue-breaking-barriers-2025"
import { NewSeasonNewRules202425Content } from "../content/new-season-new-rules-2024-25"
import { WrestlingYearRoundMartialArt2025Content } from "../content/wrestling-year-round-martial-art-2025"
import { InSeasonStrengthTrainingMistakes2025Content } from "../content/in-season-strength-training-mistakes-2025"
import { NcUnited2024PatriotOpenContent } from "../content/nc-united-2024-patriot-open"
import { NcUnited2024SoutheastOpenContent } from "../content/nc-united-2024-southeast-open"
import { NchsaaArticleComments } from "@/components/nchsaa-article-comments"
import { NchsaaArticleReactions } from "@/components/nchsaa-article-reactions"
import { NewsSharePanel } from "@/components/news/news-share-panel"
import { getRecruitingAwardsProfileIdMap } from "@/lib/content/recruiting-awards-profile-ids"
import { getRecruitingAwardsCollegeLogoMap } from "@/lib/content/recruiting-awards-logo-map"
import { RECRUITING_AWARDS_SLUG } from "@/lib/content/recruiting-awards-2026"
import {
  AAU_SCHOLASTIC_DUALS_2026_NEWS_SLUG,
  getAauScholasticDuals2026RosterDisplayMaps,
} from "@/lib/content/aau-scholastic-duals-2026-profile-ids"

const ANNOUNCEMENT_CONTENT: Record<string, () => JSX.Element> = {
  "united-ascent-2026-08-24": () => <UnitedAscent20260824Content />,
  "united-ascent-2026-08-16": () => <UnitedAscent20260816Content />,
  "nc-united-2024-southeast-open": () => <NcUnited2024SoutheastOpenContent />,
  "nc-united-2024-patriot-open": () => <NcUnited2024PatriotOpenContent />,
  "in-season-strength-training-mistakes-2025": () => <InSeasonStrengthTrainingMistakes2025Content />,
  "wrestling-year-round-martial-art-2025": () => <WrestlingYearRoundMartialArt2025Content />,
  "new-season-new-rules-2024-25": () => <NewSeasonNewRules202425Content />,
  "nc-united-blue-breaking-barriers-2025": () => <NcUnitedBlueBreakingBarriers2025Content />,
  "wrestling-community-hurricane-relief-2025": () => <WrestlingCommunityHurricaneRelief2025Content />,
  "nc-united-blue-elevating-nc-wrestling-2024": () => <NcUnitedBlueElevatingNcWrestling2024Content />,
  "top-10-problems-nc-wrestling-tournaments-2025": () => <Top10ProblemsNcWrestlingTournaments2025Content />,
  "nc-united-inaugural-womens-ucd-team-2025": () => <NcUnitedInauguralWomensUcdTeam2025Content />,
  "nc-united-competitive-identity-ucd-2025": () => <NcUnitedCompetitiveIdentityUcd2025Content />,
  "nc-united-trains-uva-rtc-2025": () => <NcUnitedTrainsUvaRtc2025Content />,
  "tyler-tracy-junior-pan-am-games-bronze-2025": () => <TylerTracyJuniorPanAmGamesBronze2025Content />,
  "class-of-2025-college-commits": () => <ClassOf2025CollegeCommitsContent />,
  "nc-united-nwoa-referee-partnership-2025": () => <NcUnitedNwoaRefereePartnership2025Content />,
  "team-north-carolina-fargo-2025-part-1": () => <TeamNorthCarolinaFargo2025Part1Content />,
  "areas-for-growth-team-nc-fargo-2025-part-2": () => <AreasForGrowthTeamNcFargo2025Part2Content />,
  "team-north-carolina-women-fargo-2025-part-3": () => <TeamNorthCarolinaWomenFargo2025Part3Content />,
  "moving-forward-future-bright-nc-wrestling-part-4": () => <MovingForwardFutureBrightNcWrestlingPart4Content />,
  "wrestlers-united-in-business-launch-2025": () => <WrestlersUnitedInBusinessLaunch2025Content />,
  "nc-united-gold-second-2025-practice": () => <NcUnitedGoldSecond2025PracticeContent />,
  "nc-united-gold-inaugural-2025-practice": () => <NcUnitedGoldInaugural2025PracticeContent />,
  "nc-united-gold-launch-2025": () => <NcUnitedGoldLaunch2025Content />,
  "tyler-tracy-bronze-jamaica-2025-u23-pan-ams": () => <TylerTracyBronzeJamaica2025U23PanAmsContent />,
  "road-to-fargo-2025-north-carolina-guide": () => <RoadToFargo2025NorthCarolinaGuideContent />,
  "nc-women-breakthrough-2025-nhsca": () => <NcWomenBreakthrough2025NhscaContent />,
  "north-carolina-seniors-led-nation-2025-nhsca": () => <NorthCarolinaSeniorsLedNation2025NhscaContent />,
  "north-carolina-juniors-turn-heads-2025-nhsca": () => <NorthCarolinaJuniorsTurnHeads2025NhscaContent />,
  "north-carolina-sophomores-breakout-2025-nhsca": () => <NorthCarolinaSophomoresBreakout2025NhscaContent />,
  "north-carolina-freshmen-historic-impact-2025-nhsca": () => <NorthCarolinaFreshmenHistoricImpact2025NhscaContent />,
  "updated-seeding-2025-nhsca-nationals": () => <UpdatedSeeding2025NhscaNationalsContent />,
  "nhsca-seeding-analysis-nc-rise-2025": () => <NhscaSeedingAnalysisNcRise2025Content />,
  "north-carolina-ready-2025-nhsca-nationals": () => <NorthCarolinaReady2025NhscaNationalsContent />,
  "class-of-2026-nc-womens-wrestling-prospects": () => <ClassOf2026NcWomensWrestlingProspectsContent />,
  "class-of-2027-top-sophomores-to-watch": () => <ClassOf2027TopSophomoresToWatchContent />,
  "class-of-2026-top-20-college-prospects": () => <ClassOf2026Top20CollegeProspectsContent />,
  "class-of-2025-top-25-college-prospects": () => <ClassOf2025Top25CollegeProspectsContent />,
  "josh-wilson-defending-national-title-hodge-trophy": () => <JoshWilsonDefendingNationalTitleHodgeTrophyContent />,
  "ethan-oakley-mission-acc-ncaa-championships": () => <EthanOakleyMissionAccNcaaChampionshipsContent />,
  "caleb-smith-gives-back": () => <CalebSmithGivesBackContent />,
  "nc-united-wrestling-guild-premier-partner": () => <NcUnitedWrestlingGuildPremierPartnerContent />,
  "nc-united-nc-mat-official-media-partner": () => <NcUnitedNcMatOfficialMediaPartnerContent />,
  "recruitnc-interactive-wrestling-club-map": () => <RecruitNcInteractiveWrestlingClubMapContent />,
  "tournament-of-champions-announced": () => <TournamentOfChampionsAnnouncedContent />,
  "caden-perry-warrior-scholarship-announced": () => <CadenPerryWarriorScholarshipAnnouncedContent />,
  "the-weight-of-the-scale": () => <TheWeightOfTheScaleContent />,
  "united-ascent-2026-08-08": () => <UnitedAscent20260808Content />,
  "united-ascent-2026-08-01": () => <UnitedAscent20260801Content />,
  "united-ascent-2026-07-25": () => <UnitedAscent20260725Content />,
  "united-ascent-2026-07-18": () => <UnitedAscent20260718Content />,
  "jumping-levels-what-drives-rapid-improvement": () => <JumpingLevelsWhatDrivesRapidImprovementContent />,
  "finding-flow-on-the-mat": () => <FindingFlowOnTheMatTheZoneContent />,
  "real-cost-elite-wrestling-nc-smarter-build": () => <RealCostEliteWrestlingNcSmarterBuildContent />,
  "lynchburg-building-a-program-with-intention": () => <LynchburgBuildingAProgramWithIntentionContent />,
  "first-flight-2026-nc-united-shoe": () => <FirstFlight2026Content />,
  "nhsca-most-outstanding-wrestler-award-2026": () => <NhscaMostOutstandingWrestlerAward2026Content />,
  "nhsca-nationals-recap-2026": () => <NhscaNationalsRecap2026Content />,
  "class-of-2026-senior-sendoff": () => <ClassOf2026SeniorSendoffContent />,
}

export async function generateStaticParams() {
  return getAnnouncementSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const item = getAnnouncementBySlug(slug)
  if (!item) return {}

  const title =
    slug === "the-weight-of-the-scale"
      ? "Weight Cutting in Wrestling: Risks, Benefits, and When to Move Up | RecruitNC"
      : `${item.title} | NC United`

  return {
    title,
    description: item.summary,
    openGraph: {
      title,
      description: item.summary,
      type: "article",
      publishedTime: item.date,
      authors: item.author ? [item.author] : undefined,
      images: item.image ? [{ url: item.image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: item.summary,
      images: item.image ? [item.image] : undefined,
    },
  }
}

export default async function NewsAnnouncementPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const item = getAnnouncementBySlug(slug)
  if (!item) notFound()

  const aauRosterDisplayMaps =
    slug === AAU_SCHOLASTIC_DUALS_2026_NEWS_SLUG
      ? await getAauScholasticDuals2026RosterDisplayMaps()
      : null
  const profileIdMap =
    slug === RECRUITING_AWARDS_SLUG
      ? await getRecruitingAwardsProfileIdMap()
      : aauRosterDisplayMaps?.profileIdMap
  const highSchoolMap = aauRosterDisplayMaps?.highSchoolMap
  const collegeLogoMap =
    slug === RECRUITING_AWARDS_SLUG ? await getRecruitingAwardsCollegeLogoMap() : undefined
  const Content = ANNOUNCEMENT_CONTENT[slug]
  if (
    slug !== RECRUITING_AWARDS_SLUG &&
    slug !== AAU_SCHOLASTIC_DUALS_2026_NEWS_SLUG &&
    !Content
  ) {
    notFound()
  }

  /** Designed banners already include title art — show full image, don't fade behind HTML title. */
  const designedBannerHero =
    slug === "jumping-levels-what-drives-rapid-improvement" ||
    (item.shareHeroCropOnly === true && item.imageFit === "contain")

  const showPhotoBelowHeadline = slug === "caleb-smith-gives-back"

  const skipHeroImage =
    designedBannerHero ||
    showPhotoBelowHeadline ||
    slug === "class-of-2026-senior-sendoff" ||
    slug === "real-cost-elite-wrestling-nc-smarter-build" ||
    slug === RECRUITING_AWARDS_SLUG ||
    slug === AAU_SCHOLASTIC_DUALS_2026_NEWS_SLUG

  return (
    <div className="min-h-screen bg-[#0A1628]">
      {/* Hero Header */}
      <header className="relative bg-gradient-to-br from-[#13294B] via-[#1a3a5c] to-[#0A1628]">
        {/* Hero Image */}
        {item.image && !skipHeroImage && (
          <div className="absolute inset-0 overflow-hidden">
            <Image
              src={item.image}
              alt=""
              fill
              className={`object-cover opacity-30 ${
                item.imagePosition === "top" ? "object-top" : "object-center"
              }`}
              sizes="100vw"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#13294B]/50 via-[#13294B]/80 to-[#0A1628]" />
          </div>
        )}

        <div className="relative container mx-auto px-4 py-8 md:py-12 max-w-4xl">
          {/* Back Link */}
          <Link
            href="/news"
            className="inline-flex items-center gap-2 text-sm font-medium text-white/60 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            All News
          </Link>

          {designedBannerHero && item.image ? (
            <div className="space-y-6">
              <div
                className={`relative w-full overflow-hidden rounded-xl border border-white/10 shadow-2xl ${
                  item.imageBannerBgClass ?? "bg-black"
                }`}
              >
                <Image
                  src={item.image}
                  alt={`${item.title}${item.subtitle ? ` — ${item.subtitle}` : ""}`}
                  width={1024}
                  height={546}
                  className="h-auto w-full object-contain"
                  sizes="(max-width: 896px) 100vw, 896px"
                  priority
                />
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm text-white/55">
                {item.category && (
                  <span className="inline-block rounded-full bg-[#D3B574] px-3 py-1 text-xs font-semibold text-[#13294B] uppercase tracking-wide">
                    {item.category}
                  </span>
                )}
                <span className="inline-flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {new Date(item.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
                {item.author && (
                  <span className="inline-flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {item.author}
                  </span>
                )}
                {item.readTime && (
                  <span className="inline-flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {item.readTime}
                  </span>
                )}
              </div>
              {/* Keep an accessible page title; visual title lives in the banner art. */}
              <h1 className="sr-only">
                {item.title}
                {item.subtitle ? ` — ${item.subtitle}` : ""}
              </h1>
            </div>
          ) : (
            /* Article Header */
            <div className="max-w-3xl">
              {item.category && (
                <span className="inline-block rounded-full bg-[#D3B574] px-3 py-1 text-xs font-semibold text-[#13294B] uppercase tracking-wide mb-4">
                  {item.category}
                </span>
              )}
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight">
                {item.title}
              </h1>
              {item.subtitle && (
                <p className="mt-4 text-xl text-white/70 leading-relaxed">
                  {item.subtitle}
                </p>
              )}
              <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-white/50">
                <span className="inline-flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {new Date(item.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
                {item.author && (
                  <span className="inline-flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {item.author}
                  </span>
                )}
                {item.readTime && (
                  <span className="inline-flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {item.readTime}
                  </span>
                )}
              </div>
            </div>
          )}

          {showPhotoBelowHeadline && item.image && (
            <div className="relative mt-8 aspect-[16/9] w-full overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
              <Image
                src={item.image}
                alt="Caleb Smith with wrestlers following Greensboro RTC practice at Greensboro College"
                fill
                className="object-cover"
                sizes="(max-width: 896px) 100vw, 896px"
                priority
              />
            </div>
          )}
        </div>
      </header>

      {/* Article Content */}
      <main className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
        <article className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Reactions Bar */}
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:p-6 sm:flex-row sm:items-center sm:justify-between bg-slate-50">
            <NchsaaArticleReactions articleSlug={slug} />
            <a
              href="#article-feedback"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-[#13294B] transition-colors hover:bg-white hover:border-[#13294B]"
            >
              <MessageCircle className="h-4 w-4" />
              Leave Feedback
            </a>
          </div>

          <div className="border-b border-slate-200 p-4 sm:p-6">
            <NewsSharePanel
              slug={slug}
              title={item.subtitle ? `${item.title} — ${item.subtitle}` : item.title}
              needsStoryArt={newsArticleNeedsStoryArt(item)}
            />
          </div>

          {/* Article Body */}
          <div className="p-4 sm:p-6 md:p-10 prose prose-slate max-w-none prose-headings:text-[#13294B] prose-a:text-[#13294B] prose-strong:text-[#13294B]">
            {slug === RECRUITING_AWARDS_SLUG ? (
              <NcUnitedRecruitingAwards2026Content
                profileIdMap={profileIdMap ?? {}}
                collegeLogoMap={collegeLogoMap ?? {}}
              />
            ) : slug === AAU_SCHOLASTIC_DUALS_2026_NEWS_SLUG ? (
              <AauScholasticDuals2026FloridaContent
                profileIdMap={profileIdMap ?? {}}
                highSchoolMap={highSchoolMap ?? {}}
              />
            ) : (
              Content?.()
            )}
          </div>

          {/* Bottom Reactions */}
          <div className="border-t border-slate-200 p-4 sm:p-6 bg-slate-50">
            <NchsaaArticleReactions articleSlug={slug} />
          </div>
        </article>

        {/* Comments Section */}
        <section
          id="article-feedback"
          className="mt-8 bg-[#13294B]/50 rounded-2xl border border-white/10 p-4 sm:p-6 md:p-8"
        >
          <h2 className="text-xl font-bold text-white mb-6">Feedback & Comments</h2>
          <div className="bg-white rounded-xl p-4 sm:p-6">
            <NchsaaArticleComments articleSlug={slug} />
          </div>
        </section>

        {/* Back to News */}
        <div className="mt-8 text-center">
          <Link
            href="/news"
            className="inline-flex items-center gap-2 text-[#D3B574] hover:text-white transition-colors font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to All News
          </Link>
        </div>
      </main>
    </div>
  )
}
