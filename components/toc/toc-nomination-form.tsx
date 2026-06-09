"use client"

import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, CheckCircle2 } from "lucide-react"
import { TOC_GRADUATION_YEARS, TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"

/** Wrestler self-service prospect form — not an invitation or commitment. */
export function TocNominationForm() {
  const [athleteName, setAthleteName] = useState("")
  const [email, setEmail] = useState("")
  const [school, setSchool] = useState("")
  const [club, setClub] = useState("")
  const [weightClass, setWeightClass] = useState("")
  const [gradYear, setGradYear] = useState("")
  const [notes, setNotes] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [error, setError] = useState("")

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    if (!athleteName.trim()) return setError("Your name is required")
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return setError("A valid email is required")
    }
    if (!school.trim()) return setError("High school is required")
    if (!weightClass) return setError("Select the weight you'd compete at")
    if (!gradYear) return setError("Graduation year is required")

    setStatus("loading")
    try {
      const res = await fetch("/api/toc/athlete-nominate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteName: athleteName.trim(),
          email: email.trim(),
          school: school.trim(),
          club: club.trim() || undefined,
          weightClass: Number(weightClass),
          graduationYear: Number(gradYear),
          notes: notes.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus("error")
        setError(data.error || "Submission failed")
        return
      }
      setStatus("success")
      setAthleteName("")
      setEmail("")
      setSchool("")
      setClub("")
      setWeightClass("")
      setGradYear("")
      setNotes("")
    } catch {
      setStatus("error")
      setError("Network error")
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6 flex gap-3">
        <CheckCircle2 className="h-6 w-6 text-green-700 shrink-0" />
        <div>
          <p className="font-semibold text-green-900">Info received</p>
          <p className="text-sm text-green-800 mt-1">
            Thanks — we have your name, school, club, and weight. Our staff may reach out as we review prospects and send invitations.
            Submitting this form does <strong>not</strong> guarantee an invitation or a spot in the tournament.
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => setStatus("idle")}>
            Submit again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="rounded-md border border-[#0B1D3A]/15 bg-[#0B1D3A]/5 px-4 py-3 text-sm text-[#0B1D3A]/90">
        <strong>No commitment from NC United.</strong> This helps us identify prospects and plan weight classes.
        Filling this out does not mean you are invited or registered for the event.
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="toc-athlete-name">Your name *</Label>
          <Input id="toc-athlete-name" value={athleteName} onChange={(e) => setAthleteName(e.target.value)} required />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="toc-email">Email *</Label>
          <Input
            id="toc-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="toc-school">High school *</Label>
          <Input id="toc-school" value={school} onChange={(e) => setSchool(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="toc-club">Club / team</Label>
          <Input id="toc-club" value={club} onChange={(e) => setClub(e.target.value)} placeholder="NC United, school club, etc." />
        </div>
        <div className="space-y-2">
          <Label htmlFor="toc-weight">Weight you'd compete at *</Label>
          <select
            id="toc-weight"
            value={weightClass}
            onChange={(e) => setWeightClass(e.target.value)}
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Select weight</option>
            {TOC_WEIGHT_CLASSES.map((w) => (
              <option key={w} value={String(w)}>
                {w} lbs
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="toc-grad-year">Graduation year *</Label>
          <select
            id="toc-grad-year"
            value={gradYear}
            onChange={(e) => setGradYear(e.target.value)}
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Select year</option>
            {TOC_GRADUATION_YEARS.map((y) => (
              <option key={y} value={y}>
                Class of {y}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="toc-notes">Optional — ranking, results, or context</Label>
          <Textarea id="toc-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" disabled={status === "loading"} className="bg-[#0B1D3A] hover:bg-[#060f1f] uppercase tracking-wide">
        {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Submit my info
      </Button>
    </form>
  )
}
