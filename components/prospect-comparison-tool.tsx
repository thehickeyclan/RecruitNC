"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AthleteImage } from "@/components/athlete-image"
import { Users, Scale, X } from "lucide-react"

interface Prospect {
  id: string
  name: string
  graduationyear: number
  weightclass: string
  highschool: string
  wrestlingClub: string
  photourl?: string
  achievements: string[]
  gender?: string
  prospect_ranking?: number
  recruiting_status?: string
  academic_gpa?: number
  academic_sat?: number
  academic_act?: number
  careerRecord?: string
}

interface ProspectComparisonToolProps {
  prospects: Prospect[]
  onCompare?: (selectedProspects: Prospect[]) => void
}

export function ProspectComparisonTool({ prospects, onCompare }: ProspectComparisonToolProps) {
  const [selectedProspects, setSelectedProspects] = useState<string[]>([])
  const [comparisonMode, setComparisonMode] = useState(false)
  const [sortBy, setSortBy] = useState<string>("ranking")

  const handleProspectSelect = (prospectId: string, checked: boolean) => {
    if (checked && selectedProspects.length < 4) {
      setSelectedProspects([...selectedProspects, prospectId])
    } else if (!checked) {
      setSelectedProspects(selectedProspects.filter((id) => id !== prospectId))
    }
  }

  const getSelectedProspectData = () => {
    return selectedProspects.map((id) => prospects.find((p) => p.id === id)).filter(Boolean) as Prospect[]
  }

  const startComparison = () => {
    setComparisonMode(true)
    onCompare?.(getSelectedProspectData())
  }

  const clearSelection = () => {
    setSelectedProspects([])
    setComparisonMode(false)
  }

  const sortedProspects = [...prospects].sort((a, b) => {
    switch (sortBy) {
      case "ranking":
        return (a.prospect_ranking || 999) - (b.prospect_ranking || 999)
      case "gpa":
        return (b.academic_gpa || 0) - (a.academic_gpa || 0)
      case "name":
        return a.name.localeCompare(b.name)
      case "year":
        return a.graduationyear - b.graduationyear
      default:
        return 0
    }
  })

  if (comparisonMode && selectedProspects.length > 0) {
    const compareProspects = getSelectedProspectData()

    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Prospect Comparison ({compareProspects.length})
            </CardTitle>
            <Button variant="outline" onClick={clearSelection} size="sm">
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {compareProspects.map((prospect) => (
              <Card key={prospect.id} className="border-2 border-primary/20">
                <CardContent className="p-4">
                  <div className="text-center mb-4">
                    <AthleteImage
                      src={prospect.photourl}
                      alt={prospect.name}
                      className="w-16 h-16 rounded-full mx-auto mb-2"
                    />
                    <h3 className="font-semibold text-sm">{prospect.name}</h3>
                    {prospect.prospect_ranking && (
                      <Badge variant="outline" className="mt-1">
                        #{prospect.prospect_ranking}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Class:</span>
                      <span>{prospect.graduationyear}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Weight:</span>
                      <span>{prospect.weightclass} lbs</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">School:</span>
                      <span className="truncate">{prospect.highschool}</span>
                    </div>
                    {prospect.academic_gpa && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">GPA:</span>
                        <span className="font-medium">{prospect.academic_gpa.toFixed(2)}</span>
                      </div>
                    )}
                    {prospect.academic_sat && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">SAT:</span>
                        <span className="font-medium">{prospect.academic_sat}</span>
                      </div>
                    )}
                    {prospect.careerRecord && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Record:</span>
                        <span className="font-medium">{prospect.careerRecord}</span>
                      </div>
                    )}
                  </div>

                  {prospect.achievements && prospect.achievements.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-muted-foreground mb-1">Top Achievement:</p>
                      <p className="text-xs font-medium">{prospect.achievements[0]}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Compare Prospects
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ranking">By Ranking</SelectItem>
                <SelectItem value="gpa">By GPA</SelectItem>
                <SelectItem value="name">By Name</SelectItem>
                <SelectItem value="year">By Year</SelectItem>
              </SelectContent>
            </Select>
            {selectedProspects.length > 1 && (
              <Button onClick={startComparison} size="sm">
                Compare ({selectedProspects.length})
              </Button>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Select up to 4 prospects to compare side-by-side. {selectedProspects.length}/4 selected.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedProspects.slice(0, 12).map((prospect) => (
            <div
              key={prospect.id}
              className={`p-3 border rounded-lg transition-colors ${
                selectedProspects.includes(prospect.id)
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selectedProspects.includes(prospect.id)}
                  onCheckedChange={(checked) => handleProspectSelect(prospect.id, checked as boolean)}
                  disabled={!selectedProspects.includes(prospect.id) && selectedProspects.length >= 4}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-sm truncate">{prospect.name}</h3>
                    {prospect.prospect_ranking && (
                      <Badge variant="outline" className="text-xs">
                        #{prospect.prospect_ranking}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {prospect.graduationyear} • {prospect.weightclass} lbs
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{prospect.highschool}</p>
                  {prospect.academic_gpa && (
                    <p className="text-xs text-accent font-medium mt-1">GPA: {prospect.academic_gpa.toFixed(2)}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
