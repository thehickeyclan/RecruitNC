"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { WRESTLING_CLUBS_LIST } from "@/lib/mock-data"

interface InlineSchoolClubEditorProps {
  athleteId: string
  highSchool?: string
  wrestlingClub?: string
  ncUnitedTeam?: string
  onSave: (updates: {
    highschool?: string
    wrestlingclub?: string
    ncUnitedTeam?: string
  }) => Promise<void>
  onCancel: () => void
}

export function InlineSchoolClubEditor({
  athleteId,
  highSchool,
  wrestlingClub,
  ncUnitedTeam,
  onSave,
  onCancel,
}: InlineSchoolClubEditorProps) {
  const [highSchoolValue, setHighSchoolValue] = useState(highSchool || "")
  const [clubValue, setClubValue] = useState(wrestlingClub || "")
  const [ncUnitedValue, setNcUnitedValue] = useState(ncUnitedTeam || "none")
  const [customClub, setCustomClub] = useState("")
  const [showCustomClub, setShowCustomClub] = useState(false)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  // Check if current club is in the list
  const isCustomClub = clubValue && !WRESTLING_CLUBS_LIST.includes(clubValue) && clubValue !== "CLUB IS NOT LISTED"

  const handleClubChange = (value: string) => {
    if (value === "CLUB IS NOT LISTED" || value === "CUSTOM") {
      setShowCustomClub(true)
      setClubValue("")
    } else {
      setShowCustomClub(false)
      setClubValue(value)
      setCustomClub("")
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const finalClubValue = showCustomClub || isCustomClub ? customClub || clubValue : clubValue
      await onSave({
        highschool: highSchoolValue,
        wrestlingclub: finalClubValue,
        ncUnitedTeam: ncUnitedValue,
      })
      toast({
        title: "Success",
        description: "Profile information updated successfully",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile information",
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
        <Select
          value={isCustomClub ? "CUSTOM" : clubValue || ""}
          onValueChange={handleClubChange}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select or enter wrestling club" />
          </SelectTrigger>
          <SelectContent>
            {WRESTLING_CLUBS_LIST.filter(club => club !== "CLUB IS NOT LISTED").map((club) => (
              <SelectItem key={club} value={club}>
                {club}
              </SelectItem>
            ))}
            <SelectItem value="CLUB IS NOT LISTED">+ Add New Club</SelectItem>
          </SelectContent>
        </Select>
        {(showCustomClub || isCustomClub) && (
          <Input
            id="customClub"
            value={isCustomClub ? clubValue : customClub}
            onChange={(e) => {
              if (isCustomClub) {
                setClubValue(e.target.value)
              } else {
                setCustomClub(e.target.value)
              }
            }}
            placeholder="Enter wrestling club name"
            className="mt-2"
          />
        )}
      </div>
      <div>
        <Label htmlFor="ncUnitedTeam">NC United Program</Label>
        <Select value={ncUnitedValue} onValueChange={setNcUnitedValue}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select NC United membership" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="blue">Blue Team</SelectItem>
            <SelectItem value="gold">Gold Team</SelectItem>
            <SelectItem value="both">Both Teams</SelectItem>
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

