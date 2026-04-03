"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { publishBreakingNews } from "@/app/nhsca/live/actions/breaking-news-actions"
import { Megaphone } from "lucide-react"

export function BreakingNewsForm() {
  const [message, setMessage] = useState("")
  const [severity, setSeverity] = useState<"info" | "warning" | "critical">("critical")
  const [publishing, setPublishing] = useState(false)

  const handlePublish = async () => {
    if (!message.trim()) return

    setPublishing(true)
    const result = await publishBreakingNews(message, severity)

    if (result.success) {
      setMessage("")
      alert("Breaking news published! It will appear on all screens immediately.")
    } else {
      alert(`Error: ${result.error}`)
    }

    setPublishing(false)
  }

  return (
    <div className="space-y-4">
      <Textarea
        placeholder="Enter breaking news message (e.g., 'NC United wrestler wins championship!')"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        className="bg-background/50 border-border"
      />

      <div className="flex items-center gap-4">
        <Select value={severity} onValueChange={(v: any) => setSeverity(v)}>
          <SelectTrigger className="w-40 bg-background/50 border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>

        <Button
          onClick={handlePublish}
          disabled={publishing || !message.trim()}
          className="bg-red-600 hover:bg-red-700"
        >
          <Megaphone className="w-4 h-4 mr-2" />
          {publishing ? "Publishing..." : "Publish Breaking News"}
        </Button>
      </div>
    </div>
  )
}
