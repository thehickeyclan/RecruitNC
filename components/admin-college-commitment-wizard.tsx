"use client"

import { useEffect, useState } from "react"
import {
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ImageIcon,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { ImageUpload } from "@/components/image-upload"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { updateAthleteAction } from "@/lib/athlete-actions"
import { mappedAthleteToFormUpdatePayload } from "@/lib/mapped-athlete-update-payload"
import { COLLEGE_WEIGHT_CLASSES } from "@/lib/college-weight-classes"
import { COLLEGE_DIVISION_OPTIONS } from "@/types/college"
import type { Athlete } from "@/types/athlete"

const STEPS = 4

type CollegeListRow = {
  id: string
  name: string
  division: string
  logo_url: string | null
}

interface AdminCollegeCommitmentWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  athleteId: string
  athlete: Athlete & Record<string, unknown>
  /** Current draft bio fields from the edit page (same as main save). */
  headlineDraft: string
  bioDraft: string
  onSaved: (mapped: Athlete & Record<string, unknown>) => void
}

async function syncCollegeLogoMapping(collegeName: string, logoUrl: string) {
  const fd = new FormData()
  fd.append("entityName", collegeName)
  fd.append("entityType", "college")
  fd.append("logoUrl", logoUrl)
  const res = await fetch("/api/upload-entity-logo", { method: "POST", body: fd, credentials: "include" })
  return res.ok
}

