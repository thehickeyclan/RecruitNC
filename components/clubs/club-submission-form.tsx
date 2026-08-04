"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { CheckCircle2, Facebook, Instagram, Loader2, MapPin, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type ClubSubmissionFormProps = {
  isSignedIn: boolean
  userName: string
  userEmail: string
}

const PROGRAMS = [
  { key: "hasYouth", label: "Youth" },
  { key: "hasMiddleSchool", label: "Middle school" },
  { key: "hasHighSchool", label: "High school" },
  { key: "hasMens", label: "Men / boys" },
  { key: "hasWomens", label: "Women / girls" },
  { key: "hasFreestyleGreco", label: "Freestyle / Greco" },
] as const

export function ClubSubmissionForm({ isSignedIn, userName, userEmail }: ClubSubmissionFormProps) {
  const [pending, setPending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [programs, setPrograms] = useState<Record<string, boolean>>({})

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const form = new FormData(event.currentTarget)
    const payload = Object.fromEntries(form.entries())
    for (const program of PROGRAMS) {
      payload[program.key] = String(Boolean(programs[program.key]))
    }

    const response = await fetch("/api/clubs/submissions", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    const data = await response.json().catch(() => ({}))
    setPending(false)

    if (!response.ok) {
      setError(data.error ?? "Unable to submit club right now.")
      return
    }

    setSuccess(true)
  }

  if (!isSignedIn) {
    return (
      <div className="rounded-sm border border-[#D7B968]/30 bg-[#061427]/90 p-6 shadow-2xl shadow-black/30">
        <ShieldCheck className="h-10 w-10 text-[#D7B968]" />
        <h2 className="mt-4 text-3xl font-black text-white">Sign in to submit a club</h2>
        <p className="mt-3 text-white/70">
          Club submissions require a free RecruitNC account so we know who submitted the information and can follow up
          before approving it for the public map.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/auth/signin?returnTo=/clubs/submit"
            className="inline-flex min-h-12 items-center justify-center rounded-sm bg-[#CC0000] px-6 py-3 font-bold text-white hover:bg-[#a80000]"
          >
            Sign in
          </Link>
          <Link
            href="/auth/signup?returnTo=/clubs/submit"
            className="inline-flex min-h-12 items-center justify-center rounded-sm border border-white/20 px-6 py-3 font-bold text-white hover:bg-white/10"
          >
            Create free account
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="rounded-sm border border-emerald-400/30 bg-emerald-950/30 p-6 shadow-2xl shadow-black/30">
        <CheckCircle2 className="h-10 w-10 text-emerald-300" />
        <h2 className="mt-4 text-3xl font-black text-white">Club submitted for review</h2>
        <p className="mt-3 text-white/70">
          We’ll review the address, programs, and contact info before it appears on the public club map.
        </p>
        <Link
          href="/clubs"
          className="mt-6 inline-flex min-h-12 items-center justify-center rounded-sm bg-[#D7B968] px-6 py-3 font-bold text-[#061427] hover:bg-[#e7ca78]"
        >
          Back to club map
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="rounded-sm border border-white/10 bg-[#061427]/90 p-5 shadow-2xl shadow-black/30 sm:p-7">
      <div className="flex items-start gap-3 border-b border-white/10 pb-5">
        <MapPin className="mt-1 h-6 w-6 text-[#D7B968]" />
        <div>
          <h2 className="text-2xl font-black text-white">Submit a club for the RecruitNC map</h2>
          <p className="mt-1 text-sm text-white/55">
            Submitting as {userName || userEmail}. New clubs stay pending until an admin approves them.
          </p>
        </div>
      </div>

      {error ? (
        <div className="mt-5 rounded-sm border border-red-400/30 bg-red-950/30 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label htmlFor="clubName" className="text-white">Club name</Label>
          <Input id="clubName" name="clubName" required className="mt-2 border-white/15 bg-[#020b18] text-white" />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="address" className="text-white">
            Street address <span className="font-normal text-white/40">— optional</span>
          </Label>
          <Input
            id="address"
            name="address"
            placeholder="Leave blank if you train at a school or rec centre"
            className="mt-2 border-white/15 bg-[#020b18] text-white placeholder:text-white/30"
          />
          <p className="mt-1 text-xs text-white/40">
            A town is enough to put the club on the map. Add a street address later for an exact pin.
          </p>
        </div>

        <div>
          <Label htmlFor="city" className="text-white">City</Label>
          <Input id="city" name="city" className="mt-2 border-white/15 bg-[#020b18] text-white" />
        </div>
        <div className="grid grid-cols-[1fr_1.2fr] gap-3">
          <div>
            <Label htmlFor="state" className="text-white">State</Label>
            <Input id="state" name="state" defaultValue="NC" className="mt-2 border-white/15 bg-[#020b18] text-white" />
          </div>
          <div>
            <Label htmlFor="zipCode" className="text-white">ZIP</Label>
            <Input id="zipCode" name="zipCode" className="mt-2 border-white/15 bg-[#020b18] text-white" />
          </div>
        </div>

        <div>
          <Label htmlFor="contactPhone" className="text-white">Contact phone</Label>
          <Input id="contactPhone" name="contactPhone" type="tel" className="mt-2 border-white/15 bg-[#020b18] text-white" />
        </div>
        <div>
          <Label htmlFor="contactEmail" className="text-white">Contact email</Label>
          <Input id="contactEmail" name="contactEmail" type="email" className="mt-2 border-white/15 bg-[#020b18] text-white" />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="website" className="text-white">Website</Label>
          <Input id="website" name="website" placeholder="https://…" className="mt-2 border-white/15 bg-[#020b18] text-white" />
        </div>

        <div>
          <Label htmlFor="instagramUrl" className="flex items-center gap-2 text-white">
            <Instagram className="h-4 w-4 text-[#D7B968]" />
            Instagram
          </Label>
          <Input
            id="instagramUrl"
            name="instagramUrl"
            placeholder="@yourclub"
            className="mt-2 border-white/15 bg-[#020b18] text-white"
          />
        </div>

        <div>
          <Label htmlFor="facebookUrl" className="flex items-center gap-2 text-white">
            <Facebook className="h-4 w-4 text-[#D7B968]" />
            Facebook
          </Label>
          <Input
            id="facebookUrl"
            name="facebookUrl"
            placeholder="@yourclub or a page link"
            className="mt-2 border-white/15 bg-[#020b18] text-white"
          />
        </div>

        <div className="md:col-span-2">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#D7B968]">Programs offered</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PROGRAMS.map((program) => (
              <label
                key={program.key}
                className="flex cursor-pointer items-center gap-3 rounded-sm border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/85"
              >
                <Checkbox
                  checked={Boolean(programs[program.key])}
                  onCheckedChange={(checked) => setPrograms((current) => ({ ...current, [program.key]: checked === true }))}
                />
                {program.label}
              </label>
            ))}
          </div>
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="notes" className="text-white">Anything else we should know?</Label>
          <Textarea
            id="notes"
            name="notes"
            className="mt-2 min-h-28 border-white/15 bg-[#020b18] text-white"
            placeholder="Practice schedule, primary contact, age groups, girls program details, etc."
          />
        </div>
      </div>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" disabled={pending} className="min-h-12 rounded-sm bg-[#CC0000] px-6 font-bold text-white hover:bg-[#a80000]">
          {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Submit for review
        </Button>
        <p className="text-sm text-white/50">
          Approved clubs can be geocoded and published to the map from the admin club review page.
        </p>
      </div>
    </form>
  )
}
