"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, MessageSquareWarning } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { submitDataDawgFeedbackClient } from "@/lib/data-dawg-feedback"

export type DataDawgFeedbackContext = {
  userQuery: string | null
  assistantResponse: string
  messageId?: string
}

type DataDawgFeedbackDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  context: DataDawgFeedbackContext | null
}

export function DataDawgFeedbackDialog({ open, onOpenChange, context }: DataDawgFeedbackDialogProps) {
  const { toast } = useToast()
  const [correctionNotes, setCorrectionNotes] = useState("")
  const [submitterName, setSubmitterName] = useState("")
  const [submitterEmail, setSubmitterEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const resetForm = () => {
    setCorrectionNotes("")
    setSubmitterName("")
    setSubmitterEmail("")
    setSubmitted(false)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) resetForm()
    onOpenChange(next)
  }

  const handleSubmit = async () => {
    if (!context || !correctionNotes.trim()) return
    setSubmitting(true)
    try {
      const result = await submitDataDawgFeedbackClient({
        correctionNotes: correctionNotes.trim(),
        userQuery: context.userQuery,
        assistantResponse: context.assistantResponse,
        messageId: context.messageId ?? null,
        submitterName: submitterName.trim() || null,
        submitterEmail: submitterEmail.trim() || null,
        source: "data_dawg_widget",
      })
      if (!result.ok) {
        throw new Error(result.error)
      }
      setSubmitted(true)
      toast({
        title: "Thanks!",
        description: "We'll review this and update our data when needed.",
      })
    } catch (e) {
      toast({
        title: "Could not send",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg bg-[#0F1E32] border-[#1e3a5f] text-gray-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#D3B574]">
            <MessageSquareWarning className="h-5 w-5" />
            Hey Data Dawg
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            See something wrong or outdated? Tell us what should be corrected.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="py-4 space-y-3">
            <p className="text-sm text-gray-300">
              Got it — thanks for helping keep NC wrestling data accurate. Our team will review this report.
            </p>
            <Button
              type="button"
              className="bg-[#D3B574] text-[#0A1628] hover:bg-[#c4a665]"
              onClick={() => handleOpenChange(false)}
            >
              Close
            </Button>
          </div>
        ) : (
          <>
            {context?.userQuery ? (
              <div className="rounded-lg border border-[#1e3a5f] bg-[#0A1628] p-3 text-xs text-gray-400">
                <p className="font-medium text-gray-500 mb-1">Your question</p>
                <p className="text-gray-300 line-clamp-3">{context.userQuery}</p>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="dd-correction" className="text-gray-300">
                What looks incorrect?
              </Label>
              <Textarea
                id="dd-correction"
                value={correctionNotes}
                onChange={(e) => setCorrectionNotes(e.target.value)}
                placeholder="Example: Cam Stinson placed 3rd at NHSCA 2025, not 5th."
                rows={4}
                className="bg-[#0A1628] border-[#1e3a5f] text-white placeholder:text-gray-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="dd-name" className="text-gray-400 text-xs">
                  Your name (optional)
                </Label>
                <Input
                  id="dd-name"
                  value={submitterName}
                  onChange={(e) => setSubmitterName(e.target.value)}
                  className="bg-[#0A1628] border-[#1e3a5f] text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dd-email" className="text-gray-400 text-xs">
                  Email (optional)
                </Label>
                <Input
                  id="dd-email"
                  type="email"
                  value={submitterEmail}
                  onChange={(e) => setSubmitterEmail(e.target.value)}
                  className="bg-[#0A1628] border-[#1e3a5f] text-white"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                className="border-[#1e3a5f] text-gray-300 hover:bg-[#1e3a5f]"
                onClick={() => handleOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-[#D3B574] text-[#0A1628] hover:bg-[#c4a665]"
                onClick={() => void handleSubmit()}
                disabled={submitting || correctionNotes.trim().length < 5}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send to Data Dawg team"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
