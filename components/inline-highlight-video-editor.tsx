"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Save, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface InlineHighlightVideoEditorProps {
  athleteId: string
  highlightVideoUrl?: string
  onSave: (updates: { highlight_video_url?: string }) => Promise<void>
  onCancel: () => void
}

export function InlineHighlightVideoEditor({
  highlightVideoUrl,
  onSave,
  onCancel,
}: InlineHighlightVideoEditorProps) {
  const [value, setValue] = useState(highlightVideoUrl || "")
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const handleSave = async () => {
    try {
      setSaving(true)
      await onSave({ highlight_video_url: value.trim() || undefined })
      toast({
        title: "Success",
        description: "Highlight video updated successfully",
      })
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update highlight video",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 p-4 bg-muted rounded-lg border border-border">
      <div>
        <Label htmlFor="highlightVideo">YouTube Highlight Video URL</Label>
        <Input
          id="highlightVideo"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
          type="url"
          className="mt-1"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Paste your YouTube video URL. It will be embedded on your profile.
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
