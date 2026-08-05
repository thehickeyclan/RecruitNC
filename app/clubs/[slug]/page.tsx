import type { Metadata } from "next"
import { cache } from "react"
import Link from "next/link"
import Image from "next/image"
import { notFound, redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { clubSlug, findClubBySlug } from "@/lib/clubs/club-slug"
import { normalizeClubName } from "@/lib/clubs/club-normalize"
import { buildClubLogoIndex, resolveClubLogo, type LogoMappingRow } from "@/lib/clubs/club-logo"
import { buildClubAchievements } from "@/lib/clubs/club-achievements"
import { loadClubTournamentHonours } from "@/lib/clubs/club-tournament-honours"
import { DEFAULT_PUBLIC_RANKINGS_CAP, PUBLISHED_PUBLIC_RANKINGS_YEARS } from "@/lib/public-rankings-cap"
import { TocPatrioticBar, tocDisplayClass } from "@/components/toc/toc-theme"
import { ClubClaimButton } from "@/components/clubs/club-claim-button"
import { Archive, ExternalLink, Facebook, Instagram, MapPin, Phone, Mail, ShieldCheck } from "lucide-react"

export const dynamic = "force-dynamic"

type ClubRow = Record<string, any>

/**
 * Wrapped in cache() because generateMetadata and the page body both need the club, and
 * without it every request queries the table twice.
 */
const loadClub = cache(async (slug: string): Promise<ClubRow | null> => {
  const admin = createAdminClient()
  const { data } = await admin.from("wrestling_clubs").select("*")
  return findClubBySlug<ClubRow>((data ?? []) as ClubRow[], slug)
})

/** Used only to resolve a merge target, so an old URL redirects instead of 404ing. */
const loadClubById = cache(async (id: string): Promise<ClubRow | null> => {
  const admin = createAdminClient()
  const { data } = await admin.from("wrestling_clubs").select("*").eq("id", id).maybeSingle()
  return (data as ClubRow | null) ?? null
})

/**
 * Almost no club carries its own logo_url — 50 of them live in logo_mappings instead.
 * Reading only the club row is why the map showed a logo and this page did not.
 */
const loadClubLogo = cache(async (clubId: string, name: string, normalizedName: string, ownLogo: string | null) => {
  if (ownLogo) return ownLogo
  const admin = createAdminClient()

  const { data: aliasRows } = await admin
    .from("wrestling_club_aliases")
    .select("alias")
    .eq("club_id", clubId)
  const aliases = (aliasRows ?? []).map((row) => String((row as { alias?: unknown }).alias ?? ""))

  const { data: logoRows } = await admin
    .from("logo_mappings")
    .select("entity_name,logo_url,aliases")
    .eq("entity_type", "club")

  const index = buildClubLogoIndex((logoRows ?? []) as LogoMappingRow[])
  return resolveClubLogo({ name, normalized_name: normalizedName, logo_url: ownLogo }, index, aliases)
})

/**
 * The club's wrestlers, resolved the same way the map does — canonical name plus every
 * alias — so a club whose athletes write "RAW" still finds them.
 */
const loadClubAthletes = cache(async (clubId: string, clubName: string, normalizedName: string) => {
  const admin = createAdminClient()
  const { data: aliasRows } = await admin
    .from("wrestling_club_aliases")
    .select("normalized_alias")
    .eq("club_id", clubId)

  const keys = new Set<string>([normalizedName || normalizeClubName(clubName), normalizeClubName(clubName)])
  for (const row of aliasRows ?? []) keys.add(String((row as { normalized_alias?: unknown }).normalized_alias ?? ""))

  const { data: athletes } = await admin.from("athletes").select("*").limit(2000)
  return ((athletes ?? []) as ClubRow[]).filter((athlete) =>
    keys.has(normalizeClubName(String(athlete.wrestlingClub ?? ""))),
  )
})

function programList(club: ClubRow): string[] {
  const labels: Array<[boolean, string]> = [
    [Boolean(club.youth_program), "Youth"],
    [Boolean(club.middle_school_program), "Middle school"],
    [Boolean(club.high_school_program), "High school"],
    [Boolean(club.boys_program), "Boys"],
    [Boolean(club.girls_program), "Girls"],
    [Boolean(club.freestyle_greco), "Freestyle / Greco"],
  ]
  return labels.filter(([on]) => on).map(([, label]) => label)
}

/**
 * A club that has shut down keeps its page, because its wrestlers really did train there
 * and those results really happened — deleting it would break their profiles and 404 every
 * link anyone has shared. What it loses is the invitation to turn up: contact details,
 * directions and the claim form all come off, so nobody is sent to a room that is gone.
 */
function isClosed(club: ClubRow): boolean {
  return String(club.status ?? "active") !== "active"
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const club = await loadClub(slug)
  if (!club) return { title: "Club not found | RecruitNC" }

  // cache() means this shares the page body's lookup rather than repeating it.
  const logoUrl = await loadClubLogo(
    String(club.id),
    String(club.name),
    String(club.normalized_name ?? ""),
    (club.logo_url as string | null) ?? null,
  )

  const where = [club.city, club.state].filter(Boolean).join(", ")
  const programs = programList(club)
  const closed = isClosed(club)
  const description = closed
    ? `${club.name} is no longer operating. Its RecruitNC record is kept for the wrestlers who trained there${
        where ? ` in ${where}` : ""
      }, including college commitments and tournament results.`
    : [
        `${club.name} is a wrestling club${where ? ` in ${where}` : " in North Carolina"}.`,
        programs.length ? `Programs: ${programs.join(", ")}.` : "",
        "Find practice location, contact details and college commitments on RecruitNC.",
      ]
        .filter(Boolean)
        .join(" ")

  return {
    title: closed
      ? `${club.name} — Closed Wrestling Club${where ? ` in ${where}` : ""} | RecruitNC`
      : `${club.name} — Wrestling Club${where ? ` in ${where}` : ""} | RecruitNC`,
    description,
    alternates: { canonical: `/clubs/${clubSlug(String(club.name))}` },
    openGraph: {
      title: closed ? `${club.name} | Closed NC Wrestling Club` : `${club.name} | NC Wrestling Club`,
      description,
      url: `/clubs/${clubSlug(String(club.name))}`,
      type: "website",
      ...(logoUrl ? { images: [{ url: logoUrl }] } : {}),
    },
  }
}

export default async function ClubDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const club = await loadClub(slug)
  if (!club) notFound()

  // A merged club's URL may already be shared somewhere. Send it to the surviving room
  // rather than showing a dead end.
  if (String(club.status ?? "") === "merged" && club.merged_into_club_id) {
    const target = await loadClubById(String(club.merged_into_club_id))
    if (target?.name) redirect(`/clubs/${clubSlug(String(target.name))}`)
  }

  const closed = isClosed(club)

  const logoUrl = await loadClubLogo(
    String(club.id),
    String(club.name),
    String(club.normalized_name ?? ""),
    (club.logo_url as string | null) ?? null,
  )
  const athletes = await loadClubAthletes(String(club.id), String(club.name), String(club.normalized_name ?? ""))
  const achievements = buildClubAchievements(athletes)
  const honours = await loadClubTournamentHonours(createAdminClient(), athletes)
  const honourSections = [
    { title: "NCHSAA state champions", entries: honours.nchsaaChampions },
    { title: "NCHSAA state placers", entries: honours.nchsaaPlacers },
    { title: "NHSCA All-Americans", entries: honours.nhscaAllAmericans },
    { title: "Super 32 placers", entries: honours.super32Placers },
    { title: "Fargo All-Americans", entries: honours.fargoAllAmericans },
  ]

  const where = [club.city, club.state].filter(Boolean).join(", ")
  const programs = programList(club)
  const address = [club.address, club.city, club.state, club.zip_code].filter(Boolean).join(", ")
  const mapsHref = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null

  // Structured data so the club can surface as a real place in search results. A closed
  // club is not somewhere you can go, so it is not described as an operating one.
  const jsonLd = closed
    ? {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: club.name,
        ...(logoUrl ? { logo: logoUrl } : {}),
        description: `${club.name} is a former North Carolina wrestling club that is no longer operating.`,
      }
    : {
    "@context": "https://schema.org",
    "@type": "SportsClub",
    name: club.name,
    ...(logoUrl ? { logo: logoUrl } : {}),
    ...(club.website ? { url: String(club.website) } : {}),
    ...(club.contact_phone ? { telephone: String(club.contact_phone) } : {}),
    ...(club.contact_email ? { email: String(club.contact_email) } : {}),
    sport: "Wrestling",
    address: {
      "@type": "PostalAddress",
      ...(club.address ? { streetAddress: String(club.address) } : {}),
      ...(club.city ? { addressLocality: String(club.city) } : {}),
      addressRegion: String(club.state ?? "NC"),
      ...(club.zip_code ? { postalCode: String(club.zip_code) } : {}),
      addressCountry: "US",
    },
    ...(club.latitude && club.longitude
      ? { geo: { "@type": "GeoCoordinates", latitude: club.latitude, longitude: club.longitude } }
      : {}),
    ...(club.instagram_url || club.facebook_url
      ? { sameAs: [club.instagram_url, club.facebook_url].filter(Boolean).map(String) }
      : {}),
  }

  return (
    <main className="min-h-screen bg-[#060f1f] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="relative border-b border-white/10 bg-[#0B1D3A]">
        <TocPatrioticBar />
        <div className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
          <Link href="/clubs" className="text-sm font-bold text-[#D7B968] hover:text-white">
            ← All North Carolina clubs
          </Link>

          <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-start">
            {logoUrl ? (
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-sm border border-white/10 bg-white/10">
                <Image src={logoUrl} alt={`${club.name} logo`} fill className="object-contain p-1.5" sizes="80px" />
              </div>
            ) : null}
            <div className="min-w-0">
              <h1 className={`text-4xl leading-[1.05] text-white sm:text-6xl ${tocDisplayClass()}`}>{club.name}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {where ? (
                  <span className="flex items-center gap-1.5 text-lg text-white/70">
                    <MapPin className="h-4 w-4 text-[#D7B968]" />
                    {where}
                  </span>
                ) : null}
                {closed ? (
                  <span className="flex items-center gap-1.5 rounded-sm bg-white/10 px-2.5 py-1 text-sm text-white/70">
                    <Archive className="h-3.5 w-3.5" />
                    No longer operating
                  </span>
                ) : null}
                {club.verified && !closed ? (
                  <span className="flex items-center gap-1.5 rounded-sm bg-emerald-500/15 px-2.5 py-1 text-sm text-emerald-200">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Verified club
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        <TocPatrioticBar />
      </section>

      <section className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        {closed ? (
          <div className="rounded-sm border border-amber-400/30 bg-amber-400/10 p-5">
            <h2 className="flex items-center gap-2 font-bold text-amber-100">
              <Archive className="h-4 w-4" />
              {club.name} is no longer operating
            </h2>
            <p className="mt-2 leading-7 text-white/75">
              {club.closed_note ? String(club.closed_note) : "This club has closed, so it is not on the club map."}{" "}
              Its page stays up because the wrestlers below trained here, and their results still count.{" "}
              <Link href="/clubs" className="font-bold text-[#D7B968] hover:underline">
                Find a club that is open near you
              </Link>
              .
            </p>
          </div>
        ) : null}

        {!closed && programs.length ? (
          <div className="rounded-sm border border-white/10 bg-[#071427]/80 p-5">
            <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-[#D7B968]">Programs</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {programs.map((label) => (
                <span key={label} className="rounded-full border border-[#D7B968]/35 bg-[#D7B968]/10 px-3 py-1.5 text-sm text-[#F5E7BD]">
                  {label}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          {!closed && address ? (
            <div className="rounded-sm border border-white/10 bg-[#071427]/80 p-5">
              <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-[#D7B968]">Where they train</h2>
              <p className="mt-2 leading-7 text-white/80">{address}</p>
              {mapsHref ? (
                <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm text-[#D7B968] hover:underline">
                  Get directions <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>
          ) : null}

          {!closed &&
          (club.contact_phone || club.contact_email || club.website || club.instagram_url || club.facebook_url) ? (
            <div className="rounded-sm border border-white/10 bg-[#071427]/80 p-5">
              <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-[#D7B968]">Get in touch</h2>
              <div className="mt-3 space-y-2 text-white/80">
                {club.contact_phone ? (
                  <a href={`tel:${String(club.contact_phone).replace(/\D/g, "").replace(/^(\d{10})$/, "+1$1")}`} className="flex items-center gap-2 hover:text-[#D7B968]">
                    <Phone className="h-4 w-4 text-[#D7B968]" />
                    {club.contact_phone}
                  </a>
                ) : null}
                {club.contact_email ? (
                  <a href={`mailto:${club.contact_email}`} className="flex items-center gap-2 break-all hover:text-[#D7B968]">
                    <Mail className="h-4 w-4 shrink-0 text-[#D7B968]" />
                    {club.contact_email}
                  </a>
                ) : null}
                {club.website ? (
                  <a href={String(club.website)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 break-all hover:text-[#D7B968]">
                    <ExternalLink className="h-4 w-4 shrink-0 text-[#D7B968]" />
                    {String(club.website).replace(/^https?:\/\//, "")}
                  </a>
                ) : null}
                {club.instagram_url ? (
                  <a href={String(club.instagram_url)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-[#D7B968]">
                    <Instagram className="h-4 w-4 text-[#D7B968]" />
                    Instagram
                  </a>
                ) : null}
                {club.facebook_url ? (
                  <a href={String(club.facebook_url)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-[#D7B968]">
                    <Facebook className="h-4 w-4 text-[#D7B968]" />
                    Facebook
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        {achievements.commits.length ? (
          <div className="rounded-sm border border-white/10 bg-[#071427]/80 p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-[#D7B968]">
                College commitments
              </h2>
              <span className="text-xs text-white/40">as of 2025</span>
            </div>
            <ul className="mt-3 divide-y divide-white/5">
              {achievements.commits.map((commit) => (
                <li key={`${commit.name}-${commit.college}`} className="flex flex-wrap items-baseline gap-x-2 py-2">
                  <span className="font-semibold text-white">{commit.name}</span>
                  <span className="text-white/35">→</span>
                  <span className="text-white/85">{commit.college}</span>
                  {commit.classYear ? <span className="text-sm text-white/40">Class of {commit.classYear}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {achievements.ranked.length ? (
          <div className="rounded-sm border border-white/10 bg-[#071427]/80 p-5">
            <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-[#D7B968]">
              Ranked wrestlers ({achievements.ranked.length})
            </h2>
            <ul className="mt-3 divide-y divide-white/5">
              {achievements.ranked.map((athlete) => (
                <li key={`${athlete.name}-${athlete.classYear}-${athlete.rank}`} className="flex flex-wrap items-baseline gap-x-3 py-2">
                  {/* Rank is always paired with the class — #5 in 2027 is not #5 in 2026. */}
                  <span className="w-12 shrink-0 font-black text-[#D7B968]">#{athlete.rank}</span>
                  <span className="font-semibold text-white">{athlete.name}</span>
                  {athlete.classYear ? (
                    <span className="text-sm text-white/55">Class of {athlete.classYear}</span>
                  ) : null}
                  {athlete.weight ? <span className="text-sm text-white/40">{athlete.weight}</span> : null}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-white/35">
              RecruitNC publishes a top {DEFAULT_PUBLIC_RANKINGS_CAP} for the{" "}
              {PUBLISHED_PUBLIC_RANKINGS_YEARS.join(" and ")} classes.
            </p>
          </div>
        ) : null}

        {honourSections.some((section) => section.entries.length) ? (
          <div className="rounded-sm border border-white/10 bg-[#071427]/80 p-5">
            <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-[#D7B968]">Tournament results</h2>

            {honourSections
              .filter((section) => section.entries.length)
              .map((section) => (
                <div key={section.title} className="mt-4">
                  <h3 className="text-sm font-bold text-white">{section.title}</h3>
                  <ul className="mt-2 space-y-1.5">
                    {section.entries.map((entry) => (
                      <li key={entry.athleteName}>
                        <span className="font-semibold text-white">{entry.athleteName}</span>
                        <span className="text-sm text-white/50"> — {entry.detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

            <p className="mt-5 border-t border-white/10 pt-3 text-xs leading-5 text-white/35">
              Results come from official tournament records. Placings are shown as year and place; NCHSAA entries
              include the classification and weight. College commitments reflect what was on file as of 2025.
            </p>
          </div>
        ) : null}

        {closed ? null : (
          <div className="rounded-sm border border-white/10 bg-[#071427]/80 p-5">
            <ClubClaimButton clubId={String(club.id)} clubName={String(club.name)} />
          </div>
        )}

        <div className="rounded-sm border border-[#D7B968]/20 bg-[#D7B968]/5 p-5">
          <p className="text-white/70">
            Looking for a different room?{" "}
            <Link href="/clubs" className="font-bold text-[#D7B968] hover:underline">
              Browse every wrestling club in North Carolina
            </Link>{" "}
            on the map, filtered by age group, boys or girls, and distance from you.
          </p>
        </div>
      </section>
    </main>
  )
}
