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
        <Button variant="outline" className="flex items-center gap-2 bg-transparent">
          <Calendar className="h-4 w-4" />
          Sync Calendar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Sync with Google Calendar
          </DialogTitle>
          <DialogDescription>
            Add the NC United Wrestling calendar to your Google Calendar to stay updated on all events.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={downloadICS}
              variant="outline"
              size="sm"
              className="flex items-center gap-1 bg-transparent"
            >
              <Download className="h-3 w-3" />
              Download ICS
            </Button>
            <Button onClick={openGoogleCalendar} className="bg-blue-600 hover:bg-blue-700">
              <ExternalLink className="h-4 w-4 mr-2" />
              Add to Google Calendar
            </Button>
          </div>

          {/* Instructions */}
          <div className="text-sm text-gray-600 space-y-2">
            <p className="font-semibold">Instructions:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Click "Add to Google Calendar" above</li>
              <li>Paste the calendar URL when prompted by Google</li>
              <li>Wait 5-15 minutes for events to sync</li>
              <li>Look for "NC United Wrestling" events in your calendar</li>
            </ol>
            <p className="text-xs text-gray-500 mt-3">
              Calendar URL:{" "}
              {typeof window !== "undefined" ? `${window.location.origin}/api/calendar/feed` : "Loading..."}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
