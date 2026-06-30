"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Check, Copy, MessageSquare } from "lucide-react"
import type { TocInviteMessage } from "@/lib/toc/invite-message"

type Props = {
  share: TocInviteMessage
  title?: string
  compact?: boolean
}

async function copyText(label: string, text: string, setCopied: (v: string | null) => void) {
  try {
    await navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
  } catch {
    window.prompt(`Copy ${label}:`, text)
  }
}

export function TocInviteShareCard({ share, title = "What they'll receive", compact = false }: Props) {
  const [copied, setCopied] = useState<string | null>(null)

  return (
    <div className="rounded-md border border-[#002147]/15 bg-[#f8f9fb] p-4 space-y-4">
      <div>
        <p className="text-sm font-semibold text-[#002147]">{title}</p>
        {!compact ? (
          <p className="text-xs text-muted-foreground mt-1">
            Preview matches the email. Copy the text message or link to send via iMessage, GroupMe, etc.
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void copyText("link", share.confirmUrl, setCopied)}
        >
          {copied === "link" ? <Check className="h-3.5 w-3.5 mr-1.5 text-green-600" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
          Copy link
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void copyText("text", share.smsBody, setCopied)}
        >
          {copied === "text" ? <Check className="h-3.5 w-3.5 mr-1.5 text-green-600" /> : <MessageSquare className="h-3.5 w-3.5 mr-1.5" />}
          Copy text message
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void copyText("email", `${share.subject}\n\n${share.emailBody}`, setCopied)}
        >
          {copied === "email" ? <Check className="h-3.5 w-3.5 mr-1.5 text-green-600" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
          Copy email
        </Button>
      </div>

      <div className="space-y-3 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Subject</p>
          <p className="text-[#002147]">{share.subject}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Text message</p>
          <p className="text-[#002147]/90 whitespace-pre-wrap rounded-sm bg-white border px-3 py-2">{share.smsBody}</p>
        </div>
        {!compact ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Email body</p>
            <pre className="text-xs text-[#002147]/90 whitespace-pre-wrap rounded-sm bg-white border px-3 py-2 font-sans leading-relaxed max-h-64 overflow-auto">
              {share.emailBody}
            </pre>
          </div>
        ) : null}
      </div>
    </div>
  )
}
