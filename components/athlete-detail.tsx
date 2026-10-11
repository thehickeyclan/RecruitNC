"use client"

import { STYLE_LABEL, type CompetitionSummary } from "@/lib/wrestling-style"
import { mayUseComparison } from "@/lib/compare-access"
import { SimilarComparisons } from "@/components/profile/similar-comparisons"
import type { Credential } from "@/lib/profile/credentials"
import { bannerNationalRankingLabel, type NationalRanking } from "@/lib/national-rankings"
import {
  BannerEyebrow,
  BannerName,
  BannerRibbon,
  BannerStats,
  NationalRankingRibbon,
  CompetesBar,
  CredentialCards,
  ScoutingReportAction,
  CompareAction,
  type BannerStat,
} from "@/components/profile/profile-banner-parts"
import { ProfileRow } from "@/components/profile/profile-row"
import { AppNotableLosses, AppRow, AppSignificantWins, AppTournamentResults, useAppProfile } from "@/components/profile/app-profile-rows"
import { SignificantWinSubmissionDialog } from "@/components/significant-win-submission-dialog"
import { TournamentResultSubmissionDialog } from "@/components/tournament-result-submission-dialog"
import { ProfileFitFlag } from "@/components/profile/profile-fit-flag"
import { useState, useEffect } from "react"
import Image from "next/image"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeftRight, Award, BarChart3, Camera, Check, ChevronDown, MessageSquare, Edit, ExternalLink, Eye, FileText, GraduationCap, ListOrdered, Mail, Pencil, Phone, Scale, School, Share2, TrendingUp, Trophy, UserRound, Video } from "lucide-react"
import { UnifiedProfileMobileNav } from "./unified-profile-mobile-nav"
import type { ProfileQualityWinsTournamentBlock } from "@/lib/profile-quality-wins"
import {
  PROFILE_CARD_BODY,
  PROFILE_SECTION_HEADER,
  PROFILE_SECTION_ORDER,
  PROFILE_SECTION_TITLE,
} from "@/lib/unified-profile-section-styles"
import { cn } from "@/lib/utils"
import { WatchListButton } from "./watch-list-button"
import { CoachMessageButton } from "@/components/coach-messages/coach-message-button"
import { FamilyMessagesPanel } from "@/components/coach-messages/family-messages-panel"
import { RequestProfileEditModal } from "./request-profile-edit-modal"
import { MatchDataSectionImproved } from "./match-data-section-improved"
import { SignificantWinsSection } from "./significant-wins-section"
import { useAuth } from "@/contexts/auth-context"
import { canSeeRankingOnProfile } from "@/lib/ranking-visibility"
import { InlineEditSection } from "./inline-edit-section"
import { InlineEditHeader } from "./inline-edit-header"
import { ImageUploadEditor } from "./image-upload-editor"
import { InlineBioEditor } from "./inline-bio-editor"
import { InlineContactEditor } from "./inline-contact-editor"
import { InlineAcademicsEditor } from "./inline-academics-editor"
import { InlineAchievementsEditor } from "./inline-achievements-editor"
import { ParentLinkButton } from "./parent-link-button"
import { ClaimProfileButton } from "./claim-profile-button"
import { CoachViewsPanel } from "./coach-views-panel"
import { CollegeViewsLanding } from "@/components/profile/college-views-landing"
import { InlineCollegeOpensEditor } from "./inline-college-opens-editor"
import { InlineSchoolClubEditor } from "./inline-school-club-editor"
import { InlineWeightEditor } from "./inline-weight-editor"
import { InlineHighlightVideoEditor } from "./inline-highlight-video-editor"
import { WorkingEntityLogo } from "./working-entity-logo"
import { useToast } from "@/components/ui/use-toast"
import { getYouTubeVideoId, isDirectHighlightVideoUrl } from "@/lib/highlight-video-url"
import { ProfileViewStatsPanel } from "./profile-view-stats-panel"
import { BannerViewStats } from "./profile/banner-view-stats"
import { getPublicRankingsMax, isPublicRankingsYearPublished } from "@/lib/public-rankings-cap"
import { scoutingReportAvailable } from "@/lib/scouting-report-access"

/**
 * Bio/summary paragraph section.
 *
 * Was hidden because some bios had gone stale, but hiding it site-wide punished the
 * athletes who keep theirs current — Jake Amiott's mother updated his the day after Fargo
 * and then reported the write-up missing, because the text saved fine and simply never
 * rendered. A stale paragraph on some profiles is a smaller problem than no paragraph on
 * any of them, and the section already hides itself when an athlete has no bio.
 */
const SHOW_ATHLETE_BIO_SECTION = true

/*
 * The profile's rows, in the order they are listed (components/profile/profile-row.tsx). A row's
 * header and the sections it opens share one `order`, so the sections sit directly under it
 * wherever they are written in this file.
 */
type RowKey = "views" | "results" | "wins" | "losses" | "scouting" | "season" | "academics" | "contact" | "film" | "about" | "compare"
const ROW_ORDER: Record<RowKey, string> = {
  // The app's order first; the website's extra rows after it.
  results: "order-[5]",
  wins: "order-[6]",
  losses: "order-[7]",
  academics: "order-[9]",
  contact: "order-[10]",
  views: "order-[11]",
  scouting: "order-[12]",
  season: "order-[13]",
  film: "order-[14]",
  about: "order-[15]",
  compare: "order-[16]",
}
/** Which row holds the section an edit button opens. */
const EDIT_SECTION_ROW: Record<string, RowKey> = {
  bio: "about",
  "college-opens": "about",
  achievements: "about",
  "highlight-video": "film",
  academics: "academics",
}

interface AthleteDetailProps {
  athlete: {
    id: string
    name?: string
    college?: string
    previous_college?: string
    division?: string
    graduationyear?: number
    graduation_year?: number
    weightclass?: string
    weight_class?: string
    highschool?: string
    high_school?: string
    wrestlingClub?: string
    wrestlingClubLogoUrl?: string
    ncUnitedTeam?: string
    photourl?: string
    photo_url?: string
    image_url?: string
    achievements?: string[] | string
    location?: string
    hometown?: string
    height?: string
    gender?: string
    commitmentdate?: string
    commitment_date?: string
    bio?: string
    bio_headline?: string
    gpa?: number
    sat?: number
    act?: number
    academic_gpa?: number
    academic_sat?: number
    academic_act?: number
    academic_summary?: string | null
    academic_interest?: string | null
    recruiting_status?: string
    nhsca_2026_record?: string
    nhsca_2026_placement?: string
    nhsca_2024_record?: string
    nhsca_2025_record?: string
    nhsca_2023_record?: string
    nhsca_2024_placement?: string
    nhsca_2025_placement?: string
    nhsca_2023_placement?: string
    super_32_2023_record?: string
    super_32_2024_record?: string
    super_32_2025_record?: string
    super_32_2023_placement?: string
    super_32_2024_placement?: string
    super_32_2025_placement?: string
    ultimate_club_duals_2025_record?: string
    ultimate_club_duals_2024_record?: string
    nationally_ranked_wins?: string
    college_opens_experience?: string
    prospect_ranking?: number
    rankings?: unknown
    instagram?: string
    instagram_handle?: string
    instagram_username?: string
    highlight_video_url?: string
    socialMedia?: any
    social_media?: any
    claimed_by_user_id?: string
    profile_verified?: boolean
    additional_achievements?: string | null
    other_honours?: string | null
    flo_profile_url?: string
    track_wrestling_profile_url?: string
    last_edited_by?: string
    last_edited_at?: string
  }
  nchsaaResults?: Array<{
    year: number
    place: number
    classification: string
    weight_class: string
  }>
  currentUserId?: string | null
  tournamentResultsComponent?: React.ReactNode
  /** Public view-profile uses dark navy panels to match /athletes and /colleges. */
  theme?: "light" | "dark"
  /** Mobile: national-first section order, jump nav, compact school block, collapsed match log. */
  mobileRecruiterLayout?: boolean
  /** In North Carolina only or nationally, and in which styles (lib/wrestling-style.ts). */
  competition?: CompetitionSummary | null
  /** Key finishes for the banner's cards, built from the result rows (lib/profile/credentials). */
  credentials?: Credential[]
  /**
   * Freestyle & Greco-Roman results and wins: their own section, last, after every folkstyle one -
   * Matt: a Fargo or freestyle-states result is never to read as part of the folkstyle record.
   */
  olympicStylesSection?: React.ReactNode
}

/** "Competes nationally · Folkstyle · Freestyle · Greco-Roman", under the year and weight. */
// The hero says how far and in which styles he competes; the finishes themselves are the
// sections below and the scouting report (Matt: no credential pills on the banner).
/** The phone photo's share / message / watch-list buttons. */
const PHOTO_ACTION =
  "inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white ring-1 ring-white/25 backdrop-blur-md transition-colors hover:bg-black/60 disabled:opacity-50"

function CompetitionStrip({ competition, className }: { competition?: CompetitionSummary | null; className?: string }) {
  if (!competition) return null
  return (
    <div className={className}>
      <CompetitionBox competition={competition} />
    </div>
  )
}

function CompetitionBox({ competition }: { competition: CompetitionSummary }) {
  return (
    <div className="rounded-lg border border-white/20 bg-white/10 p-3 backdrop-blur-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Competes</p>
      <p className="text-sm font-bold text-white">
        {competition.scope === "national" ? "Nationally" : "North Carolina only"}
        {competition.styles.length ? (
          <span className="font-semibold text-[#D3B574]"> · {competition.styles.map((st) => STYLE_LABEL[st]).join(" · ")}</span>
        ) : null}
      </p>
      {competition.scope === "national" && competition.nationalEvents.length ? (
        <p className="mt-0.5 text-xs leading-snug text-white/65">{competition.nationalEvents.join(", ")}</p>
      ) : null}
    </div>
  )
}

