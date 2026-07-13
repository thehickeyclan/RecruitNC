"use client"

import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, CheckCircle2 } from "lucide-react"
import { TOC_VOLUNTEER_AVAILABILITY, TOC_VOLUNTEER_ROLES } from "@/lib/toc/constants"

export function TocVolunteerForm() {
  const [contactName, setContactName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [roleInterest, setRoleInterest] = useState("")
  const [availability, setAvailability] = useState<string[]>([])
  const [message, setMessage] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [error, setError] = useState("")

  const toggleAvailability = (value: string, checked: boolean) => {
    setAvailability((prev) => (checked ? [...prev, value] : prev.filter((v) => v !== value)))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    if (!contactName.trim()) return setError("Name is required")
    if (!contactEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
      return setError("Valid email is required")
    }
    if (availability.length === 0) return setError("Select at least one availability option")

    setStatus("loading")
    try {
      const res = await fetch("/api/toc/volunteer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactName: contactName.trim(),
          contactEmail: contactEmail.trim(),
          contactPhone: contactPhone.trim() || undefined,
          roleInterest: roleInterest || undefined,
          availability,
          message: message.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus("error")
        setError(data.error || "Submission failed")
        return
      }
      setStatus("success")
      setContactName("")
      setContactEmail("")
      setContactPhone("")
      setRoleInterest("")
      setAvailability([])
      setMessage("")
    } catch {
      setStatus("error")
      setError("Network error")
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6 flex gap-3">
        <CheckCircle2 className="h-6 w-6 text-green-700 shrink-0" />
        <p className="text-green-900">
          Thanks — we received your volunteer interest and will follow up with shift options before championship weekend.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="vol-name">Name *</Label>
          <Input id="vol-name" value={contactName} onChange={(e) => setContactName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vol-email">Email *</Label>
          <Input
            id="vol-email"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vol-phone">Phone</Label>
          <Input id="vol-phone" type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Role interest</Label>
          <Select value={roleInterest || "none"} onValueChange={(v) => setRoleInterest(v === "none" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Where you'd like to help" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not sure yet</SelectItem>
              {TOC_VOLUNTEER_ROLES.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <fieldset className="space-y-3 sm:col-span-2">
          <legend className="text-sm font-medium leading-none">Availability *</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {TOC_VOLUNTEER_AVAILABILITY.map((slot) => (
              <label key={slot.value} className="flex items-start gap-3 rounded-md border border-[#0B1D3A]/10 p-3">
                <Checkbox
                  checked={availability.includes(slot.value)}
                  onCheckedChange={(checked) => toggleAvailability(slot.value, checked === true)}
                />
                <span className="text-sm leading-snug">{slot.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vol-message">Anything else we should know?</Label>
          <Textarea
            id="vol-message"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Prior TOC experience, wrestling background, physical limitations…"
          />
        </div>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button
        type="submit"
        disabled={status === "loading"}
        className="w-full sm:w-auto min-h-11 bg-[#CC0000] hover:bg-[#a80000] uppercase tracking-wide"
      >
        {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Submit volunteer interest
      </Button>
    </form>
  )
}
