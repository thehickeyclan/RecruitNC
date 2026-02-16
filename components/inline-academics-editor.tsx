"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Save, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ACADEMIC_INTEREST_GROUPS } from "@/lib/academic-interest-options"

interface InlineAcademicsEditorProps {
  athleteId: string
  gpa?: number
  sat?: number
  act?: number
  academicInterest?: string | null
  onSave: (updates: {
    academic_gpa?: number | null
    academic_sat?: number | null
    academic_act?: number | null
    academic_interest?: string | null
  }) => Promise<void>
  onCancel: () => void
}

export function InlineAcademicsEditor({
  athleteId,
  gpa,
  sat,
  act,
  academicInterest,
  onSave,
  onCancel,
}: InlineAcademicsEditorProps) {
  const [gpaValue, setGpaValue] = useState(gpa ? String(gpa) : "")
  const [satValue, setSatValue] = useState(sat ? String(sat) : "")
  const [actValue, setActValue] = useState(act ? String(act) : "")
  const [academicInterestValue, setAcademicInterestValue] = useState(academicInterest || "")
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const handleSave = async () => {
    try {
      setSaving(true)
      await onSave({
        academic_gpa: gpaValue ? parseFloat(gpaValue) : null,
        academic_sat: satValue ? parseInt(satValue) : null,
        academic_act: actValue ? parseInt(actValue) : null,
        academic_interest: academicInterestValue || null,
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
      <div>
        <Label htmlFor="academic-interest">Academic Interest (Intended Major)</Label>
        <Select value={academicInterestValue || "none"} onValueChange={(v) => setAcademicInterestValue(v === "none" ? "" : v)}>
          <SelectTrigger id="academic-interest" className="mt-1">
            <SelectValue placeholder="Select intended major (optional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None / Undecided</SelectItem>
            {ACADEMIC_INTEREST_GROUPS.map((group) => (
              <SelectGroup key={group.label}>
                <SelectLabel>{group.label}</SelectLabel>
                {group.options.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
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

