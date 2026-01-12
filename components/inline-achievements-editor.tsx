"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Save, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface InlineAchievementsEditorProps {
  athleteId: string
  achievements?: string[] | string
  additionalAchievements?: string
  onSave: (updates: {
    achievements?: string[]
    additional_achievements?: string
  }) => Promise<void>
  onCancel: () => void
}

export function InlineAchievementsEditor({
  athleteId,
  achievements,
  additionalAchievements,
  onSave,
  onCancel,
}: InlineAchievementsEditorProps) {
  // Convert achievements to string for editing
  const achievementsArray = Array.isArray(achievements)
    ? achievements
    : typeof achievements === "string"
      ? achievements.split(",").map((a) => a.trim()).filter(Boolean)
      : []
  
  const [achievementsText, setAchievementsText] = useState(
    achievementsArray.join(", ")
  )
  const [additionalText, setAdditionalText] = useState(additionalAchievements || "")
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const handleSave = async () => {
    try {
      setSaving(true)
      const achievementsArray = achievementsText
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean)
      
      await onSave({
        achievements: achievementsArray,
        additional_achievements: additionalText || null,
      })
      toast({
        title: "Success",
        description: "Achievements updated successfully",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update achievements",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div>
        <Label htmlFor="achievements">Achievements (comma-separated)</Label>
        <Textarea
          id="achievements"
          value={achievementsText}
          onChange={(e) => setAchievementsText(e.target.value)}
          placeholder="State Champion 2024, Regional Champion 2023, etc."
          rows={4}
          className="mt-1"
        />
        <p className="text-xs text-gray-500 mt-1">
          Separate multiple achievements with commas
        </p>
      </div>
      <div>
        <Label htmlFor="additionalAchievements">Additional Achievements</Label>
        <Textarea
          id="additionalAchievements"
          value={additionalText}
          onChange={(e) => setAdditionalText(e.target.value)}
          placeholder="Enter additional achievements, one per line"
          rows={6}
          className="mt-1"
        />
        <p className="text-xs text-gray-500 mt-1">
          Enter one achievement per line
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