export function AdminCollegeCommitmentWizard({
  open,
  onOpenChange,
  athleteId,
  athlete,
  headlineDraft,
  bioDraft,
  onSaved,
}: AdminCollegeCommitmentWizardProps) {
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [collegeList, setCollegeList] = useState<CollegeListRow[]>([])
  const [collegeId, setCollegeId] = useState<string>("")
  const [commitmentDate, setCommitmentDate] = useState("")
  const [collegeWeight, setCollegeWeight] = useState("")
  const [commitmentPhotoUrl, setCommitmentPhotoUrl] = useState("")
  const [showAddCollege, setShowAddCollege] = useState(false)
  const [newCollegeName, setNewCollegeName] = useState("")
  const [newCollegeDivision, setNewCollegeDivision] = useState("NCAA Division I")
  const [addingCollege, setAddingCollege] = useState(false)
  const [skippedCollegeLogo, setSkippedCollegeLogo] = useState(false)

  const genderKey = (athlete.gender === "Female" ? "Female" : "Male") as keyof typeof COLLEGE_WEIGHT_CLASSES
  const weightOptions = COLLEGE_WEIGHT_CLASSES[genderKey] || COLLEGE_WEIGHT_CLASSES.Male

  const selectedCollege = collegeList.find((c) => c.id === collegeId) ?? null
  const hasCollegeLogo = Boolean(selectedCollege?.logo_url?.trim())

  useEffect(() => {
    setSkippedCollegeLogo(false)
  }, [collegeId])

  useEffect(() => {
    if (!open) return

    setStep(1)
    setSaving(false)
    setShowAddCollege(false)
    setNewCollegeName("")
    setNewCollegeDivision("NCAA Division I")
    setSkippedCollegeLogo(false)
    const id = (athlete.college_id as string) || ""
    const name = (athlete.college as string) || ""
    setCollegeId(id)
    setCommitmentDate(
      (athlete.commitmentDate as string) ||
        (athlete.commitmentdate as string) ||
        new Date().toISOString().split("T")[0],
    )
    setCollegeWeight((athlete.college_weight_class as string) || "")
    setCommitmentPhotoUrl((athlete.commitmentPhotoUrl as string) || "")

    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/admin/colleges", { cache: "no-store" })
        const data = await res.json()
        if (cancelled) return
        if (data.success && Array.isArray(data.colleges)) {
          const list: CollegeListRow[] = data.colleges.map(
            (c: { id: string; name: string; division?: string; logo_url?: string | null }) => ({
              id: c.id,
              name: c.name,
              division: c.division ?? "",
              logo_url: c.logo_url ?? null,
            }),
          )
          setCollegeList(list)
          if (id) {
            const match = list.find((c) => c.id === id)
            if (!match && name) {
              const byName = list.find((c) => c.name.trim().toLowerCase() === name.trim().toLowerCase())
              if (byName) setCollegeId(byName.id)
            }
          } else if (name && !id) {
            const byName = list.find((c) => c.name.trim().toLowerCase() === name.trim().toLowerCase())
            if (byName) setCollegeId(byName.id)
          }
        }
      } catch {
        if (!cancelled) {
          toast({ title: "Could not load colleges", variant: "destructive" })
        }
      }
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initialize once per dialog open
  }, [open])

  const selectedCollegeName = selectedCollege?.name ?? ""

  const canNext = (() => {
    if (step === 1) {
      if (!collegeId.trim()) return false
      if (!selectedCollege) return false
      return hasCollegeLogo || skippedCollegeLogo
    }
    if (step === 2) return commitmentDate.trim().length > 0
    if (step === 3) return collegeWeight.trim().length > 0
    return true
  })()

  const handleAddCollege = async () => {
    const name = newCollegeName.trim()
    if (!name) {
      toast({ title: "Enter a school name", variant: "destructive" })
      return
    }
    setAddingCollege(true)
    try {
      const res = await fetch("/api/admin/colleges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, division: newCollegeDivision.trim() }),
      })
      const data = await res.json()
      if (!data.success || !data.college) {
        toast({ title: "Could not add school", description: data.error || "Try again.", variant: "destructive" })
        return
      }
      const row = data.college as { id: string; name: string; division?: string; logo_url?: string | null }
      const newRow: CollegeListRow = {
        id: row.id,
        name: row.name,
        division: row.division ?? "",
        logo_url: row.logo_url ?? null,
      }
      setCollegeList((prev) => [...prev.filter((c) => c.id !== newRow.id), newRow].sort((a, b) => a.name.localeCompare(b.name)))
      setCollegeId(newRow.id)
      setNewCollegeName("")
      setShowAddCollege(false)
      setSkippedCollegeLogo(false)
      toast({
        title: "School added",
        description: `${row.name} is selected. Upload a logo below (recommended).`,
      })
    } catch {
      toast({ title: "Could not add school", variant: "destructive" })
    } finally {
      setAddingCollege(false)
    }
  }

  const handleCollegeLogoUploaded = async (url: string) => {
    if (!collegeId || !selectedCollegeName) return
    try {
      const patch = await fetch(`/api/admin/colleges/${encodeURIComponent(collegeId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ logo_url: url }),
      })
      const pj = await patch.json()
      if (!pj.success) throw new Error(pj.error || "Could not attach logo to school")

      const mappedOk = await syncCollegeLogoMapping(selectedCollegeName, url)
      if (!mappedOk) {
        console.warn("[RecruitNC] College logo saved on row but logo_mappings sync failed")
      }

      setCollegeList((prev) => prev.map((c) => (c.id === collegeId ? { ...c, logo_url: url } : c)))
      setSkippedCollegeLogo(false)
      toast({ title: "College logo saved", description: "Used for commitments and college lookups." })
    } catch (e) {
      toast({
        title: "Logo upload failed",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      })
    }
  }

  const handleSave = async () => {
    if (!collegeId || !commitmentDate || !collegeWeight) {
      toast({ title: "Complete all steps", description: "College, date, and weight are required.", variant: "destructive" })
      return
    }
    if (!selectedCollegeName) {
      toast({ title: "Select a college", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      const base = mappedAthleteToFormUpdatePayload(athlete)
      const payload = {
        ...base,
        recruiting_status: "Committed",
        is_prospect: false,
        college_id: collegeId,
        college: selectedCollegeName,
        commitmentDate,
        college_weight_class: collegeWeight,
        commitmentPhotoUrl: commitmentPhotoUrl.trim() || (base.commitmentPhotoUrl as string) || null,
        bio: bioDraft ?? base.bio,
        bio_headline: headlineDraft ?? base.bio_headline,
      }

      const result = await updateAthleteAction(athleteId, payload)
      if (!result.success) throw new Error(result.error || "Save failed")

      const metaAtSave = collegeList.find((c) => c.id === collegeId)
      let extras = ""
      if (metaAtSave && !metaAtSave.logo_url?.trim() && skippedCollegeLogo) {
        extras = " This school still has no logo — add one from Admin → Colleges when you can."
      }
      toast({
        title: "Commitment saved",
        description: `${athlete.firstName ?? ""} ${athlete.lastName ?? ""} is committed to ${selectedCollegeName}.${extras}`,
      })
      if (result.data) onSaved(result.data as Athlete & Record<string, unknown>)
      onOpenChange(false)
    } catch (e) {
      toast({
        title: "Could not save",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const collegeLogoEntitySlug = selectedCollegeName
    ? selectedCollegeName.replace(/\s+/g, "-").toLowerCase().replace(/[^a-z0-9-]/g, "")
    : "college"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border-2 border-[#002147]/20 p-0 gap-0">
        <div className="bg-gradient-to-br from-[#002147] via-[#002952] to-[#003366] px-6 pt-6 pb-5 text-white">
          <DialogHeader className="text-left space-y-2">
            <div className="flex items-center gap-2 text-[#f0d77a]">
              <GraduationCap className="h-6 w-6" aria-hidden />
              <span className="text-xs font-semibold uppercase tracking-widest">RecruitNC</span>
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-semibold text-white">College commitment</DialogTitle>
            <DialogDescription className="text-white/85 text-sm">
              Step {step} of {STEPS} — everything here: school list, logo, dates, and announcement photo.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex gap-1.5">
            {Array.from({ length: STEPS }, (_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${i < step ? "bg-[#f0d77a]" : "bg-white/25"}`}
              />
            ))}
          </div>
        </div>

        <div className="px-6 py-6 space-y-5 bg-gradient-to-b from-[#fefdfb] to-white">
          {step === 1 && (
            <div className="space-y-4">
              {showAddCollege ? (
                <div className="rounded-xl border-2 border-[#c9a227]/50 bg-[#fffbf0] p-4 space-y-3">
                  <div className="flex items-center gap-2 text-[#002147] font-semibold text-sm">
                    <Plus className="h-4 w-4 shrink-0" />
                    Add a school to the directory
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Creates the same row as Admin → Colleges. It appears in this dropdown immediately.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="wiz-new-college-name">School name</Label>
                    <Input
                      id="wiz-new-college-name"
                      value={newCollegeName}
                      onChange={(e) => setNewCollegeName(e.target.value)}
                      placeholder="e.g. Lincoln University"
                      className="border-[#002147]/25 bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>NCAA / division</Label>
                    <Select value={newCollegeDivision} onValueChange={setNewCollegeDivision}>
                      <SelectTrigger className="border-[#002147]/25 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-[240px]">
                        {COLLEGE_DIVISION_OPTIONS.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      className="bg-[#002147] hover:bg-[#001a35] text-white"
                      disabled={addingCollege}
                      onClick={handleAddCollege}
                    >
                      {addingCollege ? "Adding…" : "Add & select school"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowAddCollege(false)} disabled={addingCollege}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full border-[#c9a227]/60 text-[#002147] hover:bg-[#fffbf0]"
                  onClick={() => setShowAddCollege(true)}
                >
                  <Plus className="h-4 w-4 mr-2 shrink-0" />
                  School not in the list? Add name &amp; division here
                </Button>
              )}

              <div className="space-y-2">
                <Label className="text-[#002147] font-medium">Which college?</Label>
                <Select value={collegeId || undefined} onValueChange={setCollegeId}>
                  <SelectTrigger className="border-[#002147]/25">
                    <SelectValue placeholder="Choose a school" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[280px]">
                    {collegeList.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {collegeId && selectedCollege && (
                <div className="space-y-3 pt-1">
                  {hasCollegeLogo ? (
                    <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-emerald-900">Logo on file</p>
                        {/* eslint-disable-next-line @next/next/no-img-element -- admin preview; external URL */}
                        <img
                          src={selectedCollege.logo_url!}
                          alt=""
                          className="mt-2 h-12 w-auto max-w-[120px] object-contain rounded border bg-white p-1"
                        />
                      </div>
                    </div>
                  ) : (
                    <Alert className="border-[#B31B1B]/40 bg-[#fff5f5]">
                      <AlertTriangle className="h-4 w-4 text-[#B31B1B]" />
                      <AlertTitle className="text-[#002147]">No logo for this school yet</AlertTitle>
                      <AlertDescription className="space-y-3 text-muted-foreground">
                        <p className="text-sm">
                          Upload a mark so commitment cards and profiles don&apos;t fall back to a generic logo. This updates
                          the college record and logo lookup — you don&apos;t need the enhanced logo manager.
                        </p>
                        <div className="rounded-lg border border-[#002147]/10 bg-white p-3">
                          <div className="flex items-center gap-2 text-[#002147] text-sm font-medium mb-2">
                            <ImageIcon className="h-4 w-4" />
                            College logo upload
                          </div>
                          <ImageUpload
                            category="colleges"
                            onUploadComplete={handleCollegeLogoUploaded}
                            existingImageUrl={undefined}
                            entityName={collegeLogoEntitySlug || "college"}
                            aspectRatio="square"
                          />
                        </div>
                        <label className="flex items-start gap-2 cursor-pointer text-sm text-[#002147]">
                          <Checkbox
                            checked={skippedCollegeLogo}
                            onCheckedChange={(v) => setSkippedCollegeLogo(v === true)}
                            className="mt-0.5 border-[#002147]/40"
                          />
                          <span>Continue without a logo for now (you can add it later under Admin → Colleges).</span>
                        </label>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <Label htmlFor="wiz-commit-date" className="text-[#002147] font-medium">
                Commitment date
              </Label>
              <Input
                id="wiz-commit-date"
                type="date"
                value={commitmentDate}
                onChange={(e) => setCommitmentDate(e.target.value)}
                className="border-[#002147]/25"
              />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <Label className="text-[#002147] font-medium">Anticipated college weight</Label>
              <Select value={collegeWeight || undefined} onValueChange={setCollegeWeight}>
                <SelectTrigger className="border-[#002147]/25">
                  <SelectValue placeholder="Select weight class" />
                </SelectTrigger>
                <SelectContent className="max-h-[280px]">
                  {weightOptions.map((w) => (
                    <SelectItem key={w.value} value={w.value}>
                      {w.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Based on athlete gender ({genderKey}).</p>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <Label className="text-[#002147] font-medium">Commitment picture</Label>
              <ImageUpload
                category="commitment"
                onUploadComplete={(url) => setCommitmentPhotoUrl(url)}
                existingImageUrl={commitmentPhotoUrl || undefined}
                entityName={`${athlete.firstName ?? "athlete"}-${athlete.lastName ?? "commitment"}-wizard`}
                aspectRatio="announcement"
              />
              <p className="text-xs text-muted-foreground">Optional — announcement graphic for the athlete.</p>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-3 pt-2 border-t border-[#002147]/10">
            <Button
              type="button"
              variant="outline"
              className="border-[#002147]/30 text-[#002147] hover:bg-[#002147]/5"
              disabled={step <= 1 || saving}
              onClick={() => setStep((s) => Math.max(1, s - 1))}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>

            {step < STEPS ? (
              <Button
                type="button"
                className="bg-[#B31B1B] hover:bg-[#8B1515] text-white shadow-md"
                disabled={!canNext || saving}
                onClick={() => setStep((s) => Math.min(STEPS, s + 1))}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                type="button"
                className="bg-[#002147] hover:bg-[#001a35] text-white shadow-md gap-1.5"
                disabled={saving}
                onClick={handleSave}
              >
                {saving ? "Saving…" : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Save commitment
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
