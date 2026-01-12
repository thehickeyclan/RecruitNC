"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Save, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface InlineContactEditorProps {
  athleteId: string
  cell?: string
  email?: string
  instagram?: string
  highlightVideoUrl?: string
  onSave: (updates: {
    cell?: string
    email?: string
    contact_email?: string
    instagram?: string
    highlight_video_url?: string
  }) => Promise<void>
  onCancel: () => void
}

export function InlineContactEditor({
  athleteId,
  cell,
  email,
  instagram,
  highlightVideoUrl,
  onSave,
  onCancel,
}: InlineContactEditorProps) {
  const [cellValue, setCellValue] = useState(cell || "")
  const [emailValue, setEmailValue] = useState(email || "")
  const [instagramValue, setInstagramValue] = useState(instagram || "")
  const [highlightVideoValue, setHighlightVideoValue] = useState(highlightVideoUrl || "")
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const handleSave = async () => {
    try {
      setSaving(true)
      await onSave({
        cell: cellValue,
        email: emailValue,
        contact_email: emailValue,
        instagram: instagramValue,
        highlight_video_url: highlightVideoValue,
      })
      toast({
        title: "Success",
        description: "Contact information updated successfully",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update contact information",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div>
        <Label htmlFor="cell">Cell Phone</Label>
        <Input
          id="cell"
          value={cellValue}
          onChange={(e) => setCellValue(e.target.value)}
          placeholder="Enter your cell phone number"
          type="tel"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          value={emailValue}
          onChange={(e) => setEmailValue(e.target.value)}
          placeholder="your.email@example.com"
          type="email"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="instagram">Instagram Handle</Label>
        <Input
          id="instagram"
          value={instagramValue}
          onChange={(e) => setInstagramValue(e.target.value)}
          placeholder="@username"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="highlightVideo">Highlight Video URL (YouTube)</Label>
        <Input
          id="highlightVideo"
          value={highlightVideoValue}
          onChange={(e) => setHighlightVideoValue(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          type="url"
          className="mt-1"
        />
        <p className="text-xs text-gray-500 mt-1">
          Paste your YouTube video URL here
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving} size="sm">
          <Save className="h-4 w-4 mr-1" />
          Save
        </Button>
        <Button onClick={onCancel} variant="outline" disabled={saving} size="sm">
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
      </div>
    </div>
  )
}

