"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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
}: {
  athleteId: string
  athleteName: string
  initial: ProfileSetupValues
  mode: "verify" | "create"
}) {
  const router = useRouter()
  const [v, setV] = useState<ProfileSetupValues>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

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
            ? "We built this from his results. Correct anything wrong and add what is missing."
            : "Five things make the profile. The rest is optional and can wait."}
        </p>
      </div>

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
          <h2 className="font-semibold text-white">Academics<Optional /></h2>
          <p className="mt-1 text-sm text-white/50">The first thing a college coach asks after results.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-white">GPA</Label>
            <Input value={v.gpa} onChange={(e) => set("gpa", e.target.value)} placeholder="3.8" />
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
          <Label className="text-white">What he wants to study</Label>
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
          <h2 className="font-semibold text-white">Contact<Optional /></h2>
          <p className="mt-1 text-sm text-white/50">
            Released only to verified college coaches. Use a parent&apos;s details if you would rather.
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
