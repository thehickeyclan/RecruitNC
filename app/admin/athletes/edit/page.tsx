"use client"

/**
 * Admin edit athlete - Modern CRM-style contact editor
 * Mobile-first design with collapsible sections, dark theme, and 44px+ touch targets
 */
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { updateAthleteAction } from "@/lib/athlete-actions"
import { AdminCollegeCommitmentWizard } from "@/components/admin-college-commitment-wizard"
import { ContactFormSections } from "./contact-form-sections"
import {
  ArrowLeft,
  Sparkles,
  GraduationCap,
  ExternalLink,
  ImagePlus,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react"
import Link from "next/link"

export default function EditAthletePage() {
  const [id, setId] = useState("")
  const [athlete, setAthlete] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveTimestamp, setSaveTimestamp] = useState<string | null>(null)
  const [generatingBio, setGeneratingBio] = useState(false)
  const [editableBio, setEditableBio] = useState("")
  const [editableHeadline, setEditableHeadline] = useState("")
  const [commitmentWizardOpen, setCommitmentWizardOpen] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (typeof window === "undefined") return
    const q = new URLSearchParams(window.location.search).get("id")?.trim() ?? ""
    setId(q)
  }, [])

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    async function fetchAthlete() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/admin/athletes/${encodeURIComponent(id)}`, { credentials: "include" })
        const result = await res.json().catch(() => ({}))
        if (!res.ok || !result.success) {
          throw new Error(result.error || "Athlete not found")
        }
        setAthlete(result.data)
        setEditableBio(result.data.bio || "")
        setEditableHeadline(result.data.bio_headline || "")
      } catch (error) {
        console.error("Error fetching athlete:", error)
        setError("Failed to load athlete data. Please try again.")
        toast({
          title: "Error",
          description: "Failed to load athlete data",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
    fetchAthlete()
  }, [id, toast])

  const handleGenerateBio = async () => {
    try {
      setGeneratingBio(true)
      const response = await fetch(`/api/athletes/${id}/generate-bio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      if (!response.ok) throw new Error("Failed to generate bio")
      const data = await response.json()
      setAthlete((prev: any) => ({ ...prev, bio: data.bio, bio_headline: data.headline }))
      setEditableBio(data.bio)
      setEditableHeadline(data.headline)
      toast({ title: "Success", description: "AI bio generated!" })
    } catch (error) {
      console.error("Error generating bio:", error)
      toast({ title: "Error", description: "Failed to generate bio", variant: "destructive" })
    } finally {
      setGeneratingBio(false)
    }
  }

  const handleSubmit = async (data: any) => {
    try {
      setSaveSuccess(false)
      const requiredFields = ["firstName", "lastName", "gender"]
      const missingFields = requiredFields.filter((field) => !data[field])
      if (missingFields.length > 0) {
        if (data.name && (missingFields.includes("firstName") || missingFields.includes("lastName"))) {
          const nameParts = data.name.split(" ")
          if (nameParts.length >= 2) {
            if (!data.firstName) data.firstName = nameParts[0]
            if (!data.lastName) data.lastName = nameParts.slice(1).join(" ")
          }
        }
        if (missingFields.includes("gender")) data.gender = "Male"
      }
      if (data.achievements && typeof data.achievements === "string") {
        data.achievements = data.achievements.split(",").map((item: string) => item.trim()).filter(Boolean)
      }
      if (editableBio !== undefined) data.bio = editableBio
      if (editableHeadline !== undefined) data.bio_headline = editableHeadline

      const result = await updateAthleteAction(id, data)
      if (!result.success) throw new Error(result.error || "Failed to update athlete")

      setSaveSuccess(true)
      setSaveTimestamp(new Date().toLocaleString())
      setAthlete(result.data)
      if (result.data) {
        setEditableBio(result.data.bio || "")
        setEditableHeadline(result.data.bio_headline || "")
      }
      toast({ title: "Saved", description: `${data.firstName} ${data.lastName} updated` })
      router.refresh()
    } catch (error) {
      console.error("Error updating athlete:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save",
        variant: "destructive",
      })
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#061224]">
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-[#C8A94A]" />
            <p className="text-white/60">Loading athlete...</p>
          </div>
        </div>
      </div>
    )
  }

  // No ID state
  if (!id) {
    return (
      <div className="min-h-screen bg-[#061224] px-4 py-8">
        <div className="mx-auto max-w-2xl text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-[#C8A94A]" />
          <h1 className="mt-4 text-xl font-bold text-white">No athlete selected</h1>
          <p className="mt-2 text-white/60">Open this page from the athletes directory.</p>
          <Link
            href="/admin/athletes"
            className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#C8A94A] px-6 font-semibold text-[#061224] hover:bg-[#d4b75c]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Athletes
          </Link>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[#061224] px-4 py-8">
        <div className="mx-auto max-w-2xl text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <h1 className="mt-4 text-xl font-bold text-white">Error loading athlete</h1>
          <p className="mt-2 text-white/60">{error}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#C8A94A] px-6 font-semibold text-[#061224] hover:bg-[#d4b75c]"
            >
              Try Again
            </button>
            <Link
              href="/admin/athletes"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-white/20 px-6 font-semibold text-white hover:bg-white/10"
            >
              Back to Athletes
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Not found state
  if (!athlete) {
    return (
      <div className="min-h-screen bg-[#061224] px-4 py-8">
        <div className="mx-auto max-w-2xl text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-[#C8A94A]" />
          <h1 className="mt-4 text-xl font-bold text-white">Athlete not found</h1>
          <Link
            href="/admin/athletes"
            className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#C8A94A] px-6 font-semibold text-[#061224] hover:bg-[#d4b75c]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Athletes
          </Link>
        </div>
      </div>
    )
  }

  const displayName = athlete.name || `${athlete.firstName || ""} ${athlete.lastName || ""}`.trim() || "Athlete"

  return (
    <div className="min-h-screen bg-[#061224]">
      {/* Sticky header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#061224]/95 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/admin/athletes"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-white/15 text-white/70 hover:border-[#C8A94A]/50 hover:bg-white/5 hover:text-white"
              aria-label="Back to athletes"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex-1 truncate">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#C8A94A]">Editing</p>
              <h1 className="truncate text-lg font-bold text-white">{displayName}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/view-profile?id=${encodeURIComponent(id)}`}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-white/15 text-white/70 hover:border-[#C8A94A]/50 hover:bg-white/5 hover:text-white"
                aria-label="View profile"
              >
                <ExternalLink className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Quick actions bar */}
      <div className="border-b border-white/10 bg-[#0B2545]">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCommitmentWizardOpen(true)}
              className="flex min-h-[44px] items-center gap-2 rounded-lg bg-[#C8A94A] px-4 text-sm font-semibold text-[#061224] hover:bg-[#d4b75c]"
            >
              <GraduationCap className="h-4 w-4" />
              College Commitment
            </button>
            <Link
              href={`/admin/athletes/images/${id}`}
              className="flex min-h-[44px] items-center gap-2 rounded-lg border border-white/20 px-4 text-sm font-semibold text-white hover:bg-white/10"
            >
              <ImagePlus className="h-4 w-4" />
              Upload Images
            </Link>
            <button
              onClick={handleGenerateBio}
              disabled={generatingBio}
              className="flex min-h-[44px] items-center gap-2 rounded-lg border border-white/20 px-4 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              {generatingBio ? "Generating..." : "AI Bio"}
            </button>
          </div>
        </div>
      </div>

      {/* Success banner */}
      {saveSuccess && (
        <div className="border-b border-emerald-500/30 bg-emerald-500/10">
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
            <p className="text-sm text-emerald-300">
              Saved successfully{saveTimestamp ? ` at ${saveTimestamp}` : ""}
            </p>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="mx-auto max-w-3xl px-4 py-6">
        {/* Status badges */}
        <div className="mb-6 flex flex-wrap gap-2">
          {athlete.weightclass && (
            <span className="rounded-full bg-[#C8A94A] px-3 py-1 text-xs font-bold text-[#061224]">
              {athlete.weightclass} lbs
            </span>
          )}
          {athlete.graduationyear && (
            <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
              Class of {athlete.graduationyear}
            </span>
          )}
          {athlete.highschool && (
            <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
              {athlete.highschool}
            </span>
          )}
          {athlete.recruiting_status && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                athlete.recruiting_status.toLowerCase() === "committed" ||
                athlete.recruiting_status.toLowerCase() === "college athlete"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-amber-500/20 text-amber-400"
              }`}
            >
              {athlete.recruiting_status}
            </span>
          )}
        </div>

        {/* Bio section */}
        <div className="mb-6 rounded-xl border border-white/10 bg-[#0B2545] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#C8A94A]">
            <Sparkles className="h-4 w-4" />
            AI Bio & Headline
          </div>
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-white/50">
                Headline
              </label>
              <input
                type="text"
                value={editableHeadline}
                onChange={(e) => setEditableHeadline(e.target.value)}
                placeholder="Name, School — Achievements"
                className="w-full rounded-lg border border-white/15 bg-[#061224] px-4 py-3 text-white placeholder:text-white/30 focus:border-[#C8A94A] focus:outline-none focus:ring-1 focus:ring-[#C8A94A]/50"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-white/50">
                Bio
              </label>
              <textarea
                value={editableBio}
                onChange={(e) => setEditableBio(e.target.value)}
                placeholder="Athlete biography..."
                rows={4}
                className="w-full rounded-lg border border-white/15 bg-[#061224] px-4 py-3 text-white placeholder:text-white/30 focus:border-[#C8A94A] focus:outline-none focus:ring-1 focus:ring-[#C8A94A]/50"
              />
            </div>
          </div>
        </div>

        {/* Form sections */}
        <ContactFormSections
          initialData={athlete}
          onSubmit={handleSubmit}
          editableBio={editableBio}
          editableHeadline={editableHeadline}
        />
      </main>

      {/* College commitment wizard */}
      <AdminCollegeCommitmentWizard
        open={commitmentWizardOpen}
        onOpenChange={setCommitmentWizardOpen}
        athleteId={id}
        athleteName={displayName}
        onSuccess={(data) => {
          setAthlete((prev: any) => ({
            ...prev,
            college: data.collegeName,
            college_id: data.collegeId,
            commitmentdate: data.commitmentDate,
            recruiting_status: "Committed",
          }))
          toast({ title: "Success", description: "College commitment saved!" })
        }}
      />
    </div>
  )
}
