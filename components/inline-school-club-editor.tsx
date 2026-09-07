"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
/**
 * The club list comes from the club directory — the same rows behind the club finder map.
 *
 * It used to come from `WRESTLING_CLUBS_LIST`, a hardcoded array of about forty-six names in
 * `lib/mock-data.ts`. The directory holds seventy-three, so a third of the clubs on the map
 * could not be chosen here at all: Cory Thomas wrestles for OTM Walters, which is in the
 * directory with two aliases and simply was not in the array, so his profile has no club on it.
 * Fifteen wrestlers in the Tournament of Champions field have a blank club for the same reason.
 *
 * Loading it means the two can never disagree again — a club added to the map is selectable
 * here the moment it is added.
 */

interface InlineSchoolClubEditorProps {
  athleteId: string
  highSchool?: string
  wrestlingClub?: string
  ncUnitedTeam?: string
  /** When true, NC United Program is read-only (set in Admin only). Default true. */
  ncUnitedTeamReadOnly?: boolean
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
  ncUnitedTeamReadOnly = true,
  onSave,
  onCancel,
}: InlineSchoolClubEditorProps) {
  const [highSchoolValue, setHighSchoolValue] = useState(highSchool || "")
  const [clubValue, setClubValue] = useState(wrestlingClub || "")
  const [ncUnitedValue, setNcUnitedValue] = useState(ncUnitedTeam || "none")
  const [customClub, setCustomClub] = useState("")
  const [showCustomClub, setShowCustomClub] = useState(false)
  const [saving, setSaving] = useState(false)
  const [clubs, setClubs] = useState<string[]>([])
  const { toast } = useToast()

  useEffect(() => {
    let cancelled = false
    fetch("/api/clubs/search?q=&all=1", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return
        const names = ((d?.clubs ?? []) as Array<{ name?: unknown }>)
          .map((c) => String(c.name ?? "").trim())
          .filter(Boolean)
        // The club already on the profile stays selectable even if it has since been retired
        // from the directory, so opening the editor cannot silently clear somebody's club.
        const withCurrent = clubValue && !names.includes(clubValue) ? [clubValue, ...names] : names
        setClubs([...new Set(withCurrent)].sort((a, b) => a.localeCompare(b)))
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
    // Loaded once on open; the current club is captured on that first run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Check if current club is in the list
  const isCustomClub = clubValue && clubs.length > 0 && !clubs.includes(clubValue) && clubValue !== "CLUB IS NOT LISTED"

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
      const updates: { highschool?: string; wrestlingclub?: string; ncUnitedTeam?: string } = {
        highschool: highSchoolValue,
        wrestlingclub: finalClubValue,
      }
      if (!ncUnitedTeamReadOnly) updates.ncUnitedTeam = ncUnitedValue
      await onSave(updates)
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
    <div className="space-y-4 p-4 bg-muted rounded-lg border border-border">
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
            {clubs.filter(club => club !== "CLUB IS NOT LISTED").map((club) => (
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
        {ncUnitedTeamReadOnly ? (
          <div className="mt-1 rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground/80">
            {ncUnitedValue === "blue" ? "NC United Blue" : ncUnitedValue === "gold" ? "NC United Gold" : ncUnitedValue === "both" ? "Both Teams" : "None"}
            <span className="ml-2 text-xs text-muted-foreground">(set in Admin → Athletes)</span>
          </div>
        ) : (
          <Select value={ncUnitedValue} onValueChange={setNcUnitedValue}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select NC United membership" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="blue">NC United Blue</SelectItem>
            </SelectContent>
          </Select>
        )}
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

