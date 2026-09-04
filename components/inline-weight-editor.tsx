"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const HS_WEIGHT_CLASSES = {
  Male: [
    { value: "106", label: "106 lbs" },
    { value: "113", label: "113 lbs" },
    { value: "120", label: "120 lbs" },
    { value: "126", label: "126 lbs" },
    { value: "132", label: "132 lbs" },
    { value: "138", label: "138 lbs" },
    { value: "144", label: "144 lbs" },
    { value: "150", label: "150 lbs" },
    { value: "157", label: "157 lbs" },
    { value: "165", label: "165 lbs" },
    { value: "175", label: "175 lbs" },
    { value: "190", label: "190 lbs" },
    { value: "215", label: "215 lbs" },
    { value: "285", label: "285 lbs" },
  ],
  Female: [
    { value: "100", label: "100 lbs" },
    { value: "107", label: "107 lbs" },
    { value: "114", label: "114 lbs" },
    { value: "120", label: "120 lbs" },
    { value: "126", label: "126 lbs" },
    { value: "132", label: "132 lbs" },
    { value: "138", label: "138 lbs" },
    { value: "145", label: "145 lbs" },
    { value: "152", label: "152 lbs" },
    { value: "165", label: "165 lbs" },
    { value: "185", label: "185 lbs" },
    { value: "235", label: "235 lbs" },
  ],
}

interface InlineWeightEditorProps {
  athleteId: string
  weightClass?: string
  gender?: string
  onSave: (updates: { weightclass?: string }) => Promise<void>
  onCancel: () => void
}

export function InlineWeightEditor({
  athleteId,
  weightClass,
  gender,
  onSave,
  onCancel,
}: InlineWeightEditorProps) {
  const [value, setValue] = useState(weightClass || "")
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const genderKey = (gender && (gender === "Female" || gender === "Male")) ? gender : "Male"
  const options = HS_WEIGHT_CLASSES[genderKey as keyof typeof HS_WEIGHT_CLASSES] || HS_WEIGHT_CLASSES.Male

  const handleSave = async () => {
    try {
      setSaving(true)
      await onSave({ weightclass: value || undefined })
      toast({
        title: "Success",
        description: "Weight class updated successfully",
      })
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update weight class",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 p-4 bg-muted rounded-lg border border-border">
      <div>
        <Label htmlFor="weightClass">Weight Class</Label>
        <Select value={value || ""} onValueChange={setValue}>
          <SelectTrigger id="weightClass" className="mt-1">
            <SelectValue placeholder="Select weight class" />
          </SelectTrigger>
          <SelectContent>
            {options.map((wc) => (
              <SelectItem key={wc.value} value={wc.value}>
                {wc.label}
              </SelectItem>
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
