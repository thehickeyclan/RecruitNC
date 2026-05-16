"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { AdminHeader } from "@/components/admin-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { HardLink } from "@/components/hard-link"
import { Loader2, ArrowLeft, RefreshCw } from "lucide-react"

export default function AdminMessagingPreviewPage() {
  const searchParams = useSearchParams()
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [bodyHtml, setBodyHtml] = useState("")
  const [logoVariant, setLogoVariant] = useState<"recruitnc" | "nc-united">("recruitnc")
  const [iframeHtml, setIframeHtml] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPreview = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/messaging/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          subject: subject || "Update from RecruitNC",
          body: body || "Your message here.",
          bodyHtml: bodyHtml || undefined,
          logoVariant,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && typeof data.html === "string") {
        setIframeHtml(data.html)
      } else {
        setError(data.error || "Failed to load preview")
      }
    } catch {
      setError("Request failed")
    } finally {
      setLoading(false)
    }
  }, [subject, body, bodyHtml, logoVariant])

  useEffect(() => {
    const sub = searchParams?.get("subject")
    const b = searchParams?.get("body")
    const b64 = searchParams?.get("b64")
    const html64 = searchParams?.get("html64")
    const logo = searchParams?.get("logo")
    let nextSub = ""
    let nextBody = ""
    let nextBodyHtml = ""
    if (typeof sub === "string") nextSub = decodeURIComponent(sub)
    if (typeof b === "string") nextBody = decodeURIComponent(b)
    else if (typeof b64 === "string") {
      try {
        nextBody = decodeURIComponent(escape(atob(decodeURIComponent(b64))))
      } catch {
        nextBody = ""
      }
    }
    if (typeof html64 === "string") {
      try {
        nextBodyHtml = decodeURIComponent(escape(atob(decodeURIComponent(html64))))
      } catch {
        nextBodyHtml = ""
      }
    }
    if (logo === "nc-united") setLogoVariant("nc-united")
    setSubject((prev) => (nextSub || prev))
    setBody((prev) => (nextBody || prev))
    setBodyHtml(nextBodyHtml)
    setLoading(true)
    setError(null)
    fetch("/api/admin/messaging/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        subject: nextSub || "Update from RecruitNC",
        body: nextBody || "Your message here.",
        bodyHtml: nextBodyHtml || undefined,
        logoVariant: logo === "nc-united" ? "nc-united" : "recruitnc",
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.html) setIframeHtml(data.html)
      })
      .catch(() => setError("Failed to load preview"))
      .finally(() => setLoading(false))
  }, [searchParams])

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-4">
          <HardLink href="/admin/messaging" className="inline-flex items-center gap-2 text-sm text-[#003366] hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to Messaging
          </HardLink>
        </div>
        <div className="rounded-lg border border-[#003366]/20 bg-white p-4 mb-6">
          <h1 className="text-xl font-bold text-[#003366] mb-4">Email preview</h1>
          <p className="text-sm text-gray-600 mb-4">
            Change subject or message and click Update to see how the blast will look. This is exactly what recipients see.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-[#003366]">Header logo</Label>
              <Select value={logoVariant} onValueChange={(v) => setLogoVariant(v as "recruitnc" | "nc-united")}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recruitnc">RecruitNC (shield)</SelectItem>
                  <SelectItem value="nc-united">NC United (stacked)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[#003366]">Subject</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Update from RecruitNC"
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-[#003366]">Message (Markdown)</Label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Your message here."
                rows={4}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          <Button onClick={fetchPreview} disabled={loading} className="mt-4 bg-[#003366] hover:bg-[#003366]/90">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {loading ? " Updating…" : " Update preview"}
          </Button>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600 border-b">
            How the email looks
          </div>
          <div className="min-h-[420px] bg-gray-100 p-4">
            {iframeHtml ? (
              <iframe
                title="Email preview"
                srcDoc={iframeHtml}
                className="w-full min-h-[400px] border-0 rounded bg-white shadow-sm"
                sandbox="allow-same-origin"
              />
            ) : (
              <div className="flex items-center justify-center h-[400px] text-gray-500">
                {loading ? "Loading…" : "Click Update preview to see the email."}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
