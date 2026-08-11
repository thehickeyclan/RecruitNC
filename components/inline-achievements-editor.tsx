"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Save, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

/**
 * Editor for the honours an athlete writes themselves.
 *
 * It used to write `achievements` and `additional_achievements`, which is where typed
 * state titles came from — and those columns are no longer athlete-editable, so saving
 * here would now fail. Results come from the NCHSAA / NHSCA / Super 32 / Fargo tables;
 * this field is for what those tables do not cover.
 *
 * One box, one honour per line. The old comma-separated field split "Fred T. Foard, 3rd"
 * into two entries, which is part of why the data was unusable.
 */
interface InlineAchievementsEditorProps {
  athleteId: string
  otherHonours?: string | null
  onSave: (updates: { other_honours?: string | null }) => Promise<void>
  onCancel: () => void
}

export function InlineAchievementsEditor({ otherHonours, onSave, onCancel }: InlineAchievementsEditorProps) {
  // Migrated rows joined their entries with " • "; show them one per line for editing.
  const [text, setText] = useState((otherHonours ?? "").replace(/\s+•\s+/g, "\n"))
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const handleSave = async () => {
    try {
      setSaving(true)
      const cleaned = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .join("\n")
      await onSave({ other_honours: cleaned || null })
      toast({ title: "Saved", description: "Your honours were updated." })
    } catch (error: any) {
      toast({
        title: "Could not save",
        description: error?.message || "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div>
        <Label htmlFor="otherHonours">Other honours</Label>
        <p className="mb-2 mt-1 text-xs leading-5 text-gray-500">
          Conference and regional finishes, invitationals, career milestones, team titles — anything not covered by
          official results. Your state, NHSCA, Super 32 and Fargo results are added automatically and shown separately,
          so there is no need to list them here.
        </p>
        <Textarea
          id="otherHonours"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"2x All Conference\n3rd — Dash Classic 2025\n100+ career wins"}
          rows={6}
          className="mt-1"
        />
        <p className="mt-1 text-xs text-gray-500">One per line</p>
      </div>
      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving} size="sm">
          <Save className="mr-1 h-4 w-4" />
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button onClick={onCancel} variant="outline" disabled={saving} size="sm">
          <X className="mr-1 h-4 w-4" />
          Cancel
        </Button>
      </div>
    </div>
  )
}
