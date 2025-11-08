"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

export const LEAD_SOURCE_OPTIONS = [
  "National Tournament",
  "Local/State Tournament",
  "College Open",
  "Prospect Camp / Clinic",
  "Club Practice / RTC",
  "RecruitNC Rankings",
  "RecruitNC Email",
  "Social Media",
  "Referral",
  "Website / Direct",
  "Other",
]

interface LeadSourceValues {
  lead_source?: string | null
  lead_subsource?: string | null
  lead_source_detail?: string | null
}

interface LeadSourceFormProps {
  athleteId: string | null
  isStarred: boolean
  defaultValues?: LeadSourceValues
  onSaved?: () => void
  viewAsCoachId?: string | null
}

export function LeadSourceForm({ athleteId, isStarred, defaultValues, onSaved, viewAsCoachId }: LeadSourceFormProps) {
  const { toast } = useToast()

  const [leadSource, setLeadSource] = useState<string>("")
  const [leadSubSource, setLeadSubSource] = useState<string>("")
  const [leadSourceDetail, setLeadSourceDetail] = useState<string>("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isStarred) {
      setLeadSource("RecruitNC Rankings")
    } else if (defaultValues?.lead_source) {
      setLeadSource(defaultValues.lead_source)
    } else {
      setLeadSource("")
    }
  }, [isStarred, defaultValues?.lead_source])

  useEffect(() => {
    setLeadSubSource(defaultValues?.lead_subsource || "")
    setLeadSourceDetail(defaultValues?.lead_source_detail || "")
  }, [defaultValues?.lead_subsource, defaultValues?.lead_source_detail])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!athleteId) {
      toast({
        title: "Missing Athlete",
        description: "We could not identify this athlete. Please try again.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/coach-portal/update-lead-source", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          athleteId,
          leadSource,
          leadSubSource,
          leadSourceDetail,
          viewAsCoachId: viewAsCoachId || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "Failed to save lead source")
      }

      toast({
        title: "Lead Source Saved",
        description: "The lead source details were saved successfully.",
        variant: "default",
      })

      onSaved?.()
    } catch (error) {
      console.error("[LeadSourceForm] Error saving lead source:", error)
      toast({
        title: "Save Failed",
        description: "We could not save the lead source details. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const dropdownDisabled = isStarred

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800">Recruit Lead Source</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="lead_source" className="text-sm font-medium text-slate-700">
              Lead Source
            </Label>
            <Select
              value={leadSource}
              onValueChange={setLeadSource}
              disabled={dropdownDisabled}
            >
              <SelectTrigger
                id="lead_source"
                className={dropdownDisabled ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""}
              >
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                {LEAD_SOURCE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {dropdownDisabled && (
              <p className="text-xs text-slate-500">
                Starred prospects default to RecruitNC Rankings. Update the star status to change this value.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lead_subsource" className="text-sm font-medium text-slate-700">
              Lead Subsource
            </Label>
            <Input
              id="lead_subsource"
              placeholder='e.g. "Super 32", "Instagram DM", "UNC Prospect Camp"'
              value={leadSubSource}
              onChange={(event) => setLeadSubSource(event.target.value)}
              className="rounded-lg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lead_source_detail" className="text-sm font-medium text-slate-700">
              Notes / Context
            </Label>
            <Textarea
              id="lead_source_detail"
              placeholder='Optional context (e.g. "Coach saw him at UNC dual before practice")'
              value={leadSourceDetail}
              onChange={(event) => setLeadSourceDetail(event.target.value)}
              className="rounded-lg min-h-[120px]"
            />
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={loading} className="min-w-[140px]">
            {loading ? "Saving..." : "Save Lead Source"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

