"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Save, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface InlineBioEditorProps {
  athleteId: string
  bio?: string
  bioHeadline?: string
  onSave: (updates: { bio?: string; bio_headline?: string }) => Promise<void>
  onCancel: () => void
}

export function InlineBioEditor({ athleteId, bio, bioHeadline, onSave, onCancel }: InlineBioEditorProps) {
  const [headline, setHeadline] = useState(bioHeadline || "")
  const [bioText, setBioText] = useState(bio || "")
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const handleSave = async () => {
    try {
      setSaving(true)
      await onSave({
        bio_headline: headline,
        bio: bioText,
      })
      toast({
        title: "Success",
        description: "Bio updated successfully",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update bio",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div>
        <Label htmlFor="headline">Bio Headline</Label>
        <Input
          id="headline"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="Enter a headline for your bio"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          value={bioText}
          onChange={(e) => setBioText(e.target.value)}
          placeholder="Tell us about yourself..."
          rows={6}
          className="mt-1"
        />
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

