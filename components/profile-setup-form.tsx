"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Camera, Eye, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { isHeic, preparePhoto } from "@/lib/images/prepare-photo"

/**
 * The one form behind every door.
 *
 * Six entry points each had their own idea of what a free profile needs, which is why nothing
 * about claiming felt predictable. This is the field set: the five things that make a profile a
 * profile, then everything a college coach asks for next, marked optional and asked once.
 *
 * The reminder that a coach is the reader stays on screen rather than sitting in small print,
 * because it is the reason to fill any of it in and the reason to think before doing so.
 */

export type ProfileSetupValues = {
  firstName: string
  lastName: string
  highSchool: string
  club: string
  graduationYear: string
  weightClass: string
  gpa: string
  sat: string
  act: string
  academicInterest: string
  instagram: string
  cell: string
  email: string
  apClasses: boolean
  honorsClasses: boolean
}

export const EMPTY_PROFILE_SETUP: ProfileSetupValues = {
  firstName: "", lastName: "", highSchool: "", club: "", graduationYear: "", weightClass: "",
  gpa: "", sat: "", act: "", academicInterest: "", instagram: "", cell: "", email: "",
  apClasses: false, honorsClasses: false,
}

export function ProfileSetupForm({
  athleteId,
  athleteName,
  initial,
  mode,
  photoUrl = null,
  gender = null,
  asParent = false,
}: {
  athleteId: string
  athleteName: string
  initial: ProfileSetupValues
  mode: "verify" | "create"
  /** The photo already on the profile, if any. */
  photoUrl?: string | null
  gender?: string | null
  /** A parent filling it in for a child: "your wrestler", not "you". */
  asParent?: boolean
}) {
  const router = useRouter()
  const [v, setV] = useState<ProfileSetupValues>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const female = /^f/i.test(gender ?? "")
  const his = female ? "her" : "his"
  const first = athleteName.trim().split(/\s+/)[0] || "your wrestler"
  const yourWrestler = asParent ? first : "you"

  /*
   * Photo first (Matt, 30 Oct 2026: "do we tell them to add a picture, update academic info and
   * leave their contact info?"). A claim used to land on name/school/weight - things we already
   * had - and the photo was not on the page at all. It uploads on pick, so it is saved even if
   * nothing else is.
   */
  const [photo, setPhoto] = useState<string | null>(photoUrl)
  const [uploading, setUploading] = useState(false)
  const [photoError, setPhotoError] = useState("")
  const fileInput = useRef<HTMLInputElement>(null)
  const pickPhoto = async (file: File | undefined) => {
    if (!file) return
    setPhotoError("")
    if (!file.type.startsWith("image/") && !isHeic(file)) return setPhotoError("That file is not a photo.")
    // Photos are shrunk in the browser before they go up (lib/images/prepare-photo.ts).
    if (file.size > 25 * 1024 * 1024) return setPhotoError("That photo is over 25MB. Pick a smaller one.")
    setUploading(true)
    try {
      const form = new FormData()
      form.append("file", await preparePhoto(file))
      form.append("athleteId", athleteId)
      form.append("category", "profile")
      const res = await fetch("/api/athletes/upload-image", { method: "POST", body: form, credentials: "include" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) throw new Error(data.error || "")
      setPhoto(data.url)
    } catch (err) {
      setPhotoError(err instanceof Error && err.message ? err.message : "The photo did not upload. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  const set = <K extends keyof ProfileSetupValues>(k: K, val: ProfileSetupValues[K]) =>
    setV((p) => ({ ...p, [k]: val }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSaving(true)
    try {
      const res = await fetch(`/api/athletes/${encodeURIComponent(athleteId)}/profile-setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(v),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "That did not save. Please try again.")
        return
      }
      router.push(`/view-profile?id=${encodeURIComponent(athleteId)}`)
    } catch {
      setError("That did not save. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const Optional = () => <span className="font-normal text-white/40"> (optional)</span>

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl space-y-8">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#D3B574]">
          {mode === "verify" ? "Check this is right" : "Build the profile"}
        </p>
        <h1 className="mt-2 text-3xl font-black text-white">
          {mode === "verify" ? athleteName : "A few details"}
        </h1>
        <p className="mt-2 text-white/60">
          {mode === "verify"
            ? `We built this from ${his} results. Add the three things coaches look for next, and correct anything wrong.`
            : "Five things make the profile. Then the three things coaches look for next."}
        </p>
      </div>

      {/* What is still missing, at a glance: the three things only the family can add. */}
      <ul className="grid grid-cols-3 gap-2 text-center text-xs font-semibold">
        {[
          ["Photo", Boolean(photo)],
          ["GPA", Boolean(v.gpa.trim())],
          ["Contact", Boolean(v.cell.trim() || v.email.trim())],
        ].map(([label, done]) => (
          <li key={String(label)} className={`rounded-lg border px-2 py-2 ${done ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300" : "border-white/15 bg-white/5 text-white/70"}`}>
            {done ? "✓ " : ""}{label}
          </li>
        ))}
      </ul>

      <section className="space-y-3">
        <div>
          <h2 className="font-semibold text-white">Photo</h2>
          <p className="mt-1 text-sm text-white/50">
            The first thing a coach sees. A clear photo of {asParent ? first : "you"}, wrestling or a headshot.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- Blob photo URL
            <img src={photo} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
          ) : (
            <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-white/5 text-white/30">
              <Camera className="h-7 w-7" aria-hidden />
            </span>
          )}
          <div>
            <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => void pickPhoto(e.target.files?.[0])} />
            <Button type="button" variant="outline" disabled={uploading} onClick={() => fileInput.current?.click()} className="min-h-[44px] border-white/25 bg-transparent text-white hover:bg-white/10">
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
              {photo ? "Change photo" : "Add a photo"}
            </Button>
            {photoError ? <p className="mt-2 text-sm text-red-300">{photoError}</p> : null}
          </div>
        </div>
      </section>

      <div className="flex items-start gap-3 rounded-lg border border-[#D3B574]/40 bg-[#D3B574]/10 p-4">
        <Eye className="mt-0.5 h-5 w-5 shrink-0 text-[#D3B574]" aria-hidden />
        <p className="text-sm text-white/80">
          <strong className="text-white">College coaches read this page.</strong> Results, school,
          class and weight are public. Contact details are released only to coaches we have
          verified.
        </p>
      </div>

      <section className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-white">First name</Label>
            <Input value={v.firstName} onChange={(e) => set("firstName", e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label className="text-white">Last name</Label>
            <Input value={v.lastName} onChange={(e) => set("lastName", e.target.value)} required />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-white">High school</Label>
          <Input value={v.highSchool} onChange={(e) => set("highSchool", e.target.value)} required />
        </div>
        <div className="space-y-2">
          {/* Plenty of wrestlers are school-only. Blank is the answer, and there is nothing to tick. */}
          <Label className="text-white">
            Club<span className="font-normal text-white/40"> (optional)</span>
          </Label>
          <Input
            value={v.club}
            onChange={(e) => set("club", e.target.value)}
            placeholder="Leave blank if school only"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-white">Graduating class</Label>
            <Input
              type="number"
              min={2024}
              max={2035}
              value={v.graduationYear}
              onChange={(e) => set("graduationYear", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white">Weight class</Label>
            <Input value={v.weightClass} onChange={(e) => set("weightClass", e.target.value)} required />
          </div>
        </div>
      </section>

      <section className="space-y-4 border-t border-white/10 pt-6">
        <div>
          <h2 className="font-semibold text-white">Academics</h2>
          <p className="mt-1 text-sm text-white/50">The first thing a college coach asks after results. Coaches filter by GPA.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-white">GPA</Label>
            <Input value={v.gpa} onChange={(e) => set("gpa", e.target.value)} placeholder="e.g. 3.8" />
          </div>
          <div className="space-y-2">
            <Label className="text-white">SAT</Label>
            <Input value={v.sat} onChange={(e) => set("sat", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-white">ACT</Label>
            <Input value={v.act} onChange={(e) => set("act", e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-white">What {asParent ? `${first} wants` : "you want"} to study<Optional /></Label>
          <Input
            value={v.academicInterest}
            onChange={(e) => set("academicInterest", e.target.value)}
            placeholder="Engineering, business, undecided…"
          />
        </div>
        <div className="flex flex-wrap gap-5">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-white/80">
            <input type="checkbox" checked={v.apClasses} onChange={(e) => set("apClasses", e.target.checked)} className="h-4 w-4" />
            Takes AP classes
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-white/80">
            <input type="checkbox" checked={v.honorsClasses} onChange={(e) => set("honorsClasses", e.target.checked)} className="h-4 w-4" />
            Takes Honors classes
          </label>
        </div>
      </section>

      <section className="space-y-4 border-t border-white/10 pt-6">
        <div>
          <h2 className="font-semibold text-white">Contact</h2>
          <p className="mt-1 text-sm text-white/50">
            How a coach reaches {yourWrestler}. Released only to verified college coaches.{" "}
            {asParent ? "Use yours, your wrestler's, or both." : "Use a parent's details if you would rather."}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-white">Cell</Label>
            <Input type="tel" value={v.cell} onChange={(e) => set("cell", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-white">Email</Label>
            <Input type="email" value={v.email} onChange={(e) => set("email", e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-white">Instagram</Label>
          <Input value={v.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="@handle" />
        </div>
      </section>

      {error && <p className="rounded-md bg-red-950 p-3 text-sm text-red-200">{error}</p>}

      <div className="flex flex-wrap items-center gap-4 border-t border-white/10 pt-6">
        <Button type="submit" disabled={saving} className="bg-[#B31B1B] text-white hover:bg-[#8f1616]">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {mode === "verify" ? "Save and view the profile" : "Create the profile"}
        </Button>
        <p className="text-sm text-white/50">You can change any of this later.</p>
      </div>
    </form>
  )
}