export function AthleteDetail({
  athlete,
  nchsaaResults = [],
  currentUserId = null,
  tournamentResultsComponent,
  theme = "light",
  mobileRecruiterLayout = false,
  competition = null,
  credentials = [],
  olympicStylesSection = null,
}: AthleteDetailProps) {
  const isDark = theme === "dark"
  const { isAdmin, isVerifiedCoach, profile: viewerProfile } = useAuth()
  /**
   * The server decides who sees the scouting report, so the entry point cannot drift from the
   * endpoint. Pre-launch that is an explicit allowlist rather than a role, which is why this
   * does not just check isCollegeCoach — see lib/scouting-report-release.ts.
   */
  // The endpoint refuses a report for an athlete it has no rating coverage for, so the button
  // is hidden for the same athletes rather than leading a coach to a 404.
  const canSeeScoutingReport =
    viewerProfile?.scouting_report_access === true && scoutingReportAvailable(athlete as { gender?: unknown })
  const [imageError, setImageError] = useState(false)
  const [highSchoolLogo, setHighSchoolLogo] = useState<string | null>(null)
  const [highSchoolLogoLoadError, setHighSchoolLogoLoadError] = useState(false)
  const [collegeLogo, setCollegeLogo] = useState<string | null>(null)
  const [clubLogo, setClubLogo] = useState<string | null>(null)
  const [clubLogoLoadError, setClubLogoLoadError] = useState(false)
  const [instagramLogo, setInstagramLogo] = useState<string | null>(null)
  const [floLogo, setFloLogo] = useState<string | null>(null)
  const [trackWrestlingLogo, setTrackWrestlingLogo] = useState<string | null>(null)
  const [fetchedNchsaaResults, setFetchedNchsaaResults] = useState<
    Array<{
      year: number
      place: number
      classification: string
      weight_class: string
    }>
  >([])

  const [showEditModal, setShowEditModal] = useState(false)
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  const [athleteData, setAthleteData] = useState(athlete)
  const [editingSection, setEditingSection] = useState<string | null>(null)
  /*
   * The body is a list of rows that open in place, on a phone and on a desktop alike (Matt's
   * mock, 10 October 2026: the iPhone profile - a header, then Tournament Results, Significant
   * Wins, Academic Information, each with one line of real data). The page had been fourteen
   * full-width cards stacked 6,000 pixels deep. Everything is still on the page and still
   * mounted, so each section loads its data and can report its line; a closed row hides it.
   */
  const [openRows, setOpenRows] = useState<ReadonlySet<RowKey>>(new Set())
  const toggleRow = (key: RowKey) =>
    setOpenRows((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  const openRow = (key: RowKey) => setOpenRows((prev) => (prev.has(key) ? prev : new Set([...prev, key])))
  /** The order a row's sections take, and whether they show. Last in `cn`, so it wins the order. */
  /*
   * A row's sections sit flush under it, inside the same outline, as the app's rows open: the
   * negative margin closes the column's gap and the header drops its bottom corners when open.
   */
  const inRow = (key: RowKey) =>
    cn("-mt-2.5 rounded-none border-x border-b border-t-0 border-[#1a3a5f] bg-[#0f1c2e] p-3 shadow-none last:rounded-b-xl", ROW_ORDER[key], !openRows.has(key) && "hidden")
  /** Tournaments, wins and losses as the iPhone app reads them (components/profile/app-profile-rows). */
  const appData = useAppProfile(String(athlete.id))
  /** The owner's editor buttons, behind "Edit Profile" on the completeness card. */
  const [showEditors, setShowEditors] = useState(false)
  /*
   * The college-views email, the claim flow and the checkout all land on the views panel
   * (components/profile/college-views-landing.tsx); open its row so the panel is there.
   */
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    if (window.location.hash === "#college-views" || q.get("src") === "email-views" || q.get("views") === "1" || q.get("purchased") === "1") {
      openRow("views")
    }
  }, [])
  // Editing a section from anywhere opens its row, so the form is never hidden.
  useEffect(() => {
    const row = editingSection ? EDIT_SECTION_ROW[editingSection] : undefined
    if (row) openRow(row)
  }, [editingSection])
  // Open by default. It is the athlete introducing themselves, directly under the banner —
  // the one section a reader wants before they have decided to look for anything.
  // A preview until asked: the full bio ran four phone screens before the first result.
  const [bioExpanded, setBioExpanded] = useState(!mobileRecruiterLayout)
  const [linkedProfileViewAthleteIds, setLinkedProfileViewAthleteIds] = useState<Set<string>>(new Set())
  // The narrower set: athletes this account is linked to through parent_athlete_links, which is
  // what the self-edit route accepts. The wallet list above also counts user_profiles.athlete_id.
  const [parentLinkedAthleteIds, setParentLinkedAthleteIds] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  const handleShareProfile = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      toast({ title: "Link copied", description: "Profile link copied to clipboard." })
    } catch {
      toast({ title: "Copy failed", description: "Could not copy link. Try selecting the URL manually.", variant: "destructive" })
    }
  }

  /*
   * Does this account hold a current NC United Blue membership?
   *
   * Asked only when somebody is signed in and only once per profile. A signed-out visitor never
   * sees the ranking, so there is nothing to look up for them.
   */
  const [isBlueMember, setIsBlueMember] = useState(false)
  useEffect(() => {
    if (!currentUserId) {
      setIsBlueMember(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const response = await fetch("/api/blue/my-memberships")
        if (!response.ok) return
        const data = await response.json()
        const holds =
          (Array.isArray(data?.memberships) && data.memberships.length > 0) ||
          (Array.isArray(data?.wiqSubscriptions) && data.wiqSubscriptions.length > 0)
        if (!cancelled) setIsBlueMember(holds)
      } catch {
        // A failed lookup leaves the ranking hidden, which is the safe way to be wrong.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [currentUserId])

  // Profile owner can see their own private info (cell, GPA, ACT, SAT)
  const isViewingOwnProfile = Boolean(currentUserId && athlete.claimed_by_user_id === currentUserId)
  const isLinkedParentProfile = Boolean(currentUserId && linkedProfileViewAthleteIds.has(athlete.id))
  const isParentLinkedEditor = Boolean(currentUserId && parentLinkedAthleteIds.has(String(athlete.id)))
  const canViewProfileStats = isViewingOwnProfile || isLinkedParentProfile || isAdmin
  // The same rule /api/athletes/[id]/self-edit enforces: owner, linked parent, or admin. Everyone
  // else gets "Request Profile Edit", which queues the change for review.
  const canEdit = isViewingOwnProfile || isParentLinkedEditor || isAdmin

  // ?edit=photo opens the photo editor straight away - the iPhone app sends families here to add
  // a photo, since the app itself cannot pick one until a native build ships. canEdit settles
  // after auth loads, so this waits for it rather than reading it on first render.
  useEffect(() => {
    if (!canEdit) return
    if (new URLSearchParams(window.location.search).get("edit") !== "photo") return
    setEditingSection("photo")
    setTimeout(() => document.querySelector("[data-owner-editor]")?.scrollIntoView({ block: "start" }), 300)
  }, [canEdit])
  // Private info (contact, GPA, ACT, SAT) visible only to self, coaches, and admins
  const canSeePrivateInfo = isViewingOwnProfile || isAdmin || isVerifiedCoach
  /** The comparison: verified college coaches and admins, never on your own profile. */
  const mayCompare = mayUseComparison({ isAdmin, profile: viewerProfile, userId: currentUserId }) && !isViewingOwnProfile

  // Academic fields: support both gpa/sat/act and academic_gpa/academic_sat/academic_act (DB column variants)
  const effectiveGpa = athleteData?.academic_gpa ?? athleteData?.gpa
  const effectiveSat = athleteData?.academic_sat ?? athleteData?.sat
  const effectiveAct = athleteData?.academic_act ?? athleteData?.act
  const hasAcademicData = Boolean(effectiveGpa || effectiveSat || effectiveAct)

  type NationalTeamHighlightVideo = {
    event: string
    year: number
    title: string
    videoSrc: string
    ariaLabel: string
  }

  const nationalTeamHighlightVideos: NationalTeamHighlightVideo[] = Array.isArray(
    (athleteData as { national_team_highlight_videos?: NationalTeamHighlightVideo[] })
      ?.national_team_highlight_videos
  )
    ? ((athleteData as { national_team_highlight_videos?: NationalTeamHighlightVideo[] })
        .national_team_highlight_videos as NationalTeamHighlightVideo[])
    : []

  const profileQualityWins: ProfileQualityWinsTournamentBlock[] = Array.isArray(
    (athleteData as { profile_quality_wins?: ProfileQualityWinsTournamentBlock[] })?.profile_quality_wins,
  )
    ? ((athleteData as { profile_quality_wins?: ProfileQualityWinsTournamentBlock[] })
        .profile_quality_wins as ProfileQualityWinsTournamentBlock[])
    : []

  const renderDirectHighlightVideo = (url: string, title: string) => (
    <div className="relative w-full overflow-hidden rounded-lg shadow-lg bg-black">
      <video
        src={url}
        controls
        playsInline
        preload="metadata"
        className="w-full max-h-[min(70vh,720px)]"
        title={title}
      >
        <source src={url} type="video/quicktime" />
        <source src={url} type="video/mp4" />
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          Watch highlight video
        </a>
      </video>
    </div>
  )

  // Handler for inline edits
  const handleInlineSave = async (updates: Record<string, any>) => {
    const response = await fetch(`/api/athletes/${athlete.id}/self-edit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to save")
    }

    const data = await response.json()
    // Update local state
    setAthleteData((prev) => ({ ...prev, ...updates }))
    setEditingSection(null)
    // Refresh page data
    window.location.reload()
  }

  // Handler for image upload
  const handleImageUpload = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("athleteId", athlete.id)
    formData.append("category", "profile")

    const response = await fetch("/api/athletes/upload-image", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to upload image")
    }

    const data = await response.json()
    // Update local state
    setAthleteData((prev) => ({ ...prev, photourl: data.url }))
    return data.url
  }

  const isKayne =
    athlete?.id === "9064f44a-2166-45a2-a8c6-690ae8d439db" ||
    (athlete?.name?.toLowerCase?.().includes("kayne") && athlete?.name?.toLowerCase?.().includes("bryson"))

  const athleteName = athlete?.name || "Unknown Athlete"
  const college = athlete?.college || "Not specified"
  const previousCollege = String(athlete?.previous_college ?? "").trim() || null
  const collegeTransferLabel =
    previousCollege &&
    college !== "Not specified" &&
    previousCollege.toLowerCase() !== college.toLowerCase()
      ? `Transferred from ${previousCollege}`
      : null
  const graduationYear = athlete?.graduationyear || athlete?.graduation_year || 0
  const profileWeightDisplay = (athlete as { profile_weight_display?: {
    displayWeight: string | null
    listedWeight: string | null
    lastCompeted: { weight: string; year: number; event: string } | null
    differsFromListed: boolean
  } })?.profile_weight_display
  const weightClass =
    profileWeightDisplay?.displayWeight ??
    athlete?.weightclass ??
    athlete?.weight_class ??
    "Not specified"
  const weightClassLabel =
    weightClass === "Not specified" || weightClass === ""
      ? "Not specified"
      : String(weightClass).replace(/\s*lbs?$/i, "")
  // Headline is the athlete's own listed weight; this line is the competed history beneath
  // it, and always names the weight they actually wrestled at.
  const weightSubline = profileWeightDisplay?.lastCompeted
    ? `Last competed: ${profileWeightDisplay.lastCompeted.weight} lbs · ${profileWeightDisplay.lastCompeted.event} ${profileWeightDisplay.lastCompeted.year}`
    : null
  const highSchool = athlete?.highschool || athlete?.high_school || "Not specified"
  const wrestlingClub = athlete?.wrestlingClub || "Not specified"
  const ncUnitedTeam = athlete?.ncUnitedTeam || ""
  const recruitingStatus = athlete?.recruiting_status || "Uncommitted"
  const rawRank = (() => {
    const p = (athlete as any)?.prospect_ranking
    if (p != null && Number.isFinite(Number(p))) return Number(p)
    const r = (athlete as any)?.rankings
    if (r != null && typeof r === "number" && Number.isFinite(r)) return r
    if (r != null && typeof r === "object") {
      const n = (r as Record<string, unknown>)[2028] ?? (r as Record<string, unknown>)["2028"] ?? (r as Record<string, unknown>).class_2028 ?? (r as Record<string, unknown>).state ?? (r as Record<string, unknown>).national
      if (typeof n === "number" && Number.isFinite(n)) return n
    }
    return null
  })()
  // Only show rank on profile when athlete is on our official published rankings.
  const graduationYearNumber = Number(graduationYear)
  const maxRankForClass = isPublicRankingsYearPublished(graduationYearNumber)
    ? getPublicRankingsMax(graduationYearNumber)
    : 0
  const publishedRank =
    rawRank != null &&
    Number.isFinite(rawRank) &&
    rawRank >= 1 &&
    rawRank <= maxRankForClass
      ? rawRank
      : null
  /*
   * The ranking is the thing this platform charges for, and it was printed under the athlete's
   * name on every public profile — so the whole board could be read off the roster by anybody.
   * Gated here, at the single place it is computed, so every card that renders it is covered.
   */
  const maySeeRanking = canSeeRankingOnProfile({ isAdmin, isVerifiedCoach })
  const prospectRanking = maySeeRanking ? publishedRank : null

  const getAthletePhoto = () => {
    if (athleteName.toLowerCase().includes("liam hickey")) {
      return "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/athlete/liam-hickey-1746040496978.png"
    }

    if (athleteName.toLowerCase().includes("anna ockerman")) {
      return "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/athlete/anna-ockerman-1746893349014.png"
    }

    // Prefer athleteData so uploaded photo shows immediately (athleteData is updated on save)
    const photoUrl =
      athleteData?.photourl ||
      athleteData?.photo_url ||
      athleteData?.image_url ||
      athlete?.photourl ||
      athlete?.photo_url ||
      athlete?.image_url

    if (photoUrl && !imageError && photoUrl !== "/wrestler-silhouette.png") {
      return photoUrl
    }

    return "/wrestler-silhouette.png"
  }

  useEffect(() => {
    const loadLogos = async () => {
      try {
        if (highSchool && highSchool !== "Not specified") {
          const hsLogoUrl = athlete?.highSchoolLogoUrl ?? athlete?.highschoollogourl ?? (athlete as any)?.high_school_logo_url
          if (hsLogoUrl) {
            setHighSchoolLogo(hsLogoUrl)
          } else {
            const response = await fetch(`/api/logo-mappings/by-entity/highschool/${encodeURIComponent(highSchool)}`)
            if (response.ok) {
              const data = await response.json()
              if (data.success && data.logo_url) {
                setHighSchoolLogo(data.logo_url)
                setHighSchoolLogoLoadError(false)
              }
            }
          }
        }

        if (college && college !== "Not specified") {
          const response = await fetch(`/api/logo-mappings/by-entity/college/${encodeURIComponent(college)}`)
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.logo_url) {
              setCollegeLogo(data.logo_url)
            }
          }
        }

        const clubLogoUrl = athlete?.wrestlingClubLogoUrl ?? athlete?.wrestlingclublogourl ?? (athlete as any)?.wrestling_club_logo_url
        if (clubLogoUrl) {
          setClubLogo(clubLogoUrl)
          setClubLogoLoadError(false)
        } else if (wrestlingClub && wrestlingClub !== "Not specified") {
          const response = await fetch(`/api/logo-mappings/by-entity/club/${encodeURIComponent(wrestlingClub)}`)
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.logo_url) {
              setClubLogo(data.logo_url)
              setClubLogoLoadError(false)
            }
          }
        }

        // Load social media logos from logo manager with fallbacks
        const instagramResponse = await fetch(`/api/logo-mappings/by-entity/other/Instagram`)
        if (instagramResponse.ok) {
          const instagramData = await instagramResponse.json()
          if (instagramData.success && instagramData.logo_url) {
            console.log("✅ Instagram logo from logo manager:", instagramData.logo_url)
            setInstagramLogo(instagramData.logo_url)
          }
        }

        const floResponse = await fetch(`/api/logo-mappings/by-entity/other/Flo`)
        if (floResponse.ok) {
          const floData = await floResponse.json()
          console.log("🔍 Flo API response:", floData)
          if (floData.success && floData.logo_url) {
            console.log("✅ Flo logo from logo manager:", floData.logo_url)
            setFloLogo(floData.logo_url)
          } else {
            console.log("⚠️ Flo logo not found in logo manager, using fallback")
            // Fallback to provided URL only if not found in logo manager
            setFloLogo("https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/tSowJ6H6xqarm-EN8yomh-Flo.png")
          }
        } else {
          console.log("⚠️ Flo API call failed, using fallback")
          // Fallback to provided URL only if API call fails
          setFloLogo("https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/tSowJ6H6xqarm-EN8yomh-Flo.png")
        }

        const trackResponse = await fetch(`/api/logo-mappings/by-entity/other/Track`)
        if (trackResponse.ok) {
          const trackData = await trackResponse.json()
          console.log("🔍 Track API response:", trackData)
          if (trackData.success && trackData.logo_url) {
            console.log("✅ Track logo from logo manager:", trackData.logo_url)
            setTrackWrestlingLogo(trackData.logo_url)
          } else {
            console.log("⚠️ Track logo not found in logo manager, using fallback")
            // Fallback to provided URL only if not found in logo manager
            setTrackWrestlingLogo("https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/yr63Q1zyRJ9lUKClT1Xy7-Track.png")
          }
        } else {
          console.log("⚠️ Track API call failed, using fallback")
          // Fallback to provided URL only if API call fails
          setTrackWrestlingLogo("https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/yr63Q1zyRJ9lUKClT1Xy7-Track.png")
        }
      } catch (error) {
        console.error("Error loading logos:", error)
      }
    }

    loadLogos()
  }, [highSchool, college, athleteName, wrestlingClub, athlete?.wrestlingClubLogoUrl, athlete?.highSchoolLogoUrl])

  /**
   * Honours the athlete wrote themselves.
   *
   * State placements and qualifiers, NHSCA, Super 32 and Fargo come from the result tables
   * and render in their own sections — RecruitNC populates those so nobody can mistype a
   * state title. This field is only for what those tables do not cover: conference and
   * regional finishes, invitationals, career records, team titles.
   *
   * The legacy achievements / additional_achievements columns were migrated into
   * other_honours and are no longer read here, but they are still in the database.
   */
  const otherHonours = (() => {
    const raw = (athleteData?.other_honours ?? "").toString()
    if (!raw.trim()) return []
    return raw
      .split(/\r?\n|;|\s+•\s+/)
      .map((entry) => entry.trim())
      .filter(Boolean)
  })()

  /*
   * A section with nothing in it is not structure, it is noise.
   *
   * These four printed on every profile whether or not the athlete had filled them in — on one
   * profile that was 978 pixels of "No highlight video yet" above the results a college coach came
   * for. The card still shows to whoever can fill it in, where the empty state is a prompt rather
   * than a dead end.
   */
  const hasBioContent = Boolean(String(athleteData?.bio ?? "").trim())
  const hasHighlightContent = Boolean(athleteData?.highlight_video_url) || nationalTeamHighlightVideos.length > 0
  const hasCollegeOpensContent = Boolean(String(athleteData?.college_opens_experience ?? "").trim())
  const hasOtherHonoursContent = otherHonours.length > 0

  const athletePhoto = getAthletePhoto()

  const getRecruitingStatusBadge = () => {
    const status = (recruitingStatus || "").toLowerCase().trim()

    if (status === "committed") {
      return { color: "bg-red-600", text: "COMMITTED", isCollegeAthlete: false }
    } else if (status === "college athlete") {
      return { color: "bg-red-600", text: "COLLEGE ATHLETE", isCollegeAthlete: true }
    } else if (status === "verbal commit") {
      return { color: "bg-yellow-600", text: "VERBAL COMMIT", isCollegeAthlete: false }
    } else if (status === "recruited") {
      return { color: "bg-blue-900", text: "RECRUITED", isCollegeAthlete: false }
    } else if (status === "prospect") {
      return { color: "bg-yellow-700", text: "PROSPECT", isCollegeAthlete: false }
    } else if (status === "uncommitted" || status === "" || !status) {
      const currentYear = new Date().getFullYear()
      if (graduationYear && graduationYear > currentYear) {
        return { color: "bg-blue-900", text: "HIGH SCHOOL PROSPECT", isCollegeAthlete: false }
      } else {
        return { color: "bg-red-600", text: "UNCOMMITTED", isCollegeAthlete: false }
      }
    } else {
      return { color: "bg-red-600", text: "UNCOMMITTED", isCollegeAthlete: false }
    }
  }

  const statusBadge = getRecruitingStatusBadge()
  const normalizedStatus = (recruitingStatus || "").toLowerCase().trim()
  const isCommittedStatus =
    normalizedStatus.includes("committed") ||
    normalizedStatus.includes("college athlete") ||
    normalizedStatus === "verbal commit" ||
    normalizedStatus === "signed"

  const getALLAmericanStatus = () => {
    try {
      const fromJson = Array.isArray(athlete?.nhsca_results)
        ? (athlete.nhsca_results as { year?: number; placement?: string | number }[])
        : []
      const fromLegacy = [
        { year: "2026", placement: athlete?.nhsca_2026_placement },
        { year: "2025", placement: athlete?.nhsca_2025_placement },
        { year: "2024", placement: athlete?.nhsca_2024_placement },
        { year: "2023", placement: athlete?.nhsca_2023_placement },
      ]

      const placeToNum = (raw: string | number | undefined | null): number | null => {
        if (raw == null || raw === "") return null
        if (typeof raw === "number" && !isNaN(raw)) return raw
        const s = String(raw).trim()
        const low = s.toLowerCase()
        if (low.includes("champion") || low === "1st" || /^1(\s|$)/.test(low)) return 1
        const n = Number.parseInt(s, 10)
        if (!isNaN(n) && n >= 1 && n <= 99) return n
        const m = s.match(/^(\d+)(st|nd|rd|th)/i)
        if (m) {
          const v = Number.parseInt(m[1], 10)
          return isNaN(v) ? null : v
        }
        const lead = s.match(/(\d+)(?:st|nd|rd|th)?\s+all-american/i)
        if (lead) {
          const v = Number.parseInt(lead[1], 10)
          return isNaN(v) ? null : v
        }
        return null
      }

      const yearsAa: string[] = []
      for (const r of fromJson) {
        const place = placeToNum(r.placement as string | number | undefined)
        if (place != null && place >= 1 && place <= 8) {
          yearsAa.push(String(r.year ?? ""))
        }
      }
      for (const p of fromLegacy) {
        if (!p.placement || p.placement === "") continue
        const place = placeToNum(p.placement as string | number | undefined)
        if (place != null && place >= 1 && place <= 8) {
          yearsAa.push(p.year)
        }
      }

      const unique = [...new Set(yearsAa.filter(Boolean))]
      return unique.length > 0 ? `All American (${unique.join(", ")})` : null
    } catch (error) {
      console.error("[v0] Error in getALLAmericanStatus:", error)
      return null
    }
  }

  const getAchievementBadges = () => {
    try {
      const badges = []

      if (ncUnitedTeam?.toLowerCase().includes("blue")) {
        badges.push({
          color: "bg-white text-blue-900 border-2 border-blue-900",
          text: "NC UNITED BLUE",
          icon: "/nc-united-blue-logo.png",
        })
      } else if (ncUnitedTeam?.toLowerCase().includes("gold")) {
        badges.push({
          color: "bg-white text-yellow-700 border-2 border-yellow-700",
          text: "NC UNITED GOLD",
          icon: "/nc-united-blue-logo.png",
        })
      }

      const hasStateTitle = Array.isArray(nchsaaResults) && nchsaaResults.some((result) => result?.place === 1)
      if (hasStateTitle) {
        badges.push({ color: "bg-yellow-600 text-white", text: "STATE CHAMPION" })
      }

      const stateQualifier = (athlete?.state_qualifier ?? athleteData?.state_qualifier ?? "").toString().trim()
      if (stateQualifier) {
        badges.push({ color: "bg-green-600 text-white", text: "STATE QUALIFIER" })
      }

      const allAmericanStatus = getALLAmericanStatus()
      if (allAmericanStatus) {
        badges.push({ color: "bg-yellow-600 text-white", text: "ALL-AMERICAN" })
      }

      return badges
    } catch (error) {
      console.error("[v0] Error in getAchievementBadges:", error)
      return []
    }
  }

  const achievementBadges = getAchievementBadges()

  const getMedalIcon = (placement: number) => {
    if (placement === 1) return "🥇"
    if (placement === 2) return "🥈"
    if (placement === 3) return "🥉"
    if (placement >= 4 && placement <= 8) return "🥉"
    return null
  }

  const getConsolidatedTournamentData = () => {
    const tournaments = []

    const effectiveNchsaaResults = nchsaaResults.length > 0 ? nchsaaResults : fetchedNchsaaResults

    if (Array.isArray(effectiveNchsaaResults) && effectiveNchsaaResults.length > 0) {
      effectiveNchsaaResults.forEach((result) => {
        if (result && typeof result === "object") {
          tournaments.push({
            tournament: "NCHSAA",
            year: result.year,
            placement: result.place,
            record: null,
            classification: result.classification,
            weight: result.weight_class,
            type: "state",
          })
        }
      })
    }

    // Try new JSON format first for NHSCA
    if (athlete?.nhsca_results && Array.isArray(athlete.nhsca_results) && athlete.nhsca_results.length > 0) {
      athlete.nhsca_results.forEach((result: any) => {
        tournaments.push({
          tournament: "NHSCA",
          year: result.year,
          placement: result.placement,
          record: result.record,
          type: "national",
        })
      })
    } else {
      // Fallback to old columns (include 2026 — nhsca_results JSON may be empty while legacy cols are set)
      const nhscaYears = [
        { year: 2026, record: athlete?.nhsca_2026_record, placement: athlete?.nhsca_2026_placement },
        { year: 2025, record: athlete?.nhsca_2025_record, placement: athlete?.nhsca_2025_placement },
        { year: 2024, record: athlete?.nhsca_2024_record, placement: athlete?.nhsca_2024_placement },
        { year: 2023, record: athlete?.nhsca_2023_record, placement: athlete?.nhsca_2023_placement },
      ]

      nhscaYears.forEach(({ year, record, placement }) => {
        if (record || placement) {
          tournaments.push({
            tournament: "NHSCA",
            year,
            placement: placement ? Number.parseInt(placement) || placement : null,
            record,
            type: "national",
          })
        }
      })
    }

    // Super 32: only from table (super32_results). Do NOT use athlete row (super_32_* / super32_results JSONB)
    // so we never show wrong/stale data. When tournamentResultsComponent is passed, Super32 comes from table only.
    // consolidatedTournaments is used for ordering; Super32 display is from tournamentResultsComponent.
    // Skip adding Super32 from athlete row here to avoid double/wrong data.

    try {
      return tournaments.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year
        const order = { NCHSAA: 1, NHSCA: 2, "Super 32": 3 }
        return (order[a.tournament] || 999) - (order[b.tournament] || 999)
      })
    } catch (error) {
      console.error("[v0] Error sorting tournaments:", error)
      return tournaments
    }
  }

  const consolidatedTournaments = getConsolidatedTournamentData() || []

  useEffect(() => {
    async function fetchLinkedProfileViewAthletes() {
      if (!currentUserId || isViewingOwnProfile || isAdmin) {
        setLinkedProfileViewAthleteIds(new Set())
        setParentLinkedAthleteIds(new Set())
        return
      }

      try {
        const response = await fetch("/api/profile/linked-athletes", { credentials: "include" })
        if (!response.ok) {
          setLinkedProfileViewAthleteIds(new Set())
          setParentLinkedAthleteIds(new Set())
          return
        }
        const data = (await response.json()) as { athletes?: Array<{ id?: string; canUnlink?: boolean }> }
        const rows = data.athletes ?? []
        setLinkedProfileViewAthleteIds(
          new Set(rows.map((row) => String(row.id ?? "").trim()).filter(Boolean)),
        )
        // canUnlink is set exactly when the link is a parent_athlete_links row.
        setParentLinkedAthleteIds(
          new Set(rows.filter((row) => row.canUnlink).map((row) => String(row.id ?? "").trim()).filter(Boolean)),
        )
      } catch (error) {
        console.error("[v0] Error fetching linked profile-view athletes:", error)
        setLinkedProfileViewAthleteIds(new Set())
        setParentLinkedAthleteIds(new Set())
      }
    }

    fetchLinkedProfileViewAthletes()
  }, [athlete.id, currentUserId, isAdmin, isViewingOwnProfile])

  useEffect(() => {
    async function fetchNchsaaData() {
      if (!athleteName) return
      if (nchsaaResults.length > 0) return

      try {
        const params = new URLSearchParams({ name: athleteName })
        const wrestlingName = (athlete as { wrestling_name?: string })?.wrestling_name?.trim()
        if (wrestlingName && wrestlingName !== athleteName) params.set("wrestling_name", wrestlingName)
        if (graduationYear && graduationYear > 0) params.set("graduation_year", String(graduationYear))
        const response = await fetch(`/api/wrestling-achievements?${params.toString()}`)
        const data = await response.json()

        if (data.success && data.achievements) {
          const stateChampionships = data.achievements.state_championships || []

          const nchsaaData = stateChampionships.map((achievement: any) => ({
            year: achievement.year || 0,
            place: achievement.place || 1,
            classification: achievement.division || "",
            weight_class: achievement.weight_class || "",
          }))

          setFetchedNchsaaResults(nchsaaData)
        }
      } catch (error) {
        console.error("[v0] Error fetching NCHSAA data:", error)
      }
    }

    fetchNchsaaData()
  }, [athleteName, graduationYear, (athlete as { wrestling_name?: string })?.wrestling_name, nchsaaResults.length])

  useEffect(() => {
    async function fetchUserEmail() {
      if (!currentUserId) return
      try {
        const response = await fetch("/api/user/profile")
        if (response.ok) {
          const data = await response.json()
          setCurrentUserEmail(data.email || null)
        }
      } catch (error) {
        console.error("[v0] Error fetching user email:", error)
      }
    }
    fetchUserEmail()
  }, [currentUserId])

  const getInstagramHandle = () => {
    let instagram = athlete?.instagram || athlete?.instagram_handle || athlete?.instagram_username

    if (!instagram && athlete?.socialMedia) {
      try {
        const socialData =
          typeof athlete.socialMedia === "string" ? JSON.parse(athlete.socialMedia) : athlete.socialMedia
        if (socialData && typeof socialData === "object") {
          instagram = socialData.instagram || socialData.Instagram
        }
      } catch (error) {
        console.error("[v0] Error parsing socialMedia:", error)
      }
    }

    if (!instagram && athlete?.social_media) {
      try {
        const socialData =
          typeof athlete.social_media === "string" ? JSON.parse(athlete.social_media) : athlete.social_media
        if (socialData && typeof socialData === "object") {
          instagram = socialData.instagram || socialData.Instagram
        }
      } catch (error) {
        console.error("[v0] Error parsing social_media:", error)
      }
    }

    return instagram || null
  }

  const instagramHandle = getInstagramHandle()

  const getInstagramUrl = () => {
    if (!instagramHandle) return null

    const cleanHandle = instagramHandle.replace("@", "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "")

    return `https://www.instagram.com/${cleanHandle}`
  }

  const instagramUrl = getInstagramUrl()
  const cellPhone = (athleteData.cell || athleteData.cell_number || athleteData.phone)?.trim() || null
  const contactEmail =
    (athleteData.email || athleteData.contact_email || athleteData.email_address)?.trim() || null
  const showHeroContactRow =
    !!instagramUrl ||
    !!athlete?.flo_profile_url ||
    !!athlete?.track_wrestling_profile_url ||
    (canSeePrivateInfo && !!cellPhone) ||
    (canSeePrivateInfo && !!contactEmail) ||
    canEdit
  const openContactEditor = () => setEditingSection("contact")

  const renderHeroContactRow = (variant: "pills" | "buttons") => {
    if (!showHeroContactRow) return null
    const linkClass =
      variant === "pills"
        ? "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white"
        : "inline-flex items-center gap-2 rounded-lg bg-white/15 hover:bg-white/25 px-3 py-2 text-white text-sm font-medium transition-colors"
    const imgSize = variant === "pills" ? 16 : 20
    const phoneIconClass = variant === "pills" ? "h-4 w-4" : "h-5 w-5 flex-shrink-0"
    const mailIconClass = variant === "pills" ? "h-4 w-4" : "h-5 w-5 flex-shrink-0"

    return (
      <div
        className={
          variant === "pills"
            ? "mt-3.5 flex gap-2 overflow-x-auto scroll-table-x pb-0.5"
            : "flex flex-wrap items-center gap-2 mt-4"
        }
      >
        {instagramUrl && instagramLogo && (
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
            aria-label="Instagram"
          >
            <Image
              src={instagramLogo}
              alt={variant === "pills" ? "" : "Instagram"}
              width={imgSize}
              height={imgSize}
              className={variant === "pills" ? "h-4 w-4 object-contain" : "w-5 h-5 object-contain"}
            />
            <span>{variant === "pills" ? "IG" : "Instagram"}</span>
          </a>
        )}
        {canSeePrivateInfo && cellPhone && (
          <a
            href={`tel:${cellPhone.replace(/\D/g, "")}`}
            className={linkClass}
            aria-label="Call"
          >
            <Phone className={phoneIconClass} />
            <span>{cellPhone}</span>
          </a>
        )}
        {canSeePrivateInfo && contactEmail && (
          <a href={`mailto:${contactEmail}`} className={linkClass} aria-label="Email">
            <Mail className={mailIconClass} />
            <span>{variant === "pills" ? "Email" : contactEmail}</span>
          </a>
        )}
        {athlete?.flo_profile_url && floLogo && (
          <a
            href={athlete.flo_profile_url}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
            aria-label="Flo Wrestling"
          >
            <Image
              src={floLogo}
              alt={variant === "pills" ? "" : "Flo"}
              width={variant === "pills" ? 16 : 18}
              height={variant === "pills" ? 16 : 18}
              className={
                variant === "pills" ? "h-4 w-4 object-contain" : "w-[18px] h-[18px] object-contain"
              }
            />
            <span>Flo</span>
          </a>
        )}
        {athlete?.track_wrestling_profile_url && trackWrestlingLogo && (
          <a
            href={athlete.track_wrestling_profile_url}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
            aria-label="Track Wrestling"
          >
            <Image
              src={trackWrestlingLogo}
              alt={variant === "pills" ? "" : "Track"}
              width={variant === "pills" ? 16 : 18}
              height={variant === "pills" ? 16 : 18}
              className={
                variant === "pills" ? "h-4 w-4 object-contain" : "w-[18px] h-[18px] object-contain"
              }
            />
            <span>Track</span>
          </a>
        )}
        {canEdit && (
          <Button
            size="sm"
            variant="secondary"
            className={
              variant === "pills"
                ? "h-8 shrink-0 bg-white text-[#13294B] hover:bg-white/90 text-xs"
                : "bg-white text-[#13294B] hover:bg-white/90 shrink-0"
            }
            onClick={openContactEditor}
          >
            <Edit className="h-3.5 w-3.5 mr-1.5" />
            {cellPhone || contactEmail || instagramUrl ? "Edit contact" : "Add contact"}
          </Button>
        )}
      </div>
    )
  }

  const lastCompeted = profileWeightDisplay?.lastCompeted ?? null
  /*
   * The banner's facts: class, school, club, and the weight he last competed at (Matt, 10 October
   * 2026). The listed weight is gone from here - it sat beside "last competed" saying something
   * different a third of the time, and the one a coach wants is the one he actually made. It
   * shows only as a fallback, labelled as listed, when no result with a weight is on file.
   */
  const hasSchool = Boolean(highSchool && highSchool !== "Not specified")
  const hasClub = Boolean(wrestlingClub && wrestlingClub !== "Not specified")
  const bannerText = (text: string) => <span className="block text-base font-bold leading-tight lg:text-xl">{text}</span>
  const editWeight = canEdit ? (
    <button
      type="button"
      className="inline-flex items-center rounded p-0.5 text-white/60 hover:bg-white/10 hover:text-white"
      onClick={() => setEditingSection("weight")}
      aria-label="Edit weight"
    >
      <Edit className="h-3.5 w-3.5" />
    </button>
  ) : undefined
  // School, club and NC United team are edited together; the form opens under the banner.
  const editSchoolClub = canEdit ? (
    <button
      type="button"
      className="inline-flex items-center rounded p-0.5 text-white/60 hover:bg-white/10 hover:text-white"
      onClick={() => setEditingSection("school-club")}
      aria-label="Edit school and club"
    >
      <Edit className="h-3.5 w-3.5" />
    </button>
  ) : undefined
  const bannerStats: BannerStat[] = [
    { label: "Year", value: graduationYear || "—" },
    ...(hasSchool || canEdit ? [{ label: "School", value: bannerText(hasSchool ? highSchool : "—"), action: editSchoolClub }] : []),
    ...(hasClub ? [{ label: "Club", value: bannerText(wrestlingClub) }] : []),
    ...(ncUnitedTeam && ncUnitedTeam !== "none"
      ? [
          {
            label: "NC United",
            value: bannerText(ncUnitedTeam === "blue" ? "Blue Team" : ncUnitedTeam === "gold" ? "Gold Team" : ncUnitedTeam === "both" ? "Both Teams" : ncUnitedTeam),
          },
        ]
      : []),
    lastCompeted
      ? {
          label: "Last competed",
          value: <span className="text-lg font-bold lg:text-2xl">{lastCompeted.weight} lbs</span>,
          sub: `${lastCompeted.event} ${lastCompeted.year}`,
          // The owner still corrects the listed weight from here; it no longer shows.
          action: editWeight,
        }
      : {
          label: "Listed weight",
          value: weightClassLabel === "Not specified" ? "—" : `${weightClassLabel} lbs`,
          sub: "No competed weight on file",
          action: editWeight,
        },
  ]
  const bannerRibbon = prospectRanking
    ? `RecruitNC #${prospectRanking}  ·  Class of ${graduationYear || "—"}`
    : graduationYear
      ? `Class of ${graduationYear}`
      : null
  /*
   * Nationally ranked, beside the RecruitNC rank (Matt, 8 October 2026). Boys and girls alike: it is
   * the outlet's ranking, not ours, so it belongs on every profile that holds one.
   */
  const bannerNationalRanking = bannerNationalRankingLabel(
    ((athleteData as { national_rankings_current?: NationalRanking[] })?.national_rankings_current ?? []) as NationalRanking[],
  )
  const bannerCommitted =
    isCommittedStatus && college && college !== "Not specified" ? (
      <div className="flex items-center gap-3">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-white/30 bg-white">
          {collegeLogo ? <Image src={collegeLogo} alt={`${college} logo`} fill className="object-contain p-1.5" /> : null}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/60">Committed to</p>
          <p className="truncate text-lg font-bold text-white">{college}</p>
          {collegeTransferLabel ? <p className="text-xs text-white/55">{collegeTransferLabel}</p> : null}
        </div>
      </div>
    ) : null
  /*
   * Contact is its own row, not part of the banner (Matt, 10 October 2026: "we need a cleaner
   * banner up top"). The banner says who he is; how to reach him is one tap down, where the app
   * puts it too.
   */
  const contactButtons = showHeroContactRow ? (
    <div className="[&>div]:mt-0">{renderHeroContactRow("buttons")}</div>
  ) : null

  /*
   * The header, as the iPhone app draws it (Matt's mock, 10 October 2026): a small photo beside
   * the name, the ranking ribbons, then Class of and Last competed in one card. It replaces the
   * full-bleed banner at every width - that banner was most of a screen before a single result,
   * and the app says the same things in a fifth of the space. Sizes and colours are the app's
   * (recruitnc-mobile, src/app/(tabs)/athlete/[id].tsx) so the two read as one product.
   */
  const nameWords = athleteName.trim().split(/\s+/)
  const suffixWords = nameWords.length > 2 && /^(jr\.?|sr\.?|ii|iii|iv)$/i.test(nameWords[nameWords.length - 1]!) ? 2 : 1
  const firstNames = nameWords.slice(0, -suffixWords).join(" ")
  const lastNames = nameWords.slice(-suffixWords).join(" ")
  const schoolLine = [hasSchool ? highSchool : null, hasClub ? wrestlingClub : null].filter(Boolean).join(" · ")
  const ncUnitedLabel =
    ncUnitedTeam && ncUnitedTeam !== "none"
      ? ncUnitedTeam === "blue" ? "NC United Blue" : ncUnitedTeam === "gold" ? "NC United Gold" : ncUnitedTeam === "both" ? "NC United Blue & Gold" : `NC United ${ncUnitedTeam}`
      : null
  /*
   * Four things a coach looks for, in five equal parts: the photo and the school each count, so a
   * profile with both and a phone number reads 60% - enough to see there is more to add.
   */
  const completenessParts = [Boolean(athletePhoto), hasSchool, hasAcademicData, hasHighlightContent, Boolean(cellPhone || contactEmail)]
  const completeness = {
    percent: Math.round((completenessParts.filter(Boolean).length / completenessParts.length) * 100),
    items: [
      { label: "Photo and wrestling information", todo: "Add a photo and your school", done: Boolean(athletePhoto) && hasSchool, edit: athletePhoto ? "school-club" : "photo" },
      { label: "Academic information", todo: "Add academic information", done: hasAcademicData, edit: "academics" },
      { label: "Highlight reel", todo: "Add highlight reel", done: hasHighlightContent, edit: "highlight-video" },
      { label: "Contact information", todo: "Verify contact information", done: Boolean(cellPhone || contactEmail), edit: "contact" },
    ],
  }
  const isGirl = /^(f|female|girl)/i.test(String((athlete as { gender?: string | null }).gender ?? ""))
  const compactHero = (
    <div className="bg-[#0A1628] px-4 pb-4 pt-3 text-white lg:px-5 lg:pb-5">
      <div className="mb-2 flex items-center justify-end gap-2">
        {currentUserId && !canEdit ? (
          <button type="button" className={PHOTO_ACTION} onClick={() => setShowEditModal(true)} aria-label="Request edit">
            <Edit className="h-4 w-4" />
          </button>
        ) : null}
        <button type="button" className={PHOTO_ACTION} onClick={handleShareProfile} aria-label="Share profile">
          <Share2 className="h-4 w-4" />
        </button>
        <WatchListButton
          athleteId={athlete.id}
          compact
          className={cn(PHOTO_ACTION, "border-0 shadow-none data-[starred=false]:bg-black/40 data-[starred=false]:text-white")}
        />
      </div>
      <div className="flex items-center gap-3 lg:gap-5">
        <div className="relative h-[156px] w-[124px] shrink-0 overflow-hidden rounded-xl bg-[#0f1c2e] lg:h-[200px] lg:w-[160px]">
          {canEdit ? (
            <ImageUploadEditor athleteId={athlete.id} currentImageUrl={athletePhoto || undefined} onUpload={handleImageUpload} canEdit={canEdit} className="h-full w-full" />
          ) : (
            <Image
              src={athletePhoto || "/wrestler-silhouette.png"}
              alt={athleteName}
              fill
              className="object-cover object-top"
              sizes="160px"
              onError={() => setImageError(true)}
              priority
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#D3B574]">NC Wrestling</p>
          <h1 className="mt-1 uppercase text-white">
            {firstNames ? <span className="block text-[22px] font-medium leading-6 tracking-tight text-white/90 lg:text-3xl">{firstNames}</span> : null}
            <span className="block break-words text-[32px] font-black leading-[34px] tracking-tight lg:text-5xl">{lastNames}</span>
          </h1>
          {schoolLine || canEdit ? (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-[#A8BBD1]">
              <span className="min-w-0">{schoolLine || "Add school and club"}</span>
              {editSchoolClub}
            </p>
          ) : null}
          {ncUnitedLabel ? <p className="text-xs font-semibold text-[#A8BBD1]">{ncUnitedLabel}</p> : null}
          {isCommittedStatus && college && college !== "Not specified" ? (
            <p className="mt-1.5 flex items-center gap-2 text-sm text-white">
              {collegeLogo ? (
                <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-white">
                  <Image src={collegeLogo} alt="" fill className="object-contain p-0.5" />
                </span>
              ) : null}
              <span className="min-w-0">
                <span className="text-[#A8BBD1]">Committed to </span>
                <span className="font-bold">{college}</span>
                {collegeTransferLabel ? <span className="block text-xs text-white/55">{collegeTransferLabel}</span> : null}
              </span>
            </p>
          ) : null}
          {prospectRanking ? (
            <p className="mt-2 inline-block rounded-md bg-[#D3B574] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-[#0A1628]">
              RecruitNC #{prospectRanking}
            </p>
          ) : null}
        </div>
      </div>

      {bannerNationalRanking ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <NationalRankingRibbon label={bannerNationalRanking} />
        </div>
      ) : null}

      <div className="mt-3 flex rounded-xl border border-[#1a3a5f] bg-[#0f1c2e]">
        <div className="p-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#6B829D]">Class of</p>
          <p className="mt-1 text-[22px] font-black leading-none text-white">{graduationYear || "—"}</p>
        </div>
        <div className="min-w-0 flex-1 border-l border-[#1a3a5f] p-3">
          <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-[#6B829D]">
            {lastCompeted ? "Last competed" : "Listed weight"}
            {editWeight}
          </p>
          {lastCompeted ? (
            <>
              <p className="mt-1 text-[22px] font-black leading-none text-white">{lastCompeted.weight} lbs</p>
              <p className="mt-1 text-[11px] text-[#A8BBD1]">{[lastCompeted.event, lastCompeted.year].filter(Boolean).join(" · ")}</p>
            </>
          ) : (
            <>
              <p className="mt-1 text-[22px] font-black leading-none text-white">{weightClassLabel === "Not specified" ? "—" : `${weightClassLabel} lbs`}</p>
              <p className="mt-1 text-[11px] text-[#A8BBD1]">No results on file yet</p>
            </>
          )}
        </div>
      </div>

      {/* A recruiter's actions: the report, the comparison, a message. Nothing renders for most viewers. */}
      <div className="mt-3 flex flex-wrap items-center gap-2 empty:hidden">
        {canSeeScoutingReport ? <ScoutingReportAction href={`/athletes/${encodeURIComponent(String(athlete.id))}/scouting-report`} /> : null}
        {mayCompare ? <CompareAction athleteId={String(athlete.id)} /> : null}
        {!isViewingOwnProfile ? <CoachMessageButton athleteId={String(athlete.id)} athleteName={athleteName} variant="action" /> : null}
        {mayCompare ? <ProfileFitFlag athleteId={String(athlete.id)} className="inline-flex items-center" /> : null}
      </div>
    </div>
  )

  return (
    <div
      className={cn(
        mobileRecruiterLayout
          // One narrow column at every width, as on the phone: a profile is read, not scanned across.
          ? "mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-2.5"
          : "space-y-8 min-w-0 max-w-full",
        isDark && "profile-surface",
      )}
    >
      {/* 1. Banner (hero with photo, name, weight, college) */}
      <Card
        className={cn(
          "profile-card overflow-hidden",
          mobileRecruiterLayout && PROFILE_SECTION_ORDER.hero,
          // The card's own padding left an empty strip above the banner.
          mobileRecruiterLayout && "gap-0 py-0",
          mobileRecruiterLayout && "-mx-4 rounded-none border-x-0 border-t-0 lg:mx-0 lg:rounded-lg lg:border-x lg:border-t",
        )}
      >
        <div className="relative">
          {/* Mobile view */}
          <div className={mobileRecruiterLayout ? "block" : "block lg:hidden"}>
            {mobileRecruiterLayout ? (
              compactHero
            ) : (
              <>
            <div className="relative w-full bg-[#13294B]">
              {/* eslint-disable-next-line @next/next/no-img-element -- never crop mobile hero graphics */}
              <img
                src={athletePhoto || "/wrestler-silhouette.png"}
                alt={athleteName}
                className="mx-auto block h-auto w-auto max-h-[min(85vh,720px)] max-w-full"
                onError={() => setImageError(true)}
              />

              {/* Edit Button - Bottom Right of Photo */}
              {currentUserId && (
                <Button
                  size="sm"
                  className="absolute bottom-4 right-4 z-20 bg-white/90 hover:bg-white text-[#13294B] shadow-lg p-2 h-auto"
                  onClick={() => setShowEditModal(true)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="bg-gradient-to-r from-[#13294B] to-[#1e3a5f] text-white p-6 relative">
              {/* Share + Star - Top Right of Banner */}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white/90 hover:text-white hover:bg-white/20 h-9 px-3"
                  onClick={handleShareProfile}
                  aria-label="Share profile"
                >
                  <Share2 className="w-4 h-4 mr-1.5" />
                  Share
                </Button>
                <WatchListButton athleteId={athlete.id} />
              </div>

              <h1 className="text-3xl font-bold mb-3">{athleteName}</h1>

              {isCommittedStatus && college && college !== "Not specified" && (
                <div className="flex items-center gap-3 mb-4">
                  {collegeLogo ? (
                    <div className="relative h-14 w-14 rounded-full overflow-hidden border border-white/40 bg-white/90 shadow-lg">
                      <Image
                        src={collegeLogo}
                        alt={`${college} logo`}
                        fill
                        className="object-contain p-2"
                      />
                    </div>
                  ) : (
                    <div className="h-14 w-14 rounded-full border border-white/40 bg-white/20 flex items-center justify-center text-white text-lg font-semibold shadow-lg">
                      {college
                        .split(" ")
                        .slice(0, 2)
                        .map((word) => word[0]?.toUpperCase())
                        .join("") || "C"}
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Committed To</p>
                    <p className="text-lg font-bold text-white drop-shadow">
                      {college}
                    </p>
                    {collegeTransferLabel ? (
                      <p className="text-xs text-white/60 mt-0.5">{collegeTransferLabel}</p>
                    ) : null}
                  </div>
                </div>
              )}

              {prospectRanking && (
                <div className="mb-4">
                  <Badge className="bg-[#D3B574] text-[#13294B] px-3 py-1.5 text-sm font-bold">
                    RecruitNC #{prospectRanking} - Class of {graduationYear}
                  </Badge>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                  <p className="text-white/70 text-xs font-medium uppercase tracking-wide">Year</p>
                  <p className="text-xl font-bold">{graduationYear || "N/A"}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20 flex flex-col">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-white/70 text-xs font-medium uppercase tracking-wide">Weight</p>
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-white/80 hover:text-white hover:bg-white/20 -mr-1 -mt-0.5"
                        onClick={() => setEditingSection("weight")}
                        aria-label="Edit weight"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <p className="text-xl font-bold">
                    {weightClassLabel === "Not specified" ? weightClassLabel : `${weightClassLabel} lbs`}
                  </p>
                </div>
              </div>
              <CompetitionStrip competition={competition} className="mt-3" />

              {renderHeroContactRow("buttons")}
            </div>
              </>
            )}
          </div>

          {/* Desktop view */}
          <div className={mobileRecruiterLayout ? "hidden" : "hidden lg:block"}>
            {mobileRecruiterLayout ? (
              null
            ) : (
            <div className="relative min-h-[360px] bg-gradient-to-r from-[#13294B] to-[#1e3a5f]">
              <div className="absolute inset-0 bg-black/10" />

              {/* Share + Message + Star - Top Right */}
              <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white/90 hover:text-white hover:bg-white/20"
                  onClick={handleShareProfile}
                  aria-label="Share profile"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share profile
                </Button>
                <WatchListButton athleteId={athlete.id} />
              </div>

              <div className="relative z-10 flex items-start gap-8 p-8">
                <div className="flex-shrink-0 w-72 h-[360px]">
                  <div className="relative w-full h-full rounded-xl overflow-hidden border-4 border-white/30 shadow-2xl bg-[#13294B]">
                    {canEdit ? (
                      <ImageUploadEditor
                        athleteId={athlete.id}
                        currentImageUrl={athletePhoto || undefined}
                        onUpload={handleImageUpload}
                        canEdit={canEdit}
                        className="w-full h-full"
                      />
                    ) : (
                      <Image
                        src={athletePhoto || "/wrestler-silhouette.png"}
                        alt={athleteName}
                        fill
                        className="object-cover object-top"
                        sizes="320px"
                        onError={() => setImageError(true)}
                        priority
                      />
                    )}
                  </div>
                </div>

                <div className="flex-1 text-white pt-4">
                  <h1 className="text-5xl font-bold mb-4 text-white drop-shadow-lg">{athleteName}</h1>

                  {isCommittedStatus && college && college !== "Not specified" && (
                    <div className="flex items-center gap-4 mb-6">
                      {collegeLogo ? (
                        <div className="relative h-20 w-20 rounded-full overflow-hidden border-2 border-white/50 bg-white/95 shadow-xl">
                          <Image
                            src={collegeLogo}
                            alt={`${college} logo`}
                            fill
                            className="object-contain p-3"
                          />
                        </div>
                      ) : (
                        <div className="h-20 w-20 rounded-full border-2 border-white/40 bg-white/20 flex items-center justify-center text-white text-2xl font-semibold shadow-xl">
                          {college
                            .split(" ")
                            .slice(0, 2)
                            .map((word) => word[0]?.toUpperCase())
                            .join("") || "C"}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-widest text-white/70">Committed To</p>
                        <p className="text-3xl font-bold text-white drop-shadow-lg leading-tight">{college}</p>
                        {collegeTransferLabel ? (
                          <p className="text-sm text-white/60 mt-1">{collegeTransferLabel}</p>
                        ) : null}
                      </div>
                    </div>
                  )}

                  {prospectRanking && (
                    <Badge className="bg-[#D3B574] text-[#13294B] px-4 py-2 text-base font-bold shadow-lg mb-4">
                      RecruitNC #{prospectRanking} - Class of {graduationYear}
                    </Badge>
                  )}

                  <div className="grid grid-cols-2 gap-4 max-w-md">
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                      <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-1">Year</p>
                      <p className="text-2xl font-bold text-white">{graduationYear || "N/A"}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20 flex flex-col">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">Weight</p>
                        {canEdit && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-white/80 hover:text-white hover:bg-white/20 -mr-1"
                            onClick={() => setEditingSection("weight")}
                            aria-label="Edit weight"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        )}
                      </div>
                      <p className="text-2xl font-bold text-white">
                        {weightClassLabel === "Not specified" ? weightClassLabel : `${weightClassLabel} lbs`}
                      </p>
                      {weightSubline ? (
                        <p className="mt-0.5 text-xs leading-snug text-white/65">{weightSubline}</p>
                      ) : null}
                    </div>
                  </div>
                  <CompetitionStrip competition={competition} className="mt-4 max-w-md" />

                  {renderHeroContactRow("buttons")}
                </div>
              </div>
            </div>
            )}
          </div>
        </div>
      </Card>

      {/* The rows. Written here, ahead of every section, so each header comes before the sections
          that share its order. */}
      {canViewProfileStats && athlete.id ? (
        <ProfileRow
          icon={Eye}
          title="Profile Views"
          summary="Who is looking at this profile, and which college programs"
          open={openRows.has("views")}
          onToggle={() => toggleRow("views")}
          className={ROW_ORDER.views}
        />
      ) : null}
      <AppTournamentResults
        profile={appData.profile}
        loaded={appData.loaded}
        isGirl={isGirl}
        fallbackLine={credentials.length ? credentials.slice(0, 2).map((c) => c.label).join(" · ") : null}
        // The website's own: a family can send in a tournament we do not carry.
        footer={<TournamentResultSubmissionDialog athleteId={String(athlete.id)} />}
        className={ROW_ORDER.results}
      />
      <AppSignificantWins
        wins={appData.wins}
        loaded={appData.winsLoaded}
        footer={<SignificantWinSubmissionDialog athleteId={String(athlete.id)} />}
        className={ROW_ORDER.wins}
      />
      <AppNotableLosses losses={appData.losses} loaded={appData.winsLoaded} className={ROW_ORDER.losses} />
      {canSeeScoutingReport ? (
        <AppRow
          icon={FileText}
          title="Scouting Report"
          subtitle="Evaluation, record and competition, in full"
          href={`/athletes/${encodeURIComponent(String(athlete.id))}/scouting-report`}
          className={ROW_ORDER.scouting}
        />
      ) : null}
      <ProfileRow
        icon={ListOrdered}
        title="In-Season Match Log"
        summary="Every high school bout on file, season by season"
        open={openRows.has("season")}
        onToggle={() => toggleRow("season")}
        className={ROW_ORDER.season}
      />
      {hasAcademicData || canEdit ? (
        <ProfileRow
          icon={GraduationCap}
          title="Academic Information"
          summary={
            !hasAcademicData
              ? "Not on file yet"
              : canSeePrivateInfo
                ? [effectiveGpa ? `GPA ${effectiveGpa}` : null, effectiveSat ? `SAT ${effectiveSat}` : null, effectiveAct ? `ACT ${effectiveAct}` : null].filter(Boolean).join(" · ")
                : "Visible to approved college coaches"
          }
          locked={hasAcademicData && !canSeePrivateInfo}
          open={openRows.has("academics")}
          onToggle={() => toggleRow("academics")}
          className={ROW_ORDER.academics}
        />
      ) : null}
      {/* Messaging, as a row of its own (Matt, 10 October 2026). College coaches get the row that
          writes to the family; it renders nothing for anyone else. An admin sees it locked, so
          it is clear the row exists and who it is for. */}
      {!isViewingOwnProfile ? (
        <CoachMessageButton athleteId={String(athlete.id)} athleteName={athleteName} variant="row" className={ROW_ORDER.contact} />
      ) : null}
      {isAdmin && !isViewingOwnProfile ? (
        <AppRow
          icon={MessageSquare}
          title="Messages"
          subtitle="College coaches message the family from here. Admins do not start conversations."
          locked
          className={ROW_ORDER.contact}
        />
      ) : null}
      {/* Contact, and messaging with it: a coach looking for how to reach a wrestler looks here. */}
      {contactButtons || ((isVerifiedCoach || isAdmin) && !isViewingOwnProfile) ? (
        <>
          <ProfileRow
            icon={Phone}
            title="Contact Information"
            summary={
              // Admins hold the coach flag too but do not message, so they get the plain line.
              isVerifiedCoach && !isAdmin && !isViewingOwnProfile
                ? canSeePrivateInfo && (cellPhone || contactEmail)
                  ? "Message, call or text the athlete"
                  : "Message the athlete"
                : canSeePrivateInfo && (cellPhone || contactEmail)
                  ? "Call, text or email the athlete"
                  : "Instagram and wrestling profile links"
            }
            open={openRows.has("contact")}
            onToggle={() => toggleRow("contact")}
            className={ROW_ORDER.contact}
          />
          {/* On the banner's navy whatever the theme: the buttons are drawn for a dark ground. */}
          <div className={cn("flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-[#0A1628] p-4 lg:p-6", inRow("contact"))}>
            {/* College coaches only; the button renders nothing for anyone else. */}
            {!isViewingOwnProfile ? (
              <CoachMessageButton athleteId={String(athlete.id)} athleteName={athleteName} variant="action" className="min-h-[44px]" />
            ) : null}
            {contactButtons}
            {isAdmin && !isViewingOwnProfile ? (
              <p className="w-full text-xs text-white/50">College coaches see a Message button here. Admins do not start conversations.</p>
            ) : null}
          </div>
        </>
      ) : null}
      {hasHighlightContent || canEdit ? (
        <ProfileRow
          icon={Video}
          title="Highlight Reel"
          summary={hasHighlightContent ? "Watch the film" : "No video yet"}
          open={openRows.has("film")}
          onToggle={() => toggleRow("film")}
          className={ROW_ORDER.film}
        />
      ) : null}
      {hasBioContent || hasCollegeOpensContent || hasOtherHonoursContent || canEdit ? (
        <ProfileRow
          icon={UserRound}
          title="About"
          summary={[hasBioContent ? "Bio" : null, hasCollegeOpensContent ? "College open experience" : null, hasOtherHonoursContent ? "Other honours" : null].filter(Boolean).join(" · ") || "Nothing added yet"}
          open={openRows.has("about")}
          onToggle={() => toggleRow("about")}
          className={ROW_ORDER.about}
        />
      ) : null}
      {mayCompare ? (
        <ProfileRow
          icon={ArrowLeftRight}
          title="Compare"
          summary="Head to head, common opponents and similar wrestlers"
          open={openRows.has("compare")}
          onToggle={() => toggleRow("compare")}
          className={ROW_ORDER.compare}
        />
      ) : null}

      {/* Who is recruiting this wrestler. Renders nothing unless the viewer is the athlete,
          a linked parent, or an admin — the endpoint refuses everybody else. */}
      {/* empty:hidden - the panel renders nothing for most viewers, and an empty wrapper still
          takes a gap, which left the space under the banner looking unfinished. */}
      <div className={cn("px-1 empty:hidden", mobileRecruiterLayout && PROFILE_SECTION_ORDER.panels)}>
        <CollegeViewsLanding athleteName={athleteName} signedIn={Boolean(currentUserId)} canSeePanel={canViewProfileStats} />
      </div>
      {/* One "who's viewing you" panel: the counts, then the college programs and the subscription
          that names them. It was two - the programs up here, the counts far down the page. */}
      <div id="college-views" className={cn("scroll-mt-24 px-1 empty:hidden", mobileRecruiterLayout && PROFILE_SECTION_ORDER.panels, inRow("views"))}>
        {canViewProfileStats && athlete.id ? (
          <ProfileViewStatsPanel athleteId={athlete.id} adminView={isAdmin && !isViewingOwnProfile}>
            <CoachViewsPanel athleteId={String(athlete.id)} embedded />
          </ProfileViewStatsPanel>
        ) : null}
      </div>

      {/* Coaches who messaged this wrestler. Renders only for the wrestler and linked parents
          (the list endpoint returns nothing to anyone else) and only once a coach has written. */}
      <div className={cn("empty:hidden", mobileRecruiterLayout && PROFILE_SECTION_ORDER.panels, ROW_ORDER.contact)}>
        <FamilyMessagesPanel athleteId={String(athlete.id)} />
      </div>

      {/* Recruiters want one page they can take into a staff meeting. Coaches only — the
          report pulls academics and results together in a way the public profile does not. */}
      {/* Recruiters' two actions: the one-page report and, for college coaches, a message. */}
      {!mobileRecruiterLayout && (canSeeScoutingReport || !isViewingOwnProfile) && (
        <div className="flex flex-wrap items-center gap-2 px-1 empty:hidden">
          {canSeeScoutingReport ? (
          <a
            href={`/athletes/${encodeURIComponent(String(athlete.id))}/scouting-report`}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[#D3B574] bg-[#D3B574]/10 px-4 py-2 text-sm font-semibold text-[#D3B574] transition-colors hover:bg-[#D3B574]/20"
          >
            <FileText className="h-4 w-4" />
            Scouting report (PDF)
          </a>
          ) : null}
          {mayCompare ? <CompareAction athleteId={String(athlete.id)} className="min-h-[44px]" /> : null}
          {mayCompare ? <ProfileFitFlag athleteId={String(athlete.id)} className="inline-flex items-center" /> : null}
          {!isViewingOwnProfile ? (
            <CoachMessageButton athleteId={String(athlete.id)} athleteName={athleteName} variant="action" className="min-h-[44px]" />
          ) : null}
        </div>
      )}

      {/* Athletes create their own profiles, so a parent never fills in a form — the only
          thing they need is to tie their account to a profile that already exists, and this
          is where they will be when they want that. Hides itself when signed out, when this
          is the viewer's own profile, or when the link already exists. */}
      {/*
        Unclaimed: ask whose profile it is. Claimed: a parent can still link to their kid,
        which is what ParentLinkButton is for — the two never show at once.

        Gated on ownership, not on canEdit. canEdit used to be true for ANY signed-in user, so
        this whole block only ever rendered for signed-out visitors: a parent who made an account,
        searched for their wrestler and landed here saw no way to claim the profile at all.
        273 of 404 profiles have no owner, and three quarters of the ranked ones do not — this
        is the door they were looking for. Admins are excluded so nobody claims a profile by
        reflex while checking somebody else's page.
      */}
      {!isViewingOwnProfile && !isAdmin && (
        <div className={cn("px-1 empty:hidden", mobileRecruiterLayout && PROFILE_SECTION_ORDER.claim)}>
          {athlete.claimed_by_user_id ? (
            <ParentLinkButton athleteId={String(athlete.id)} athleteName={athleteName} />
          ) : (
            <ClaimProfileButton
              athleteId={String(athlete.id)}
              athleteName={athleteName}
              claimedByUserId={athlete.claimed_by_user_id}
            />
          )}
        </div>
      )}

      {/*
        Owner toolbar. Matt: if someone owns the profile, make it obvious they can edit it. The
        section "Edit" buttons were small ghost links in each header, and the phone banner had no
        way to change the photo at all; this puts every editor one tap from the top.
      */}
      {canEdit && mobileRecruiterLayout ? (
        <div
          className={cn(
            "rounded-xl border border-[#D3B574]/50 bg-gradient-to-r from-[#D3B574]/15 to-[#D3B574]/5 p-4 lg:p-5",
            PROFILE_SECTION_ORDER.panels,
          )}
        >
          {/* Profile completeness (Matt's mock, 10 October 2026): what is done, what is left, and
              one button to the editors. Each open item is a tap to its own form. */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-base font-bold text-white">Profile Completeness</p>
                <p className="text-base font-black text-white">{completeness.percent}%</p>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full border border-white/15 bg-[#0A1628]">
                <div className="h-full rounded-full bg-[#D3B574]" style={{ width: `${completeness.percent}%` }} />
              </div>
              <p className="mt-2 text-sm text-white/70">
                {completeness.percent === 100
                  ? "Your profile is complete. Keep it current: college coaches read this page."
                  : "Complete your profile to get more views from college coaches."}
              </p>
            </div>
            <ul className="space-y-1.5 lg:w-64">
              {completeness.items.map((item) => (
                <li key={item.label}>
                  <button
                    type="button"
                    disabled={item.done}
                    onClick={() => {
                      setEditingSection(item.edit)
                      window.setTimeout(() => document.querySelector<HTMLElement>("[data-owner-editor], [data-section=academics], #highlights")?.scrollIntoView({ behavior: "smooth", block: "center" }), 80)
                    }}
                    className={cn("flex items-center gap-2 text-left text-sm", item.done ? "text-white" : "text-white/80 hover:text-[#D3B574]")}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                        item.done ? "border-[#D3B574] bg-[#D3B574] text-[#0A1628]" : "border-white/50",
                      )}
                      aria-hidden
                    >
                      {item.done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
                    </span>
                    {item.done ? item.label : item.todo}
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setShowEditors((v) => !v)}
              aria-expanded={showEditors}
              className="shrink-0 rounded-lg bg-[#D3B574] px-5 py-3 text-sm font-bold text-[#0A1628] hover:bg-[#c4a665]"
            >
              Edit Profile
            </button>
          </div>
          <div className={cn("mt-4 flex flex-wrap gap-2", !showEditors && "hidden")}>
            {(
              [
                { key: "photo", label: "Photo", icon: Camera, target: null },
                { key: "weight", label: "Weight", icon: Scale, target: null },
                { key: "bio", label: "Bio", icon: FileText, target: "bio" },
                { key: "contact", label: "Contact", icon: Phone, target: null },
                { key: "highlight-video", label: "Video", icon: Video, target: "highlights" },
                { key: "school-club", label: "School & club", icon: School, target: "programs" },
                { key: "academics", label: "Academics", icon: GraduationCap, target: "[data-section=academics]" },
              ] as const
            ).map(({ key, label, icon: Icon, target }) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  if (key === "bio") setBioExpanded(true)
                  setEditingSection(key)
                  // Forms for photo, weight and contact open just below this bar; the rest open in
                  // their own section, so take the owner there.
                  window.setTimeout(() => {
                    const el = target
                      ? document.querySelector<HTMLElement>(target.startsWith("[") ? target : `#${target}`)
                      : document.querySelector<HTMLElement>("[data-owner-editor]")
                    el?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }, 50)
                }}
                className={cn(
                  "inline-flex min-h-[40px] items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-semibold transition-colors",
                  editingSection === key
                    ? "border-[#D3B574] bg-[#D3B574] text-[#0A1628]"
                    : "border-white/20 bg-white/10 text-white hover:bg-white/20",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {canEdit && editingSection === "photo" && (
        <Card
          data-owner-editor
          className={cn("profile-card border-t-4 border-t-[#D3B574] shadow-md", mobileRecruiterLayout && PROFILE_SECTION_ORDER.weightEdit)}
        >
          <div className="bg-gradient-to-r from-[#13294B] to-[#1e3a5f] p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-bold text-white">Profile photo</h2>
              <Button size="sm" variant="ghost" className="text-white hover:bg-white/20" onClick={() => setEditingSection(null)}>
                Done
              </Button>
            </div>
          </div>
          <div className="profile-card-body p-6">
            <p className="mb-4 text-sm text-muted-foreground">
              Use a clear action or portrait photo with no text or app overlays on it.
            </p>
            <div className="relative mx-auto aspect-[4/5] w-full max-w-xs overflow-hidden rounded-xl">
              <ImageUploadEditor
                athleteId={athlete.id}
                currentImageUrl={athletePhoto || undefined}
                onUpload={handleImageUpload}
                canEdit={canEdit}
                className="h-full w-full"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Weight / contact edit forms (opened from hero) */}
      {canEdit && editingSection === "weight" && (
        <Card
          data-owner-editor
          className={cn(
            "profile-card border-t-4 border-t-[#D3B574] shadow-md",
            mobileRecruiterLayout && PROFILE_SECTION_ORDER.weightEdit,
          )}
        >
          <div className="bg-gradient-to-r from-[#13294B] to-[#1e3a5f] p-6">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-white">Weight Class</h2>
            </div>
          </div>
          <div className="profile-card-body p-8">
            <InlineWeightEditor
              athleteId={athlete.id}
              weightClass={athleteData.weightclass || athleteData.weight_class}
              gender={athleteData.gender}
              onSave={handleInlineSave}
              onCancel={() => setEditingSection(null)}
            />
          </div>
        </Card>
      )}

      {canEdit && editingSection === "contact" && (
        <Card
          data-owner-editor
          className={cn(
            "profile-card border-t-4 border-t-[#D3B574] shadow-md",
            mobileRecruiterLayout && PROFILE_SECTION_ORDER.weightEdit,
          )}
          data-section="contact"
        >
          <div className="bg-gradient-to-r from-[#13294B] to-[#1e3a5f] p-6">
            <div className="flex items-center gap-3">
              <Phone className="h-6 w-6 text-white" />
              <h2 className="text-2xl font-bold text-white">Edit Contact</h2>
            </div>
          </div>
          <div className="profile-card-body p-8">
            <InlineContactEditor
              athleteId={athlete.id}
              cell={athleteData.cell || athleteData.cell_number || athleteData.phone}
              email={athleteData.email || athleteData.contact_email || athleteData.email_address}
              instagram={athleteData.instagram || athleteData.instagram_handle || athleteData.instagram_username}
              highlightVideoUrl={athleteData.highlight_video_url}
              onSave={handleInlineSave}
              onCancel={() => setEditingSection(null)}
            />
          </div>
        </Card>
      )}

      {/* Profile owner or admin — the API enforces the same rule server-side, and the
          panel renders nothing until there are views worth reporting. */}

      {/* Athlete Profile (Bio) — after the jump links, as a three-line preview with "Read full
          profile". Every sibling now carries an order class, so this one can too. */}
      {SHOW_ATHLETE_BIO_SECTION && (hasBioContent || canEdit) ? (
      <Card
        id="bio"
        className={cn("profile-card border-t-4 border-t-[#D3B574] shadow-md", mobileRecruiterLayout && PROFILE_SECTION_ORDER.bio, inRow("about"))}
        data-section="bio"
      >
        <div className={cn(mobileRecruiterLayout ? PROFILE_SECTION_HEADER : "bg-gradient-to-r from-[#13294B] to-[#1e3a5f] p-6")}>
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
                aria-expanded={bioExpanded || editingSection === "bio"}
                aria-controls={`athlete-bio-${athlete.id}`}
                disabled={editingSection === "bio"}
                onClick={() => setBioExpanded((expanded) => !expanded)}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <TrendingUp className={cn("text-white", mobileRecruiterLayout ? "h-5 w-5" : "h-6 w-6")} />
                  <span className={cn(mobileRecruiterLayout ? PROFILE_SECTION_TITLE : "text-2xl font-bold text-white")}>
                    Athlete Profile
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/65">
                  <span className="hidden sm:inline">
                    {bioExpanded || editingSection === "bio" ? "Hide" : "View"}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 transition-transform",
                      (bioExpanded || editingSection === "bio") && "rotate-180",
                    )}
                    aria-hidden="true"
                  />
                </span>
              </button>
              {canEdit && !editingSection && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                  onClick={() => {
                    setBioExpanded(true)
                    setEditingSection("bio")
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>
          <div
            id={`athlete-bio-${athlete.id}`}
            hidden={!mobileRecruiterLayout && !bioExpanded && editingSection !== "bio"}
            className={cn(mobileRecruiterLayout ? PROFILE_CARD_BODY : "profile-card-body p-8")}
          >
            {editingSection === "bio" ? (
              <InlineBioEditor
                athleteId={athlete.id}
                bio={athleteData.bio}
                bioHeadline={athleteData.bio_headline}
                onSave={handleInlineSave}
                onCancel={() => setEditingSection(null)}
              />
            ) : (
              <>
                <div className="mb-4">
                  <div className="flex-1">
                    {athleteData?.bio_headline && (
                      <h3 className={cn("profile-headline font-semibold text-primary leading-relaxed", mobileRecruiterLayout ? "text-base lg:text-lg mb-3" : "text-xl mb-4")}>{athleteData.bio_headline}</h3>
                    )}
                  </div>
                </div>
                {athleteData?.bio ? (
                  <div className={cn(!mobileRecruiterLayout && "profile-panel bg-card rounded-lg p-6 shadow-sm border border-border")}>
                    <p
                      className={cn(
                        "text-base text-foreground/80 leading-relaxed whitespace-pre-wrap",
                        mobileRecruiterLayout && !bioExpanded && "line-clamp-3",
                      )}
                    >
                      {athleteData.bio}
                    </p>
                    {mobileRecruiterLayout ? (
                      <button
                        type="button"
                        className="mt-3 text-sm font-semibold text-[#D3B574] hover:underline"
                        aria-expanded={bioExpanded}
                        onClick={() => setBioExpanded((v) => !v)}
                      >
                        {bioExpanded ? "Show less" : "Read full profile"}
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <p className="profile-text-muted text-muted-foreground italic">{canEdit ? "No bio yet. Click Edit to add." : "No bio available."}</p>
                )}
              </>
            )}
          </div>
        </Card>
      ) : null}

      {/* School and club live in the banner now (Matt, 10 October 2026). This card is only the
          form for changing them, shown while the owner is editing and up with the other edit forms. */}
      {editingSection === "school-club" ? (
      <Card
        id="programs"
        className={cn(
          "profile-card border-t-4 border-t-[#D3B574] shadow-md",
          mobileRecruiterLayout && PROFILE_SECTION_ORDER.weightEdit,
        )}
        data-section="programs"
      >
          <div className={cn(mobileRecruiterLayout ? PROFILE_SECTION_HEADER : "bg-gradient-to-r from-[#13294B] to-[#1e3a5f] p-6")}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <GraduationCap className={cn("text-white", mobileRecruiterLayout ? "h-5 w-5" : "h-6 w-6")} />
                <h2 className={cn(mobileRecruiterLayout ? PROFILE_SECTION_TITLE : "text-2xl font-bold text-white")}>
                  {mobileRecruiterLayout ? (
                    <>
                      <span className="lg:hidden">School & Programs</span>
                      <span className="hidden lg:inline">High School and Programs</span>
                    </>
                  ) : (
                    "High School and Programs"
                  )}
                </h2>
              </div>
              {canEdit && !editingSection && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                  onClick={() => setEditingSection("school-club")}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>
          <div className={cn(mobileRecruiterLayout ? PROFILE_CARD_BODY : "profile-card-body p-8")}>
            {editingSection === "school-club" ? (
              <InlineSchoolClubEditor
                athleteId={athlete.id}
                highSchool={athleteData.highschool || athleteData.high_school}
                wrestlingClub={athleteData.wrestlingclub || athleteData.wrestlingClub}
                ncUnitedTeam={athleteData.ncUnitedTeam || athleteData.ncunitedteam}
                onSave={handleInlineSave}
                onCancel={() => setEditingSection(null)}
              />
            ) : (
              <div
                className={cn(
                  "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
                  mobileRecruiterLayout ? "grid-cols-2 gap-3 lg:gap-6" : "gap-6",
                )}
              >
                {highSchool && highSchool !== "Not specified" && (
                  <div className="profile-panel bg-card rounded-xl p-4 lg:p-6 shadow-sm border border-border hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 lg:w-16 lg:h-16 rounded-lg bg-muted p-1.5 lg:p-2 flex items-center justify-center mb-2 lg:mb-3 border border-border overflow-hidden">
                      {highSchoolLogo && !highSchoolLogoLoadError ? (
                        <Image
                          src={highSchoolLogo}
                          alt=""
                          width={48}
                          height={48}
                          className="object-contain"
                          unoptimized={highSchoolLogo.startsWith("http")}
                          onError={() => setHighSchoolLogoLoadError(true)}
                        />
                      ) : (
                        <WorkingEntityLogo entityName={highSchool} entityType="highschool" size={48} />
                      )}
                    </div>
                    <p className="profile-label text-[10px] lg:text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1 lg:mb-2">High School</p>
                    <p className="profile-text text-base lg:text-xl font-bold text-foreground leading-tight">{highSchool}</p>
                  </div>
                )}
                {wrestlingClub && wrestlingClub !== "Not specified" && (
                  <div className="profile-panel bg-card rounded-xl p-4 lg:p-6 shadow-sm border border-border hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 lg:w-16 lg:h-16 rounded-lg bg-muted p-1.5 lg:p-2 flex items-center justify-center mb-2 lg:mb-3 border border-border overflow-hidden">
                      {clubLogo && !clubLogoLoadError ? (
                        <Image
                          src={clubLogo}
                          alt=""
                          width={48}
                          height={48}
                          className="object-contain"
                          unoptimized={clubLogo.startsWith("http")}
                          onError={() => setClubLogoLoadError(true)}
                        />
                      ) : (
                        <WorkingEntityLogo entityName={wrestlingClub} entityType="club" size={48} />
                      )}
                    </div>
                    <p className="profile-label text-[10px] lg:text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1 lg:mb-2">Wrestling Club</p>
                    <p className="profile-text text-base lg:text-xl font-bold text-foreground leading-tight">{wrestlingClub}</p>
                  </div>
                )}
                {ncUnitedTeam && ncUnitedTeam !== "none" && (
                  <div className="profile-panel bg-card rounded-xl p-4 lg:p-6 shadow-sm border border-border hover:shadow-md transition-shadow col-span-2 lg:col-span-1">
                    <div className="w-10 h-10 lg:w-16 lg:h-16 rounded-lg bg-muted p-1.5 lg:p-2 flex items-center justify-center mb-2 lg:mb-3 border border-border">
                      <Image
                        src="/nc-united-blue-logo.png"
                        alt="NC United logo"
                        width={48}
                        height={48}
                        className="object-contain"
                      />
                    </div>
                    <p className="profile-label text-[10px] lg:text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1 lg:mb-2">NC United Program</p>
                    <p className="profile-text text-base lg:text-xl font-bold text-foreground leading-tight">
                      {ncUnitedTeam === "blue" ? "Blue Team" : ncUnitedTeam === "gold" ? "Gold Team" : ncUnitedTeam === "both" ? "Both Teams" : ncUnitedTeam}
                    </p>
                  </div>
                )}
                {(!highSchool || highSchool === "Not specified") && (!wrestlingClub || wrestlingClub === "Not specified") && (!ncUnitedTeam || ncUnitedTeam === "none") && (
                  <p className="profile-text-muted text-muted-foreground italic col-span-full">{canEdit ? "No school or programs listed. Click Edit to add." : "No school or programs listed."}</p>
                )}
              </div>
            )}
          </div>
        </Card>
      ) : null}

      {/* Tournament results, significant wins and notable losses are the app's rows above
          (components/profile/app-profile-rows.tsx); the old full-width cards are gone. */}

      {/* 10. High School Career Match Results */}
      <div
        /** MatchDataSectionImproved takes its own theme prop; it needs no override hook. */
        className={cn("min-w-0 max-w-full w-full", mobileRecruiterLayout && PROFILE_SECTION_ORDER.inSeason, inRow("season"))}
      >
        <MatchDataSectionImproved
          athleteId={athlete.id}
          athleteName={athleteName}
          graduationYear={graduationYear}
          theme={isDark ? "dark" : "light"}
          // The row above is the collapse now; a second one inside it was a tap for nothing.
          collapseOnMobile={false}
        />
      </div>


      {/* 5. Academics - always show for consistent structure */}
      {hasAcademicData || canEdit ? (
      <Card
        className={cn(
          "profile-card border-t-4 border-t-[#D3B574] shadow-md",
          mobileRecruiterLayout && PROFILE_SECTION_ORDER.academics,
          inRow("academics"),
        )}
        data-section="academics"
      >
        <div className="bg-gradient-to-r from-[#13294B] to-[#1e3a5f] p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <GraduationCap className="h-6 w-6 text-white" />
                <h2 className="text-2xl font-bold text-white">Academics</h2>
              </div>
              {canEdit && !editingSection && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                  onClick={() => setEditingSection("academics")}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>
          <div className="profile-card-body p-8">
            {editingSection === "academics" ? (
              <InlineAcademicsEditor
                athleteId={athlete.id}
                gpa={effectiveGpa}
                sat={effectiveSat}
                act={effectiveAct}
                academicInterest={athleteData?.academic_interest}
                onSave={handleInlineSave}
                onCancel={() => setEditingSection(null)}
              />
            ) : (
              <>
                {canSeePrivateInfo && hasAcademicData && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {effectiveGpa != null && (
                      <div className="bg-muted rounded-lg p-6 border border-border">
                        <p className="text-sm text-muted-foreground font-semibold uppercase tracking-wider mb-2">GPA</p>
                        <p className="text-4xl font-bold text-foreground">
                          {Number(effectiveGpa).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">Grade Point Average</p>
                      </div>
                    )}
                    {effectiveSat != null && (
                      <div className="bg-muted rounded-lg p-6 border border-border">
                        <p className="text-sm text-muted-foreground font-semibold uppercase tracking-wider mb-2">SAT</p>
                        <p className="text-4xl font-bold text-foreground">{effectiveSat}</p>
                        <p className="text-xs text-muted-foreground mt-2">Standardized Test Score</p>
                      </div>
                    )}
                    {effectiveAct != null && (
                      <div className="bg-muted rounded-lg p-6 border border-border">
                        <p className="text-sm text-muted-foreground font-semibold uppercase tracking-wider mb-2">ACT</p>
                        <p className="text-4xl font-bold text-foreground">{effectiveAct}</p>
                        <p className="text-xs text-muted-foreground mt-2">Standardized Test Score</p>
                      </div>
                    )}
                  </div>
                )}
                {(athleteData?.academic_summary || athleteData?.academic_interest) && canSeePrivateInfo && (
                  <div className="mt-4 space-y-2">
                    {athleteData.academic_summary && (
                      <p className="text-sm text-foreground/80">{athleteData.academic_summary}</p>
                    )}
                    {athleteData.academic_interest && (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Academic Interest:</span> {athleteData.academic_interest}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
            {!canSeePrivateInfo && hasAcademicData && (
              <div className="bg-muted border border-border rounded-lg p-6">
                <p className="text-sm text-primary text-center">
                  📊 GPA, SAT, and ACT are only visible to you (when signed in as this athlete), verified college coaches, and administrators.
                </p>
              </div>
            )}
          </div>
        </Card>
      ) : null}

      {/* 7. Highlight Reel - always show for consistent structure */}
      {hasHighlightContent || canEdit ? (
      <Card
        id="highlights"
        className={cn(
          "profile-card border-t-4 border-t-[#D3B574] shadow-md",
          mobileRecruiterLayout && PROFILE_SECTION_ORDER.highlights,
          inRow("film"),
        )}
        data-section="highlights"
      >
        <div className={cn(mobileRecruiterLayout ? PROFILE_SECTION_HEADER : "bg-gradient-to-r from-[#13294B] to-[#1e3a5f] p-6")}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Video className={cn("text-white", mobileRecruiterLayout ? "h-5 w-5" : "h-6 w-6")} />
                <h2 className={cn(mobileRecruiterLayout ? PROFILE_SECTION_TITLE : "text-2xl font-bold text-white")}>Highlight Reel</h2>
              </div>
              {canEdit && !editingSection && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                  onClick={() => setEditingSection("highlight-video")}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {athleteData?.highlight_video_url ? "Update video" : "Add video"}
                </Button>
              )}
            </div>
          </div>
          {/* Capped on desktop: a full-width player filled the screen and buried the results. */}
          <div className={cn(mobileRecruiterLayout ? cn(PROFILE_CARD_BODY, "[&>*]:mx-auto [&>*]:max-w-3xl") : "profile-card-body p-8")}>
            {editingSection === "highlight-video" ? (
              <InlineHighlightVideoEditor
                athleteId={athlete.id}
                highlightVideoUrl={athleteData.highlight_video_url}
                onSave={handleInlineSave}
                onCancel={() => setEditingSection(null)}
              />
            ) : athleteData?.highlight_video_url ? (
              (() => {
                const url = athleteData.highlight_video_url
                const videoId = getYouTubeVideoId(url)
                if (isDirectHighlightVideoUrl(url)) {
                  return renderDirectHighlightVideo(
                    url,
                    `${athleteData.name ?? "Athlete"} highlight reel`
                  )
                }
                if (!videoId) {
                  return (
                    <p className="text-muted-foreground">
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        Watch video
                      </a>
                      {canEdit && " — Use Edit to replace with a valid YouTube link for embedding."}
                    </p>
                  )
                }
                return (
                  <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                    <iframe
                      src={`https://www.youtube.com/embed/${videoId}`}
                      title="Wrestling Highlight Video"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute top-0 left-0 w-full h-full rounded-lg shadow-lg"
                      style={{ border: "none" }}
                    />
                  </div>
                )
              })()
            ) : nationalTeamHighlightVideos.length > 0 ? (
              <div className="space-y-6">
                {nationalTeamHighlightVideos.map((highlight) => (
                  <div key={`${highlight.event}-${highlight.year}-${highlight.videoSrc}`}>
                    <p className={"text-sm font-semibold mb-3 text-foreground/80"}>
                      {highlight.event} {highlight.year}
                    </p>
                    {renderDirectHighlightVideo(highlight.videoSrc, highlight.ariaLabel)}
                    <p className={"mt-2 text-sm text-muted-foreground"}>{highlight.title}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">
                {canEdit ? "Add a YouTube highlight video or upload a video file via admin. Click the button above to paste your link." : "No highlight video yet."}
              </p>
            )}
            {athleteData?.highlight_video_url && nationalTeamHighlightVideos.length > 0 ? (
              <div
                className={cn(
                  "mt-8 space-y-6 border-t pt-8",
                  "border-border",
                )}
              >
                <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  NC United National Team Highlights
                </p>
                {nationalTeamHighlightVideos.map((highlight) => (
                  <div key={`${highlight.event}-${highlight.year}-${highlight.videoSrc}`}>
                    <p className={"text-sm font-semibold mb-3 text-foreground/80"}>
                      {highlight.event} {highlight.year}
                    </p>
                    {renderDirectHighlightVideo(highlight.videoSrc, highlight.ariaLabel)}
                    <p className={"mt-2 text-sm text-muted-foreground"}>{highlight.title}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}

      {/* 8. College Opens Experience - always show for consistent structure */}
      {hasCollegeOpensContent || canEdit ? (
      <Card
        className={cn(
          "profile-card border-t-4 border-t-[#D3B574] shadow-md",
          mobileRecruiterLayout && PROFILE_SECTION_ORDER.collegeOpens,
          inRow("about"),
        )}
        data-section="college-opens"
      >
        <div className="bg-gradient-to-r from-[#13294B] to-[#1e3a5f] p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="h-6 w-6 text-white" />
              <h2 className="text-2xl font-bold text-white">College Open Experience</h2>
            </div>
            {canEdit && !editingSection && (
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20"
                onClick={() => setEditingSection("college-opens")}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </div>
        <div className="profile-card-body p-8">
              {editingSection === "college-opens" ? (
                <InlineCollegeOpensEditor
                  athleteId={athlete.id}
                  collegeOpens={athleteData.college_opens_experience}
                  onSave={handleInlineSave}
                  onCancel={() => setEditingSection(null)}
                />
              ) : (
            <div className="whitespace-pre-line text-foreground/80 leading-relaxed">
            {athleteData.college_opens_experience || (canEdit ? "No college opens experience listed. Click Edit to add." : "No college opens experience listed.")}
          </div>
          )}
        </div>
      </Card>
      ) : null}

      {/* 9. Achievements - always show for consistent structure */}
      {hasOtherHonoursContent || canEdit ? (
      <Card
        className={cn(
          "profile-card border-t-4 border-t-[#D3B574] shadow-md",
          mobileRecruiterLayout && PROFILE_SECTION_ORDER.achievements,
          inRow("about"),
        )}
        data-section="achievements"
      >
        <div className="bg-gradient-to-r from-[#13294B] to-[#1e3a5f] p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Award className="h-6 w-6 text-white" />
              <h2 className="text-2xl font-bold text-white">Other Honours</h2>
            </div>
            {canEdit && !editingSection && (
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20"
                onClick={() => setEditingSection("achievements")}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </div>
        <div className="profile-card-body p-8">
              {editingSection === "achievements" ? (
                <InlineAchievementsEditor
                  athleteId={athlete.id}
                  otherHonours={athleteData.other_honours}
                  onSave={handleInlineSave}
                  onCancel={() => setEditingSection(null)}
                />
              ) : (
                <>
                  {(() => {
                    const stateQualifierText = (athleteData?.state_qualifier ?? athlete?.state_qualifier ?? "").toString().trim()
                    return stateQualifierText ? (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-foreground mb-3">State Qualifier</h3>
                        <p className="text-foreground/80">{stateQualifierText}</p>
                      </div>
                    ) : null
                  })()}
                  {otherHonours.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">Other honours</h3>
                      {/* Said plainly, because the tournament sections above are verified and
                          this is not. Leaving both unlabelled is what let a self-typed line
                          read as a state title. */}
                      <p className="mb-3 text-sm text-muted-foreground">
                        Added by the athlete. State, NHSCA, Super 32 and Fargo results are shown separately and come
                        from official records.
                      </p>
                      <ul className="list-disc list-inside space-y-2 text-foreground/80">
                        {otherHonours.map((honour, index) => (
                          <li key={`other-honour-${index}`} className="text-base leading-relaxed">
                            {honour}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {otherHonours.length === 0 && !(athleteData?.state_qualifier ?? athlete?.state_qualifier)?.toString().trim() && (
                    <p className="profile-text-muted text-muted-foreground italic">
                      {canEdit
                        ? "Conference and regional finishes, invitationals, career records — anything not covered by official results. Click Edit to add."
                        : "No additional honours listed."}
                    </p>
                  )}
                </>
              )}
            </div>
          </Card>
      ) : null}


      {/* Last Edited By - Footer */}
      {(athlete.last_edited_by || athlete.last_edited_at) && (
        <div
          className={cn(
            "container mx-auto px-4 py-4",
            mobileRecruiterLayout && PROFILE_SECTION_ORDER.footer,
          )}
        >
          <p className={"text-xs text-center text-muted-foreground"}>
            {athlete.last_edited_at && (
              <>
                Last edited{" "}
                {athlete.last_edited_by && (
                  <>
                    by <span className="font-medium">{athlete.last_edited_by}</span>{" "}
                  </>
                )}
                on {new Date(athlete.last_edited_at).toLocaleDateString()} at{" "}
                {new Date(athlete.last_edited_at).toLocaleTimeString()}
              </>
            )}
          </p>
        </div>
      )}

      {/*
        The comparison, for verified college coaches and admins only (lib/compare-access.ts - the
        API refuses everyone else too). Its own card rather than inside "request an edit", which
        is hidden from anyone who can edit - every admin. Arriving from here pre-selects this
        wrestler, so only the other side has to be chosen.
      */}
      {mayCompare && (
        <div
          className={cn(
            "min-w-0",
            inRow("compare"),
          )}
        >
          <Card className={"profile-card border-2 border-border bg-muted"}>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className={"text-lg font-semibold mb-1 text-foreground"}>Compare this wrestler</h3>
                  <p className={"text-sm text-muted-foreground"}>
                    Head to head, common opponents, strength of opponents and your perfect recruit, side by side.
                  </p>
                </div>
                <Button asChild variant="outline" size="lg" className="px-6 py-2">
                  <a href={`/compare?left=${athlete.id}&src=profile-card`}>Compare with another wrestler</a>
                </Button>
              </div>
              <SimilarComparisons athleteId={String(athlete.id)} source="profile-similar" label="Or one tap: similar wrestlers" className="mt-5" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Request Edit - only for non-owners (owners use inline edit) */}
      {!canEdit && (
        <div
          className={cn(
            "container mx-auto px-4 py-8",
            mobileRecruiterLayout && PROFILE_SECTION_ORDER.requestEdit,
          )}
        >
          <Card className={"profile-card border-2 border-border bg-muted"}>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className={"text-lg font-semibold mb-1 text-foreground"}>
                    Help Keep This Profile Accurate
                  </h3>
                  <p className={"text-sm text-muted-foreground"}>
                    Found an error or have updated information? Request an edit to this profile.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={() => setShowEditModal(true)}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-2"
                    size="lg"
                  >
                    Request Profile Edit
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Request Profile Edit Modal */}
      <RequestProfileEditModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        athleteId={athlete.id}
        athleteName={athleteName}
        currentUserEmail={currentUserEmail || undefined}
        isOwner={isViewingOwnProfile || isLinkedParentProfile}
      />
    </div>
  )
}
