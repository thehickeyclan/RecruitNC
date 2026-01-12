"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Save, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface InlineContactEditorProps {
  athleteId: string
  highSchool?: string
  wrestlingClub?: string
  cell?: string
  instagram?: string
  onSave: (updates: {
    highschool?: string
    wrestlingclub?: string
    cell?: string
    instagram?: string
  }) => Promise<void>
  onCancel: () => void
}

export function InlineContactEditor({
  athleteId,
  highSchool,
  wrestlingClub,
  cell,
  instagram,
  onSave,
  onCancel,
}: InlineContactEditorProps) {
  const [highSchoolValue, setHighSchoolValue] = useState(highSchool || "")
  const [clubValue, setClubValue] = useState(wrestlingClub || "")
  const [cellValue, setCellValue] = useState(cell || "")
  const [instagramValue, setInstagramValue] = useState(instagram || "")
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const handleSave = async () => {
    try {
      setSaving(true)
      await onSave({
        highschool: highSchoolValue,
        wrestlingclub: clubValue,
        cell: cellValue,
        instagram: instagramValue,
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
        <Label htmlFor="highSchool">High School</Label>
        <Input
          id="highSchool"
          value={highSchoolValue}
          onChange={(e) => setHighSchoolValue(e.target.value)}
          placeholder="Enter your high school"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="wrestlingClub">Wrestling Club</Label>
        <Input
          id="wrestlingClub"
          value={clubValue}
          onChange={(e) => setClubValue(e.target.value)}
          placeholder="Enter your wrestling club"
          className="mt-1"
        />
      </div>
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
        <Label htmlFor="instagram">Instagram Handle</Label>
        <Input
          id="instagram"
          value={instagramValue}
          onChange={(e) => setInstagramValue(e.target.value)}
          placeholder="@username"
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

