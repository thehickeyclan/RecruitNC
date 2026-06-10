"use client"

import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, CheckCircle2 } from "lucide-react"
import { TOC_MEDIA_REQUEST_TYPES } from "@/lib/toc/constants"

export function TocMediaForm() {
  const [outlet, setOutlet] = useState("")
  const [contactName, setContactName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [mediaType, setMediaType] = useState("")
  const [message, setMessage] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [error, setError] = useState("")

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    if (!outlet.trim()) return setError("Outlet / organization is required")
    if (!contactName.trim()) return setError("Contact name is required")
    if (!contactEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
      return setError("Valid email is required")
    }

    setStatus("loading")
    try {
      const res = await fetch("/api/toc/media-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet: outlet.trim(),
          contactName: contactName.trim(),
          contactEmail: contactEmail.trim(),
          contactPhone: contactPhone.trim() || undefined,
          mediaType: mediaType || undefined,
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
      setOutlet("")
      setContactName("")
      setContactEmail("")
      setContactPhone("")
      setMediaType("")
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
        <p className="text-green-900">Thanks — we received your media request and will follow up with next steps.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="media-outlet">Outlet / organization *</Label>
          <Input id="media-outlet" value={outlet} onChange={(e) => setOutlet(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="media-name">Contact name *</Label>
          <Input id="media-name" value={contactName} onChange={(e) => setContactName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="media-email">Email *</Label>
          <Input
            id="media-email"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="media-phone">Phone</Label>
          <Input id="media-phone" type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Media type</Label>
          <Select value={mediaType || "none"} onValueChange={(v) => setMediaType(v === "none" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Print, broadcast, digital…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Select type</SelectItem>
              {TOC_MEDIA_REQUEST_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="media-message">What do you need?</Label>
          <Textarea
            id="media-message"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Credentials, interview subjects, arrival time, equipment needs…"
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
        Submit media request
      </Button>
    </form>
  )
}
