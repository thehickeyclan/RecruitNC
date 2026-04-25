"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { PublicImageUpload } from "@/components/public-image-upload"
import { HardLink } from "@/components/hard-link"
import { ExpenseRequestSection } from "@/components/profile/expense-request-section"
import { Loader2, Camera, CheckCircle, LayoutDashboard, Link2, Search, ExternalLink, Sparkles, Users, ArrowRight } from "lucide-react"

const ATHLETE_COMPLETENESS_LABELS: Record<string, string> = {
  bio: "Bio",
  achievements: "Achievements",
  academic: "Academic info",
  highlightVideo: "Highlight video",
  photo: "Photo",
  contact: "Contact info (phone, email, or Instagram)",
}

type Linked = {
  id: string
  name: string
  profileVerified: boolean
  updatedAt: string | null
  claimedByUserId: string | null
}

export type UserProfileForFamily = {
  athlete_id?: string
  athlete_name?: string
  cell_phone?: string
  bio?: string
  name?: string
}

type ProfileFamilyTabProps = {
  profile: UserProfileForFamily
  blueMembershipsLength: number
  blueLoading: boolean
  linkedAthletes: Linked[]
  linkedLoading: boolean
  athleteSearchQuery: string
  setAthleteSearchQuery: (q: string) => void
  athleteSearchResults: { id: string; name: string; highschool: string | null; graduationyear: number | null; alreadyLinked: boolean }[]
  athleteSearchLoading: boolean
  linkAthleteLoading: string | null
  linkAthlete: (id: string) => void
  athleteCompleteness: Record<string, { percent: number; completed: string[]; missing: string[] }>
  completenessLoading: boolean
  eventHubs: { id: string; slug: string; name: string; href: string }[]
  eventHubsLoading: boolean
  onProfilePhotoUploaded?: (url: string) => void
}

