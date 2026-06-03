"use client"

import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, CheckCircle2 } from "lucide-react"
import { TOC_GRADUATION_YEARS, TOC_NOMINATION_RELATIONSHIPS, TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"

export function TocNominationForm() {
  const [athleteName, setAthleteName] = useState("")
  const [school, setSchool] = useState("")
  const [weightClass, setWeightClass] = useState("")
  const [gradYear, setGradYear] = useState("")
  const [submitterName, setSubmitterName] = useState("")
  const [submitterEmail, setSubmitterEmail] = useState("")
  const [relationship, setRelationship] = useState("")
  const [notes, setNotes] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [error, setError] = useState("")

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    if (!athleteName.trim()) return setError("Athlete name is required")
    if (!submitterEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submitterEmail.trim())) {
      return setError("Valid submitter email is required")
    }

    setStatus("loading")
    try {
      const res = await fetch("/api/toc/athlete-nominate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteName: athleteName.trim(),
          school: school.trim() || undefined,
          weightClass: weightClass ? Number(weightClass) : undefined,
          graduationYear: gradYear ? Number(gradYear) : undefined,
          submittedByName: submitterName.trim() || undefined,
          submittedByEmail: submitterEmail.trim(),
          submittedByRelationship: relationship || undefined,
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
      setSchool("")
      setWeightClass("")
      setGradYear("")
      setSubmitterName("")
      setSubmitterEmail("")
      setRelationship("")
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
          <p className="font-semibold text-green-900">Nomination received</p>
          <p className="text-sm text-green-800 mt-1">
            Thank you. Our team will review nominations and contact you if the athlete is selected for the field.
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => setStatus("idle")}>
            Submit another
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="toc-athlete-name">Athlete name *</Label>
          <Input id="toc-athlete-name" value={athleteName} onChange={(e) => setAthleteName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="toc-school">High school</Label>
          <Input id="toc-school" value={school} onChange={(e) => setSchool(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Weight class</Label>
          <Select value={weightClass || "none"} onValueChange={(v) => setWeightClass(v === "none" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select weight" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not sure</SelectItem>
              {TOC_WEIGHT_CLASSES.map((w) => (
                <SelectItem key={w} value={String(w)}>
                  {w} lbs
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Graduation year</Label>
          <Select value={gradYear || "none"} onValueChange={(v) => setGradYear(v === "none" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Grad year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">—</SelectItem>
              {TOC_GRADUATION_YEARS.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="toc-submitter-name">Your name</Label>
          <Input id="toc-submitter-name" value={submitterName} onChange={(e) => setSubmitterName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="toc-submitter-email">Your email *</Label>
          <Input
            id="toc-submitter-email"
            type="email"
            value={submitterEmail}
            onChange={(e) => setSubmitterEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Your relationship</Label>
          <Select value={relationship || "none"} onValueChange={(v) => setRelationship(v === "none" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Coach, parent, athlete…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">—</SelectItem>
              {TOC_NOMINATION_RELATIONSHIPS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="toc-notes">Why this athlete? (results, ranking, context)</Label>
          <Textarea id="toc-notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" disabled={status === "loading"} className="bg-[#0B1D3A] hover:bg-[#060f1f] uppercase tracking-wide">
        {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Submit nomination
      </Button>
    </form>
  )
}
