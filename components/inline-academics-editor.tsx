"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Save, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface InlineAcademicsEditorProps {
  athleteId: string
  gpa?: number
  sat?: number
  act?: number
  onSave: (updates: {
    academic_gpa?: number | null
    academic_sat?: number | null
    academic_act?: number | null
  }) => Promise<void>
  onCancel: () => void
}

export function InlineAcademicsEditor({
  athleteId,
  gpa,
  sat,
  act,
  onSave,
  onCancel,
}: InlineAcademicsEditorProps) {
  const [gpaValue, setGpaValue] = useState(gpa ? String(gpa) : "")
  const [satValue, setSatValue] = useState(sat ? String(sat) : "")
  const [actValue, setActValue] = useState(act ? String(act) : "")
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const handleSave = async () => {
    try {
      setSaving(true)
      await onSave({
        academic_gpa: gpaValue ? parseFloat(gpaValue) : null,
        academic_sat: satValue ? parseInt(satValue) : null,
        academic_act: actValue ? parseInt(actValue) : null,
      })
      toast({
        title: "Success",
        description: "Academic information updated successfully",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update academic information",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div>
        <Label htmlFor="gpa">GPA</Label>
        <Input
          id="gpa"
          value={gpaValue}
          onChange={(e) => setGpaValue(e.target.value)}
          placeholder="4.0"
          type="number"
          step="0.01"
          min="0"
          max="5"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="sat">SAT Score</Label>
        <Input
          id="sat"
          value={satValue}
          onChange={(e) => setSatValue(e.target.value)}
          placeholder="1600"
          type="number"
          min="0"
          max="1600"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="act">ACT Score</Label>
        <Input
          id="act"
          value={actValue}
          onChange={(e) => setActValue(e.target.value)}
          placeholder="36"
          type="number"
          min="0"
          max="36"
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

