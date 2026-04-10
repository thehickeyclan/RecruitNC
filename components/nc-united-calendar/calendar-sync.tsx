"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Calendar, Download, ExternalLink } from "lucide-react"

export function CalendarSync() {
  const [isOpen, setIsOpen] = useState(false)

  const downloadICS = async () => {
    try {
      const response = await fetch("/api/calendar/feed")
      const blob = await response.blob()

      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "nc-united-wrestling.ics"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Download error:", error)
      alert("Download failed. Please try again.")
    }
  }

  const openGoogleCalendar = () => {
    const calendarUrl = `${window.location.origin}/api/calendar/feed`
    const googleUrl = `https://calendar.google.com/calendar/u/0/r/settings/addbyurl?url=${encodeURIComponent(calendarUrl)}`
    window.open(googleUrl, "_blank")
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2 rounded-full border-slate-200 bg-white/90 font-medium text-nc-navy-900 hover:border-nc-navy/25 hover:bg-slate-50"
        >
          <Calendar className="h-4 w-4" />
          Sync Calendar
        </Button>
      </DialogTrigger>
      <DialogContent className="border-slate-200/90 bg-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-nc-navy-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-nc-red/10 text-nc-red">
              <Calendar className="h-5 w-5" />
            </span>
            Sync calendar
          </DialogTitle>
          <DialogDescription className="text-slate-600">
            Add the NC United Wrestling feed to Google Calendar or download an{" "}
            <span className="font-medium text-nc-navy-900">.ics</span> file for Apple and other apps.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              onClick={downloadICS}
              variant="outline"
              size="sm"
              className="flex items-center justify-center gap-2 rounded-xl border-slate-200 font-medium text-nc-navy-900 hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Download .ics
            </Button>
            <Button
              onClick={openGoogleCalendar}
              className="flex items-center justify-center gap-2 rounded-xl bg-nc-navy-950 font-medium text-white hover:bg-nc-navy-800"
            >
              <ExternalLink className="h-4 w-4" />
              Add in Google
            </Button>
          </div>

          <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/80 p-4 text-sm text-slate-700">
            <p className="font-semibold text-nc-navy-900">How it works</p>
            <ol className="list-inside list-decimal space-y-1.5 text-xs leading-relaxed text-slate-600">
              <li>Use <span className="font-medium text-nc-navy-900">Add in Google</span> or paste the URL below.</li>
              <li>Google may take a few minutes to refresh the feed.</li>
              <li>Look for events labeled NC United Wrestling.</li>
            </ol>
            <p className="break-all rounded-lg bg-white/80 px-2 py-2 font-mono text-[11px] text-slate-600">
              {typeof window !== "undefined" ? `${window.location.origin}/api/calendar/feed` : "…"}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
