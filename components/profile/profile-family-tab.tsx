"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { PublicImageUpload } from "@/components/public-image-upload"
import { HardLink } from "@/components/hard-link"
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
      {/* What to do next */}
      <Card className="bg-gradient-to-br from-[#D3B574]/20 to-[#0F1E32] border-[#D3B574]/30 shadow-md overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-[#D3B574] to-[#c4a665]" aria-hidden />
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D3B574] text-[#0A1628]">
              <Sparkles className="h-4 w-4" />
            </span>
            What to do next
          </CardTitle>
          <CardDescription className="text-gray-400">Make your profile and athlete pages more engaging</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-300">
          {!profile.cell_phone?.trim() && (
            <p className="flex items-center gap-2">
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#D3B574]" />
              <span>
                Add your cell phone in the <strong className="text-white">Account</strong> tab so coaches can reach you.
              </span>
            </p>
          )}
          {!profile.bio?.trim() && (
            <p className="flex items-center gap-2">
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#D3B574]" />
              <span>Add a short bio in the Account tab to introduce yourself.</span>
            </p>
          )}
          {!blueLoading && blueMembershipsLength === 0 && (
            <p className="flex items-center gap-2">
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#D3B574]" />
              <HardLink href="/blue" className="text-[#D3B574] font-semibold hover:text-white underline-offset-2 hover:underline">
                Interested in NC United Blue?
              </HardLink>{" "}
              Learn more.
            </p>
          )}
          {!linkedLoading && linkedAthletes.length > 0 && linkedAthletes.some((a) => !a.profileVerified) && (
            <p className="flex items-center gap-2">
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#D3B574]" />
              <span>Get your athlete&apos;s profile public so coaches can find them.</span>
            </p>
          )}
          {!linkedLoading && linkedAthletes.length > 0 && (
            <p className="flex items-center gap-2">
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#D3B574]" />
              <span>Keep achievements and stats up to date.</span>
            </p>
          )}
          {profile.cell_phone?.trim() &&
            profile.bio?.trim() &&
            (linkedAthletes.length === 0 || linkedAthletes.every((a) => a.profileVerified)) &&
            (blueMembershipsLength > 0 || linkedAthletes.length > 0) && <p className="text-gray-500">You&apos;re all set. Browse athletes or submit a commitment when ready.</p>}
        </CardContent>
      </Card>

      <p className="text-xs text-gray-500 -mt-2">
        <strong className="text-[#D3B574] font-semibold">Fundraising</strong> totals and{" "}
        <strong className="text-[#D3B574] font-semibold">reimbursement requests</strong> are on the{" "}
        <span className="font-medium text-gray-300">Digital wallet</span> tab.
      </p>

      {/* Event Hubs */}
      <Card className="bg-[#0F1E32] border-[#1e3a5f] shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <LayoutDashboard className="h-5 w-5 text-[#D3B574]" />
            Event hubs
          </CardTitle>
          <CardDescription className="text-gray-400">Roster, gear sizes, and team chat for events you&apos;re registered for</CardDescription>
        </CardHeader>
        <CardContent>
          {eventHubsLoading ? (
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </p>
          ) : eventHubs.length === 0 ? (
            <p className="text-sm text-gray-500">
              When you register for a National Team event (e.g. NHSCA Duals), the hub will appear here.
            </p>
          ) : (
            <ul className="space-y-2">
              {eventHubs.map((hub) => (
                <li key={hub.id}>
                  <a href={hub.href} className="inline-flex items-center gap-2 text-sm font-medium text-[#D3B574] hover:text-white transition-colors">
                    {hub.name}
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Link Athlete */}
      <Card className="bg-[#0F1E32] border-[#1e3a5f] shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Link2 className="h-5 w-5 text-[#D3B574]" />
            Link your athlete
          </CardTitle>
          <CardDescription className="text-gray-400">Search for your wrestler to link them to your account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative max-w-md">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              placeholder="Search by name (e.g. Liam Hickey)"
              value={athleteSearchQuery}
              onChange={(e) => setAthleteSearchQuery(e.target.value)}
              className="pl-8 bg-[#0A1628] border-[#1e3a5f] text-white placeholder:text-gray-500"
            />
          </div>
          {athleteSearchLoading && <p className="text-xs text-gray-500">Searching...</p>}
          {!athleteSearchLoading && athleteSearchQuery.trim().length >= 2 && athleteSearchResults.length === 0 && (
            <p className="text-xs text-gray-500">No athletes found. Try a different name.</p>
          )}
          {!athleteSearchLoading && athleteSearchResults.length > 0 && (
            <ul className="space-y-2 max-h-48 overflow-y-auto rounded-lg border border-[#1e3a5f] bg-[#0A1628] p-2 max-w-2xl">
              {athleteSearchResults.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>
                    <span className="font-medium text-white">{a.name}</span>
                    {(a.highschool || a.graduationyear) && (
                      <span className="text-gray-400 ml-1">
                        {[a.highschool, a.graduationyear != null ? `'${String(a.graduationyear).slice(-2)}` : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    )}
                  </span>
                  {a.alreadyLinked ? (
                    <span className="text-xs text-green-400 shrink-0">Linked</span>
                  ) : (
                    <Button size="sm" variant="outline" className="border-[#D3B574] text-[#D3B574] hover:bg-[#D3B574] hover:text-[#0A1628]" disabled={linkAthleteLoading === a.id} onClick={() => linkAthlete(a.id)}>
                      {linkAthleteLoading === a.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Link"}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Your Athletes */}
      {!linkedLoading && linkedAthletes.length > 0 && (
        <Card className="bg-[#0F1E32] border-[#1e3a5f] shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Users className="h-5 w-5 text-[#D3B574]" />
              Your athletes
            </CardTitle>
            <CardDescription className="text-gray-400">Status and last update for linked profiles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {linkedAthletes.map((a) => {
              const comp = athleteCompleteness[a.id]
              return (
                <div key={a.id} className="rounded-lg border border-[#1e3a5f] bg-[#0A1628] p-4">
                  <p className="font-medium text-white">{a.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Public profile:{" "}
                    {a.profileVerified ? (
                      <span className="text-green-400 inline-flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 shrink-0" /> Live
                      </span>
                    ) : (
                      <span className="text-amber-400">Not yet public</span>
                    )}
                  </p>
                  {a.updatedAt && <p className="text-xs text-gray-500">Last updated: {new Date(a.updatedAt).toLocaleDateString()}</p>}
                  {completenessLoading && !comp ? (
                    <p className="text-xs text-gray-500 mt-2">Loading profile completeness...</p>
                  ) : comp ? (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-gray-400 mb-1">Profile completeness: {comp.percent}%</p>
                      <Progress value={comp.percent} className="h-2 bg-[#1e3a5f]" />
                      {comp.missing.length > 0 ? (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-amber-400 mb-0.5">To reach 100%, add:</p>
                          <ul className="text-xs text-gray-400 space-y-0.5 list-disc list-inside">
                            {comp.missing.map((m) => (
                              <li key={m}>{ATHLETE_COMPLETENESS_LABELS[m] ?? m}</li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="text-xs text-green-400 mt-1">Profile complete!</p>
                      )}
                    </div>
                  ) : null}
                  {!a.claimedByUserId && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-700/50 bg-amber-900/20 px-3 py-2 mt-3">
                      <span className="text-amber-400 text-[13px] shrink-0 mt-px">!</span>
                      <p className="text-[12px] text-amber-300 leading-snug">
                        {(a.name?.split(" ")[0] || "This athlete")} hasn&apos;t claimed this profile yet.{" "}
                        <a href={`/view-profile?id=${encodeURIComponent(a.id)}`} className="underline font-medium text-amber-200">
                          View profile
                        </a>{" "}
                        to share the link.
                      </p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Button asChild variant="outline" size="sm" className="border-[#1e3a5f] text-gray-300 hover:bg-[#1e3a5f] hover:text-white">
                      <a href={`/view-profile?id=${encodeURIComponent(a.id)}`}>View</a>
                    </Button>
                    <Button
                      asChild
                      size="sm"
                      className={comp && comp.percent === 0 ? "bg-[#D3B574] hover:bg-[#c4a665] text-[#0A1628]" : "border-[#1e3a5f] text-gray-300 hover:bg-[#1e3a5f] hover:text-white"}
                      variant={comp && comp.percent === 0 ? "default" : "outline"}
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

      {/* Athlete Photo Upload */}
      {profile.athlete_id && profile.athlete_name && (
        <Card className="bg-[#0F1E32] border-[#1e3a5f] shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Camera className="h-5 w-5 text-[#D3B574]" />
              Your Athlete Photo
            </CardTitle>
            <CardDescription className="text-gray-400">Upload your own photo for your athlete profile</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(() => {
              const comp = profile.athlete_id ? athleteCompleteness[profile.athlete_id] : undefined
              return completenessLoading && !comp ? (
                <p className="text-xs text-gray-500">Loading profile completeness...</p>
              ) : comp ? (
                <div>
                  <p className="text-xs font-medium text-gray-400 mb-1">Profile completeness: {comp.percent}%</p>
                  <Progress value={comp.percent} className="h-2 bg-[#1e3a5f]" />
                  {comp.missing.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Missing: {comp.missing.map((m) => ATHLETE_COMPLETENESS_LABELS[m] ?? m).join(", ")}
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
            <div className="flex flex-wrap gap-2 pt-3 border-t border-[#1e3a5f]">
              <Button asChild size="sm" className="bg-[#D3B574] hover:bg-[#c4a665] text-[#0A1628]">
                <a href={`/view-profile?id=${encodeURIComponent(profile.athlete_id!)}`}>View {profile.athlete_name}&apos;s profile</a>
              </Button>
              <Button asChild variant="outline" size="sm" className="border-[#1e3a5f] text-gray-300 hover:bg-[#1e3a5f] hover:text-white">
                <a href={`/athletes/${profile.athlete_id}/edit`}>Edit profile</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
