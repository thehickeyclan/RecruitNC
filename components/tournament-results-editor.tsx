"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Trophy, Plus, Pencil, Trash2, CheckCircle2 } from "lucide-react"

interface TournamentResult {
  year: number
  placement: string
  record: string
  weight?: string
  division?: string
  notes?: string
}

interface TournamentResultsEditorProps {
  athleteId: string
  nhscaResults?: TournamentResult[]
  super32Results?: TournamentResult[]
  onSave?: () => void
}

export function TournamentResultsEditor({
  athleteId,
  nhscaResults: initialNhsca = [],
  super32Results: initialSuper32 = [],
  onSave,
}: TournamentResultsEditorProps) {
  const [nhscaResults, setNhscaResults] = useState<TournamentResult[]>(initialNhsca)
  const [super32Results, setSuper32Results] = useState<TournamentResult[]>(initialSuper32)
  const [editingNhsca, setEditingNhsca] = useState<TournamentResult | null>(null)
  const [editingSuper32, setEditingSuper32] = useState<TournamentResult | null>(null)
  const [isAddingNhsca, setIsAddingNhsca] = useState(false)
  const [isAddingSuper32, setIsAddingSuper32] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const placementOptions = [
    "Champion",
    "Finalist",
    "3rd",
    "4th",
    "5th",
    "6th",
    "7th",
    "8th",
    "Quarterfinalist",
    "DNP",
    "Did Not Attend",
  ]

  const divisionOptions = ["Freshman", "Sophomore", "Junior", "Senior"]

  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear + 1 - i)

  const getPlacementBadge = (placement: string) => {
    if (!placement) {
      return <Badge variant="outline">—</Badge>
    }
    const p = placement.toLowerCase()
    if (p === "champion" || p === "1st") {
      return <Badge className="bg-yellow-500 text-white">🥇 {placement}</Badge>
    }
    if (p === "finalist" || p === "2nd") {
      return <Badge className="bg-gray-400 text-white">🥈 {placement}</Badge>
    }
    if (p === "3rd") {
      return <Badge className="bg-amber-600 text-white">🥉 {placement}</Badge>
    }
    if (["4th", "5th", "6th", "7th", "8th"].includes(p)) {
      return <Badge className="bg-[#002147] text-white">{placement}</Badge>
    }
    return <Badge variant="outline">{placement}</Badge>
  }

  const handleSaveAll = async () => {
    setIsSaving(true)
    setSaveMessage(null)

    try {
      const response = await fetch(`/api/athletes/${athleteId}/tournament-results`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nhsca_results: nhscaResults,
          super32_results: super32Results,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save tournament results")
      }

      setSaveMessage({ type: "success", text: "Tournament results saved successfully!" })
      onSave?.()
    } catch (error) {
      console.error("Error saving tournament results:", error)
      setSaveMessage({ type: "error", text: "Failed to save tournament results. Please try again." })
    } finally {
      setIsSaving(false)
    }
  }

  const NhscaEditor = () => {
    const [formData, setFormData] = useState<TournamentResult>(
      editingNhsca || {
        year: currentYear,
        placement: "",
        record: "",
        weight: "",
        division: "",
        notes: "",
      }
    )

    const handleSave = () => {
      if (!formData.placement || !formData.year) {
        alert("Year and Placement are required")
        return
      }

      if (editingNhsca) {
        const index = nhscaResults.findIndex((r) => r.year === editingNhsca.year)
        const updated = [...nhscaResults]
        updated[index] = formData
        setNhscaResults(updated.sort((a, b) => b.year - a.year))
        setEditingNhsca(null)
      } else {
        setNhscaResults([...nhscaResults, formData].sort((a, b) => b.year - a.year))
        setIsAddingNhsca(false)
      }
    }

    const handleCancel = () => {
      setEditingNhsca(null)
      setIsAddingNhsca(false)
    }

    return (
      <div className="border rounded-lg p-4 bg-gray-50 space-y-4">
        <h4 className="font-semibold text-[#002147]">{editingNhsca ? "Edit" : "Add"} NHSCA Result</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Year *</Label>
            <Select value={formData.year.toString()} onValueChange={(v) => setFormData({ ...formData, year: parseInt(v) })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Placement *</Label>
            <Select value={formData.placement} onValueChange={(v) => setFormData({ ...formData, placement: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select placement" />
              </SelectTrigger>
              <SelectContent>
                {placementOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Record</Label>
            <Input
              placeholder="e.g., 5-1"
              value={formData.record}
              onChange={(e) => setFormData({ ...formData, record: e.target.value })}
            />
          </div>

          <div>
            <Label>Weight Class</Label>
            <Input
              placeholder="e.g., 157"
              value={formData.weight || ""}
              onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
            />
          </div>

          <div>
            <Label>Division</Label>
            <Select value={formData.division || ""} onValueChange={(v) => setFormData({ ...formData, division: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select division" />
              </SelectTrigger>
              <SelectContent>
                {divisionOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>Notes (optional)</Label>
          <Textarea
            placeholder="Add any additional notes..."
            value={formData.notes || ""}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={2}
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} className="bg-[#B31B1B] hover:bg-[#8B1515]">
            Save Result
          </Button>
          <Button onClick={handleCancel} variant="outline">
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  const Super32Editor = () => {
    const [formData, setFormData] = useState<TournamentResult>(
      editingSuper32 || {
        year: currentYear,
        placement: "",
        record: "",
        weight: "",
        division: "",
        notes: "",
      }
    )

    const handleSave = () => {
      if (!formData.placement || !formData.year) {
        alert("Year and Placement are required")
        return
      }

      if (editingSuper32) {
        const index = super32Results.findIndex((r) => r.year === editingSuper32.year)
        const updated = [...super32Results]
        updated[index] = formData
        setSuper32Results(updated.sort((a, b) => b.year - a.year))
        setEditingSuper32(null)
      } else {
        setSuper32Results([...super32Results, formData].sort((a, b) => b.year - a.year))
        setIsAddingSuper32(false)
      }
    }

    const handleCancel = () => {
      setEditingSuper32(null)
      setIsAddingSuper32(false)
    }

    return (
      <div className="border rounded-lg p-4 bg-gray-50 space-y-4">
        <h4 className="font-semibold text-[#002147]">{editingSuper32 ? "Edit" : "Add"} Super 32 Result</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Year *</Label>
            <Select value={formData.year.toString()} onValueChange={(v) => setFormData({ ...formData, year: parseInt(v) })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Placement *</Label>
            <Select value={formData.placement} onValueChange={(v) => setFormData({ ...formData, placement: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select placement" />
              </SelectTrigger>
              <SelectContent>
                {placementOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Record</Label>
            <Input
              placeholder="e.g., 6-0"
              value={formData.record}
              onChange={(e) => setFormData({ ...formData, record: e.target.value })}
            />
          </div>

          <div>
            <Label>Weight Class</Label>
            <Input
              placeholder="e.g., 157"
              value={formData.weight || ""}
              onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
            />
          </div>

          <div>
            <Label>Division</Label>
            <Select value={formData.division || ""} onValueChange={(v) => setFormData({ ...formData, division: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select division" />
              </SelectTrigger>
              <SelectContent>
                {divisionOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>Notes (optional)</Label>
          <Textarea
            placeholder="Add any additional notes..."
            value={formData.notes || ""}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={2}
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} className="bg-[#B31B1B] hover:bg-[#8B1515]">
            Save Result
          </Button>
          <Button onClick={handleCancel} variant="outline">
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* NHSCA Section */}
      <Card className="border-t-4 border-t-[#002147]">
        <CardHeader className="bg-gradient-to-r from-[#002147] to-[#003366]">
          <CardTitle className="text-white flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            NHSCA National Championship
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {nhscaResults.length > 0 && !editingNhsca && !isAddingNhsca && (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Year</TableHead>
                    <TableHead>Placement</TableHead>
                    <TableHead>Record</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Division</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nhscaResults.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{result.year}</TableCell>
                      <TableCell>{getPlacementBadge(result.placement)}</TableCell>
                      <TableCell>{result.record || "—"}</TableCell>
                      <TableCell>{result.weight || "—"}</TableCell>
                      <TableCell>{result.division || "—"}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingNhsca(result)}
                          className="hover:bg-[#002147] hover:text-white"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setNhscaResults(nhscaResults.filter((_, i) => i !== index))}
                          className="hover:bg-red-600 hover:text-white"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {(isAddingNhsca || editingNhsca) && <NhscaEditor />}

          {!isAddingNhsca && !editingNhsca && (
            <Button onClick={() => setIsAddingNhsca(true)} className="bg-[#B31B1B] hover:bg-[#8B1515]">
              <Plus className="h-4 w-4 mr-2" />
              Add NHSCA Year
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Super 32 Section */}
      <Card className="border-t-4 border-t-[#002147]">
        <CardHeader className="bg-gradient-to-r from-[#002147] to-[#003366]">
          <CardTitle className="text-white flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Super 32
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {super32Results.length > 0 && !editingSuper32 && !isAddingSuper32 && (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Year</TableHead>
                    <TableHead>Placement</TableHead>
                    <TableHead>Record</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Division</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {super32Results.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{result.year}</TableCell>
                      <TableCell>{getPlacementBadge(result.placement)}</TableCell>
                      <TableCell>{result.record || "—"}</TableCell>
                      <TableCell>{result.weight || "—"}</TableCell>
                      <TableCell>{result.division || "—"}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingSuper32(result)}
                          className="hover:bg-[#002147] hover:text-white"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSuper32Results(super32Results.filter((_, i) => i !== index))}
                          className="hover:bg-red-600 hover:text-white"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {(isAddingSuper32 || editingSuper32) && <Super32Editor />}

          {!isAddingSuper32 && !editingSuper32 && (
            <Button onClick={() => setIsAddingSuper32(true)} className="bg-[#B31B1B] hover:bg-[#8B1515]">
              <Plus className="h-4 w-4 mr-2" />
              Add Super 32 Year
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Save All Button */}
      <div className="flex items-center gap-4">
        <Button
          onClick={handleSaveAll}
          disabled={isSaving}
          className="bg-[#B31B1B] hover:bg-[#8B1515] text-white px-8"
          size="lg"
        >
          {isSaving ? "Saving..." : "Save All Tournament Data"}
        </Button>

        {saveMessage && (
          <Alert className={saveMessage.type === "success" ? "border-green-500" : "border-red-500"}>
            <CheckCircle2 className={`h-4 w-4 ${saveMessage.type === "success" ? "text-green-600" : "text-red-600"}`} />
            <AlertDescription className={saveMessage.type === "success" ? "text-green-800" : "text-red-800"}>
              {saveMessage.text}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}

