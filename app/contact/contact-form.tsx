"use client"

import { useState, type FormEvent } from "react"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type Sent = { email: string; acknowledged: boolean }

export function ContactForm() {
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<Sent | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>
    setSending(true)
    setError(null)
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error || "We couldn't send your message. Please email info@ncwrestlingunited.com directly.")
        return
      }
      setSent({ email: data.email.trim(), acknowledged: json.acknowledged !== false })
      form.reset()
    } catch {
      setError("We couldn't send your message. Check your connection and try again.")
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div role="status" className="flex flex-col items-start gap-3 py-4">
        <CheckCircle2 className="h-10 w-10 text-green-600" aria-hidden />
        <h2 className="text-xl font-semibold">Message sent</h2>
        <p className="text-muted-foreground">
          Thanks — your message reached NC United Wrestling. We&apos;ll reply to{" "}
          <span className="font-medium text-foreground">{sent.email}</span> as soon as we can.
        </p>
        {sent.acknowledged ? (
          <p className="text-sm text-muted-foreground">
            We&apos;ve also emailed you a copy. If you don&apos;t see it, check your spam folder.
          </p>
        ) : null}
        <Button variant="outline" onClick={() => setSent(null)}>
          Send another message
        </Button>
      </div>
    )
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" placeholder="Your name" required maxLength={120} autoComplete="name" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="Your email address"
            required
            maxLength={254}
            autoComplete="email"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">Subject</Label>
        <Input id="subject" name="subject" placeholder="Message subject" maxLength={200} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" name="message" placeholder="Your message" rows={6} required maxLength={5000} />
      </div>

      {/* Honeypot: hidden from people, filled by bots. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="w-full sm:w-auto" disabled={sending}>
        {sending ? "Sending…" : "Send Message"}
      </Button>
    </form>
  )
}
