"use client"

import { useState, type FormEvent } from "react"
import { CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function TocCollegeCoachRegistration() {
  const [form, setForm] = useState({
    coachName: "",
    collegeProgram: "",
    email: "",
    mobilePhone: "",
    attendance: "",
    staffCount: "1",
  })
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle")
  const [error, setError] = useState("")

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError("")
    setStatus("loading")
    try {
      const response = await fetch("/api/toc/college-coach-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, staffCount: Number(form.staffCount) }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "Registration failed")
      setStatus("success")
    } catch (caught) {
      setStatus("idle")
      setError(caught instanceof Error ? caught.message : "Registration failed")
    }
  }

  if (status === "success") {
    return (
      <div className="flex gap-3 rounded-lg border border-emerald-400/30 bg-emerald-950/30 p-5 text-emerald-50">
        <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-400" />
        <div>
          <p className="font-semibold">College coach registration received.</p>
          <p className="mt-1 text-sm text-emerald-100/75">Check your email for credential and VIP lounge details.</p>
        </div>
      </div>
    )
  }

  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }))
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-md border border-[#C8A94A]/40 bg-[#C8A94A]/10 p-4 sm:col-span-2">
        <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#F3D98B]">College coaches only</p>
        <p className="mt-1 text-sm leading-relaxed text-white/75">
          Complimentary credentials are available only to college wrestling coaches and staff. Club coach admission
          details will be announced separately.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="coach-name" className="text-white">
          College coach name *
        </Label>
        <Input id="coach-name" value={form.coachName} onChange={(e) => set("coachName", e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="coach-program" className="text-white">
          College wrestling program *
        </Label>
        <Input id="coach-program" value={form.collegeProgram} onChange={(e) => set("collegeProgram", e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="coach-email" className="text-white">
          Email *
        </Label>
        <Input id="coach-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="coach-phone" className="text-white">
          Mobile number *
        </Label>
        <Input id="coach-phone" type="tel" value={form.mobilePhone} onChange={(e) => set("mobilePhone", e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label className="text-white">Attending *</Label>
        <Select value={form.attendance} onValueChange={(value) => set("attendance", value)} required>
          <SelectTrigger>
            <SelectValue placeholder="Select days" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="friday">Friday</SelectItem>
            <SelectItem value="saturday">Saturday</SelectItem>
            <SelectItem value="both">Friday and Saturday</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="coach-count" className="text-white">
          College staff attending *
        </Label>
        <Input id="coach-count" type="number" min={1} max={12} value={form.staffCount} onChange={(e) => set("staffCount", e.target.value)} required />
      </div>
      <label className="flex items-start gap-3 rounded-md border border-white/10 bg-black/15 p-3 text-sm leading-relaxed text-white/80 sm:col-span-2">
        <input type="checkbox" required className="mt-1 h-4 w-4 shrink-0 accent-[#CC0000]" />
        <span>I confirm this registration is for a college wrestling program.</span>
      </label>
      {error ? <p className="text-sm text-red-300 sm:col-span-2">{error}</p> : null}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={status === "loading" || !form.attendance} className="min-h-11 w-full bg-[#CC0000] uppercase tracking-wide hover:bg-[#a80000] sm:w-auto">
          {status === "loading" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Register college coaching staff
        </Button>
      </div>
    </form>
  )
}
