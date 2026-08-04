import type { Metadata } from "next"
import { cache } from "react"
import Link from "next/link"
import Image from "next/image"
import { notFound } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { clubSlug, findClubBySlug } from "@/lib/clubs/club-slug"
import { TocPatrioticBar, tocDisplayClass } from "@/components/toc/toc-theme"
import { ClubClaimButton } from "@/components/clubs/club-claim-button"
import { ExternalLink, Facebook, Instagram, MapPin, Phone, Mail, ShieldCheck } from "lucide-react"

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

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const club = await loadClub(slug)
  if (!club) return { title: "Club not found | RecruitNC" }

  const where = [club.city, club.state].filter(Boolean).join(", ")
  const programs = programList(club)
  const description = [
    `${club.name} is a wrestling club${where ? ` in ${where}` : " in North Carolina"}.`,
    programs.length ? `Programs: ${programs.join(", ")}.` : "",
    "Find practice location, contact details and college commitments on RecruitNC.",
  ]
    .filter(Boolean)
    .join(" ")

  return {
    title: `${club.name} — Wrestling Club${where ? ` in ${where}` : ""} | RecruitNC`,
    description,
    alternates: { canonical: `/clubs/${clubSlug(String(club.name))}` },
    openGraph: {
      title: `${club.name} | NC Wrestling Club`,
      description,
      url: `/clubs/${clubSlug(String(club.name))}`,
      type: "website",
      ...(club.logo_url ? { images: [{ url: String(club.logo_url) }] } : {}),
    },
  }
}

export default async function ClubDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const club = await loadClub(slug)
  if (!club) notFound()

  const where = [club.city, club.state].filter(Boolean).join(", ")
  const programs = programList(club)
  const address = [club.address, club.city, club.state, club.zip_code].filter(Boolean).join(", ")
  const mapsHref = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null

  // Structured data so the club can surface as a real place in search results.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsClub",
    name: club.name,
    ...(club.logo_url ? { logo: String(club.logo_url) } : {}),
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
            {club.logo_url ? (
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-sm border border-white/10 bg-white/10">
                <Image src={String(club.logo_url)} alt={`${club.name} logo`} fill className="object-contain p-1.5" sizes="80px" />
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
                {club.verified ? (
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
        {programs.length ? (
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
          {address ? (
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

          {club.contact_phone || club.contact_email || club.website || club.instagram_url || club.facebook_url ? (
            <div className="rounded-sm border border-white/10 bg-[#071427]/80 p-5">
              <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-[#D7B968]">Get in touch</h2>
              <div className="mt-3 space-y-2 text-white/80">
                {club.contact_phone ? (
                  <a href={`tel:${club.contact_phone}`} className="flex items-center gap-2 hover:text-[#D7B968]">
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

        <div className="rounded-sm border border-white/10 bg-[#071427]/80 p-5">
          <ClubClaimButton clubId={String(club.id)} clubName={String(club.name)} />
        </div>

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
