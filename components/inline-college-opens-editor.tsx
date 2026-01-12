"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Save, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface InlineCollegeOpensEditorProps {
  athleteId: string
  collegeOpens?: string
  onSave: (updates: {
    college_opens_experience?: string
  }) => Promise<void>
  onCancel: () => void
}

export function InlineCollegeOpensEditor({
  athleteId,
  collegeOpens,
  onSave,
  onCancel,
}: InlineCollegeOpensEditorProps) {
  const [collegeOpensValue, setCollegeOpensValue] = useState(collegeOpens || "")
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const handleSave = async () => {
    try {
      setSaving(true)
      await onSave({
        college_opens_experience: collegeOpensValue || null,
      })
      toast({
        title: "Success",
        description: "College Opens Experience updated successfully",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update college opens experience",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div>
        <Label htmlFor="collegeOpens">College Opens Experience</Label>
        <Textarea
          id="collegeOpens"
          value={collegeOpensValue}
          onChange={(e) => setCollegeOpensValue(e.target.value)}
          placeholder="Describe your college opens experience..."
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