export function ProfileFamilyTab({
  profile,
  blueLoading,
  blueMembershipsLength,
  linkedAthletes,
  linkedLoading,
  athleteSearchQuery,
  setAthleteSearchQuery,
  athleteSearchResults,
  athleteSearchLoading,
  linkAthleteLoading,
  linkAthlete,
  athleteCompleteness,
  completenessLoading,
  eventHubs,
  eventHubsLoading,
  onProfilePhotoUploaded,
}: ProfileFamilyTabProps) {
  return (
    <div className="space-y-6">
      <Card className="border-[#CBAF5D]/35 bg-gradient-to-br from-[#CBAF5D]/[0.12] via-white to-[#003366]/5 shadow-sm overflow-hidden">
        <div className="h-0.5 w-full bg-gradient-to-r from-[#03154C] via-[#B31B1B] to-[#CBAF5D]" aria-hidden />
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#03154C]">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#03154C] text-[#CBAF5D]">
              <Sparkles className="h-4 w-4" />
            </span>
            What to do next
          </CardTitle>
          <CardDescription className="text-slate-600">Make your profile and athlete pages more engaging</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700">
          {!profile.cell_phone?.trim() && (
            <p className="flex items-center gap-2">
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#B31B1B]" />
              <span>
                Add your cell phone in the <strong>Account</strong> tab so coaches can reach you.
              </span>
            </p>
          )}
          {!profile.bio?.trim() && (
            <p className="flex items-center gap-2">
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#B31B1B]" />
              <span>Add a short bio in the Account tab to introduce yourself.</span>
            </p>
          )}
          {!blueLoading && blueMembershipsLength === 0 && (
            <p className="flex items-center gap-2">
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#B31B1B]" />
              <HardLink href="/blue" className="text-[#003366] font-semibold hover:text-[#B31B1B] underline-offset-2 hover:underline">
                Interested in NC United Blue?
              </HardLink>{" "}
              Learn more.
            </p>
          )}
          {!linkedLoading && linkedAthletes.length > 0 && linkedAthletes.some((a) => !a.profileVerified) && (
            <p className="flex items-center gap-2">
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#B31B1B]" />
              <span>Get your athlete&apos;s profile public so coaches can find them — use Request Profile Edit or Edit profile below.</span>
            </p>
          )}
          {!linkedLoading && linkedAthletes.length > 0 && (
            <p className="flex items-center gap-2">
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#B31B1B]" />
              <span>Keep achievements and stats up to date — edit athlete profile below.</span>
            </p>
          )}
          {profile.cell_phone?.trim() &&
            profile.bio?.trim() &&
            (linkedAthletes.length === 0 || linkedAthletes.every((a) => a.profileVerified)) &&
            (blueMembershipsLength > 0 || linkedAthletes.length > 0) && <p className="text-slate-500">You&apos;re all set. Browse athletes or submit a commitment when ready.</p>}
        </CardContent>
      </Card>

      <p className="text-xs text-slate-500 -mt-2">
        <strong className="text-[#003366] font-semibold">Fundraising</strong> totals and donate links are on the{" "}
        <span className="font-medium text-[#03154C]">Fundraise</span> tab.
      </p>

      <Card className="border-[#003366]/10 shadow-md shadow-[#003366]/4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#03154C]">
            <LayoutDashboard className="h-5 w-5" />
            Event hubs
          </CardTitle>
          <CardDescription>Roster, gear sizes, and team chat for events you’re registered for</CardDescription>
        </CardHeader>
        <CardContent>
          {eventHubsLoading ? (
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </p>
          ) : eventHubs.length === 0 ? (
            <p className="text-sm text-gray-500">
              When you register for a National Team event (e.g. NHSCA Duals), the hub will appear here and in the nav under
              Workspace.
            </p>
          ) : (
            <ul className="space-y-2">
              {eventHubs.map((hub) => (
                <li key={hub.id}>
                  <a href={hub.href} className="inline-flex items-center gap-2 text-sm font-medium text-[#003366] hover:underline">
                    {hub.name}
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-[#003366]/10 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#03154C]">
            <Link2 className="h-5 w-5 text-[#003366]" />
            Link your athlete
          </CardTitle>
          <CardDescription>Search for your wrestler to link them. They show under &quot;Your athletes&quot; below.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative max-w-md">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by name (e.g. Liam Hickey)"
              value={athleteSearchQuery}
              onChange={(e) => setAthleteSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          {athleteSearchLoading && <p className="text-xs text-gray-500">Searching…</p>}
          {!athleteSearchLoading && athleteSearchQuery.trim().length >= 2 && athleteSearchResults.length === 0 && (
            <p className="text-xs text-gray-500">No athletes found. Try a different name.</p>
          )}
          {!athleteSearchLoading && athleteSearchResults.length > 0 && (
            <ul className="space-y-2 max-h-48 overflow-y-auto rounded border bg-gray-50/50 p-2 max-w-2xl">
              {athleteSearchResults.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>
                    <span className="font-medium text-gray-900">{a.name}</span>
                    {(a.highschool || a.graduationyear) && (
                      <span className="text-gray-500 ml-1">
                        {[a.highschool, a.graduationyear != null ? `’${String(a.graduationyear).slice(-2)}` : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    )}
                  </span>
                  {a.alreadyLinked ? (
                    <span className="text-xs text-green-600 shrink-0">Linked</span>
                  ) : (
                    <Button size="sm" variant="outline" disabled={linkAthleteLoading === a.id} onClick={() => linkAthlete(a.id)}>
                      {linkAthleteLoading === a.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Link"}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {!linkedLoading && linkedAthletes.length > 0 && (
        <Card className="border-[#003366]/10 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#03154C]">
              <Users className="h-5 w-5 text-[#003366]" />
              Your athletes
            </CardTitle>
            <CardDescription>Status and last update for linked profiles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {linkedAthletes.map((a) => {
              const comp = athleteCompleteness[a.id]
              return (
                <div key={a.id} className="rounded-lg border bg-gray-50/50 p-3">
                  <p className="font-medium text-gray-900">{a.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Public profile:{" "}
                    {a.profileVerified ? (
                      <span className="text-green-600 inline-flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 shrink-0" /> Live
                      </span>
                    ) : (
                      "Not yet public"
                    )}
                  </p>
                  {a.updatedAt && <p className="text-xs text-gray-400">Last updated: {new Date(a.updatedAt).toLocaleDateString()}</p>}
                  {completenessLoading && !comp ? (
                    <p className="text-xs text-gray-400 mt-2">Loading profile completeness…</p>
                  ) : comp ? (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-gray-600 mb-1">Profile completeness: {comp.percent}%</p>
                      <Progress value={comp.percent} className="h-2" />
                      {comp.missing.length > 0 ? (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-amber-800 mb-0.5">To reach 100%, add:</p>
                          <ul className="text-xs text-gray-600 space-y-0.5 list-disc list-inside">
                            {comp.missing.map((m) => (
                              <li key={m}>{ATHLETE_COMPLETENESS_LABELS[m] ?? m}</li>
                            ))}
                          </ul>
                          <p className="text-xs text-gray-500 mt-1">
                            {comp.missing.includes("contact")
                              ? "Add contact info so coaches can reach you directly — "
                              : "Use "}
                            <a href={`/athletes/${a.id}/edit`} className="underline text-[#03154C] font-medium">
                              Edit profile
                            </a>
                            {comp.missing.includes("contact")
                              ? " to add phone, email, or Instagram."
                              : " to fill these in."}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-green-600 mt-1">
                          Profile complete — bio, achievements, academics, highlight video, photo, and contact info are filled.
                        </p>
                      )}
                    </div>
                  ) : null}
                  {!a.claimedByUserId && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 mt-2">
                      <span className="text-amber-500 text-[13px] shrink-0 mt-px">!</span>
                      <p className="text-[12px] text-amber-800 leading-snug">
                        {(a.name?.split(" ")[0] || "This athlete")} hasn&apos;t claimed this profile yet. When they sign up and claim
                        it, they can manage their own recruiting info.{" "}
                        <a href={`/view-profile?id=${encodeURIComponent(a.id)}`} className="underline font-medium">
                          View profile
                        </a>{" "}
                        to share the link with them.
                      </p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Button asChild variant="outline" size="sm">
                      <a href={`/view-profile?id=${encodeURIComponent(a.id)}`}>View</a>
                    </Button>
                    <Button
                      asChild
                      size="sm"
                      variant={comp && comp.percent === 0 ? "default" : "outline"}
                      className={comp && comp.percent === 0 ? "bg-[#03154C] hover:bg-[#0a2a6e] text-white" : ""}
                    >
                      <a href={`/athletes/${a.id}/edit`}>
                        {comp && comp.percent === 0 ? "Complete profile" : "Edit profile"}
                      </a>
                    </Button>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {profile.athlete_id && profile.athlete_name && (
        <Card className="border-[#003366]/10 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#03154C]">
              <Camera className="h-5 w-5 text-[#003366]" />
              Your Athlete Photo
            </CardTitle>
            <CardDescription>Upload your own photo for your athlete profile</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(() => {
              const comp = profile.athlete_id ? athleteCompleteness[profile.athlete_id] : undefined
              return completenessLoading && !comp ? (
                <p className="text-xs text-gray-400">Loading profile completeness…</p>
              ) : comp ? (
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">Profile completeness: {comp.percent}%</p>
                  <Progress value={comp.percent} className="h-2" />
                  {comp.missing.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Full bar = Bio, Achievements, Academic info, Highlight video, Photo. Add:{" "}
                      {comp.missing.map((m) => ATHLETE_COMPLETENESS_LABELS[m] ?? m).join(", ")}
                    </p>
                  )}
                </div>
              ) : null
            })()}
            <PublicImageUpload
              athleteId={profile.athlete_id}
              athleteName={profile.athlete_name}
              onUploadComplete={(url) => onProfilePhotoUploaded?.(url)}
            />
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <Button asChild variant="default" size="sm">
                <a href={`/view-profile?id=${encodeURIComponent(profile.athlete_id!)}`}>View {profile.athlete_name}&apos;s profile</a>
              </Button>
              <Button asChild variant="outline" size="sm">
                <a href={`/athletes/${profile.athlete_id}/edit`}>Edit profile</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <ExpenseRequestSection linkedAthletes={linkedAthletes} />
    </div>
  )
}
