"use client"

import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, CheckCircle2 } from "lucide-react"
import { TOC_SPONSOR_TIERS } from "@/lib/toc/constants"

export function TocSponsorForm() {
  const [company, setCompany] = useState("")
  const [contactName, setContactName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [tierInterest, setTierInterest] = useState("")
  const [message, setMessage] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [error, setError] = useState("")

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    if (!company.trim()) return setError("Company name is required")
    if (!contactName.trim()) return setError("Contact name is required")
    if (!contactEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
      return setError("Valid email is required")
    }

    setStatus("loading")
    try {
      const res = await fetch("/api/toc/sponsor-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: company.trim(),
          contactName: contactName.trim(),
          contactEmail: contactEmail.trim(),
          contactPhone: contactPhone.trim() || undefined,
          tierInterest: tierInterest || undefined,
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
      setCompany("")
      setContactName("")
      setContactEmail("")
      setContactPhone("")
      setTierInterest("")
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
        <p className="text-green-900">Thanks — we&apos;ll follow up on your sponsorship inquiry shortly.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sp-company">Company *</Label>
          <Input id="sp-company" value={company} onChange={(e) => setCompany(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sp-name">Contact name *</Label>
          <Input id="sp-name" value={contactName} onChange={(e) => setContactName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sp-email">Email *</Label>
          <Input id="sp-email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sp-phone">Phone</Label>
          <Input id="sp-phone" type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Tier interest</Label>
          <Select value={tierInterest || "none"} onValueChange={(v) => setTierInterest(v === "none" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Title, Champion, Partner…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not sure yet</SelectItem>
              {TOC_SPONSOR_TIERS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="sp-message">Message</Label>
          <Textarea id="sp-message" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" disabled={status === "loading"} className="bg-[#CC0000] hover:bg-[#a80000] uppercase tracking-wide">
        {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Send inquiry
      </Button>
    </form>
  )
}
